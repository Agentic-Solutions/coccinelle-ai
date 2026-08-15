"""
Pipeline vocal VoixIA — Agent et instrumentation New Relic.

Ce module definit :
- VoixIAAgent : agent vocal avec prompt systeme et outils metier (@function_tool)
- VoixIAPipeline : instrumentation New Relic pour le suivi des latences
- log_call_to_api : log d appel vers POST /api/v1/voixia/log-call

Le prompt systeme est selectionne dynamiquement via resolve_tenant (tenant.py).
"""

import logging
import os
import time

import httpx
from livekit.agents import Agent, function_tool

from config import PROMPT_TYPE, get_llm_config
from prompts import get_prompt
from tools import appointments, messaging, crm, products, knowledge, transfer, tasks

logger = logging.getLogger("voixia.pipeline")

SEUIL_LATENCE_MS = 800


class VoixIAAgent(Agent):
    """
    Agent vocal VoixIA (livekit-agents >= 1.4.6).

    Accepte soit un system_prompt direct (depuis l'API Coccinelle),
    soit un prompt_type pour charger le prompt depuis prompts.py.
    """

    def __init__(
        self,
        prompt_type: str | None = None,
        system_prompt: str | None = None,
        tenant_info: dict | None = None,
    ) -> None:
        # Priorite 1 : system_prompt direct depuis l'API
        # Priorite 2 : prompt_type -> get_prompt()
        # Priorite 3 : PROMPT_TYPE par defaut (env)
        if system_prompt:
            resolved_prompt = system_prompt
            resolved_type = prompt_type or "api"
        else:
            resolved_type = prompt_type or PROMPT_TYPE
            resolved_prompt = get_prompt(resolved_type)

        self._tenant_info = tenant_info or {}
        super().__init__(instructions=resolved_prompt)
        logger.info(
            "VoixIAAgent initialise — prompt : %s (%d car.)",
            resolved_type, len(resolved_prompt),
        )

    @function_tool
    async def book_appointment(
        self,
        customer_name: str,
        customer_phone: str,
        date_time: str,
        service: str,
    ) -> str:
        """Reserver un rendez-vous pour un client.

        Args:
            customer_name: Nom complet du client.
            customer_phone: Numero de telephone du client.
            date_time: Date et heure souhaitees (format ISO 8601).
            service: Type de service demande.
        """
        logger.info("Tool : book_appointment — %s le %s", customer_name, date_time)
        return await appointments.book_appointment(
            customer_name, customer_phone, date_time, service
        )

    @function_tool
    async def check_availability(self, date: str, service: str) -> str:
        """Verifier la disponibilite des creneaux pour une date et un service.

        Args:
            date: Date souhaitee (format AAAA-MM-JJ).
            service: Type de service demande.
        """
        logger.info("Tool : check_availability — %s / %s", date, service)
        return await appointments.check_availability(date, service)

    @function_tool
    async def send_sms(self, to: str, message: str) -> str:
        """Envoyer un SMS au client.

        Args:
            to: Numero de telephone du destinataire (format international).
            message: Contenu du SMS a envoyer.
        """
        logger.info("Tool : send_sms — %s", to)
        return await messaging.send_sms(to, message)

    # `send_email` retire le 15/08/2026 — il ne pouvait PAS fonctionner.
    #
    # L'outil etait expose au LLM, qui pouvait donc l'appeler de sa propre
    # initiative et annoncer un envoi a l'appelant. Il visait
    # `POST /api/v1/email/send`, une route qui exige un JWT, alors que l'agent
    # s'authentifie par `X-VoixIA-Key`. Verifie en production le 15/08 :
    # 401 « Authorization required ». Aucun e-mail n'est jamais parti par ce
    # chemin.
    #
    # Le prompt du secteur `education` demandait en plus de le proposer
    # (« propose l'envoi du programme par email ») : retire au meme moment dans
    # `src/modules/shared/sector-prompts.js`. Les deux ensemble, jamais l'un sans
    # l'autre — sinon il reste soit un outil appelable sans consigne, soit une
    # consigne sans outil.
    #
    # L'e-mail sort du perimetre de lancement (decision du 15/08). L'ENVOI
    # transactionnel par Resend (confirmations, devis) n'est pas concerne : il ne
    # passe pas par l'agent vocal.

    @function_tool
    async def create_prospect(self, name: str, phone: str, email: str) -> str:
        """Creer un prospect dans le CRM Coccinelle.

        Args:
            name: Nom complet du prospect.
            phone: Numero de telephone du prospect.
            email: Adresse e-mail du prospect.
        """
        logger.info("Tool : create_prospect — %s", name)
        return await crm.create_prospect(name, phone, email)

    @function_tool
    async def search_products(self, query: str) -> str:
        """Rechercher des produits dans le catalogue.

        Args:
            query: Termes de recherche.
        """
        logger.info("Tool : search_products — %s", query)
        return await products.search_products(query)

    @function_tool
    async def search_knowledge(self, question: str) -> str:
        """Rechercher dans la base de connaissances Coccinelle.

        Args:
            question: Question posee par l'utilisateur.
        """
        logger.info("Tool : search_knowledge — %s", question)
        return await knowledge.search_knowledge(question)

    @function_tool
    async def transfer_to_human(self, reason: str) -> str:
        """Transferer l appel vers un conseiller humain.

        Args:
            reason: Raison du transfert demande par le client.
        """
        logger.info("Tool : transfer_to_human — %s", reason)
        return await transfer.transfer_to_human(reason)

    @function_tool
    async def create_task(
        self,
        description: str,
        keywords: str,
        contact_name: str = "",
        contact_phone: str = "",
        kb_response: str = "",
        kb_satisfied: bool = False,
    ) -> str:
        """Creer une tache et l affecter au bon membre de l equipe.
        A utiliser UNIQUEMENT si la base de connaissances ne peut pas
        repondre, si le client est insatisfait, si c est une urgence
        physique, ou si le client demande un humain.

        Args:
            description: Description de la demande du client.
            keywords: Mots-cles pour identifier le type (sinistre, contestation, travaux...).
            contact_name: Nom du client.
            contact_phone: Telephone du client.
            kb_response: Reponse fournie par la base de connaissances.
            kb_satisfied: True si le client etait satisfait de la reponse KB.
        """
        logger.info("Tool : create_task — %s / %s", keywords, contact_name)
        tenant_info = getattr(self, "_tenant_info", {})
        tenant_id = tenant_info.get("tenant_id", "")
        secteur = tenant_info.get("sector", "")
        return await tasks.call_create_task(
            tenant_id=tenant_id,
            description=description,
            keywords=keywords,
            contact_name=contact_name,
            contact_phone=contact_phone,
            secteur=secteur,
            kb_response=kb_response,
            kb_satisfied=kb_satisfied,
        )


class VoixIAPipeline:
    """Instrumentation New Relic pour le pipeline vocal."""

    def __init__(self) -> None:
        self._provider = os.environ.get("LLM_PROVIDER", "mistral")
        self._llm_config = get_llm_config(self._provider)

    @staticmethod
    def _enregistrer_latence(nom_metrique: str, duree_ms: float) -> None:
        try:
            import newrelic.agent
            newrelic.agent.record_custom_metric(nom_metrique, duree_ms)
        except Exception:
            pass

    def _instrumenter_stt(self, debut: float) -> float:
        duree_ms = (time.perf_counter() - debut) * 1000
        self._enregistrer_latence("voixia.latency.stt", duree_ms)
        logger.debug("Latence STT : %.1f ms", duree_ms)
        return duree_ms

    def _instrumenter_llm(self, debut: float) -> float:
        duree_ms = (time.perf_counter() - debut) * 1000
        self._enregistrer_latence("voixia.latency.llm", duree_ms)
        try:
            import newrelic.agent
            newrelic.agent.record_custom_metric(
                f"voixia.llm.provider.{self._provider}", 1
            )
        except Exception:
            pass
        logger.debug("Latence LLM (%s) : %.1f ms", self._llm_config.display_name, duree_ms)
        return duree_ms

    def _instrumenter_tts(self, debut: float) -> float:
        duree_ms = (time.perf_counter() - debut) * 1000
        self._enregistrer_latence("voixia.latency.tts", duree_ms)
        logger.debug("Latence TTS : %.1f ms", duree_ms)
        return duree_ms

    def _instrumenter_total(self, debut: float) -> None:
        duree_ms = (time.perf_counter() - debut) * 1000
        self._enregistrer_latence("voixia.latency.total", duree_ms)
        try:
            import newrelic.agent
            newrelic.agent.add_custom_parameter("llm_provider", self._provider)
        except Exception:
            pass
        if duree_ms > SEUIL_LATENCE_MS:
            logger.warning(
                "Latence elevee : %.1f ms (seuil : %d ms) — %s",
                duree_ms, SEUIL_LATENCE_MS, self._llm_config.display_name,
            )
        else:
            logger.info("Latence totale : %.1f ms", duree_ms)


# ═══════════════════════════════════════════════════════════════
# Log d appel vers POST /api/v1/voixia/log-call
# Appele par main.py dans le shutdown callback de la session
# ═══════════════════════════════════════════════════════════════

async def log_call_to_api(
    tenant_id: str,
    api_key: str,
    base_url: str,
    caller_phone: str,
    duration_seconds: int,
    transcript: str,
    summary: str,
) -> None:
    """Envoie le log d appel a POST /api/v1/voixia/log-call (silencieux)."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{base_url}/api/v1/voixia/log-call",
                json={
                    "caller_phone": caller_phone,
                    "duration_seconds": duration_seconds,
                    "status": "completed",
                    "direction": "inbound",
                    "transcript": transcript,
                    "summary": summary,
                },
                headers={
                    "X-VoixIA-Key": api_key,
                    "X-VoixIA-Tenant": tenant_id,
                },
            )
            logger.info("log-call HTTP %d — tenant=%s duree=%ds", resp.status_code, tenant_id, duration_seconds)
    except Exception as e:
        logger.warning("log-call echoue (silencieux) : %s", e)
