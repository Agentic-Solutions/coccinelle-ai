"""
Resolution de tenant par numero de telephone (routing SIP).

Au debut de chaque appel SIP, ce module :
1. Extrait le numero appele depuis les metadonnees SIP du participant LiveKit
2. Appelle l API Coccinelle pour resoudre le tenant associe au numero
3. Retourne la config complete (prompt, LLM, voix) pour configurer l agent dynamiquement

Fallback : config generaliste si le numero n est pas trouve.
"""

import asyncio
import os
import logging
import time

import httpx


logger = logging.getLogger("voixia.tenant")

COCCINELLE_RESOLVE_URL = (
    "https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/voixia/resolve-phone"
)
# Clé lue depuis /opt/voixia/.env (EnvironmentFile systemd) — jamais en dur
# (repo public). Valeur identique verifiee le 18/07.
VOIXIA_KEY = os.environ.get("VOIXIA_API_KEY", "")
VOIXIA_TENANT = "tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy"

DEFAULT_PROMPT_TYPE  = "generaliste"
# ⚠️ VIDE, ET C'EST VOLONTAIRE (Lot B, 18/08/2026).
# Cette constante valait "VoixIA" — le nom de l'EDITEUR. Le 18/08 a 12h41, apres un
# echec de resolution, l'agent a decroche en disant « VoixIA » chez un client du
# Garage Toulouse. Meme famille que la fuite LightRAG du 08/08 : l'identite de
# l'editeur servie au client.
# Vide, `get_greeting()` retombe sur « Bonjour ! Comment puis-je vous aider ? » —
# le comportement neutre existait deja, il n'etait simplement jamais atteint.
# `company_name` ne sert par ailleurs qu'aux logs et a un champ New Relic (verifie).
DEFAULT_COMPANY_NAME = ""
DEFAULT_LLM_PROVIDER = "mistral"
DEFAULT_LLM_MODEL    = "mistral-large-latest"
DEFAULT_VOICE_ID     = "cgSgspJ2msm6clMCkdW9"


async def resolve_tenant(
    phone: str, caller: str | None = None, budget_s: float | None = None,
) -> dict:
    """
    Resout la config complete du tenant a partir du numero appele.

    `budget_s` : duree TOTALE accordee, retentatives et pauses comprises. Passe ce
    delai, on rend les valeurs par defaut plutot que de continuer a essayer.
    `None` = pas de plafond (comportement historique, conserve pour les scripts).

    Appelle GET /api/v1/voixia/resolve-phone?phone=<phone>&caller=<caller>
    `caller` (numero APPELANT) est optionnel : il ne sert au backend que si le numero
    appele est le numero d essai partage (inscrit sans numero provisionne encore).
    Retourne {
        tenant_id, company_name, prompt_type,
        llm_provider, llm_model, voice_id, system_prompt
    }.
    En cas d erreur ou numero inconnu, retourne les valeurs par defaut.
    """
    encoded_phone = phone.replace("+", "%2B")
    url = f"{COCCINELLE_RESOLVE_URL}?phone={encoded_phone}"
    if caller:
        url += f"&caller={caller.replace('+', '%2B')}"

    # Retry : pendant le setup media de l appel, l event loop LiveKit peut affamer
    # la requete httpx jusqu au timeout -> on retombait a tort sur le generaliste.
    # 2 tentatives + timeout genereux (connect court, read long) corrigent ca sans
    # penaliser le chemin nominal (~0.3s). Voir diag QW8 du 18/07.
    # ── DELAI UNITAIRE ET NOMBRE DE TENTATIVES (Lot C.2, 18/08/2026) ──
    #
    # Avant : 2 tentatives x 15 s = 30 s au pire. Mesure du 18/08 a 12h41 : tentative 1
    # en ReadTimeout apres 15 s, tentative 2 en 500 — l'appelant a attendu 30 s avant
    # d'entendre quoi que ce soit. Un prospect a raccroche bien avant.
    #
    # Latence reelle mesuree le 18/08 sur 15 appels : 345-498 ms, mediane 417 ms.
    # 5 s reste 12x le pire cas observe. 3 x 5 s = ~16 s au pire, soit la moitie
    # d'avant, avec une tentative de plus.
    #
    # ⚠️ TENSION A CONNAITRE : les 15 s venaient du diagnostic QW8 du 18/07 — la boucle
    # d'evenements LiveKit affame la requete httpx pendant le setup media. Raccourcir
    # peut reintroduire de faux timeouts. Le signal a surveiller est « tentative 1 en
    # timeout, tentative 2 rapide » : s'il devient systematique, rallonger. On ne regle
    # pas a l'aveugle — l'instrumentation cote Worker (Lot C.1) dira si le 500 vient du
    # serveur ou de la famine locale.
    # ── BUDGET TOTAL (chantier latence, 20/08/2026) ──
    # Un delai UNITAIRE ne borne pas le total : 3 essais x 5 s + 2 pauses de 0,3 s
    # = 15,6 s au pire, pendant lesquelles l'appelant n'entend RIEN puisque l'accueil
    # personnalise attend cette reponse. C'est la forme attenuee de la panne du 18/08
    # (2 x 15 s = 30,2 s), pas sa correction.
    # Le budget borne l'ENSEMBLE : chaque essai voit son delai rabote sur ce qui
    # reste, et on ne relance pas un essai qu'on n'a pas les moyens de finir.
    timeout_unitaire, connect_unitaire = 5.0, 3.0
    echeance = (time.monotonic() + budget_s) if budget_s else None
    last_error = None
    for attempt in range(3):
        if echeance is not None:
            restant = echeance - time.monotonic()
            # 0,25 s : en dessous, un essai ne peut pas aboutir (la latence nominale
            # mesuree est de 46 a 84 ms, mais le connect TLS a froid coute plus).
            # Mieux vaut parler tout de suite que consommer le budget pour rien.
            if restant < 0.25:
                logger.warning(
                    "Budget de resolution epuise (%.2f s) apres %d essai(s) — "
                    "accueil neutre, l'appel continue",
                    budget_s, attempt,
                )
                break
            timeout = httpx.Timeout(
                min(timeout_unitaire, restant), connect=min(connect_unitaire, restant),
            )
        else:
            timeout = httpx.Timeout(timeout_unitaire, connect=connect_unitaire)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                appel = client.get(
                    url,
                    headers={
                        "X-VoixIA-Key": VOIXIA_KEY,
                        "X-VoixIA-Tenant": VOIXIA_TENANT,
                    },
                )
                # ⚠️ LE PLAFOND EST LE NOTRE, PAS CELUI DE httpx.
                # Cloisonner l'essai par le seul `httpx.Timeout` revient a faire
                # confiance a httpx pour s'interrompre — or le diagnostic QW8 du
                # 18/07 dit l'inverse : la boucle d'evenements LiveKit peut affamer
                # cette requete pendant le setup media. Une requete jamais
                # replanifiee ne declenche pas non plus son propre delai.
                # Le banc `scripts/test_resolution_budget.py` a trouve exactement ce
                # trou : avec un client qui ignore le timeout, la resolution
                # repartait pour 30 s.
                if echeance is not None:
                    resp = await asyncio.wait_for(
                        appel, timeout=max(0.05, echeance - time.monotonic()),
                    )
                else:
                    resp = await appel
                resp.raise_for_status()
                data = resp.json()
                logger.info(
                    "Tenant resolu : %s -> tenant=%s secteur=%s llm=%s (essai %d)",
                    phone,
                    data.get("tenant_id"),
                    data.get("prompt_type"),
                    data.get("llm_model"),
                    attempt + 1,
                )
                return {
                    "tenant_id":    data.get("tenant_id", ""),
                    "company_name": data.get("company_name", DEFAULT_COMPANY_NAME),
                    "prompt_type":  data.get("prompt_type", DEFAULT_PROMPT_TYPE),
                    "llm_provider": data.get("llm_provider", DEFAULT_LLM_PROVIDER),
                    "llm_model":    data.get("llm_model",    DEFAULT_LLM_MODEL),
                    "voice_id":     data.get("voice_id",     DEFAULT_VOICE_ID),
                    "system_prompt": data.get("system_prompt", None),
                    # ── Champs ADDITIFS (chantier PRENOM, 18/08/2026) ──
                    # `greeting` est la phrase d'accueil DEJA CONSTRUITE par le
                    # backend. L'agent la prononce, il ne la fabrique plus : la
                    # fabriquer ici etait la seconde source, et elle divergeait de ce
                    # que la page « Mon Assistant » montrait au client.
                    # `None` si le backend n'est pas encore deploye -> main.py
                    # retombe sur l'ancien chemin, sans fenetre de casse.
                    "greeting":   data.get("greeting", None),
                    "agent_name": data.get("agent_name", None),
                }
        except Exception as e:
            last_error = e
            logger.warning(
                "Resolution tenant essai %d/3 echouee pour %s : %r",
                attempt + 1, phone, e,
            )
            if attempt < 2:
                # Ne pas dormir si la pause elle-meme mange le budget restant :
                # ce serait echanger du silence contre du silence.
                if echeance is not None and (echeance - time.monotonic()) < 0.55:
                    break
                await asyncio.sleep(0.3)

    logger.warning(
        "Resolution tenant echouee pour %s : %r — utilisation des valeurs par defaut",
        phone, last_error,
    )
    return {
        "tenant_id":    "",
        "company_name": DEFAULT_COMPANY_NAME,
        "prompt_type":  DEFAULT_PROMPT_TYPE,
        "llm_provider": DEFAULT_LLM_PROVIDER,
        "llm_model":    DEFAULT_LLM_MODEL,
        "voice_id":     DEFAULT_VOICE_ID,
        "system_prompt": None,
        # Pas de greeting impose : `company_name` etant vide (Lot B), `get_greeting`
        # rendra la phrase neutre sans aucune raison sociale.
        "greeting":   None,
        "agent_name": None,
    }


def extract_sip_to_number(participant) -> str | None:
    """
    Extrait le numero APPELE (destination) depuis les attributs SIP du participant.

    LiveKit SIP (appel entrant) :
      - sip.trunkPhoneNumber = numero APPELE (numero compose)  <- ce qu on veut
      - sip.phoneNumber      = numero APPELANT (origine)       <- NE PAS utiliser ici
    Cles testees (ordre) : sip.trunkPhoneNumber, sip.toUser, sip.to
    Retourne None si aucune information SIP n est disponible.
    """
    attrs = getattr(participant, "attributes", {}) or {}
    for key in ("sip.trunkPhoneNumber", "sip.toUser", "sip.to"):
        value = attrs.get(key)
        if value:
            logger.info(
                "Numero APPELE (trunk) via %s : %s | APPELANT : %s",
                key, value, attrs.get("sip.phoneNumber"),
            )
            return value
    logger.warning("Aucun numero SIP appele trouve dans les attributs : %s", attrs)
    return None
