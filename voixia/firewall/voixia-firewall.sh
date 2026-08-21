#!/usr/bin/env bash
# =============================================================================
# VoixIA — Referme les ports que Docker publie sur 0.0.0.0 et que rien
# d'exterieur ne consomme legitimement.
# =============================================================================
# POURQUOI UNE UNITE DEDIEE PLUTOT QUE `iptables-persistent` :
# `netfilter-persistent` restaure un instantane de TOUTES les tables, y compris
# les chaines que Docker gere lui-meme et reconstruit a chaque demarrage (DOCKER,
# DOCKER-ISOLATION-*, nat/DOCKER avec les DNAT de chaque conteneur). Restaurer cet
# instantane AVANT `dockerd`, c'est reinjecter des regles de NAT pointant vers des
# IP de conteneurs qui n'existent plus. Ici on ne gere que NOS regles, et Docker
# garde les siennes.
#
# ⚠️ `ufw deny 7880` ne fermerait RIEN : le trafic v4 vers un port publie par
# Docker est DNAT en nat/PREROUTING puis traverse FORWARD, jamais INPUT. C'est
# DOCKER-USER qui fait foi. Le trafic v6, lui, passe par docker-proxy en espace
# utilisateur, donc par INPUT (Docker IPv6 est desactive sur cette machine).
#
# NE FERME PAS : 22 (SSH), 5060 (SIP — necessaire depuis Twilio),
# 50100-50500/udp (media WebRTC). Voir LOT-ROTATION-LIVEKIT.md § 4.3.
# =============================================================================
set -u

IF="ens2"                          # interface publique
PORTS_FORWARD="7880,7881,6380"     # publies par Docker -> DOCKER-USER
PORTS_INPUT="7880,7881,6380,8081"  # residuel docker-proxy + 8081 (agent Python)

log() { logger -t voixia-firewall "$*"; echo "voixia-firewall: $*"; }

# Docker doit avoir cree DOCKER-USER avant qu'on ecrive dedans. `After=docker.service`
# garantit que l'unite a demarre, pas que la chaine existe : on attend, borne.
for _ in $(seq 1 30); do
  iptables -S DOCKER-USER >/dev/null 2>&1 && break
  sleep 1
done
if ! iptables -S DOCKER-USER >/dev/null 2>&1; then
  log "ECHEC : chaine DOCKER-USER absente apres 30 s — les ports restent OUVERTS"
  exit 1
fi

# Idempotent : on retire toutes les occurrences, puis on en pose exactement une.
poser() {
  local cmd="$1" chaine="$2"; shift 2
  while "$cmd" -D "$chaine" "$@" 2>/dev/null; do :; done
  "$cmd" -I "$chaine" 1 "$@"
}

poser iptables  DOCKER-USER -i "$IF" -p tcp -m multiport --dports "$PORTS_FORWARD" -j DROP
poser iptables  INPUT       -i "$IF" -p tcp -m multiport --dports "$PORTS_INPUT"   -j DROP
poser ip6tables INPUT       -i "$IF" -p tcp -m multiport --dports "$PORTS_INPUT"   -j DROP

# Defense supplementaire : acces direct a l'IP du conteneur Redis depuis l'exterieur.
# L'IP est resolue A CHAUD — la figer en dur donne une regle qui devient fausse en
# silence le jour ou le reseau Docker est recree.
REDIS_IP="$(docker inspect voixia-redis --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || true)"
if [ -n "${REDIS_IP:-}" ]; then
  poser iptables DOCKER-USER -d "$REDIS_IP/32" -i "$IF" -p tcp --dport 6379 -j DROP
  log "regles posees (redis=$REDIS_IP)"
else
  log "AVERTISSEMENT : IP du conteneur Redis introuvable — regle 6379 non posee"
fi
