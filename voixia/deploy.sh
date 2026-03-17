#!/usr/bin/env bash
# =============================================================================
# VoixIA — Script de deploiement LiveKit
# =============================================================================
# Usage:
#   ./deploy.sh          → Mode dev (local, Docker Desktop)
#   ./deploy.sh prod     → Mode prod (Scaleway Paris)
#   ./deploy.sh stop     → Arreter les containers
#   ./deploy.sh logs     → Voir les logs
#   ./deploy.sh status   → Etat des services
# =============================================================================

set -euo pipefail

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Repertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# Fonctions utilitaires
# ---------------------------------------------------------------------------
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERREUR]${NC} $1"; }

# ---------------------------------------------------------------------------
# Verification des prerequis
# ---------------------------------------------------------------------------
check_prerequisites() {
    log_info "Verification des prerequis..."

    # Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installe. Installez Docker Desktop: https://docs.docker.com/desktop/"
        exit 1
    fi
    log_success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

    # Docker Compose v2
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose v2 n'est pas disponible. Mettez a jour Docker Desktop."
        exit 1
    fi
    log_success "Docker Compose $(docker compose version --short)"

    # Fichier .env
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        log_warn "Fichier .env absent. Creation a partir de .env.example..."
        if [ -f "$SCRIPT_DIR/.env.example" ]; then
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
            log_info "Fichier .env cree. Editez-le avec vos cles API avant de continuer."
        else
            log_error "Fichier .env.example introuvable."
            exit 1
        fi
    fi
    log_success "Fichier .env present"

    # livekit.yaml
    if [ ! -f "$SCRIPT_DIR/livekit.yaml" ]; then
        log_error "Fichier livekit.yaml introuvable."
        exit 1
    fi
    log_success "Fichier livekit.yaml present"

    echo ""
}

# ---------------------------------------------------------------------------
# Generation des cles LiveKit si absentes
# ---------------------------------------------------------------------------
generate_livekit_keys() {
    source "$SCRIPT_DIR/.env"

    if [ "${LIVEKIT_API_KEY:-devkey}" = "devkey" ] || [ "${LIVEKIT_API_KEY:-}" = "CHANGEZ_MOI_cle_api" ] || [ -z "${LIVEKIT_API_KEY:-}" ]; then
        log_warn "Cles LiveKit par defaut detectees. Generation de nouvelles cles..."

        # Generer une cle API (prefixe API + 12 caracteres aleatoires)
        NEW_API_KEY="API$(openssl rand -hex 6)"
        # Generer un secret (32 caracteres aleatoires)
        NEW_API_SECRET="$(openssl rand -base64 32 | tr -d '=/+' | head -c 32)"

        # Mettre a jour le .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=${NEW_API_KEY}|" "$SCRIPT_DIR/.env"
            sed -i '' "s|^LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=${NEW_API_SECRET}|" "$SCRIPT_DIR/.env"
        else
            # Linux
            sed -i "s|^LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=${NEW_API_KEY}|" "$SCRIPT_DIR/.env"
            sed -i "s|^LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=${NEW_API_SECRET}|" "$SCRIPT_DIR/.env"
        fi

        # Mettre a jour livekit.yaml avec la nouvelle cle
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^  devkey:.*|  ${NEW_API_KEY}: ${NEW_API_SECRET}|" "$SCRIPT_DIR/livekit.yaml"
            sed -i '' "s|^  API[a-f0-9]*:.*|  ${NEW_API_KEY}: ${NEW_API_SECRET}|" "$SCRIPT_DIR/livekit.yaml"
        else
            sed -i "s|^  devkey:.*|  ${NEW_API_KEY}: ${NEW_API_SECRET}|" "$SCRIPT_DIR/livekit.yaml"
            sed -i "s|^  API[a-f0-9]*:.*|  ${NEW_API_KEY}: ${NEW_API_SECRET}|" "$SCRIPT_DIR/livekit.yaml"
        fi

        log_success "Nouvelles cles generees:"
        echo -e "  ${BLUE}LIVEKIT_API_KEY${NC}    = ${NEW_API_KEY}"
        echo -e "  ${BLUE}LIVEKIT_API_SECRET${NC} = ${NEW_API_SECRET}"
        echo ""

        # Recharger le .env
        source "$SCRIPT_DIR/.env"
    else
        log_success "Cles LiveKit configurees (API_KEY: ${LIVEKIT_API_KEY:0:8}...)"
    fi
}

# ---------------------------------------------------------------------------
# Health check des services
# ---------------------------------------------------------------------------
wait_for_health() {
    local service_name="$1"
    local url="$2"
    local max_retries=30
    local retry=0

    log_info "Attente du demarrage de ${service_name}..."
    while [ $retry -lt $max_retries ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "${service_name} est operationnel!"
            return 0
        fi
        retry=$((retry + 1))
        sleep 2
    done

    log_error "${service_name} n'a pas demarre apres ${max_retries} tentatives."
    return 1
}

# ---------------------------------------------------------------------------
# Affichage des URLs et infos
# ---------------------------------------------------------------------------
show_info() {
    local mode="${1:-dev}"
    local host="localhost"

    if [ "$mode" = "prod" ]; then
        host="${LIVEKIT_HOST:-voixia.coccinelle.ai}"
    fi

    echo ""
    echo -e "${GREEN}=========================================================${NC}"
    echo -e "${GREEN}  VoixIA — Infrastructure LiveKit demarree!${NC}"
    echo -e "${GREEN}=========================================================${NC}"
    echo ""
    echo -e "  ${BLUE}Mode:${NC}              ${mode}"
    echo -e "  ${BLUE}LiveKit API:${NC}       http://${host}:7880"
    echo -e "  ${BLUE}LiveKit WS:${NC}        ws://${host}:7880"
    echo -e "  ${BLUE}SIP (UDP/TCP):${NC}     ${host}:5060"
    echo -e "  ${BLUE}WebRTC TCP:${NC}        ${host}:7881"
    echo -e "  ${BLUE}WebRTC UDP:${NC}        ${host}:7882"
    echo ""
    echo -e "  ${YELLOW}Playground LiveKit:${NC}"
    echo -e "  https://agents-playground.livekit.io/"
    echo -e "  → URL: ws://${host}:7880"
    echo -e "  → API Key: ${LIVEKIT_API_KEY:-devkey}"
    echo -e "  → API Secret: (voir fichier .env)"
    echo ""
    echo -e "  ${YELLOW}Commandes utiles:${NC}"
    echo -e "  docker compose logs -f          # Voir les logs"
    echo -e "  docker compose ps               # Etat des services"
    echo -e "  docker compose down              # Arreter tout"
    echo -e "  docker compose restart livekit   # Redemarrer LiveKit"
    echo ""

    if [ "$mode" = "dev" ]; then
        echo -e "  ${YELLOW}Configuration SIP (a faire une fois):${NC}"
        echo -e "  lk sip inbound create sip/twilio-trunk.json"
        echo -e "  lk sip dispatch create sip/dispatch-rules.json"
        echo ""
    fi
}

# ---------------------------------------------------------------------------
# Mode DEV — Lancement local
# ---------------------------------------------------------------------------
deploy_dev() {
    log_info "=== Deploiement en mode DEV (local) ==="
    echo ""

    check_prerequisites
    generate_livekit_keys

    log_info "Demarrage des containers..."
    docker compose --env-file .env up -d

    # Health check
    wait_for_health "LiveKit Server" "http://localhost:7880"

    # Verifier les containers
    echo ""
    log_info "Etat des containers:"
    docker compose ps

    show_info "dev"
}

# ---------------------------------------------------------------------------
# Mode PROD — Deploiement Scaleway Paris
# ---------------------------------------------------------------------------
deploy_prod() {
    log_info "=== Deploiement en mode PROD (Scaleway Paris) ==="
    echo ""

    check_prerequisites
    generate_livekit_keys

    # Verifications supplementaires pour la prod
    source "$SCRIPT_DIR/.env"

    if [ "${DEEPGRAM_API_KEY:-CHANGEZ_MOI}" = "CHANGEZ_MOI" ] || [ -z "${DEEPGRAM_API_KEY:-}" ]; then
        log_error "DEEPGRAM_API_KEY non configuree dans .env"
        exit 1
    fi
    if [ "${MISTRAL_API_KEY:-CHANGEZ_MOI}" = "CHANGEZ_MOI" ] || [ -z "${MISTRAL_API_KEY:-}" ]; then
        log_error "MISTRAL_API_KEY non configuree dans .env"
        exit 1
    fi
    if [ "${ELEVENLABS_API_KEY:-CHANGEZ_MOI}" = "CHANGEZ_MOI" ] || [ -z "${ELEVENLABS_API_KEY:-}" ]; then
        log_error "ELEVENLABS_API_KEY non configuree dans .env"
        exit 1
    fi

    log_success "Toutes les cles API sont configurees"

    # Retirer le flag --dev de la commande LiveKit
    log_info "Configuration production: suppression du flag --dev..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|command: --config /etc/livekit.yaml --dev|command: --config /etc/livekit.yaml|' "$SCRIPT_DIR/docker-compose.yml"
    else
        sed -i 's|command: --config /etc/livekit.yaml --dev|command: --config /etc/livekit.yaml|' "$SCRIPT_DIR/docker-compose.yml"
    fi

    log_info "Demarrage des containers en production..."
    docker compose --env-file .env up -d

    # Health check
    wait_for_health "LiveKit Server" "http://localhost:7880"

    echo ""
    log_info "Etat des containers:"
    docker compose ps

    show_info "prod"

    echo -e "${YELLOW}[RAPPEL PROD]${NC} Pensez a:"
    echo "  1. Configurer le firewall (ports 7880, 7881, 7882, 5060)"
    echo "  2. Mettre en place un reverse proxy avec TLS (Caddy/Nginx)"
    echo "  3. Configurer le SIP trunk Twilio avec l'IP publique du serveur"
    echo "  4. Creer les SIP trunks: lk sip inbound create sip/twilio-trunk.json"
    echo "  5. Creer les dispatch rules: lk sip dispatch create sip/dispatch-rules.json"
    echo ""
}

# ---------------------------------------------------------------------------
# Commandes de gestion
# ---------------------------------------------------------------------------
stop_services() {
    log_info "Arret des containers VoixIA..."
    docker compose down
    log_success "Tous les containers sont arretes."
}

show_logs() {
    docker compose logs -f --tail=100
}

show_status() {
    echo ""
    log_info "Etat des services VoixIA:"
    echo ""
    docker compose ps
    echo ""

    # Verifier la sante de LiveKit
    if curl -sf "http://localhost:7880/" > /dev/null 2>&1; then
        log_success "LiveKit Server: operationnel"
    else
        log_error "LiveKit Server: injoignable"
    fi
}

# ---------------------------------------------------------------------------
# Point d'entree
# ---------------------------------------------------------------------------
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       VoixIA — Deploiement LiveKit       ║${NC}"
echo -e "${BLUE}║         Coccinelle.ai CRM SaaS           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

case "${1:-dev}" in
    dev|local)
        deploy_dev
        ;;
    prod|production)
        deploy_prod
        ;;
    stop|down)
        stop_services
        ;;
    logs)
        show_logs
        ;;
    status|ps)
        show_status
        ;;
    *)
        echo "Usage: $0 {dev|prod|stop|logs|status}"
        echo ""
        echo "  dev    — Demarrage local (Docker Desktop)"
        echo "  prod   — Deploiement production (Scaleway Paris)"
        echo "  stop   — Arreter tous les containers"
        echo "  logs   — Afficher les logs en temps reel"
        echo "  status — Etat des services"
        exit 1
        ;;
esac
