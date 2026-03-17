"""
VoixIA — Pipeline vocal STT -> LLM -> TTS.

Ce module assemble le pipeline vocal en selectionnant dynamiquement
les providers (STT, LLM, TTS, VAD) selon la configuration.

Architecture :
  Microphone/SIP -> VAD (Silero) -> STT (Deepgram) -> LLM (Mistral|Claude) -> TTS (ElevenLabs|Cartesia) -> Audio

Utilise le SDK LiveKit Agents v1.4+ avec le pattern AgentSession + Agent.
"""

import logging
import time
from typing import Any

from livekit.agents import AgentSession, Agent, room_io
from livekit.plugins import deepgram, openai, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from config import (
    stt_config,
    vad_config,
    get_llm_provider,
    get_llm_config,
    get_tts_provider,
    get_tts_config,
    LATENCY_TARGET_MS,
)
from prompts import SYSTEM_PROMPT, GREETING_INSTRUCTIONS

logger = logging.getLogger("voixia.pipeline")


# ==============================================================================
# Construction des composants du pipeline
# ==============================================================================

def create_stt() -> deepgram.STT:
    """Cree et configure le composant STT (Deepgram)."""
    logger.info("Initialisation STT : Deepgram %s (langue: %s)", stt_config.model, stt_config.language)

    return deepgram.STT(
        model=stt_config.model,
        language=stt_config.language,
        punctuate=stt_config.punctuate,
        smart_format=stt_config.smart_format,
        interim_results=stt_config.interim_results,
        keywords=stt_config.keywords,
    )


def create_llm() -> Any:
    """
    Cree et configure le composant LLM selon le provider selectionne.

    - Mistral : utilise le plugin OpenAI avec base_url Mistral (API compatible)
    - Claude  : utilise le plugin Anthropic natif
    """
    llm_cfg = get_llm_config()
    provider = get_llm_provider()

    if provider == "claude":
        from livekit.plugins import anthropic
        logger.info("Initialisation LLM : Claude / %s", llm_cfg.model)
        return anthropic.LLM(
            model=llm_cfg.model,
            api_key=llm_cfg.api_key or None,
            temperature=llm_cfg.temperature,
        )
    else:
        # Mistral via le plugin OpenAI (API compatible)
        logger.info("Initialisation LLM : Mistral / %s", llm_cfg.model)
        return openai.LLM(
            model=llm_cfg.model,
            base_url=llm_cfg.base_url,
            api_key=llm_cfg.api_key or None,
            temperature=llm_cfg.temperature,
        )


def create_tts() -> Any:
    """
    Cree et configure le composant TTS selon le provider selectionne.

    - ElevenLabs : voix francaise naturelle, modele multilingue
    - Cartesia   : alternative plus rapide
    """
    tts_cfg = get_tts_config()
    provider = get_tts_provider()

    if provider == "cartesia":
        from livekit.plugins import cartesia
        logger.info("Initialisation TTS : Cartesia / %s (voix: %s)", tts_cfg.model, tts_cfg.voice_id)
        return cartesia.TTS(
            model=tts_cfg.model,
            voice=tts_cfg.voice_id,
            api_key=tts_cfg.api_key or None,
            language=tts_cfg.language,
        )
    else:
        from livekit.plugins import elevenlabs
        logger.info(
            "Initialisation TTS : ElevenLabs / %s (voix: %s)",
            tts_cfg.model, tts_cfg.voice_id,
        )
        return elevenlabs.TTS(
            model=tts_cfg.model,
            voice_id=tts_cfg.voice_id,
            api_key=tts_cfg.api_key or None,
            language=tts_cfg.language,
        )


def create_vad() -> silero.VAD:
    """Cree et configure le composant VAD (Silero)."""
    logger.info(
        "Initialisation VAD : Silero (seuil: %.2f, silence: %.2fs)",
        vad_config.threshold,
        vad_config.min_silence_duration,
    )
    return silero.VAD.load(
        min_silence_duration=vad_config.min_silence_duration,
        min_speech_duration=vad_config.min_speech_duration,
        padding_duration=vad_config.padding_duration,
        activation_threshold=vad_config.threshold,
    )


# ==============================================================================
# Agent vocal principal
# ==============================================================================

class VoixIAAgent(Agent):
    """
    Agent vocal VoixIA.

    Herite de livekit.agents.Agent et definit les instructions systeme.
    Les tools (rendez-vous, SMS, CRM, etc.) seront ajoutes par l'Agent 3
    sous forme de methodes decorees avec @function_tool.
    """

    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)


# ==============================================================================
# Creation de la session AgentSession
# ==============================================================================

def create_agent_session(tools: list | None = None) -> AgentSession:
    """
    Assemble et retourne une AgentSession configuree avec le pipeline vocal complet.

    Args:
        tools: Liste optionnelle de function tools a enregistrer.
               Sera rempli par l'Agent 3 (tool calls Coccinelle).

    Returns:
        AgentSession prete a etre demarree avec session.start().
    """
    logger.info("=" * 50)
    logger.info("Creation du pipeline vocal VoixIA")
    logger.info("=" * 50)

    # Construction des composants
    stt = create_stt()
    llm = create_llm()
    tts = create_tts()
    vad = create_vad()

    # Detection de tour de parole multilingue
    turn_detection = MultilingualModel()

    # Configuration de la session
    session_kwargs: dict[str, Any] = {
        "stt": stt,
        "llm": llm,
        "tts": tts,
        "vad": vad,
        "turn_detection": turn_detection,
        # Filtres de texte pour le TTS (pas de markdown ni d'emoji en vocal)
        "tts_text_transforms": ["filter_markdown", "filter_emoji"],
        # Generation preemptive pour reduire la latence
        "preemptive_generation": True,
        # Nombre max d'appels de tools enchaines
        "max_tool_steps": 5,
    }

    # Ajouter les tools si fournis
    if tools:
        session_kwargs["tools"] = tools
        logger.info("Tools enregistres : %d", len(tools))

    session = AgentSession(**session_kwargs)

    # Attacher les evenements de monitoring
    _attach_latency_monitor(session)

    logger.info("Pipeline vocal cree avec succes.")
    return session


# ==============================================================================
# Monitoring de la latence
# ==============================================================================

# Variable pour mesurer le temps entre la fin de parole et le debut de reponse
_last_user_speech_end: float = 0.0


def _attach_latency_monitor(session: AgentSession) -> None:
    """
    Attache des callbacks sur la session pour mesurer et logger la latence
    du pipeline (temps entre fin de parole utilisateur et debut de reponse TTS).
    """

    @session.on("user_state_changed")
    def on_user_state_changed(event: Any) -> None:
        """Capture le moment ou l'utilisateur arrete de parler."""
        global _last_user_speech_end
        state = getattr(event, "state", getattr(event, "new_state", None))
        # L'utilisateur vient de finir de parler
        if state and str(state).lower() in ("listening", "idle", "away"):
            _last_user_speech_end = time.monotonic()

    @session.on("agent_state_changed")
    def on_agent_state_changed(event: Any) -> None:
        """Mesure la latence quand l'agent commence a parler."""
        global _last_user_speech_end
        state = getattr(event, "state", getattr(event, "new_state", None))
        if state and str(state).lower() == "speaking" and _last_user_speech_end > 0:
            latency_ms = (time.monotonic() - _last_user_speech_end) * 1000
            _last_user_speech_end = 0.0

            if latency_ms <= LATENCY_TARGET_MS:
                logger.info(
                    "Latence pipeline : %.0f ms (cible: %d ms) OK",
                    latency_ms, LATENCY_TARGET_MS,
                )
            else:
                logger.warning(
                    "Latence pipeline : %.0f ms (cible: %d ms) DEPASSE",
                    latency_ms, LATENCY_TARGET_MS,
                )

    @session.on("user_input_transcribed")
    def on_user_transcribed(event: Any) -> None:
        """Log la transcription de l'utilisateur pour le debug."""
        text = getattr(event, "text", getattr(event, "transcript", ""))
        is_final = getattr(event, "is_final", True)
        if is_final and text:
            logger.info("Utilisateur : %s", text.strip())

    logger.debug("Monitoring de latence attache a la session.")


# ==============================================================================
# Options de room pour les appels SIP (telephonie)
# ==============================================================================

def get_room_options() -> room_io.RoomOptions:
    """
    Retourne les options de room optimisees pour les appels SIP entrants.

    - Audio uniquement (pas de video)
    - Annulation de bruit pour la telephonie
    - Fermeture automatique quand l'appelant raccroche
    """
    from livekit import rtc
    from livekit.plugins import noise_cancellation

    return room_io.RoomOptions(
        audio_input=room_io.AudioInputOptions(
            # Utiliser l'annulation de bruit telephonique pour les appels SIP
            noise_cancellation=lambda params: (
                noise_cancellation.BVCTelephony()
                if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                else noise_cancellation.BVC()
            ),
        ),
        # Pas de video pour un agent vocal
        video_input=False,
        video_output=False,
        # Activer l'entree/sortie texte pour le chat
        text_input=True,
        text_output=True,
        # Fermer la session quand l'appelant raccroche
        close_on_disconnect=True,
    )
