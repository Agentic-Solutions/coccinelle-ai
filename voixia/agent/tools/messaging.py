"""
Outils d'envoi de messages (SMS et e-mail) via l'API VoixIA Coccinelle.

Ce module fournit deux fonctions :
- ``send_sms`` : envoie un SMS via POST /api/v1/voixia/sms
- ``send_email`` : envoie un e-mail (POST /api/v1/email/send)

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


async def send_sms(to: str, message: str) -> str:
    """
    Envoie un SMS au numero indique via POST /api/v1/voixia/sms.

    Instrumente avec New Relic pour le suivi des performances.

    Args:
        to: Numero de telephone du destinataire (format international, ex. +33612345678).
        message: Contenu du message SMS a envoyer.

    Returns:
        Message de confirmation d'envoi en francais ou message d'erreur.
    """
    # Instrumentation New Relic (import lazy)
    try:
        import newrelic.agent
        newrelic.agent.add_custom_parameter("tool", "send_sms")
        newrelic.agent.add_custom_parameter("sms_to", to)
    except Exception:
        pass

    logger.info("Envoi d'un SMS au %s", to)
    try:
        async with _get_client() as client:
            reponse = await client.post(
                "/api/v1/voixia/sms",
                json={"to": to, "message": message},
            )
            reponse.raise_for_status()
            donnees = reponse.json()
            logger.info("SMS envoye avec succes au %s : %s", to, donnees)
            return f"SMS envoye avec succes au {to}."
    except httpx.HTTPStatusError as exc:
        logger.error("Erreur HTTP lors de l'envoi du SMS : %s", exc.response.text)
        return (
            f"Erreur lors de l'envoi du SMS : "
            f"{exc.response.status_code} — {exc.response.text}"
        )
    except httpx.TimeoutException:
        logger.error("Timeout lors de l'envoi du SMS au %s", to)
        return "Erreur : le serveur n'a pas repondu a temps pour l'envoi du SMS."
    except Exception as exc:
        logger.exception("Erreur inattendue lors de l'envoi du SMS")
        return f"Erreur inattendue lors de l'envoi du SMS : {exc}"


async def send_email(to: str, subject: str, body: str) -> str:
    """
    Envoie un e-mail au destinataire indique via POST /api/v1/email/send.

    Note : l'endpoint e-mail n'a pas encore de route VoixIA dediee,
    cet appel utilise donc l'ancien endpoint avec les headers VoixIA.
    Si l'API retourne 401/404, un endpoint VoixIA e-mail devra etre ajoute.

    Instrumente avec New Relic pour le suivi des performances.

    Args:
        to: Adresse e-mail du destinataire.
        subject: Objet de l'e-mail.
        body: Corps du message e-mail.

    Returns:
        Message de confirmation d'envoi en francais ou message d'erreur.
    """
    # Instrumentation New Relic (import lazy)
    try:
        import newrelic.agent
        newrelic.agent.add_custom_parameter("tool", "send_email")
        newrelic.agent.add_custom_parameter("email_to", to)
    except Exception:
        pass

    logger.info("Envoi d'un e-mail a %s (objet : \u00ab %s \u00bb)", to, subject)
    try:
        async with _get_client() as client:
            reponse = await client.post(
                "/api/v1/email/send",
                json={"to": to, "subject": subject, "body": body},
            )
            reponse.raise_for_status()
            donnees = reponse.json()
            logger.info("E-mail envoye avec succes a %s : %s", to, donnees)
            return f"E-mail envoye avec succes a {to} (objet : \u00ab {subject} \u00bb)."
    except httpx.HTTPStatusError as exc:
        logger.error("Erreur HTTP lors de l'envoi de l'e-mail : %s", exc.response.text)
        return (
            f"Erreur lors de l'envoi de l'e-mail : "
            f"{exc.response.status_code} — {exc.response.text}"
        )
    except httpx.TimeoutException:
        logger.error("Timeout lors de l'envoi de l'e-mail a %s", to)
        return "Erreur : le serveur n'a pas repondu a temps pour l'envoi de l'e-mail."
    except Exception as exc:
        logger.exception("Erreur inattendue lors de l'envoi de l'e-mail")
        return f"Erreur inattendue lors de l'envoi de l'e-mail : {exc}"
