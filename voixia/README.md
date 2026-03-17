# VoixIA — Agent Vocal IA pour Coccinelle.ai

Infrastructure LiveKit self-hosted pour remplacer Retell.ai. Transport audio WebRTC avec SIP trunk Twilio pour les appels telephoniques entrants.

## Architecture

```
Appel telephonique                    Navigateur web
       |                                    |
  +33939035760                         Widget WebRTC
       |                                    |
   Twilio SIP                               |
       |                                    |
       v                                    v
+------------------------------------------------------+
|              LiveKit Server (WebRTC SFU)              |
|              Port 7880 (HTTP/WS)                      |
|              Port 7881 (ICE/TCP)                      |
|              Port 7882 (ICE/UDP)                      |
+------------------------------------------------------+
       |                    |                    |
       v                    v                    v
  LiveKit SIP          Agent VoixIA          Egress
  (port 5060)          (Python)             (optionnel)
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
          Deepgram      Mistral AI    ElevenLabs
           (STT)          (LLM)         (TTS)
              |             |             |
              v             v             v
         Transcrit     Comprend &     Synthetise
          l'audio      repond          la voix
```

### Composants

| Service | Role | Port |
|---------|------|------|
| **LiveKit Server** | Serveur WebRTC (signaling + media) | 7880, 7881, 7882 |
| **LiveKit SIP** | Bridge SIP vers WebRTC | 5060 (UDP/TCP) |
| **Redis** | Cache et etat des rooms LiveKit | 6379 (interne) |
| **Egress** | Enregistrement des appels (optionnel) | - |
| **Agent VoixIA** | Agent vocal Python (STT + LLM + TTS) | - |

### Pipeline vocal

1. **Appel entrant** : Twilio recoit l'appel sur +33939035760
2. **SIP Bridge** : Twilio route vers LiveKit SIP (port 5060)
3. **Room creation** : LiveKit cree une room `voixia-call-<id>`
4. **Agent dispatch** : L'agent VoixIA rejoint la room
5. **STT** : Deepgram transcrit l'audio en texte (francais, nova-2)
6. **LLM** : Mistral AI genere la reponse
7. **TTS** : ElevenLabs synthetise la voix
8. **Audio** : La reponse audio est envoyee au participant

## Prerequis

- **Docker Desktop** >= 4.25 (avec Docker Compose v2)
- **Cle API Deepgram** : [console.deepgram.com](https://console.deepgram.com/signup)
- **Cle API Mistral** : [console.mistral.ai](https://console.mistral.ai/)
- **Cle API ElevenLabs** : [elevenlabs.io](https://elevenlabs.io/)
- **Compte Twilio** (pour les appels telephoniques) : [twilio.com](https://www.twilio.com/)
- **LiveKit CLI** (optionnel, pour configurer SIP) : `brew install livekit-cli`

## Installation

### 1. Cloner et preparer

```bash
cd voixia/
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
nano .env   # ou vim, code, etc.
```

Remplissez au minimum :
- `DEEPGRAM_API_KEY`
- `MISTRAL_API_KEY`
- `ELEVENLABS_API_KEY`

Les cles LiveKit seront generees automatiquement par le script de deploiement.

### 3. Lancer l'infrastructure

```bash
./deploy.sh dev
```

Le script va :
- Verifier les prerequis (Docker, fichiers)
- Generer des cles LiveKit si necessaire
- Demarrer Redis, LiveKit Server, et le SIP bridge
- Verifier que LiveKit repond
- Afficher les URLs d'acces

### 4. Configurer le SIP trunk (une seule fois)

```bash
# Installer le CLI LiveKit si pas deja fait
brew install livekit-cli

# Configurer le CLI
export LIVEKIT_URL=http://localhost:7880
export LIVEKIT_API_KEY=$(grep LIVEKIT_API_KEY .env | cut -d= -f2)
export LIVEKIT_API_SECRET=$(grep LIVEKIT_API_SECRET .env | cut -d= -f2)

# Creer le trunk SIP inbound
lk sip inbound create sip/twilio-trunk.json

# Creer la regle de dispatch
lk sip dispatch create sip/dispatch-rules.json
```

### 5. Configurer Twilio (une seule fois)

1. Aller dans la [console Twilio](https://console.twilio.com/)
2. **Elastic SIP Trunking** > **Trunks** > **Creer un trunk**
3. Ajouter une **Origination URI** : `sip://<IP_SERVEUR>:5060;transport=udp`
4. Associer le numero **+33939035760** au trunk

## Test avec le Playground LiveKit

Le Playground LiveKit permet de tester la connexion WebRTC sans agent :

1. Ouvrir [agents-playground.livekit.io](https://agents-playground.livekit.io/)
2. Entrer les informations :
   - **URL** : `ws://localhost:7880`
   - **API Key** : (voir fichier `.env`)
   - **API Secret** : (voir fichier `.env`)
3. Creer une room et rejoindre
4. Verifier que l'audio fonctionne

## Structure des fichiers

```
voixia/
├── docker-compose.yml      # Infrastructure Docker (LiveKit, SIP, Redis, Egress)
├── livekit.yaml            # Configuration du serveur LiveKit
├── deploy.sh               # Script de deploiement (dev/prod)
├── .env.example            # Template des variables d'environnement
├── .env                    # Variables d'environnement (non versionne)
├── README.md               # Cette documentation
│
├── sip/
│   ├── twilio-trunk.json   # Configuration du SIP trunk Twilio inbound
│   └── dispatch-rules.json # Regles de dispatch des appels SIP vers les rooms
│
├── agent/                  # Agent vocal Python (LiveKit Agents SDK)
│   ├── worker.py           # Point d'entree de l'agent
│   ├── pipeline.py         # Pipeline STT → LLM → TTS
│   ├── prompts.py          # Prompts systeme pour Mistral
│   ├── tools.py            # Fonctions appelables par le LLM (API Coccinelle)
│   ├── requirements.txt    # Dependances Python
│   ├── Dockerfile          # Image Docker de l'agent
│   └── .env.example        # Variables specifiques a l'agent
│
└── widget/                 # Widget WebRTC pour le navigateur
    ├── VoixiaWidget.tsx    # Composant React
    └── useVoixia.ts        # Hook React pour LiveKit
```

## Commandes utiles

### Gestion des containers

```bash
# Demarrer en mode dev
./deploy.sh dev

# Demarrer en mode prod (Scaleway)
./deploy.sh prod

# Arreter tous les services
./deploy.sh stop

# Voir les logs en temps reel
./deploy.sh logs

# Etat des services
./deploy.sh status

# Redemarrer un service specifique
docker compose restart livekit
docker compose restart sip
```

### Activer l'enregistrement des appels

```bash
# Demarrer avec le profil "recording"
docker compose --profile recording up -d
```

### Gestion SIP avec le CLI LiveKit

```bash
# Lister les trunks SIP
lk sip inbound list

# Lister les dispatch rules
lk sip dispatch list

# Supprimer un trunk
lk sip inbound delete <trunk_id>

# Lister les rooms actives
lk room list

# Lister les participants d'une room
lk room participants <room_name>
```

### Debug

```bash
# Logs d'un service specifique
docker compose logs -f livekit
docker compose logs -f sip
docker compose logs -f redis

# Verifier que LiveKit repond
curl http://localhost:7880

# Verifier l'etat de Redis
docker compose exec redis redis-cli ping
```

## Deploiement en production (Scaleway Paris)

### 1. Provisionner un serveur

- Instance **DEV1-M** (3 vCPU, 4 Go RAM) minimum
- Region : **Paris (fr-par-1)**
- OS : Ubuntu 22.04 ou Debian 12
- Installer Docker et Docker Compose

### 2. Configurer le firewall

Ports a ouvrir :

| Port | Protocole | Usage |
|------|-----------|-------|
| 7880 | TCP | API LiveKit + WebSocket |
| 7881 | TCP | ICE/TCP (WebRTC fallback) |
| 7882 | UDP | ICE/UDP (WebRTC media) |
| 5060 | UDP + TCP | SIP signaling |
| 10000-10100 | UDP | RTP media SIP |
| 50000-50060 | UDP | RTP media WebRTC |
| 443 | TCP | HTTPS (reverse proxy) |

### 3. Reverse proxy TLS

Utiliser Caddy ou Nginx avec un certificat Let's Encrypt :

```
voixia.coccinelle.ai → localhost:7880
```

### 4. Deployer

```bash
./deploy.sh prod
```

### 5. Configurer Twilio

Mettre a jour l'Origination URI avec l'IP publique du serveur Scaleway :
```
sip://<IP_PUBLIQUE_SCALEWAY>:5060;transport=udp
```

## Troubleshooting

### LiveKit ne demarre pas

```bash
# Verifier les logs
docker compose logs livekit

# Verifier que Redis est accessible
docker compose exec livekit wget -qO- http://localhost:7880/ || echo "KO"

# Verifier la config YAML
docker compose exec livekit cat /etc/livekit.yaml
```

### Le SIP bridge ne recoit pas les appels

1. Verifier que le port 5060 est ouvert : `nc -zvu localhost 5060`
2. Verifier les logs SIP : `docker compose logs -f sip`
3. Verifier que le trunk est cree : `lk sip inbound list`
4. Verifier que la dispatch rule existe : `lk sip dispatch list`
5. Verifier la configuration Twilio (Origination URI correcte)

### Problemes audio (pas de son, coupures)

1. Verifier les ports UDP (7882, 50000-50060)
2. Verifier que `use_external_ip: true` dans `livekit.yaml`
3. En local derriere un NAT, le TURN integre devrait aider
4. Verifier les logs pour des erreurs ICE : `docker compose logs -f livekit | grep ICE`

### Erreur de cles API

```bash
# Regenerer les cles LiveKit
# Supprimer les cles existantes dans .env
sed -i 's/^LIVEKIT_API_KEY=.*/LIVEKIT_API_KEY=devkey/' .env
# Relancer le deploiement (les cles seront regenerees)
./deploy.sh dev
```

## Licence

Projet interne Coccinelle.ai — Tous droits reserves.
