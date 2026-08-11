"""
Outils pour la gestion des rendez-vous via l'API VoixIA Coccinelle.

Ce module fournit deux fonctions :
- ``book_appointment`` : reserve un creneau pour un client
- ``check_availability`` : verifie les creneaux disponibles

Authentification par cle API (X-VoixIA-Key + X-VoixIA-Tenant).
"""

import logging
import os

import httpx

from .context import get_api_key, get_tenant_id

logger = logging.getLogger(__name__)

# Timeout par defaut pour les requetes HTTP (en secondes)
_TIMEOUT_SECONDES = 5

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
    # Tenant de l'appel en cours, pas celui du .env : sans cela, l'agent
    # annonce les creneaux d'une autre entreprise et y pose le rendez-vous.
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


async def book_appointment(
    customer_name: str,
    customer_phone: str,
    date_time: str,
    service: str,
) -> str:
    """
    Reserve un rendez-vous pour un client via POST /api/v1/voixia/appointments.

    Instrumente avec New Relic pour le suivi des performances.

    Args:
        customer_name: Nom complet du client.
        customer_phone: Numero de telephone du client.
        date_time: Date et heure souhaitees pour le rendez-vous (format ISO 8601).
        service: Type de service demande.

    Returns:
        Message de confirmation en francais ou message d'erreur.
    """
    # Instrumentation New Relic (import lazy pour eviter le bug multiprocessing)
    try:
        import newrelic.agent
        newrelic.agent.add_custom_parameter("tool", "book_appointment")
        newrelic.agent.add_custom_parameter("service", service)
    except Exception:
        pass

    logger.info(
        "Reservation de rendez-vous pour %s le %s (service : %s)",
        customer_name,
        date_time,
        service,
    )
    try:
        async with _get_client() as client:
            reponse = await client.post(
                "/api/v1/voixia/appointments",
                json={
                    "customer_name": customer_name,
                    "customer_phone": customer_phone,
                    "date_time": date_time,
                    "service": service,
                    # Le champ "type" est obligatoire (NOT NULL) dans la table appointments
                    "type": service or "rdv",
                },
            )
            reponse.raise_for_status()
            donnees = reponse.json()
            logger.info("Rendez-vous cree avec succes : %s", donnees)

            # Extraire l'ID du RDV depuis la reponse
            rdv = donnees.get("appointment", {})
            ref = rdv.get("id", donnees.get("id", "N/A"))
            return (
                f"Rendez-vous confirme pour {customer_name} le {date_time} "
                f"pour le service \u00ab {service} \u00bb. "
                f"Reference : {ref}."
            )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Erreur HTTP lors de la reservation du rendez-vous : %s",
            exc.response.text,
        )
        return (
            f"Erreur lors de la reservation du rendez-vous : "
            f"{exc.response.status_code} — {exc.response.text}"
        )
    except httpx.TimeoutException:
        logger.error("Timeout lors de la reservation du rendez-vous")
        return "Erreur : le serveur n'a pas repondu a temps pour la reservation."
    except Exception as exc:
        logger.exception("Erreur inattendue lors de la reservation du rendez-vous")
        return f"Erreur inattendue lors de la reservation du rendez-vous : {exc}"


async def check_availability(date: str, service: str) -> str:
    """
    Verifie les creneaux disponibles via GET /api/v1/voixia/appointments/availability.

    Instrumente avec New Relic pour le suivi des performances.

    Args:
        date: Date souhaitee (format AAAA-MM-JJ).
        service: Type de service demande.

    Returns:
        Liste des creneaux disponibles en francais ou message d'erreur.
    """
    # Instrumentation New Relic (import lazy)
    try:
        import newrelic.agent
        newrelic.agent.add_custom_parameter("tool", "check_availability")
        newrelic.agent.add_custom_parameter("date", date)
        newrelic.agent.add_custom_parameter("service", service)
    except Exception:
        pass

    logger.info(
        "Verification de la disponibilite le %s pour le service \u00ab %s \u00bb",
        date,
        service,
    )
    try:
        async with _get_client() as client:
            reponse = await client.get(
                "/api/v1/voixia/appointments/availability",
                params={"date": date, "service": service},
            )
            reponse.raise_for_status()
            donnees = reponse.json()
            logger.info("Creneaux recuperes : %s", donnees)

            # L'API VoixIA retourne { available_slots: [...], count: N }
            creneaux = donnees.get("available_slots", donnees.get("slots", []))
            if not creneaux:
                return (
                    f"Aucun creneau disponible le {date} "
                    f"pour le service \u00ab {service} \u00bb."
                )

            # Formater chaque creneau pour la synthese vocale
            lignes = []
            for c in creneaux:
                if isinstance(c, dict):
                    heure = c.get("time", "")
                    # agent_name peut etre None — eviter AttributeError sur .strip()
                    agent = (c.get("agent_name") or "").strip()
                    duree = c.get("duration_minutes", "")
                    ligne = f"  - {heure}"
                    if agent:
                        ligne += f" (avec {agent})"
                    if duree:
                        ligne += f" — {duree} min"
                    lignes.append(ligne)
                else:
                    lignes.append(f"  - {c}")

            return (
                f"Creneaux disponibles le {date} "
                f"pour le service \u00ab {service} \u00bb :\n"
                + "\n".join(lignes)
            )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Erreur HTTP lors de la verification de disponibilite : %s",
            exc.response.text,
        )
        return (
            f"Erreur lors de la verification de disponibilite : "
            f"{exc.response.status_code} — {exc.response.text}"
        )
    except httpx.TimeoutException:
        logger.error("Timeout lors de la verification de disponibilite")
        return "Erreur : le serveur n'a pas repondu a temps pour la verification."
    except Exception as exc:
        logger.exception("Erreur inattendue lors de la verification de disponibilite")
        return f"Erreur inattendue lors de la verification de disponibilite : {exc}"
