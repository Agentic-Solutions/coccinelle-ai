"""
Point d'entree principal de l'agent vocal VoixIA.

Ce module initialise le pipeline vocal complet :
- Chargement des variables d'environnement (.env)
- Initialisation New Relic (lazy, apres le fork multiprocessing)
- Pipeline vocal : VAD -> STT -> LLM -> TTS via AgentSession
- Selection dynamique du prompt, LLM et voix via resolve_tenant()
- Log d appel automatique en fin de session via shutdown callback
"""

import asyncio
import os
import re
import logging
import time
from pathlib import Path

from dotenv import load_dotenv

# --- Charger le .env AVANT tout autre import ---
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli

from config import PROMPT_TYPE
from prompts import get_greeting

# Delai de stabilisation du media SIP avant le greeting (voir Etape 5).
GREETING_MEDIA_WARMUP_S = 0.8

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s",
)
logger = logging.getLogger("voixia.main")

_nr_initialise = False

# Regex de REPLI pour extraire le prenom depuis le system_prompt.
#
# ⚠️ CE N'EST PLUS LA SOURCE. Depuis le 18/08/2026, le backend renvoie `greeting`
# deja construit et `agent_name` : cette regex ne sert plus qu'aux agents parlant a
# un backend non redeploye, et aux tenants dont `voixia_configs.agent_name` est vide.
#
# ⚠️ ELLE EST ALIGNEE SUR CELLE DU BACKEND, et ca compte. L'ancienne exigeait une
# majuscule suivie de minuscules : passees sur 18 prenoms plausibles, les deux regex
# divergeaient sur 8. `LEO`, `SARA`, `léa`, `N'Golo`, `L3a` ne remontaient pas — la
# page affichait un prenom que l'agent ne prononcait pas — et `Marie Claire` etait
# tronque en `Marie`. On borne desormais sur la virgule, comme le backend.
_ASSISTANT_NAME_RE = re.compile(
    r"Tu es\s+([^,]{1,40}),\s*l['\u2019]assistant",
    re.IGNORECASE,
)


def _extract_assistant_name(system_prompt: str | None) -> str | None:
    """Extrait le prenom de l'assistant depuis le system_prompt du tenant."""
    if not system_prompt:
        return None
    m = _ASSISTANT_NAME_RE.search(system_prompt)
    return m.group(1).strip() if m else None


def _init_newrelic() -> None:
    global _nr_initialise
    if _nr_initialise:
        return
    _nr_initialise = True
    try:
        import newrelic.agent
        newrelic.agent.initialize("newrelic.ini")
        logger.info("New Relic initialise avec succes.")
    except Exception as e:
        logger.warning("New Relic non disponible : %s", e)


def _nr_record_event(event_type: str, params: dict) -> None:
    try:
        import newrelic.agent
        newrelic.agent.record_custom_event(event_type, params)
    except Exception:
        pass


def _nr_record_metric(name: str, value: float) -> None:
    try:
        import newrelic.agent
        newrelic.agent.record_custom_metric(name, value)
    except Exception:
        pass


def _extract_caller_phone(participant, sip_to_number: str | None) -> str | None:
    """Extrait le numero de l appelant depuis les attributs SIP."""
    attrs = getattr(participant, "attributes", {}) or {}
    logger.debug("Attributs SIP du participant : %s", dict(attrs))

    # Priorite 1 : sip.fromUser (numero appelant explicite)
    for key in ("sip.fromUser", "sip.from"):
        val = attrs.get(key)
        if val:
            # Nettoyer le format SIP URI si present (sip:+33...@...)
            if ":" in val:
                val = val.split(":")[1].split("@")[0] if "@" in val else val.split(":")[-1]
            logger.info("Caller phone via %s : %s", key, val)
            return val

    # Priorite 2 : sip.phoneNumber si different du numero appele
    phone_number = attrs.get("sip.phoneNumber", "")
    if phone_number and phone_number != sip_to_number:
        logger.info("Caller phone via sip.phoneNumber : %s", phone_number)
        return phone_number

    # Priorite 3 : participant.identity (ex: "sip_+33760762153")
    identity = getattr(participant, "identity", "") or ""
    if identity.startswith("sip_"):
        phone = identity[4:]
        if phone:
            logger.info("Caller phone via identity : %s", phone)
            return phone

    logger.warning("Caller phone non trouve dans les attributs SIP")
    return None


def _extract_transcript(agent, session=None) -> str:
    """Extrait le transcript depuis le chat context de l agent ou de la session."""
    sources = []
    if session:
        sources.append(session)
    sources.append(agent)

    for source in sources:
        try:
            chat_ctx = getattr(source, "chat_ctx", None)
            if not chat_ctx or not hasattr(chat_ctx, "messages"):
                continue
            parts = []
            for msg in chat_ctx.messages:
                role = str(getattr(msg, "role", ""))
                content = str(getattr(msg, "content", "") or "")
                if content and role != "system":
                    parts.append(f"{role}: {content}")
            if parts:
                result = "\n".join(parts)
                logger.info("Transcript extrait depuis %s — %d chars", type(source).__name__, len(result))
                return result
        except Exception as exc:
            logger.debug("Transcript extraction echouee pour %s : %s", type(source).__name__, exc)

    return ""


async def entrypoint(ctx: JobContext) -> None:
    """
    Fonction d'entree appelee par LiveKit pour chaque nouvel appel.

    Pipeline : ctx.connect() -> wait_for_participant() -> resolution tenant SIP
               -> AgentSession -> session.start() -> greeting immediat
               -> shutdown callback -> log-call API
    """
    from livekit.agents import AgentSession
    from livekit.plugins import deepgram, elevenlabs, silero

    from llm_factory import get_llm_client
    from pipeline import VoixIAAgent, log_call_to_api
    from tenant import extract_sip_to_number, resolve_tenant
    from tools.context import set_call_context

    _init_newrelic()

    debut_appel = time.perf_counter()

    # --- Etape 1 : Connexion a la room et attente du participant ---
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.debug("Connecte a la room : %s — attente du participant...", ctx.room.name)

    participant = await ctx.wait_for_participant()
    logger.info("Participant connecte : %s", participant.identity)

    # --- Etape 2 : Resolution du tenant via metadonnees SIP ---
    prompt_type  = PROMPT_TYPE
    company_name = None
    llm_provider = os.environ.get("LLM_PROVIDER", "mistral")
    llm_model    = None
    voice_id     = os.environ.get("ELEVENLABS_VOICE_ID", "cgSgspJ2msm6clMCkdW9")
    system_prompt = None
    tenant_info  = {}

    sip_to_number = extract_sip_to_number(participant)

    # Caller extrait ICI (et non plus a l etape 4b) : sur le numero d essai partage,
    # c est lui qui identifie le tenant du nouvel inscrit cote resolve-phone.
    caller_phone = _extract_caller_phone(participant, sip_to_number)

    if sip_to_number:
        tenant_info = await resolve_tenant(sip_to_number, caller=caller_phone)
        prompt_type   = tenant_info["prompt_type"]
        company_name  = tenant_info["company_name"]
        llm_provider  = tenant_info["llm_provider"]
        llm_model     = tenant_info["llm_model"]
        voice_id      = tenant_info["voice_id"]
        system_prompt = tenant_info["system_prompt"]
        logger.info(
            "Tenant resolu — phone : %s | company : %s | prompt : %s | llm : %s | voice : %s",
            sip_to_number, company_name, prompt_type, llm_model, voice_id,
        )
        # ANCRAGE DU TENANT — a poser AVANT toute construction d'outil.
        # Sans cette ligne, search_knowledge / send_sms / send_email / transfer
        # lisent VOIXIA_TENANT_ID dans le .env : une valeur figee, la meme pour
        # tout le serveur. Tous les appels interrogeaient donc la base de
        # connaissances d'un seul tenant (« Agentic solutions »), d'ou des
        # reponses hors sujet et des tarifs inventes.
        set_call_context(tenant_info.get("tenant_id"), tenant_info.get("api_key"))
    else:
        tenant_info = {"tenant_id": ""}
        logger.info("Pas de metadonnees SIP — fallback sur config par defaut")

    logger.info(
        "Nouvel appel — room : %s | prompt : %s | llm : %s",
        ctx.room.name, prompt_type, llm_provider,
    )

    _nr_record_event("VoixIACall", {
        "room_name": ctx.room.name,
        "llm_provider": llm_provider,
        "prompt_type": prompt_type,
        "company_name": company_name or "",
        "sip_to": sip_to_number or "",
        "timestamp": time.time(),
    })

    # --- Etape 3 : Preparer le greeting AVANT de demarrer la session ---
    #
    # ── LA PHRASE VIENT DU BACKEND (chantier PRENOM, 18/08/2026) ──
    # L'agent la PRONONCE, il ne la fabrique plus. Elle etait construite ici en Python
    # ET dans la page « Mon Assistant » en TypeScript : deux formulations a garder
    # synchronisees a la main, sans rien pour le verifier. Le 13/08 elles avaient deja
    # diverge — la page annoncait un prenom que l'agent ne disait pas.
    #
    # Le repli local reste, et il est necessaire : un agent deploye avant le backend,
    # ou une resolution en echec, n'ont pas de `greeting`. Dans ce cas `company_name`
    # est vide (Lot B) et `get_greeting` rend la phrase neutre — jamais une raison
    # sociale qui n'est pas celle de l'appele.
    # `tenant_info` vaut {} tant que la resolution n'a pas eu lieu — jamais None.
    greeting = (tenant_info or {}).get("greeting")
    assistant_name = (tenant_info or {}).get("agent_name")
    origine_greeting = "backend"

    if not greeting:
        origine_greeting = "repli local"
        if not assistant_name:
            assistant_name = _extract_assistant_name(system_prompt)
        greeting = get_greeting(
            prompt_type,
            company_name=company_name,
            assistant_name=assistant_name,
        )

    logger.info("Greeting dynamique (%s) — assistant=%s company=%s secteur=%s",
                origine_greeting, assistant_name or "(defaut)",
                company_name or "(defaut)", prompt_type)

    # --- Etape 4 : Construction du pipeline vocal ---
    vad = silero.VAD.load()
    stt = deepgram.STT(language="fr")
    llm = get_llm_client(provider=llm_provider, model=llm_model)
    # Sans voice_settings explicites, ElevenLabs applique les reglages par
    # defaut du compte — mesures le 11/08/2026 : stability 0.5, speed 1.0, soit
    # le debit maximal et la stabilite la plus basse. Les montants passaient
    # trop vite pour etre distincts a l'oreille (« 15 » entendu « 25 »).
    #
    # speed 0.92 : environ 8 % plus lent, verifie sur l'API (une phrase de
    #   reference passe de 5,93 s a ~6,4 s). eleven_multilingual_v2 honore bien
    #   ce parametre, ce n'etait pas acquis.
    # stability 0.6 : moins de derive prosodique sur les chiffres. On ne monte
    #   pas plus haut — au-dela de 0,7 la voix s'aplatit et articule MOINS bien.
    # Reglages explicites = comportement identique pour les 20 voix, quels que
    #   soient les reglages enregistres cote compte (que notre cle API n'a
    #   d'ailleurs pas le droit de lire).
    tts = elevenlabs.TTS(
        model="eleven_multilingual_v2",
        voice_id=voice_id,
        voice_settings=elevenlabs.VoiceSettings(
            stability=0.6,
            similarity_boost=0.75,
            style=0.0,
            speed=0.92,
            use_speaker_boost=True,
        ),
    )

    # --- Etape 4b : Injection du caller phone dans le prompt (extrait a l etape 2) ---
    if caller_phone and system_prompt:
        system_prompt += (
            f"\n\n## CONTEXTE APPEL\n"
            f"Le numero de l appelant est : {caller_phone}\n"
            f"Pour envoyer un SMS utilise TOUJOURS ce numero : {caller_phone}\n"
            f"Ne demande PAS le numero a l appelant tu le connais deja."
        )
        logger.info("Caller phone injecte dans le prompt : %s", caller_phone)

    # --- Etape 5 : Demarrage de la session + greeting immediat ---
    agent = VoixIAAgent(
        tenant_info=tenant_info,
        prompt_type=prompt_type,
        system_prompt=system_prompt,
    )
    session = AgentSession(stt=stt, llm=llm, tts=tts, vad=vad)
    await session.start(room=ctx.room, agent=agent)

    # Stabilisation du media SIP sortant avant de parler : sans ce delai, le flux
    # RTP vers l appelant n est pas encore etabli au decrochage et le DEBUT du
    # greeting est coupe / bruite ("bonszz...rouche"). ~0.8s suffit a amorcer le
    # track audio. Ne PAS supprimer : session.say() joue sinon dans le vide.
    await asyncio.sleep(GREETING_MEDIA_WARMUP_S)
    logger.info("Session demarree (media stabilise +%.1fs) — envoi du greeting...", GREETING_MEDIA_WARMUP_S)

    # Le greeting est la PREMIERE et UNIQUE prise de parole initiale.
    # generate_reply(instructions=...) demande au LLM de generer le message
    # d'accueil. Il est envoye immediatement car le participant est deja
    # connecte (wait_for_participant ci-dessus).
    await session.say(greeting)
    logger.info("Message d'accueil envoye — l'agent ecoute.")

    # --- Capture de transcript en temps reel ---
    transcript_lines: list[str] = []

    @session.on("conversation_item_added")
    def _on_conversation_item(event):
        """Capture chaque message user/assistant dans le transcript."""
        item = event.item
        role = getattr(item, "role", "")
        text = getattr(item, "text_content", "") or ""
        if text.strip() and role in ("user", "assistant"):
            label = "Client" if role == "user" else "Assistant"
            transcript_lines.append(f"{label}: {text.strip()}")
            logger.debug("Transcript +1 — %s: %s", label, text[:50])


    # --- Metriques de demarrage ---
    duree_ms = (time.perf_counter() - debut_appel) * 1000
    _nr_record_metric("voixia.startup_time_ms", duree_ms)
    logger.info("Demarrage en %.1f ms — LLM : %s", duree_ms, llm_provider)

    # --- Etape 6 : Log-call en fin de session ---
    # caller_phone deja extrait a l etape 2 (avant la resolution du tenant)

    async def _on_shutdown():
        """Log l appel termine vers POST /api/v1/voixia/log-call."""
        try:
            duration_s = int(time.perf_counter() - debut_appel)
            transcript = "\n".join(transcript_lines) if transcript_lines else _extract_transcript(agent, session)
            summary = transcript[:200] if transcript else ""

            tid = tenant_info.get("tenant_id", "")
            if not tid:
                logger.info("Pas de tenant_id — skip log-call")
                return

            # Si caller_phone toujours None, skip log-call (pas de 400)
            if not caller_phone:
                logger.warning("Pas de caller_phone — skip log-call")
                return

            base_url = os.environ.get(
                "COCCINELLE_API_BASE",
                "https://coccinelle-api.youssef-amrouche.workers.dev",
            )
            api_key = os.environ.get("VOIXIA_API_KEY", "")

            await log_call_to_api(
                tenant_id=tid,
                api_key=api_key,
                base_url=base_url,
                caller_phone=caller_phone,
                duration_seconds=duration_s,
                transcript=transcript,
                summary=summary,
            )
            logger.info(
                "log-call envoye — duree=%ds caller=%s transcript=%d chars",
                duration_s, caller_phone, len(transcript),
            )
        except Exception as e:
            logger.warning("log-call shutdown erreur (silencieux) : %s", e)

    ctx.add_shutdown_callback(_on_shutdown)
    logger.info("Shutdown callback log-call enregistre")


if __name__ == "__main__":
    logger.info("Demarrage de l'agent vocal VoixIA (prompt=%s)...", PROMPT_TYPE)
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
