"""
VoixIA — Point d'entree de l'agent vocal.

Lance l'agent LiveKit qui ecoute les appels entrants (SIP via Twilio)
et orchestre le pipeline vocal STT -> LLM -> TTS en temps reel.

Usage :
    # Mode developpement (avec le playground LiveKit)
    python main.py dev

    # Mode production (worker connecte au serveur LiveKit)
    python main.py start

    # Mode console (test local sans LiveKit)
    python main.py console
"""

import logging
import sys
import os

# Ajouter le dossier agent au path pour les imports locaux
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from livekit import agents, rtc
from livekit.agents import AgentServer, JobContext, cli

from config import log_config_summary, livekit_config
from pipeline import VoixIAAgent, create_agent_session, get_room_options
from prompts import GREETING_INSTRUCTIONS, GOODBYE_MESSAGE

# ==============================================================================
# Configuration du logging
# ==============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Reduire le bruit des librairies externes
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("livekit").setLevel(logging.INFO)

logger = logging.getLogger("voixia.main")


# ==============================================================================
# Serveur d'agents LiveKit
# ==============================================================================

server = AgentServer()


@server.rtc_session(agent_name="voixia-agent")
async def voixia_entrypoint(ctx: JobContext) -> None:
    """
    Point d'entree principal pour chaque appel/session LiveKit.

    Cette fonction est appelee automatiquement par le serveur LiveKit
    quand un nouvel appel arrive (via SIP/Twilio ou via le playground).

    Workflow :
    1. Creer la session AgentSession avec le pipeline vocal
    2. Creer l'agent VoixIA avec les instructions systeme
    3. Demarrer la session avec les options de room
    4. Envoyer le message d'accueil
    5. Gerer les evenements de cycle de vie
    """
    room_name = ctx.room.name if ctx.room else "inconnu"
    logger.info("=" * 60)
    logger.info("Nouvel appel entrant — room: %s", room_name)
    logger.info("=" * 60)

    try:
        # ---- Etape 1 : Creer la session avec le pipeline vocal ----
        # Les tools seront ajoutes ici quand l'Agent 3 les implementera
        # Exemple : tools=[book_appointment, check_availability, send_sms, ...]
        session = create_agent_session(tools=None)

        # ---- Etape 2 : Creer l'agent vocal ----
        agent = VoixIAAgent()

        # ---- Etape 3 : Demarrer la session ----
        room_options = get_room_options()

        await session.start(
            room=ctx.room,
            agent=agent,
            room_options=room_options,
        )

        logger.info("Session demarree avec succes.")

        # ---- Etape 4 : Envoyer le message d'accueil ----
        await session.generate_reply(
            instructions=GREETING_INSTRUCTIONS,
        )

        logger.info("Message d'accueil envoye.")

        # ---- Etape 5 : Gerer les evenements de cycle de vie ----
        _attach_lifecycle_events(session, room_name)

    except Exception:
        logger.exception("Erreur lors du demarrage de la session pour room '%s'", room_name)
        raise


def _attach_lifecycle_events(session: agents.AgentSession, room_name: str) -> None:
    """
    Attache les callbacks de cycle de vie a la session.

    Gere :
    - Fin de session (appelant raccroche)
    - Changements d'etat de l'agent
    - Erreurs
    """

    @session.on("close")
    def on_session_close(*args) -> None:
        """Appelee quand la session se termine (appelant raccroche)."""
        logger.info("Session terminee — room: %s", room_name)
        logger.info("-" * 60)

    @session.on("agent_state_changed")
    def on_agent_state(event) -> None:
        """Log les changements d'etat de l'agent pour le monitoring."""
        state = getattr(event, "state", getattr(event, "new_state", "inconnu"))
        logger.debug("Etat de l'agent : %s — room: %s", state, room_name)

    @session.on("user_state_changed")
    def on_user_state(event) -> None:
        """Log les changements d'etat de l'utilisateur."""
        state = getattr(event, "state", getattr(event, "new_state", "inconnu"))
        logger.debug("Etat de l'utilisateur : %s — room: %s", state, room_name)


# ==============================================================================
# Point d'entree CLI
# ==============================================================================

def main() -> None:
    """Point d'entree principal du programme."""
    logger.info("Demarrage de VoixIA — Agent vocal IA souverain")
    logger.info("Python %s", sys.version.split()[0])

    # Afficher le resume de la configuration
    log_config_summary()

    # Lancer le serveur d'agents LiveKit
    # Modes disponibles :
    #   python main.py dev       — mode developpement (auto-reload)
    #   python main.py start     — mode production
    #   python main.py console   — test local en console
    cli.run_app(server)


if __name__ == "__main__":
    main()
