"""
Outil de gestion des prospects (CRM) via l'API VoixIA Coccinelle.

Ce module fournit la fonction ``create_prospect`` pour enregistrer
un nouveau prospect dans le CRM via POST /api/v1/voixia/prospects.

Authentification par cle API (X-VoixIA-Key + X-VoixIA-Tenant).
"""

import logging
import os

import httpx

from .context import get_api_key, get_tenant_id

logger = logging.getLogger(__name__)

# Timeout par defaut pour les requetes HTTP (en secondes)
_TIMEOUT_SECONDES = 10

# URL de base de l'API VoixIA Coccinelle
_BASE_URL = "https://coccinelle-api.youssef-amrouche.workers.dev"


def _get_client() -> httpx.AsyncClient:
    """
    Retourne un client HTTP configure pour l'API VoixIA Coccinelle.

    Le client est pre-configure avec :
    - L'URL de base (COCCINELLE_API_BASE ou valeur par defaut)
    - Les headers d'authentification VoixIA (X-VoixIA-Key + X-VoixIA-Tenant)
    - Un timeout de 10 secondes
    """
    base_url = os.environ.get("COCCINELLE_API_BASE", _BASE_URL)
    # Tenant de l'appel en cours, pas celui du .env : sans cela, le prospect
    # est cree chez le tenant fige du serveur, pas chez celui qu'on appelle.
    api_key = get_api_key()
    tenant_id = get_tenant_id()

    return httpx.AsyncClient(
        base_url=base_url,
        headers={
            "X-VoixIA-Key": api_key,
            "X-VoixIA-Tenant": tenant_id,
        },
        timeout=_TIMEOUT_SECONDES,
    )


async def create_prospect(
    name: str,
    phone: str,
    email: str,
    source: str = "appel_vocal",
) -> str:
    """
    Cree un nouveau prospect dans le CRM via POST /api/v1/voixia/prospects.

    L'API gere la deduplication automatiquement : si un prospect avec le
    meme telephone ou e-mail existe deja, il sera mis a jour au lieu d'etre
    duplique.

    Instrumente avec New Relic pour le suivi des performances.

    Args:
        name: Nom complet du prospect.
        phone: Numero de telephone du prospect.
        email: Adresse e-mail du prospect.
        source: Source d'acquisition du prospect (par defaut « appel_vocal »).

    Returns:
        Message de confirmation de creation en francais ou message d'erreur.
    """
    # Instrumentation New Relic (import lazy)
    try:
        import newrelic.agent
        newrelic.agent.add_custom_parameter("tool", "create_prospect")
        newrelic.agent.add_custom_parameter("prospect_source", source)
    except Exception:
        pass

    logger.info(
        "Creation d'un prospect : %s (telephone : %s, e-mail : %s, source : %s)",
        name,
        phone,
        email,
        source,
    )
    try:
        async with _get_client() as client:
            reponse = await client.post(
                "/api/v1/voixia/prospects",
                json={
                    "name": name,
                    "phone": phone,
                    "email": email,
                    "source": source,
                },
            )
            reponse.raise_for_status()
            donnees = reponse.json()
            logger.info("Prospect cree avec succes : %s", donnees)

            # Extraire l'ID du prospect depuis la reponse
            prospect = donnees.get("prospect", {})
            ref = prospect.get("id", donnees.get("id", "N/A"))
            fusionne = donnees.get("merged", False)

            if fusionne:
                return (
                    f"Prospect \u00ab {name} \u00bb deja existant — "
                    f"mis a jour avec succes (reference : {ref})."
                )
            return (
                f"Prospect \u00ab {name} \u00bb cree avec succes dans le CRM "
                f"(reference : {ref})."
            )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Erreur HTTP lors de la creation du prospect : %s", exc.response.text
        )
        return (
            f"Erreur lors de la creation du prospect : "
            f"{exc.response.status_code} — {exc.response.text}"
        )
    except httpx.TimeoutException:
        logger.error("Timeout lors de la creation du prospect %s", name)
        return "Erreur : le serveur n'a pas repondu a temps pour la creation du prospect."
    except Exception as exc:
        logger.exception("Erreur inattendue lors de la creation du prospect")
        return f"Erreur inattendue lors de la creation du prospect : {exc}"
