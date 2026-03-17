"""
VoixIA - Tools Coccinelle
Ensemble des tools (function calling) connectant l'agent vocal VoixIA
aux endpoints API du CRM Coccinelle.

Usage dans le pipeline vocal:
    from voixia.agent.tools import CoccinelleTools

    tools = CoccinelleTools(
        api_base="https://coccinelle-api.youssef-amrouche.workers.dev",
        api_token="<JWT token du tenant>",
    )

    agent = VoicePipelineAgent(
        ...
        fnc_ctx=tools,
    )
"""

from __future__ import annotations

import logging
from typing import Annotated

from livekit.agents import llm
import httpx

from .appointments import AppointmentTools
from .products import ProductTools
from .knowledge import KnowledgeTools
from .messaging import MessagingTools
from .crm import CRMTools

logger = logging.getLogger("voixia.tools")

__all__ = [
    "CoccinelleTools",
    "AppointmentTools",
    "ProductTools",
    "KnowledgeTools",
    "MessagingTools",
    "CRMTools",
]

# URL de production par defaut
DEFAULT_API_BASE = "https://coccinelle-api.youssef-amrouche.workers.dev"


class CoccinelleTools(llm.FunctionContext):
    """Classe unifiee regroupant tous les tools VoixIA pour le CRM Coccinelle.

    Herite de ``llm.FunctionContext`` et expose directement toutes les
    fonctions appellables par le LLM (rendez-vous, produits, base de
    connaissances, messagerie, CRM).

    L'agent vocal instancie cette classe une seule fois au demarrage
    de la session et la passe au pipeline via ``fnc_ctx``.

    Parametres
    ----------
    api_base : str
        URL de base de l'API Coccinelle (sans slash final).
    api_token : str
        Token JWT d'authentification du tenant.
    """

    def __init__(
        self,
        api_base: str = DEFAULT_API_BASE,
        api_token: str = "",
    ) -> None:
        super().__init__()
        self._api_base = api_base.rstrip("/")
        self._api_token = api_token

        # Client HTTP partage avec retry et timeout
        self._client = httpx.AsyncClient(
            base_url=self._api_base,
            headers={
                "Authorization": f"Bearer {self._api_token}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(10.0, connect=5.0),
        )

        logger.info(
            "CoccinelleTools initialise (base=%s, token=%s...)",
            self._api_base,
            self._api_token[:8] + "..." if len(self._api_token) > 8 else "***",
        )

    # ==================================================================
    # Helper HTTP avec retry
    # ==================================================================

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict | None = None,
        params: dict | None = None,
        max_retries: int = 2,
        timeout: float | None = None,
    ) -> httpx.Response:
        """Execute une requete HTTP avec retry automatique.

        Retente sur les erreurs 5xx et les timeouts.
        Leve ``httpx.HTTPStatusError`` pour les erreurs 4xx.
        """
        last_exc: Exception | None = None

        for attempt in range(max_retries + 1):
            try:
                response = await self._client.request(
                    method,
                    path,
                    json=json,
                    params=params,
                    timeout=timeout,
                )
                # Ne pas retenter les erreurs client (4xx)
                if 400 <= response.status_code < 500:
                    response.raise_for_status()
                # Retenter les erreurs serveur (5xx)
                if response.status_code >= 500 and attempt < max_retries:
                    logger.warning(
                        "Requete %s %s : %d, tentative %d/%d",
                        method,
                        path,
                        response.status_code,
                        attempt + 1,
                        max_retries + 1,
                    )
                    continue
                response.raise_for_status()
                return response
            except httpx.TimeoutException as exc:
                last_exc = exc
                if attempt < max_retries:
                    logger.warning(
                        "Timeout %s %s, tentative %d/%d",
                        method,
                        path,
                        attempt + 1,
                        max_retries + 1,
                    )
                    continue
            except httpx.HTTPStatusError:
                raise
            except Exception as exc:
                last_exc = exc
                if attempt < max_retries:
                    continue

        raise last_exc or httpx.TimeoutException("Toutes les tentatives ont echoue")

    # ==================================================================
    # RENDEZ-VOUS
    # ==================================================================

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
            llm.TypeInfo(description="Type de service ou motif du rendez-vous"),
        ] = "",
        notes: Annotated[
            str,
            llm.TypeInfo(description="Notes complementaires sur le rendez-vous"),
        ] = "",
    ) -> str:
        """Cree un rendez-vous dans le CRM Coccinelle."""
        try:
            combined_notes = " ".join(
                part for part in [service, notes] if part
            ).strip()

            response = await self._request(
                "POST",
                "/api/v1/appointments",
                json={
                    "scheduled_at": date_time,
                    "notes": combined_notes or None,
                    "customer": {
                        "name": customer_name,
                        "phone": customer_phone,
                    },
                },
            )
            data = response.json()

            appointment = data.get("data", {}).get(
                "appointment", data.get("appointment", {})
            )
            apt_id = appointment.get("id", "")
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
                "Pouvez-vous reessayer ou me donner un autre creneau ?"
            )
        except Exception as exc:
            logger.error("book_appointment error: %s", exc)
            return (
                "Desole, une erreur technique m'empeche de prendre le rendez-vous. "
                "Un conseiller pourra vous rappeler."
            )

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
                description="Date pour verifier les disponibilites (format AAAA-MM-JJ)"
            ),
        ],
        service: Annotated[
            str,
            llm.TypeInfo(description="Type de service souhaite (optionnel)"),
        ] = "",
    ) -> str:
        """Interroge les disponibilites et retourne les creneaux libres."""
        try:
            response = await self._request("GET", "/api/v1/availability")
            data = response.json()

            slots = data.get("data", {}).get("slots", data.get("slots", []))

            if not slots:
                return (
                    f"Je n'ai pas trouve de creneaux configures pour le {_format_date_fr(date)}. "
                    "Souhaitez-vous verifier une autre date ?"
                )

            target_dow = _date_to_dow(date)

            available_slots = []
            for slot in slots:
                slot_dow = slot.get("day_of_week")
                if (
                    slot_dow is not None
                    and int(slot_dow) == target_dow
                    and slot.get("is_available", 1)
                ):
                    start = slot.get("start_time", "")
                    end = slot.get("end_time", "")
                    if start and end:
                        available_slots.append(f"{start} a {end}")

            if not available_slots:
                return (
                    f"Il n'y a pas de creneaux disponibles pour le {_format_date_fr(date)}. "
                    "Voulez-vous essayer un autre jour ?"
                )

            slots_text = ", ".join(available_slots[:6])
            return (
                f"Voici les creneaux disponibles pour le {_format_date_fr(date)} : "
                f"{slots_text}. Lequel vous conviendrait ?"
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

    # ==================================================================
    # CATALOGUE PRODUITS
    # ==================================================================

    @llm.ai_callable(
        description=(
            "Rechercher dans le catalogue de produits ou services. "
            "Utilise cet outil quand le client pose une question sur "
            "les produits, services, tarifs ou disponibilites du catalogue."
        )
    )
    async def search_products(
        self,
        query: Annotated[
            str,
            llm.TypeInfo(
                description="Termes de recherche : nom du produit, service ou mots-cles"
            ),
        ],
        category: Annotated[
            str,
            llm.TypeInfo(
                description="Categorie de produit pour affiner la recherche"
            ),
        ] = "",
    ) -> str:
        """Interroge le catalogue produits Coccinelle."""
        try:
            params: dict = {"status": "active", "limit": "10"}
            if category:
                params["category"] = category

            response = await self._request(
                "GET", "/api/v1/products", params=params
            )
            data = response.json()

            products = data.get("data", {}).get(
                "products", data.get("products", [])
            )

            if not products:
                return (
                    "Je n'ai pas trouve de produits correspondant "
                    f'a votre recherche pour "{query}". '
                    "Pourriez-vous preciser votre demande ?"
                )

            # Filtrer cote client
            if query:
                query_lower = query.lower()
                filtered = [
                    p
                    for p in products
                    if query_lower in (p.get("title", "") or "").lower()
                    or query_lower in (p.get("description", "") or "").lower()
                    or query_lower in (p.get("short_description", "") or "").lower()
                    or query_lower in (p.get("category", "") or "").lower()
                    or query_lower in (p.get("keywords", "") or "").lower()
                ]
                if filtered:
                    products = filtered

            results: list[str] = []
            for p in products[:5]:
                title = p.get("title", "Sans titre")
                price = p.get("price")
                currency = p.get("price_currency", "EUR")
                desc = p.get("short_description") or p.get("description") or ""
                if len(desc) > 120:
                    desc = desc[:117] + "..."

                line = f"- {title}"
                if price is not None:
                    line += f" : {_format_price(price, currency)}"
                if desc:
                    line += f". {desc}"
                results.append(line)

            total = data.get("data", {}).get("total", data.get("total", len(products)))
            header = f"J'ai trouve {total} resultat{'s' if total > 1 else ''}."
            if total > 5:
                header += " Voici les 5 premiers :"

            return header + "\n" + "\n".join(results)

        except httpx.HTTPStatusError as exc:
            logger.error("search_products HTTP error: %s", exc.response.text)
            return (
                "Je n'ai pas pu consulter le catalogue pour le moment. "
                "Souhaitez-vous que je prenne note de votre demande ?"
            )
        except Exception as exc:
            logger.error("search_products error: %s", exc)
            return (
                "Une erreur technique m'empeche d'acceder au catalogue. "
                "Un conseiller pourra vous renseigner."
            )

    # ==================================================================
    # BASE DE CONNAISSANCES
    # ==================================================================

    @llm.ai_callable(
        description=(
            "Rechercher dans la base de connaissances de l'entreprise. "
            "Utilise cet outil pour trouver des informations sur l'entreprise, "
            "ses services, ses procedures, ses horaires, "
            "ou toute question a laquelle tu ne connais pas la reponse."
        )
    )
    async def search_knowledge(
        self,
        query: Annotated[
            str,
            llm.TypeInfo(
                description="Question ou termes de recherche dans la base de connaissances"
            ),
        ],
    ) -> str:
        """Interroge la base de connaissances via recherche semantique."""
        try:
            response = await self._request(
                "POST",
                "/api/v1/knowledge/search",
                json={"query": query, "topK": 5, "provider": "workersai"},
                timeout=15.0,
            )
            data = response.json()

            results = data.get("data", {}).get("results", data.get("results", []))

            if not results:
                return (
                    f'Je n\'ai pas trouve d\'information pour "{query}" '
                    "dans notre base de connaissances. "
                    "Souhaitez-vous que je vous mette en relation avec un conseiller ?"
                )

            knowledge_parts: list[str] = []
            sources: set[str] = set()

            for result in results[:3]:
                content = result.get("content", "").strip()
                title = result.get("title", "")
                score = result.get("score", 0)

                if content and score > 0.3:
                    if len(content) > 500:
                        content = content[:497] + "..."
                    knowledge_parts.append(content)
                    if title:
                        sources.add(title)

            if not knowledge_parts:
                return (
                    "Les resultats trouves ne sont pas assez pertinents "
                    f'pour "{query}". Puis-je vous aider autrement ?'
                )

            combined = "\n\n".join(knowledge_parts)
            preamble = (
                "Voici les informations trouvees dans notre base de connaissances. "
                "Utilise-les pour repondre au client naturellement :\n\n"
            )
            source_note = ""
            if sources:
                source_note = f"\n\n(Sources : {', '.join(sources)})"

            return preamble + combined + source_note

        except httpx.HTTPStatusError as exc:
            logger.error("search_knowledge HTTP error: %s", exc.response.text)
            return (
                "Je n'ai pas pu consulter notre base de connaissances. "
                "Puis-je repondre autrement a votre question ?"
            )
        except Exception as exc:
            logger.error("search_knowledge error: %s", exc)
            return (
                "Une erreur technique m'empeche de rechercher cette information. "
                "Souhaitez-vous etre transfere a un conseiller ?"
            )

    # ==================================================================
    # MESSAGERIE
    # ==================================================================

    @llm.ai_callable(
        description=(
            "Envoyer un SMS au client. "
            "Utilise cet outil pour envoyer un SMS de confirmation, "
            "un recapitulatif ou toute information utile par SMS."
        )
    )
    async def send_sms(
        self,
        to: Annotated[
            str,
            llm.TypeInfo(
                description="Numero de telephone du destinataire (+33612345678)"
            ),
        ],
        message: Annotated[
            str,
            llm.TypeInfo(description="Contenu du SMS (160 caracteres recommandes)"),
        ],
    ) -> str:
        """Envoie un SMS via l'API Twilio de Coccinelle."""
        try:
            if not to or len(to) < 10:
                return (
                    "Le numero de telephone fourni ne semble pas valide. "
                    "Pouvez-vous me le redonner ?"
                )

            response = await self._request(
                "POST",
                "/api/v1/twilio/sms/send",
                json={"to": to, "message": message},
            )
            data = response.json()

            status = data.get("data", {}).get("status", data.get("status", ""))
            if status == "sent" or data.get("success", False):
                return (
                    f"Le SMS a ete envoye avec succes au {_mask_phone(to)}. "
                    "Le client le recevra dans quelques instants."
                )
            else:
                return (
                    "Le SMS n'a pas pu etre envoye pour le moment. "
                    "Souhaitez-vous reessayer ?"
                )

        except httpx.HTTPStatusError as exc:
            logger.error("send_sms HTTP error: %s", exc.response.text)
            return "L'envoi du SMS a echoue. Souhaitez-vous que je reessaye ?"
        except Exception as exc:
            logger.error("send_sms error: %s", exc)
            return (
                "Je n'ai pas pu envoyer le SMS. "
                "Un conseiller pourra s'en charger."
            )

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
            llm.TypeInfo(description="Contenu de l'email en texte simple"),
        ],
    ) -> str:
        """Envoie un email via le service email de Coccinelle."""
        try:
            if not to or "@" not in to:
                return (
                    "L'adresse email fournie ne semble pas valide. "
                    "Pouvez-vous me la redonner ?"
                )

            response = await self._request(
                "POST",
                "/api/v1/email/auto-reply",
                json={"to": to, "subject": subject, "body": body},
            )

            return (
                f"L'email a ete envoye avec succes a {_mask_email(to)}. "
                "Le client devrait le recevoir sous peu."
            )

        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            logger.error("send_email HTTP error %d: %s", status_code, exc.response.text)
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
                "Je n'ai pas pu envoyer l'email. "
                "Puis-je envoyer un SMS a la place ?"
            )

    # ==================================================================
    # CRM — PROSPECTS
    # ==================================================================

    @llm.ai_callable(
        description=(
            "Creer un nouveau prospect dans le CRM. "
            "Utilise cet outil quand un nouveau client appelle et que "
            "tu as collecte ses informations de contact. "
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
                description="Numero de telephone du prospect (+33612345678)"
            ),
        ] = "",
        email: Annotated[
            str,
            llm.TypeInfo(description="Adresse email du prospect"),
        ] = "",
        source: Annotated[
            str,
            llm.TypeInfo(description="Origine du contact (defaut: voixia_call)"),
        ] = "voixia_call",
        notes: Annotated[
            str,
            llm.TypeInfo(
                description="Notes : motif de l'appel, besoins exprimes"
            ),
        ] = "",
    ) -> str:
        """Cree un prospect dans le CRM Coccinelle."""
        try:
            if not name:
                return (
                    "J'ai besoin au minimum du prenom pour enregistrer le contact. "
                    "Quel est son prenom ?"
                )
            if not phone and not email:
                return (
                    "Pour enregistrer le contact, j'ai besoin d'un numero "
                    "de telephone ou d'une adresse email."
                )

            name_parts = name.strip().split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            contact_email = (
                email
                if email
                else f"{first_name.lower().replace(' ', '')}@voixia-placeholder.local"
            )

            response = await self._request(
                "POST",
                "/api/v1/prospects",
                json={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": contact_email,
                    "phone": phone or None,
                    "source": source,
                    "status": "new",
                },
            )
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
                    f"Le contact {first_name} existait deja et a ete mis a jour. "
                    "Un conseiller assurera le suivi."
                )

            result = (
                f"Les coordonnees de {first_name} ont ete enregistrees dans le CRM."
            )
            if prospect_id:
                result += f" Reference : {prospect_id}."
            result += " Un conseiller le recontactera prochainement."

            return result

        except httpx.HTTPStatusError as exc:
            logger.error("create_prospect HTTP error: %s", exc.response.text)
            return (
                "Je n'ai pas pu enregistrer les coordonnees. "
                "Un conseiller s'en chargera manuellement."
            )
        except Exception as exc:
            logger.error("create_prospect error: %s", exc)
            return (
                "Une erreur technique m'empeche d'enregistrer ce contact. "
                "Ne vous inquietez pas, un conseiller pourra le faire."
            )

    # ==================================================================
    # Cleanup
    # ==================================================================

    async def aclose(self) -> None:
        """Ferme proprement le client HTTP."""
        await self._client.aclose()


# ======================================================================
# Fonctions utilitaires partagees
# ======================================================================

_JOURS_FR = [
    "lundi", "mardi", "mercredi", "jeudi",
    "vendredi", "samedi", "dimanche",
]
_MOIS_FR = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
]


def _format_date_fr(iso_date: str) -> str:
    """Convertit une date ISO en format lisible francais."""
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
    """Convertit une date ISO en jour de semaine (1=lundi, 7=dimanche)."""
    try:
        from datetime import datetime

        date_part = iso_date.split("T")[0]
        dt = datetime.fromisoformat(date_part)
        return dt.isoweekday()
    except (ValueError, IndexError):
        return 0


def _format_price(price: float | int | str, currency: str = "EUR") -> str:
    """Formate un prix pour la lecture vocale en francais."""
    try:
        amount = float(price)
        if amount == int(amount):
            formatted = f"{int(amount):,}".replace(",", " ")
        else:
            formatted = f"{amount:,.2f}".replace(",", " ").replace(".", ",")
        symbol = {"EUR": "euros", "USD": "dollars", "GBP": "livres"}.get(
            currency, currency
        )
        return f"{formatted} {symbol}"
    except (ValueError, TypeError):
        return str(price)


def _mask_phone(phone: str) -> str:
    """Masque partiellement un numero pour la confidentialite vocale."""
    if len(phone) > 7:
        return phone[:4] + "..." + phone[-4:]
    return phone


def _mask_email(email: str) -> str:
    """Masque partiellement un email pour la confidentialite vocale."""
    try:
        local, domain = email.split("@", 1)
        if len(local) > 2:
            masked_local = local[0] + "..." + local[-1]
        else:
            masked_local = local
        return f"{masked_local}@{domain}"
    except ValueError:
        return email
