"""
VoixIA - Tools Messagerie
Envoi de SMS et d'emails de confirmation via l'API Coccinelle.
"""

from __future__ import annotations

import logging
from typing import Annotated

from livekit.agents import llm
import httpx

logger = logging.getLogger("voixia.tools.messaging")


class MessagingTools(llm.FunctionContext):
    """Tools pour l'envoi de SMS et emails via Coccinelle."""

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
    # send_sms
    # ------------------------------------------------------------------
    @llm.ai_callable(
        description=(
            "Envoyer un SMS au client. "
            "Utilise cet outil pour envoyer un SMS de confirmation, "
            "un recapitulatif ou toute information utile au client par SMS."
        )
    )
    async def send_sms(
        self,
        to: Annotated[
            str,
            llm.TypeInfo(
                description=(
                    "Numero de telephone du destinataire au format international "
                    "(ex: +33612345678)"
                )
            ),
        ],
        message: Annotated[
            str,
            llm.TypeInfo(
                description="Contenu du SMS a envoyer (160 caracteres recommandes)"
            ),
        ],
    ) -> str:
        """Envoie un SMS via l'API Twilio de Coccinelle."""
        try:
            # Validation basique du numero
            if not to or len(to) < 10:
                return (
                    "Le numero de telephone fourni ne semble pas valide. "
                    "Pouvez-vous me le redonner ?"
                )

            response = await self._client.post(
                "/api/v1/twilio/sms/send",
                json={
                    "to": to,
                    "message": message,
                },
            )
            response.raise_for_status()
            data = response.json()

            status = data.get("data", {}).get("status", data.get("status", ""))

            if status == "sent" or data.get("success", False):
                return (
                    f"Le SMS a ete envoye avec succes au {_mask_phone(to)}. "
                    "Le client devrait le recevoir dans quelques instants."
                )
            else:
                error_msg = data.get("data", {}).get(
                    "message", data.get("error", "")
                )
                logger.warning("SMS send returned non-success: %s", error_msg)
                return (
                    "Le SMS n'a pas pu etre envoye pour le moment. "
                    "Souhaitez-vous reessayer ou utiliser une autre methode ?"
                )

        except httpx.HTTPStatusError as exc:
            logger.error("send_sms HTTP error: %s", exc.response.text)
            return (
                "L'envoi du SMS a echoue en raison d'une erreur technique. "
                "Souhaitez-vous que je reessaye ?"
            )
        except Exception as exc:
            logger.error("send_sms error: %s", exc)
            return (
                "Je n'ai pas pu envoyer le SMS. "
                "Un conseiller pourra s'en charger pour vous."
            )

    # ------------------------------------------------------------------
    # send_email
    # ------------------------------------------------------------------
    @llm.ai_callable(
        description=(
            "Envoyer un email de confirmation ou d'information au client. "
            "Utilise cet outil quand le client souhaite recevoir "
            "une confirmation ou des informations par email."
        )
    )
    async def send_email(
        self,
        to: Annotated[
            str,
            llm.TypeInfo(description="Adresse email du destinataire"),
        ],
        subject: Annotated[
            str,
            llm.TypeInfo(description="Objet de l'email"),
        ],
        body: Annotated[
            str,
            llm.TypeInfo(
                description="Contenu principal de l'email en texte simple"
            ),
        ],
    ) -> str:
        """Envoie un email via le service email de Coccinelle."""
        try:
            # Validation basique de l'email
            if not to or "@" not in to:
                return (
                    "L'adresse email fournie ne semble pas valide. "
                    "Pouvez-vous me la redonner ?"
                )

            response = await self._client.post(
                "/api/v1/email/auto-reply",
                json={
                    "to": to,
                    "subject": subject,
                    "body": body,
                },
            )
            response.raise_for_status()

            return (
                f"L'email a ete envoye avec succes a {_mask_email(to)}. "
                "Le client devrait le recevoir sous peu."
            )

        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            logger.error(
                "send_email HTTP error %d: %s",
                status_code,
                exc.response.text,
            )

            if status_code == 501:
                return (
                    "Le service d'envoi d'emails n'est pas encore configure. "
                    "Souhaitez-vous que j'envoie un SMS a la place ?"
                )

            return (
                "L'envoi de l'email a echoue. "
                "Souhaitez-vous que j'envoie un SMS a la place ?"
            )
        except Exception as exc:
            logger.error("send_email error: %s", exc)
            return (
                "Je n'ai pas pu envoyer l'email pour le moment. "
                "Puis-je vous envoyer un SMS a la place ?"
            )


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _mask_phone(phone: str) -> str:
    """Masque partiellement un numero pour la confidentialite vocale.

    Exemple: +33612345678 -> +336...5678
    """
    if len(phone) > 7:
        return phone[:4] + "..." + phone[-4:]
    return phone


def _mask_email(email: str) -> str:
    """Masque partiellement un email pour la confidentialite vocale.

    Exemple: jean.dupont@email.com -> j...t@email.com
    """
    try:
        local, domain = email.split("@", 1)
        if len(local) > 2:
            masked_local = local[0] + "..." + local[-1]
        else:
            masked_local = local
        return f"{masked_local}@{domain}"
    except ValueError:
        return email
