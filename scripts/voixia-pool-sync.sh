#!/usr/bin/env bash
# =============================================================================
# VoixIA — Server-pull : réconcilie les numéros du pool -> trunk.Numbers LiveKit
# Lancé par cron chaque minute. SÛR : n'ajoute que, ne retire jamais un numéro
# déjà présent (l'union inclut toujours les numéros actuels du trunk, dont la
# ligne prod Coccinelle +33939035760).
# =============================================================================
set -uo pipefail

API="https://coccinelle-api.youssef-amrouche.workers.dev"
TRUNK="ST_t32snCUn7y2f"
LOG="/opt/voixia/sip/pool-sync.log"

# Credentials LiveKit lues depuis la config serveur (pas de secret en dur).
export LIVEKIT_URL="ws://localhost:7880"
export LIVEKIT_API_KEY="$(grep -E '^[[:space:]]*api_key:' /opt/voixia/sip/sip-config.yaml | head -1 | awk '{print $2}')"
export LIVEKIT_API_SECRET="$(grep -E '^[[:space:]]*api_secret:' /opt/voixia/sip/sip-config.yaml | head -1 | awk '{print $2}')"

# Clé VoixIA depuis .env (sans la hardcoder)
VOIXIA_API_KEY="$(grep -E '^VOIXIA_API_KEY=' /opt/voixia/.env | head -1 | cut -d= -f2- | tr -d '"'\''\r ')"
if [ -z "$VOIXIA_API_KEY" ]; then echo "$(date -Iseconds) ERREUR: pas de VOIXIA_API_KEY" >> "$LOG"; exit 0; fi

# 1) Numéros du pool (backend) — si échec/vide, on ne fait RIEN (jamais de retrait)
POOL="$(curl -s --max-time 15 "$API/api/v1/reseller/pool-numbers" -H "X-VoixIA-Key: $VOIXIA_API_KEY" \
  | python3 -c 'import sys,json
try:
    d=json.load(sys.stdin)
    print("\n".join(d.get("numbers",[])) if d.get("success") else "")
except Exception:
    print("")')"
if [ -z "$POOL" ]; then exit 0; fi

# 2) Numéros actuels du trunk LiveKit (parse tolérant camelCase/snake)
CUR="$(lk sip inbound list --json 2>/dev/null | TRUNK="$TRUNK" python3 -c 'import sys,json,os
try:
    d=json.load(sys.stdin)
    def tid(x): return x.get("sip_trunk_id") or x.get("sipTrunkId")
    t=[x for x in d.get("items",[]) if tid(x)==os.environ["TRUNK"]]
    print("\n".join(t[0].get("numbers",[])) if t else "")
except Exception:
    print("")')"

CUR_SORTED="$(printf '%s\n' "$CUR" | grep -E '^\+[0-9]{6,15}$' | sort -u)"

# FAIL-SAFE ABSOLU : un trunk réel a toujours >=1 numéro. Si CUR est vide,
# c'est un échec de lecture -> on n'update JAMAIS (sinon on risque d'effacer
# les numéros existants, dont la ligne prod). On sort sans rien toucher.
if [ -z "$CUR_SORTED" ]; then
  echo "$(date -Iseconds) ABORT: numéros actuels illisibles — aucune MAJ (fail-safe)" >> "$LOG"
  exit 0
fi

# 3) Union dédupliquée (actuels + pool) — l'union CONTIENT toujours les actuels
UNION="$(printf '%s\n%s\n' "$CUR_SORTED" "$POOL" | grep -E '^\+[0-9]{6,15}$' | sort -u)"

# 4) Mise à jour uniquement si l'union AJOUTE des numéros (jamais de retrait)
if [ "$CUR_SORTED" != "$UNION" ]; then
  ARGS=()
  while IFS= read -r n; do [ -n "$n" ] && ARGS+=(--numbers "$n"); done <<< "$UNION"
  if lk sip inbound update --id "$TRUNK" "${ARGS[@]}" >/dev/null 2>&1; then
    echo "$(date -Iseconds) synced -> $(printf '%s' "$UNION" | tr '\n' ',')" >> "$LOG"
  else
    echo "$(date -Iseconds) ERREUR lk update" >> "$LOG"
  fi
fi
