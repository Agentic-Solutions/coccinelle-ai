"""
VoixIA - Tool CRM Prospects
Creation de prospects dans le CRM Coccinelle via l'API.
"""

from __future__ import annotations

import logging
from typing import Annotated

from livekit.agents import llm
import httpx

logger = logging.getLogger("voixia.tools.crm")


class CRMTools(llm.FunctionContext):
    """Tool pour la gestion des prospects dans le CRM Coccinelle."""

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

    @llm.ai_callable(
        description=(
            "Creer un nouveau prospect dans le CRM. "
            "Utilise cet outil quand un nouveau client appelle et que "
            "tu as collecte ses informations de contact (nom, telephone ou email). "
            "Cela permet de sauvegarder le contact pour un suivi ulterieur."
        )
    )
    async def create_prospect(
        self,
        name: Annotated[
            str,
            llm.TypeInfo(description="Prenom du prospect (obligatoire)"),
        ],
        phone: Annotated[
            str,
            llm.TypeInfo(
                description=(
                    "Numero de telephone du prospect au format international "
                    "(ex: +33612345678)"
                )
            ),
        ] = "",
        email: Annotated[
            str,
            llm.TypeInfo(description="Adresse email du prospect"),
        ] = "",
        source: Annotated[
            str,
            llm.TypeInfo(
                description="Origine du contact (defaut: voixia_call)"
            ),
        ] = "voixia_call",
        notes: Annotated[
            str,
            llm.TypeInfo(
                description=(
                    "Notes sur le prospect : motif de l'appel, "
                    "besoins exprimes, informations complementaires"
                )
            ),
        ] = "",
    ) -> str:
        """Cree un prospect dans le CRM Coccinelle et retourne la confirmation."""
        try:
            # Validation : il faut au moins un nom et un moyen de contact
            if not name:
                return (
                    "J'ai besoin au minimum du prenom du client pour "
                    "enregistrer ses coordonnees. Quel est son prenom ?"
                )

            if not phone and not email:
                return (
                    "Pour enregistrer le contact, j'ai besoin d'au moins "
                    "un numero de telephone ou une adresse email. "
                    "Pouvez-vous me communiquer l'un ou l'autre ?"
                )

            # Decomposer le nom en prenom / nom si possible
            name_parts = name.strip().split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            # L'API exige first_name + email ; generer un placeholder si absent
            contact_email = (
                email
                if email
                else f"{first_name.lower().replace(' ', '')}@voixia-placeholder.local"
            )

            payload: dict = {
                "first_name": first_name,
                "last_name": last_name,
                "email": contact_email,
                "phone": phone or None,
                "source": source,
                "status": "new",
            }

            response = await self._client.post(
                "/api/v1/prospects",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            prospect_data = data.get("data", {}).get(
                "prospect", data.get("prospect", {})
            )
            prospect_id = prospect_data.get("id", "")
            was_merged = data.get("data", {}).get(
                "merged", data.get("merged", False)
            )

            if was_merged:
                return (
                    f"Le contact {first_name} existait deja dans notre systeme "
                    "et ses informations ont ete mises a jour. "
                    "Un conseiller pourra assurer le suivi."
                )

            result = (
                f"Les coordonnees de {first_name} ont ete enregistrees avec succes "
                "dans notre CRM."
            )
            if prospect_id:
                result += f" Reference : {prospect_id}."
            result += " Un conseiller pourra le recontacter prochainement."

            return result

        except httpx.HTTPStatusError as exc:
            logger.error("create_prospect HTTP error: %s", exc.response.text)
            return (
                "Je n'ai pas pu enregistrer les coordonnees du client. "
                "Je prends note et un conseiller s'en chargera manuellement."
            )
        except Exception as exc:
            logger.error("create_prospect error: %s", exc)
            return (
                "Une erreur technique m'empeche d'enregistrer ce contact. "
                "Ne vous inquietez pas, un conseiller pourra le faire."
            )
