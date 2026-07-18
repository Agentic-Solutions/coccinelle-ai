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
DEFAULT_COMPANY_NAME = "VoixIA"
DEFAULT_LLM_PROVIDER = "mistral"
DEFAULT_LLM_MODEL    = "mistral-large-latest"
DEFAULT_VOICE_ID     = "cgSgspJ2msm6clMCkdW9"


async def resolve_tenant(phone: str, caller: str | None = None) -> dict:
    """
    Resout la config complete du tenant a partir du numero appele.

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
    timeout = httpx.Timeout(15.0, connect=5.0)
    last_error = None
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(
                    url,
                    headers={
                        "X-VoixIA-Key": VOIXIA_KEY,
                        "X-VoixIA-Tenant": VOIXIA_TENANT,
                    },
                )
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
                }
        except Exception as e:
            last_error = e
            logger.warning(
                "Resolution tenant essai %d/2 echouee pour %s : %r",
                attempt + 1, phone, e,
            )
            if attempt == 0:
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
