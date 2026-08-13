#!/usr/bin/env bash
# Revue de la migration 0084 — a lancer DEUX FOIS : avant, puis apres.
#
#   ./design/cx2/revue-0084.sh              # affiche STRUCTURE puis VOLUMES
#   ./design/cx2/revue-0084.sh > avant.txt  # puis diff avec apres.txt
#
# Pourquoi ce script plutot qu'un simple `wrangler d1 execute --file` :
# avec --file, wrangler bascule en mode IMPORT et n'affiche qu'un resume
# (« Executed 2 queries »), jamais les lignes des SELECT. Seul --command rend
# les resultats. Le fichier .sql reste la source unique : ce script en extrait
# les requetes plutot que de les redupliquer.
set -euo pipefail

cd "$(dirname "$0")/../.."
SQL="design/cx2/revue-0084.sql"
DB="coccinelle-db-eu"
WRANGLER="./node_modules/.bin/wrangler"

[ -x "$WRANGLER" ] || { echo "wrangler introuvable — lancer npm install"; exit 1; }

# Retire les commentaires, recolle les requetes, decoupe sur les ';'.
grep -v '^\s*--' "$SQL" | tr '\n' ' ' | tr ';' '\n' | while read -r requete; do
  [ -z "${requete// /}" ] && continue
  "$WRANGLER" d1 execute "$DB" --remote --json --command "$requete;" \
    | sed -n '/"results"/,/]/p'
done
