# 🎙️ VoixIA — Projet de développement du moteur vocal IA souverain

## Copie-colle ce prompt dans Claude Code depuis le dossier RACINE de coccinelle-ai

```bash
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai
claude
```

---

## CONTEXTE

Coccinelle.ai est un CRM SaaS français avec assistant vocal IA pour les TPE/PME.

Aujourd'hui, l'assistant vocal utilise **Retell.ai** — une plateforme américaine fermée qui :
- Coûte 0,115$/min (trop cher à l'échelle)
- Héberge les données vocales aux États-Unis (problème RGPD)
- Nous rend dépendant d'un fournisseur unique
- Nous empêche de différencier techniquement

**VoixIA** est notre projet de remplacement : un moteur vocal IA open source, hébergé en Europe, 100% souverain.

## ARCHITECTURE CIBLE

```
Client appelle le numéro français
        ↓
    TWILIO (téléphonie, SIP trunking — reste inchangé)
        ↓
    LIVEKIT (transport audio WebRTC, self-hosted EU)
        ↓
    DEEPGRAM (Speech-to-Text, reconnaissance vocale)
        ↓
    MISTRAL / CLAUDE (LLM, intelligence conversationnelle)
        ↓
    ELEVENLABS / CARTESIA (Text-to-Speech, synthèse vocale)
        ↓
    LIVEKIT → TWILIO → Client entend la réponse
```

### Briques technologiques

| Brique | Rôle | Fournisseur | Alternative |
|--------|------|-------------|-------------|
| Téléphonie | Numéro de tel, réseau mobile/fixe | Twilio (existant) | — |
| SIP → WebRTC | Pont entre téléphonie et WebRTC | LiveKit SIP Trunk | Jambonz |
| Transport audio | Streaming audio temps réel | LiveKit (open source, self-hosted) | — |
| STT | Reconnaissance vocale | Deepgram Nova 3 | Whisper (open source) |
| LLM | Intelligence, génération de réponse | Mistral (français) | Claude (Anthropic) |
| TTS | Synthèse vocale | ElevenLabs | Cartesia, Google TTS |
| Orchestration | Pipeline STT→LLM→TTS, turn detection | LiveKit Agents SDK (Python) | — |
| Hébergement | Serveurs | Scaleway (France) ou OVH | Cloudflare |
| Tool calls | Actions pendant l'appel (RDV, SMS, email) | API Coccinelle existante | — |

### Stack technique

- **LiveKit Server** : self-hosted sur Scaleway (Paris)
- **LiveKit Agents SDK** : Python, pipeline STT-LLM-TTS
- **Intégration Twilio** : SIP trunking vers LiveKit
- **Backend Coccinelle** : Cloudflare Workers (existant, inchangé)
- **Frontend** : Next.js 15 (existant, inchangé)

## CE QUE L'ON DÉVELOPPE

### Phase 1 — Proof of Concept (2-3 semaines)

**Objectif** : Un appel téléphonique entrant traité par notre propre pipeline vocal, sans Retell.

#### Agent 1 — Infrastructure LiveKit (Backend)

**Mission** : Mettre en place le serveur LiveKit et le pont SIP avec Twilio.

**Tâches** :
1. Créer un `docker-compose.yml` avec LiveKit Server
2. Configurer le SIP trunk entre Twilio et LiveKit
   - Twilio reçoit l'appel sur le numéro français
   - Twilio forwarde vers LiveKit via SIP
   - LiveKit crée une "room" pour l'appel
3. Créer le fichier de config LiveKit (`livekit.yaml`)
   - Ports, certificats SSL, région EU
4. Script de déploiement sur Scaleway (ou en local Docker pour les tests)
5. Tester qu'un appel Twilio arrive bien dans une room LiveKit

**Fichiers à créer** :
```
voixia/
├── docker-compose.yml
├── livekit.yaml
├── deploy.sh
├── .env.example
└── README.md
```

**Documentation à lire** :
- https://docs.livekit.io/home/self-hosting/local/
- https://docs.livekit.io/sip/trunk/inbound-trunk/
- https://docs.livekit.io/sip/trunk/twilio/

#### Agent 2 — Pipeline vocal (Agent Python)

**Mission** : Créer l'agent vocal qui écoute, comprend et répond.

**Tâches** :
1. Installer LiveKit Agents SDK (`pip install livekit-agents[deepgram,openai,silero,cartesia]`)
2. Créer l'agent Python de base :
   - VAD (Voice Activity Detection) avec Silero
   - STT avec Deepgram Nova 3 (français)
   - LLM avec Mistral (via API compatible OpenAI) OU Claude
   - TTS avec ElevenLabs ou Cartesia
3. Configurer le turn detection (quand l'utilisateur a fini de parler)
4. Gérer les interruptions (l'utilisateur coupe l'agent)
5. Prompt système de l'assistant :
   - Accueil en français
   - Identification du besoin (RDV, renseignement, autre)
   - Ton professionnel et chaleureux
6. Tester en local avec le Agents Playground de LiveKit

**Fichiers à créer** :
```
voixia/
├── agent/
│   ├── main.py              # Point d'entrée de l'agent
│   ├── pipeline.py           # Pipeline STT→LLM→TTS
│   ├── prompts.py            # Prompts système en français
│   ├── config.py             # Configuration (modèles, voix, langue)
│   └── requirements.txt
```

**Code de base pour main.py** :
```python
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import deepgram, openai, silero, cartesia

async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()

    agent = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=deepgram.STT(language="fr"),
        llm=openai.LLM(
            model="mistral-large-latest",
            base_url="https://api.mistral.ai/v1",
        ),
        tts=cartesia.TTS(voice="a167e0f3-df7e-4277-976b-f722e6380466"),  # Voix française
        chat_ctx=initial_chat_context(),
    )

    agent.start(ctx.room, participant)
    await agent.say("Bonjour ! Comment puis-je vous aider ?", allow_interruptions=True)

def initial_chat_context():
    ctx = llm.ChatContext()
    ctx.append(
        role="system",
        text="""Tu es l'assistant vocal de l'entreprise. Tu parles en français.
Tu dois :
- Accueillir chaleureusement le client
- Comprendre son besoin (rendez-vous, renseignement, réclamation)
- Renseigner sur les services et tarifs
- Proposer un rendez-vous si pertinent
- Confirmer par SMS si le client le souhaite
Sois naturel, professionnel et concis.""",
    )
    return ctx

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

**Documentation à lire** :
- https://docs.livekit.io/agents/quickstarts/voice-agent/
- https://docs.livekit.io/agents/overview/
- https://github.com/livekit/agents/tree/main/examples

#### Agent 3 — Tool Calls (intégration Coccinelle)

**Mission** : Connecter l'agent vocal aux fonctions Coccinelle existantes.

**Tâches** :
1. Définir les tools disponibles pour l'agent LLM :
   - `book_appointment` : prendre un RDV → POST /api/v1/appointments
   - `check_availability` : vérifier les créneaux → GET /api/v1/appointments/availability
   - `search_products` : chercher dans le catalogue → GET /api/v1/products
   - `search_knowledge` : chercher dans la base de connaissances → POST /api/v1/knowledge/search
   - `send_sms` : envoyer un SMS de confirmation → POST /api/v1/twilio/sms/send
   - `send_email` : envoyer un email de confirmation → via le module email
   - `create_prospect` : créer un prospect dans le CRM → POST /api/v1/prospects
2. Implémenter chaque tool call comme fonction Python qui appelle l'API Coccinelle
3. Enregistrer les tools dans le pipeline LLM de l'agent
4. Tester chaque tool call en conversation

**Fichiers à créer** :
```
voixia/
├── agent/
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── appointments.py    # book_appointment, check_availability
│   │   ├── products.py        # search_products
│   │   ├── knowledge.py       # search_knowledge
│   │   ├── messaging.py       # send_sms, send_email
│   │   └── crm.py             # create_prospect
│   └── ...
```

**Pattern pour un tool call** :
```python
from livekit.agents import llm
import httpx

API_BASE = "https://coccinelle-api.youssef-amrouche.workers.dev"

class CoccinelleTools(llm.FunctionContext):

    @llm.ai_callable(description="Prendre un rendez-vous pour le client")
    async def book_appointment(
        self,
        customer_name: str,
        customer_phone: str,
        date_time: str,
        service: str = "",
    ):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE}/api/v1/appointments",
                json={
                    "customer_name": customer_name,
                    "customer_phone": customer_phone,
                    "date_time": date_time,
                    "notes": service,
                },
                headers={"Authorization": f"Bearer {self.api_token}"},
            )
            data = response.json()
            return f"Rendez-vous confirmé le {date_time} pour {customer_name}."

    @llm.ai_callable(description="Envoyer un SMS de confirmation au client")
    async def send_sms(
        self,
        to: str,
        message: str,
    ):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE}/api/v1/twilio/sms/send",
                json={"to": to, "message": message},
                headers={"Authorization": f"Bearer {self.api_token}"},
            )
            return "SMS envoyé avec succès."
```

### Phase 2 — Intégration Coccinelle (2-3 semaines après Phase 1)

1. **Multi-tenant** : chaque tenant Coccinelle a sa propre config vocale (prompt, voix, services)
2. **Webhook de fin d'appel** : enregistrer le résumé, la transcription et les actions dans le CRM
3. **Enregistrement audio** : stocker les appels dans Cloudflare R2 (existant)
4. **Widget web** : bouton "Parler à l'assistant" embeddable dans le site du client (et dans la LP Coccinelle)
5. **Choix du modèle IA** : interface dans les settings pour choisir entre Mistral et Claude
6. **Analytics** : durée d'appel, nombre d'appels, taux de prise de RDV, satisfaction

### Phase 3 — Production (2-3 semaines après Phase 2)

1. Déploiement sur Scaleway (Paris) avec redondance
2. Monitoring et alertes (latence, erreurs, disponibilité)
3. Migration progressive des clients de Retell vers VoixIA
4. Documentation technique et guide de migration
5. Tests de charge (100 appels simultanés)

## CONTRAINTES

- **Langue** : Français uniquement pour la Phase 1. Multi-langues en Phase 3.
- **Latence cible** : < 800ms entre la fin de la phrase du client et le début de la réponse
- **RGPD** : AUCUNE donnée vocale ne doit quitter l'Union Européenne
- **Compatibilité** : L'API Coccinelle existante ne doit PAS être modifiée. VoixIA appelle les endpoints existants.
- **Twilio** : Le numéro français Twilio (+33 9 39 03 57 60) reste le même. Seul le routage change (Retell → LiveKit).
- **Coût** : Le coût par minute doit être inférieur à 0,05€ (vs 0,115€ avec Retell)

## LIVRABLES

### Phase 1 (PoC)
- [ ] LiveKit Server fonctionnel en Docker
- [ ] SIP trunk Twilio → LiveKit configuré
- [ ] Agent Python avec pipeline STT→LLM→TTS en français
- [ ] Un appel entrant traité de bout en bout sans Retell
- [ ] Latence mesurée et documentée

### Phase 2 (Intégration)
- [ ] Tool calls connectés à l'API Coccinelle
- [ ] Multi-tenant fonctionnel
- [ ] Widget web embeddable
- [ ] Choix Mistral / Claude dans les settings
- [ ] Enregistrement et transcription stockés

### Phase 3 (Production)
- [ ] Déployé sur Scaleway Paris
- [ ] 100 appels simultanés testés
- [ ] Migration Retell → VoixIA documentée
- [ ] Monitoring en place

## STRUCTURE DES FICHIERS

```
/Users/amrouche.7/match-immo-mcp/coccinelle-ai/
├── voixia/                          # ← NOUVEAU DOSSIER
│   ├── docker-compose.yml           # LiveKit Server + Redis
│   ├── livekit.yaml                 # Config LiveKit
│   ├── deploy.sh                    # Script déploiement
│   ├── .env.example                 # Variables d'environnement
│   ├── README.md                    # Documentation
│   ├── agent/
│   │   ├── main.py                  # Point d'entrée agent
│   │   ├── pipeline.py              # Pipeline vocal
│   │   ├── prompts.py               # Prompts système FR
│   │   ├── config.py                # Configuration
│   │   ├── requirements.txt         # Dépendances Python
│   │   └── tools/
│   │       ├── __init__.py
│   │       ├── appointments.py      # Prise de RDV
│   │       ├── products.py          # Recherche catalogue
│   │       ├── knowledge.py         # Base de connaissances
│   │       ├── messaging.py         # SMS + Email
│   │       └── crm.py              # Prospects
│   ├── sip/
│   │   ├── twilio-trunk.json        # Config SIP Twilio
│   │   └── dispatch-rules.json      # Règles de routage
│   └── widget/
│       ├── embed.js                 # Widget embeddable
│       └── embed.css                # Styles widget
├── src/                             # Backend existant (INCHANGÉ)
├── coccinelle-saas/                 # Frontend existant (INCHANGÉ)
└── ...
```

## COMMANDES UTILES

```bash
# Lancer LiveKit en local
cd voixia && docker-compose up -d

# Lancer l'agent Python
cd voixia/agent && pip install -r requirements.txt && python main.py dev

# Tester avec le playground LiveKit
# Aller sur https://agents-playground.livekit.io

# Voir les logs LiveKit
docker logs livekit-server -f
```

## APIS ET CLÉS NÉCESSAIRES

| Service | Variable d'environnement | À obtenir sur |
|---------|--------------------------|---------------|
| LiveKit | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Généré localement |
| Deepgram | `DEEPGRAM_API_KEY` | https://console.deepgram.com |
| Mistral | `MISTRAL_API_KEY` | https://console.mistral.ai |
| ElevenLabs | `ELEVENLABS_API_KEY` | https://elevenlabs.io |
| Coccinelle API | `COCCINELLE_API_TOKEN` | Token auth du tenant |

## IMPORTANT

- NE PAS modifier le backend Cloudflare Workers existant
- NE PAS modifier le frontend Next.js existant
- Tout le code VoixIA va dans le dossier `/voixia/`
- L'intégration avec Coccinelle se fait UNIQUEMENT via les endpoints API existants
- Commencer par la Phase 1 uniquement — ne pas anticiper les phases suivantes
- Documenter chaque étape dans le README.md

Go. Phase 1 uniquement. 3 agents en parallèle.
