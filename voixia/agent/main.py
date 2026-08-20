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

from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli

from config import PROMPT_TYPE
from prompts import get_greeting

# Delai de stabilisation du media SIP avant le greeting (voir Etape 5).
#
# ⚠️ NE PAS TOUCHER SANS MESURE (poste 5 du chantier latence, 20/08/2026). C'est le
# poste le plus lourd du chemin (800 ms sur 1 838 ms), et c'est aussi lui qui empeche
# le debut de l'accueil d'etre coupe (« bonszz...rouche »). Il ne bougera qu'une fois
# que « Premier son en ... ms » aura donne le vrai delai de disponibilite du RTP.
GREETING_MEDIA_WARMUP_S = 0.8

# Budget TOTAL de la resolution du tenant, retentatives comprises.
#
# ── POURQUOI UN BUDGET, ET POURQUOI 1,5 s (chantier latence, 20/08/2026) ──
# Le 18/08 a 12h41, resolve-phone a repondu ReadTimeout (15 s) puis 500 (15 s) :
# 30,2 s de silence AVANT le moindre son, parce que l'accueil personnalise attend
# cette reponse. Le delai unitaire a ete ramene a 5 s x 3 essais le 18/08, mais un
# delai unitaire ne borne pas le total : 3 x 5 s + 2 x 0,3 s = 15,6 s au pire.
#
# La latence nominale mesuree le 20/08 depuis le serveur est de 46 a 84 ms. 1,5 s,
# c'est donc ~18 fois le pire cas normal : on ne sacrifie PAS l'accueil personnalise
# (« Garage Toulouse, bonjour ») pour 234 ms — c'est le produit lui-meme — mais on
# refuse de laisser une panne du backend tenir l'appelant en silence.
# Au-dela du budget : accueil neutre, et l'appel continue.
RESOLUTION_BUDGET_S = 1.5

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s",
)
logger = logging.getLogger("voixia.main")

_nr_initialise = False

# Taches de fond gardees en reference forte : asyncio ne tient ses taches que par
# reference FAIBLE (`_all_tasks` est un WeakSet). Une tache creee puis oubliee peut
# etre ramassee par le GC en plein vol — le symptome serait un journal qui perd
# « Accueil termine » au hasard, c'est-a-dire une instrumentation qui ment.
_taches_de_fond: set[asyncio.Task] = set()


def _lancer_en_fond(coro) -> None:
    tache = asyncio.create_task(coro)
    _taches_de_fond.add(tache)
    tache.add_done_callback(_taches_de_fond.discard)

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
        tenant_info = await resolve_tenant(
            sip_to_number, caller=caller_phone, budget_s=RESOLUTION_BUDGET_S,
        )
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
    # Le VAD vient du process PRECHAUFFE (voir prewarm() en bas de fichier). Le
    # `or` n'est pas de la prudence decorative : un process qui n'a pas eu le temps
    # d'etre prechauffe doit servir l'appel quand meme, pas planter dessus.
    vad = ctx.proc.userdata.get("vad") or silero.VAD.load()
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

    # --- Capture de transcript en temps reel ---
    #
    # ⚠️ ENREGISTRE AVANT L'ACCUEIL (chantier latence, 20/08/2026). Ce bloc vivait
    # APRES `await session.say()`, donc rien n'ecoutait pendant toute la duree de
    # l'accueil : un appelant qui parle par-dessus n'etait pas capte, et si l'appel
    # tombait pendant l'accueil, la capture n'avait jamais commence.
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

    # --- Instrumentation du PREMIER SON (poste 2 du chantier latence) ---
    #
    # ── CE QU'ON MESURAIT AVANT, ET POURQUOI C'ETAIT FAUX ──
    # « Demarrage en X ms » etait calcule APRES `await session.say(...)`. Or `say()`
    # rend un SpeechHandle et l'attendre attend la FIN de la diction — ou le
    # raccroche. Verifie sur 3 appels : le compteur s'arretait 3 a 14 ms apres le BYE
    # SIP de l'appelant. « 14 651 ms » et « 31 320 ms » mesuraient la PATIENCE DE
    # L'APPELANT, pas la latence de l'agent. D'ou une valeur qui variait de 3,1 s a
    # 31,3 s sans correlation avec quoi que ce soit de technique, et un chantier
    # entier qui aurait pu partir sur une fausse piste.
    #
    # Ce qu'on mesure desormais, et qui est verifiable ligne a ligne dans le journal :
    #   « Accueil demande en X ms »  : job -> appel de say(). Le chemin qu'on optimise.
    #   « Premier son en Y ms »      : X + le TTFB reel du TTS. Ce que l'appelant attend.
    #   « Accueil termine en Z ms »  : fin de diction. Jamais confondu avec les deux autres.
    premier_son_journalise = False
    t_accueil_demande_ms = 0.0

    @session.on("metrics_collected")
    def _on_metrics(event):
        """Journalise le TTFB du TOUT PREMIER segment TTS de l'appel."""
        nonlocal premier_son_journalise
        metrics = getattr(event, "metrics", None)
        if premier_son_journalise or getattr(metrics, "type", "") != "tts_metrics":
            return
        premier_son_journalise = True
        ttfb_ms = float(getattr(metrics, "ttfb", 0.0)) * 1000
        logger.info(
            "Premier son en %.1f ms — accueil demande a %.1f ms + TTS ttfb %.1f ms "
            "(audio %.2f s, %d car.)",
            t_accueil_demande_ms + ttfb_ms, t_accueil_demande_ms, ttfb_ms,
            float(getattr(metrics, "audio_duration", 0.0)),
            int(getattr(metrics, "characters_count", 0)),
        )
        _nr_record_metric("voixia.premier_son_ms", t_accueil_demande_ms + ttfb_ms)

    # --- Etape 6 : Log-call en fin de session ---
    # caller_phone deja extrait a l etape 2 (avant la resolution du tenant)
    #
    # ⚠️ ENREGISTRE AVANT L'ACCUEIL, comme la capture de transcript. Il l'etait apres :
    # le 20/08 a 08h46, `ctx.add_shutdown_callback` s'est execute 5 ms APRES le
    # raccroche de l'appelant. Ca a tenu par chance ; un appel coupe pendant l'accueil
    # n'aurait laisse aucune trace dans `calls`.

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

    # --- Etape 7 : Demarrage de la session + accueil ---
    # Tout ce qui doit exister PENDANT l'accueil est enregistre au-dessus.
    await session.start(room=ctx.room, agent=agent)

    # Stabilisation du media SIP sortant avant de parler : sans ce delai, le flux
    # RTP vers l appelant n est pas encore etabli au decrochage et le DEBUT du
    # greeting est coupe / bruite ("bonszz...rouche"). ~0.8s suffit a amorcer le
    # track audio. Ne PAS supprimer : session.say() joue sinon dans le vide.
    await asyncio.sleep(GREETING_MEDIA_WARMUP_S)
    logger.info("Session demarree (media stabilise +%.1fs) — envoi du greeting...", GREETING_MEDIA_WARMUP_S)

    # Le greeting est la PREMIERE et UNIQUE prise de parole initiale.
    #
    # ⚠️ PAS DE `await` ICI, ET C'EST LE COEUR DU POSTE 2. `say()` n'est pas une
    # coroutine : elle rend un SpeechHandle (verifie dans la signature de
    # livekit-agents 1.4.6). L'attendre bloquait l'entrypoint jusqu'a la fin de la
    # diction, ce qui (a) faussait toutes les mesures et (b) retardait tout ce qui
    # suivait. Retirer le `await` est sans danger : le job ne se termine pas quand
    # l'entrypoint retourne, il se termine sur la deconnexion de la room
    # (`_shutdown_fut` dans job_proc_lazy_main.py) — verifie dans le SDK installe.
    handle = session.say(greeting)
    t_accueil_demande_ms = (time.perf_counter() - debut_appel) * 1000
    _nr_record_metric("voixia.accueil_demande_ms", t_accueil_demande_ms)
    logger.info(
        "Accueil demande en %.1f ms — LLM : %s (dont %.0f ms de stabilisation media)",
        t_accueil_demande_ms, llm_provider, GREETING_MEDIA_WARMUP_S * 1000,
    )

    async def _journaliser_fin_accueil():
        """Fin de diction — la valeur que l'ancien « Demarrage en » melangeait au reste."""
        try:
            await handle
            logger.info(
                "Accueil termine en %.1f ms — l'agent ecoute.",
                (time.perf_counter() - debut_appel) * 1000,
            )
        except Exception as exc:  # diction interrompue (raccroche, barge-in)
            logger.info("Accueil interrompu avant la fin : %r", exc)

    _lancer_en_fond(_journaliser_fin_accueil())


def prewarm(proc: JobProcess) -> None:
    """
    Prechauffe un process AVANT qu'un appel lui soit confie (poste 4).

    ── POURQUOI (chantier latence, 20/08/2026) ──
    `WorkerOptions` n'avait PAS de `prewarm_fnc`. Les 4 process inactifs existaient
    bien (defaut prod `num_idle_processes = ceil(cpu_count)`), mais ils ne
    prechargeaient rien : `silero.VAD.load()` et l'import des plugins tournaient
    dans `entrypoint`, donc dans le chemin de chaque appel.

    ⚠️ Gain mesure : ~107 ms. Reel, mais ce n'est PAS la ou etaient les secondes —
    on l'ecrit ici pour que personne ne recommence a chercher de ce cote. Les
    secondes etaient dans la regle de dispatch (poste 1) et dans resolve-phone
    (poste 3). Cout : le modele Silero est charge dans chaque process inactif,
    soit ~30 a 60 Mo x 4.
    """
    from livekit.plugins import deepgram, elevenlabs, silero  # noqa: F401

    proc.userdata["vad"] = silero.VAD.load()


if __name__ == "__main__":
    logger.info("Demarrage de l'agent vocal VoixIA (prompt=%s)...", PROMPT_TYPE)
    # num_idle_processes explicite : c'est deja le defaut en mode `start` (prod),
    # mais un defaut qui depend du nombre de vCPU change tout seul le jour ou la
    # machine grossit. 4 process x ~115 Mo + le VAD prechauffe, c'est ce qui a ete
    # mesure et valide ici.
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        num_idle_processes=4,
    ))
