"""
Outil de recherche dans la base de connaissances via l'API VoixIA Coccinelle.

Ce module fournit la fonction ``search_knowledge`` pour interroger
la base de connaissances via POST /api/v1/voixia/knowledge.

Authentification par cle API (X-VoixIA-Key + X-VoixIA-Tenant).

REGLE TTS ABSOLUE : le retour de cette fonction est lu a voix haute
par l'agent vocal. JAMAIS de prefixe technique, JAMAIS de markdown,
phrases courtes et naturelles uniquement.
"""

import logging
import os
import re

import httpx

from .context import get_api_key, get_tenant_id

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDES = 10
_BASE_URL = "https://coccinelle-api.youssef-amrouche.workers.dev"
# Budget du retour d'outil. Il valait 300 depuis l'epoque ou ce texte etait lu
# TEL QUEL a voix haute ; aujourd'hui le LLM le reformule. A 300, la reponse
# « Montage equilibrage : 15 euros » etait supprimee au profit des lignes
# voisines, et l'agent annoncait 25 euros (11/08/2026). 600 laisse passer la
# fiche demandee ET sa clarification quand deux prestations se ressemblent.
_MAX_CHARS_TTS = 600


def _nettoyer_pour_tts(texte: str) -> str:
    """Nettoie un texte pour la synthese vocale TTS.
    Ordre : remplacements specifiques AVANT generiques.
    """
    if not texte:
        return ""

    # 1. Expressions temporelles et horaires
    texte = texte.replace("24h/24 et 7j/7", "24 heures sur 24 et 7 jours sur 7")
    texte = texte.replace("24h/24", "24 heures sur 24")
    texte = texte.replace("7j/7", "7 jours sur 7")
    texte = texte.replace("24/7", "24 heures sur 24, 7 jours sur 7")
    texte = texte.replace("j/7", " jours sur 7")
    texte = texte.replace("h/24", " heures sur 24")

    # 2. Unites monetaires (specifique avant generique)
    texte = texte.replace("99\u20ac/mois", "99 euros par mois")
    texte = texte.replace("299\u20ac/mois", "299 euros par mois")
    texte = texte.replace("\u20ac/mois", " euros par mois")
    texte = texte.replace("\u20ac/an", " euros par an")
    texte = texte.replace("\u20ac", " euros")
    texte = texte.replace("EUR", " euros")

    # 3. Pourcentages
    texte = texte.replace("%", " pourcent")

    # 4. Connecteurs et symboles
    texte = texte.replace(" & ", " et ")
    texte = texte.replace("&", " et ")
    texte = texte.replace(" + ", " et ")
    texte = texte.replace("->", " vers ")
    texte = texte.replace("=>", " implique ")
    texte = texte.replace(" vs ", " versus ")
    texte = texte.replace(" vs. ", " versus ")

    # 5. Abreviations communes (word boundary regex)
    texte = re.sub(r"\bmin\b", "minutes", texte)
    texte = re.sub(r"\bmax\b", "maximum", texte)
    texte = texte.replace(" nb ", " nombre ")
    texte = texte.replace("rdv", "rendez-vous")
    texte = texte.replace("RDV", "rendez-vous")
    texte = re.sub(r"\bt\u00e9l\b", "t\u00e9l\u00e9phone", texte)
    texte = re.sub(r"\btel\b", "t\u00e9l\u00e9phone", texte)

    # 6. Sigles techniques
    texte = texte.replace("PME", "petites et moyennes entreprises")
    texte = texte.replace("TPE", "tr\u00e8s petites entreprises")
    texte = texte.replace("SLA", "niveau de service garanti")
    texte = texte.replace("CRM", "logiciel de gestion client")
    texte = texte.replace("SMS", "S M S")

    # 6b. Sigles fiscaux/comptables (word boundary pour eviter HTTP→httphors taxes)
    texte = re.sub(r"\bHT\b", "hors taxes", texte)
    texte = re.sub(r"\bTTC\b", "toutes taxes comprises", texte)
    texte = re.sub(r"\bTVA\b", "T V A", texte)

    # 7. Ordinaux
    texte = texte.replace("1er", "premier")
    texte = texte.replace("1\u00e8re", "premi\u00e8re")
    texte = texte.replace("2\u00e8me", "deuxi\u00e8me")
    texte = texte.replace("3\u00e8me", "troisi\u00e8me")

    # 8. Ponctuation problematique
    texte = texte.replace("...", ".")
    texte = texte.replace("..", ".")
    texte = texte.replace("\u2019", "'")
    texte = texte.replace("\u2018", "'")
    texte = texte.replace("\u201c", "")
    texte = texte.replace("\u201d", "")
    texte = texte.replace("\u2013", " ")
    texte = texte.replace("\u2014", " ")

    # 9. Supprimer markdown
    texte = re.sub(r"[#*_~`>|]", "", texte)

    # 10. Nettoyer espaces multiples
    texte = re.sub(r"\s+", " ", texte).strip()

    # 11. Tronquer a _MAX_CHARS_TTS
    if len(texte) > _MAX_CHARS_TTS:
        coupe = texte[:_MAX_CHARS_TTS]
        dernier_point = max(coupe.rfind("."), coupe.rfind("!"), coupe.rfind("?"))
        # Le seuil suit le budget : couper sur une fin de phrase garde une fiche
        # entiere (libelle + prix), couper au mot separerait les deux.
        if dernier_point > _MAX_CHARS_TTS // 3:
            texte = coupe[:dernier_point + 1]
        else:
            texte = coupe.rsplit(" ", 1)[0] + "."
    return texte


def _get_client() -> httpx.AsyncClient:
    base_url = os.environ.get("COCCINELLE_API_BASE", _BASE_URL)
    api_key = get_api_key()
    # Tenant de l\'APPEL en cours (contexte), plus la valeur figee du .env :
    # celle-ci faisait lire la KB d\'un autre client a chaque appel.
    tenant_id = get_tenant_id()

    return httpx.AsyncClient(
        base_url=base_url,
        headers={
            "X-VoixIA-Key": api_key,
            "X-VoixIA-Tenant": tenant_id,
        },
        timeout=_TIMEOUT_SECONDES,
    )


async def search_knowledge(question: str) -> str:
    """Recherche une reponse dans la base de connaissances Coccinelle.

    Args:
        question: Question posee par l'utilisateur en langage naturel.

    Returns:
        Reponse directe en francais, prete pour la synthese vocale.
    """
    try:
        import newrelic.agent
        newrelic.agent.add_custom_parameter("tool", "search_knowledge")
    except Exception:
        pass

    logger.info("Recherche dans la base de connaissances : %s", question)
    try:
        async with _get_client() as client:
            reponse = await client.post(
                "/api/v1/voixia/knowledge",
                json={"question": question},
            )
            reponse.raise_for_status()
            donnees = reponse.json()
            logger.info("Reponse KB recue — found=%s count=%s",
                        donnees.get("found"), donnees.get("count"))

            # Priorite 1 : champ answer (deja filtre et tronque par le backend)
            answer = donnees.get("answer")
            if answer:
                return _nettoyer_pour_tts(answer)

            # Priorite 2 : premier resultat
            resultats = donnees.get("results", [])
            if not resultats:
                return "Je n'ai pas trouve d'information sur ce sujet dans notre base de connaissances."

            premier = resultats[0]
            contenu = premier.get("content", premier.get("text", ""))
            return _nettoyer_pour_tts(contenu)

    except httpx.HTTPStatusError as exc:
        logger.error("Erreur HTTP KB : %s %s", exc.response.status_code, exc.response.text)
        return "Je ne peux pas consulter notre base de connaissances pour le moment."
    except httpx.TimeoutException:
        logger.error("Timeout KB")
        return "Notre base de connaissances met trop de temps a repondre."
    except Exception as exc:
        logger.exception("Erreur KB inattendue")
        return "Je rencontre un probleme technique pour consulter nos informations."
