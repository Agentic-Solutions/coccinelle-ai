"""
VoixIA — Configuration centralisee de l'agent vocal.

Charge les variables d'environnement et expose des objets de configuration
pour chaque brique du pipeline : STT, LLM, TTS, VAD, et l'API Coccinelle.

La selection du provider se fait via les variables d'environnement :
  - LLM_PROVIDER=mistral|claude   (defaut: mistral)
  - TTS_PROVIDER=elevenlabs|cartesia (defaut: elevenlabs)
"""

import os
import logging
from dataclasses import dataclass, field
from dotenv import load_dotenv

# Charger le fichier .env (recherche dans le dossier courant puis parent)
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger("voixia.config")


# ==============================================================================
# Constantes globales
# ==============================================================================

# Latence cible entre la fin de parole de l'utilisateur et le debut de reponse
LATENCY_TARGET_MS: int = 800

# Langue principale
LANGUAGE: str = "fr"


# ==============================================================================
# Configuration STT (Speech-to-Text) — Deepgram
# ==============================================================================

@dataclass(frozen=True)
class STTConfig:
    """Configuration pour Deepgram Nova STT."""
    provider: str = "deepgram"
    model: str = "nova-3"
    language: str = "fr"
    # Options avancees Deepgram
    punctuate: bool = True
    smart_format: bool = True
    # Interim results pour une meilleure reactivite
    interim_results: bool = True
    # Mot-cles a privilegier pour la reconnaissance
    keywords: list[str] = field(default_factory=lambda: [
        "rendez-vous", "RDV", "coccinelle", "tarif", "prix",
        "disponibilite", "horaires", "rappeler", "SMS",
    ])


# ==============================================================================
# Configuration LLM — Mistral ou Claude
# ==============================================================================

@dataclass(frozen=True)
class MistralConfig:
    """Configuration pour Mistral AI (via API compatible OpenAI)."""
    provider: str = "mistral"
    model: str = "mistral-large-latest"
    base_url: str = "https://api.mistral.ai/v1"
    api_key: str = ""
    temperature: float = 0.7
    max_tokens: int = 512

    def __post_init__(self):
        if not self.api_key:
            key = os.getenv("MISTRAL_API_KEY", "")
            object.__setattr__(self, "api_key", key)


@dataclass(frozen=True)
class ClaudeConfig:
    """Configuration pour Claude (Anthropic)."""
    provider: str = "claude"
    model: str = "claude-sonnet-4-20250514"
    api_key: str = ""
    temperature: float = 0.7
    max_tokens: int = 512

    def __post_init__(self):
        if not self.api_key:
            key = os.getenv("ANTHROPIC_API_KEY", "")
            object.__setattr__(self, "api_key", key)


# ==============================================================================
# Configuration TTS (Text-to-Speech) — ElevenLabs ou Cartesia
# ==============================================================================

@dataclass(frozen=True)
class ElevenLabsConfig:
    """Configuration pour ElevenLabs TTS."""
    provider: str = "elevenlabs"
    # Modele multilingue pour un bon rendu en francais
    model: str = "eleven_multilingual_v2"
    # Voix francaise par defaut (a personnaliser selon le tenant)
    # "Charlotte" — voix feminine francaise naturelle
    voice_id: str = "XB0fDUnXU5powFXDhCwa"
    api_key: str = ""
    language: str = "fr"
    # Parametres de stabilite et similarite
    stability: float = 0.5
    similarity_boost: float = 0.75

    def __post_init__(self):
        if not self.api_key:
            key = os.getenv("ELEVENLABS_API_KEY", os.getenv("ELEVEN_API_KEY", ""))
            object.__setattr__(self, "api_key", key)


@dataclass(frozen=True)
class CartesiaConfig:
    """Configuration pour Cartesia TTS."""
    provider: str = "cartesia"
    model: str = "sonic-2"
    # Voix francaise Cartesia (a personnaliser)
    voice_id: str = "a167e0f3-df7e-4277-976b-f722e6380466"
    api_key: str = ""
    language: str = "fr"

    def __post_init__(self):
        if not self.api_key:
            key = os.getenv("CARTESIA_API_KEY", "")
            object.__setattr__(self, "api_key", key)


# ==============================================================================
# Configuration VAD (Voice Activity Detection) — Silero
# ==============================================================================

@dataclass(frozen=True)
class VADConfig:
    """Configuration pour Silero VAD."""
    provider: str = "silero"
    # Seuil de probabilite pour detecter la parole (0.0 - 1.0)
    # Plus bas = plus sensible, plus haut = moins de faux positifs
    threshold: float = 0.5
    # Duree minimale de silence pour considerer la fin de parole (en secondes)
    min_silence_duration: float = 0.3
    # Duree minimale de parole pour etre considere comme parole (en secondes)
    min_speech_duration: float = 0.1
    # Padding ajoute avant/apres la parole detectee (en secondes)
    padding_duration: float = 0.1


# ==============================================================================
# Configuration API Coccinelle
# ==============================================================================

@dataclass(frozen=True)
class CoccinelleAPIConfig:
    """Configuration pour l'API backend Coccinelle."""
    base_url: str = ""
    api_token: str = ""
    timeout_seconds: float = 10.0

    def __post_init__(self):
        if not self.base_url:
            url = os.getenv(
                "COCCINELLE_API_URL",
                "https://coccinelle-api.youssef-amrouche.workers.dev"
            )
            object.__setattr__(self, "base_url", url)
        if not self.api_token:
            token = os.getenv("COCCINELLE_API_TOKEN", "")
            object.__setattr__(self, "api_token", token)


# ==============================================================================
# Configuration LiveKit
# ==============================================================================

@dataclass(frozen=True)
class LiveKitConfig:
    """Configuration pour la connexion LiveKit."""
    url: str = ""
    api_key: str = ""
    api_secret: str = ""

    def __post_init__(self):
        if not self.url:
            url = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
            object.__setattr__(self, "url", url)
        if not self.api_key:
            key = os.getenv("LIVEKIT_API_KEY", "")
            object.__setattr__(self, "api_key", key)
        if not self.api_secret:
            secret = os.getenv("LIVEKIT_API_SECRET", "")
            object.__setattr__(self, "api_secret", secret)


# ==============================================================================
# Selection dynamique du provider
# ==============================================================================

def get_llm_provider() -> str:
    """Retourne le provider LLM selectionne (mistral ou claude)."""
    provider = os.getenv("LLM_PROVIDER", "mistral").lower().strip()
    if provider not in ("mistral", "claude"):
        logger.warning(
            "LLM_PROVIDER='%s' non reconnu, utilisation de 'mistral' par defaut.",
            provider,
        )
        return "mistral"
    return provider


def get_tts_provider() -> str:
    """Retourne le provider TTS selectionne (elevenlabs ou cartesia)."""
    provider = os.getenv("TTS_PROVIDER", "elevenlabs").lower().strip()
    if provider not in ("elevenlabs", "cartesia"):
        logger.warning(
            "TTS_PROVIDER='%s' non reconnu, utilisation de 'elevenlabs' par defaut.",
            provider,
        )
        return "elevenlabs"
    return provider


def get_llm_config() -> MistralConfig | ClaudeConfig:
    """Retourne la configuration LLM selon le provider selectionne."""
    provider = get_llm_provider()
    if provider == "claude":
        return ClaudeConfig()
    return MistralConfig()


def get_tts_config() -> ElevenLabsConfig | CartesiaConfig:
    """Retourne la configuration TTS selon le provider selectionne."""
    provider = get_tts_provider()
    if provider == "cartesia":
        return CartesiaConfig()
    return ElevenLabsConfig()


# ==============================================================================
# Instances globales (chargees une seule fois)
# ==============================================================================

stt_config = STTConfig()
vad_config = VADConfig()
livekit_config = LiveKitConfig()
coccinelle_api_config = CoccinelleAPIConfig()


def log_config_summary() -> None:
    """Affiche un resume de la configuration au demarrage."""
    llm_cfg = get_llm_config()
    tts_cfg = get_tts_config()

    logger.info("=" * 60)
    logger.info("VoixIA — Configuration de l'agent vocal")
    logger.info("=" * 60)
    logger.info("STT      : %s / %s (langue: %s)", stt_config.provider, stt_config.model, stt_config.language)
    logger.info("LLM      : %s / %s", llm_cfg.provider, llm_cfg.model)
    logger.info("TTS      : %s / %s", tts_cfg.provider, tts_cfg.model)
    logger.info("VAD      : %s (seuil: %.2f)", vad_config.provider, vad_config.threshold)
    logger.info("API      : %s", coccinelle_api_config.base_url)
    logger.info("LiveKit  : %s", livekit_config.url)
    logger.info("Latence  : cible < %d ms", LATENCY_TARGET_MS)
    logger.info("=" * 60)
