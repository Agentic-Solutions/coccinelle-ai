"""
VoixIA - Tools Rendez-vous
Prise de RDV et verification de disponibilites via l'API Coccinelle.
"""

from __future__ import annotations

import logging
from typing import Annotated

from livekit.agents import llm
import httpx

logger = logging.getLogger("voixia.tools.appointments")


class AppointmentTools(llm.FunctionContext):
    """Tools pour la gestion des rendez-vous Coccinelle."""

    def __init__(self, api_base: str, api_token: str) -> None:
        super().__init__()
        self._api_base = api_base.rstrip("/")
        self._api_token = api_token
        self._client = httpx.AsyncClient(
            base_url=self._api_base,
            headers={
                "Authorization": f"Bearer {self._api_token}",
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )

    # ------------------------------------------------------------------
    # book_appointment
    # ------------------------------------------------------------------
    @llm.ai_callable(
        description=(
            "Prendre un rendez-vous pour le client. "
            "Utilise cet outil quand le client souhaite fixer un rendez-vous "
            "avec une date, une heure et un motif."
        )
    )
    async def book_appointment(
        self,
        customer_name: Annotated[
            str,
            llm.TypeInfo(description="Nom complet du client (prenom et nom)"),
        ],
        customer_phone: Annotated[
            str,
            llm.TypeInfo(
                description="Numero de telephone du client au format international (+33...)"
            ),
        ],
        date_time: Annotated[
            str,
            llm.TypeInfo(
                description=(
                    "Date et heure du rendez-vous au format ISO 8601 "
                    "(ex: 2026-03-20T14:30:00)"
                )
            ),
        ],
        service: Annotated[
            str,
            llm.TypeInfo(
                description="Type de service ou motif du rendez-vous"
            ),
        ] = "",
        notes: Annotated[
            str,
            llm.TypeInfo(
                description="Notes ou informations complementaires sur le rendez-vous"
            ),
        ] = "",
    ) -> str:
        """Cree un rendez-vous dans le CRM Coccinelle et retourne la confirmation."""
        try:
            combined_notes = " ".join(
                part for part in [service, notes] if part
            ).strip()

            payload: dict = {
                "scheduled_at": date_time,
                "notes": combined_notes or None,
                "customer": {
                    "name": customer_name,
                    "phone": customer_phone,
                },
            }

            response = await self._client.post(
                "/api/v1/appointments",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            appointment = data.get("data", {}).get(
                "appointment", data.get("appointment", {})
            )
            apt_id = appointment.get("id", "")

            # Formater la date en francais pour la lecture vocale
            date_display = _format_date_fr(date_time)

            parts = [
                f"Le rendez-vous est confirme pour {customer_name}",
                f"le {date_display}",
            ]
            if service:
                parts.append(f"pour {service}")
            if apt_id:
                parts.append(f"Reference : {apt_id}.")

            return " ".join(parts)

        except httpx.HTTPStatusError as exc:
            logger.error("book_appointment HTTP error: %s", exc.response.text)
            return (
                "Desole, je n'ai pas pu enregistrer le rendez-vous. "
                "Le systeme a rencontre une erreur. "
                "Pouvez-vous reessayer ou me donner un autre creneau ?"
            )
        except Exception as exc:
            logger.error("book_appointment error: %s", exc)
            return (
                "Desole, une erreur technique m'empeche de prendre le rendez-vous "
                "pour le moment. Un conseiller pourra vous rappeler."
            )

    # ------------------------------------------------------------------
    # check_availability
    # ------------------------------------------------------------------
    @llm.ai_callable(
        description=(
            "Verifier les creneaux disponibles pour un rendez-vous. "
            "Utilise cet outil quand le client demande quelles sont "
            "les disponibilites ou les horaires libres."
        )
    )
    async def check_availability(
        self,
        date: Annotated[
            str,
            llm.TypeInfo(
                description="Date pour laquelle verifier les disponibilites (format AAAA-MM-JJ)"
            ),
        ],
        service: Annotated[
            str,
            llm.TypeInfo(
                description="Type de service souhaite (optionnel)"
            ),
        ] = "",
    ) -> str:
        """Interroge l'API de disponibilites et retourne les creneaux libres."""
        try:
            # Interroger les creneaux de disponibilite
            response = await self._client.get(
                "/api/v1/availability",
            )
            response.raise_for_status()
            data = response.json()

            slots = data.get("data", {}).get("slots", data.get("slots", []))

            if not slots:
                date_display = _format_date_fr(date)
                return (
                    f"Je n'ai pas trouve de creneaux configures pour le {date_display}. "
                    "Souhaitez-vous verifier une autre date ?"
                )

            # Determiner le jour de la semaine pour la date demandee
            target_dow = _date_to_dow(date)

            # Filtrer les slots pour le jour demande
            available_slots = []
            for slot in slots:
                slot_dow = slot.get("day_of_week")
                if slot_dow is not None and int(slot_dow) == target_dow and slot.get("is_available", 1):
                    start = slot.get("start_time", "")
                    end = slot.get("end_time", "")
                    if start and end:
                        available_slots.append(f"{start} a {end}")

            if not available_slots:
                date_display = _format_date_fr(date)
                return (
                    f"Il n'y a pas de creneaux disponibles pour le {date_display}. "
                    "Voulez-vous essayer un autre jour ?"
                )

            date_display = _format_date_fr(date)
            slots_text = ", ".join(available_slots[:6])
            return (
                f"Voici les creneaux disponibles pour le {date_display} : {slots_text}. "
                "Lequel vous conviendrait ?"
            )

        except httpx.HTTPStatusError as exc:
            logger.error("check_availability HTTP error: %s", exc.response.text)
            return (
                "Je n'ai pas pu verifier les disponibilites pour le moment. "
                "Souhaitez-vous que je prenne note de votre preference ?"
            )
        except Exception as exc:
            logger.error("check_availability error: %s", exc)
            return (
                "Une erreur technique m'empeche de consulter les disponibilites. "
                "Puis-je vous aider autrement ?"
            )


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

_JOURS_FR = [
    "lundi", "mardi", "mercredi", "jeudi",
    "vendredi", "samedi", "dimanche",
]

_MOIS_FR = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
]


def _format_date_fr(iso_date: str) -> str:
    """Convertit une date ISO en format lisible francais.

    Exemples:
        '2026-03-20T14:30:00' -> 'jeudi 20 mars 2026 a 14h30'
        '2026-03-20'          -> 'jeudi 20 mars 2026'
    """
    try:
        from datetime import datetime

        if "T" in iso_date:
            dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
            jour = _JOURS_FR[dt.weekday()]
            mois = _MOIS_FR[dt.month - 1]
            return f"{jour} {dt.day} {mois} {dt.year} a {dt.hour}h{dt.minute:02d}"
        else:
            dt = datetime.fromisoformat(iso_date)
            jour = _JOURS_FR[dt.weekday()]
            mois = _MOIS_FR[dt.month - 1]
            return f"{jour} {dt.day} {mois} {dt.year}"
    except (ValueError, IndexError):
        return iso_date


def _date_to_dow(iso_date: str) -> int:
    """Convertit une date ISO en jour de la semaine (1=lundi ... 7=dimanche).

    L'API Coccinelle utilise 1-7 (lundi-dimanche) pour les availability_slots.
    """
    try:
        from datetime import datetime

        date_part = iso_date.split("T")[0]
        dt = datetime.fromisoformat(date_part)
        return dt.isoweekday()  # 1=Monday, 7=Sunday
    except (ValueError, IndexError):
        return 0
