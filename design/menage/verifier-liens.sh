#!/usr/bin/env bash
# Verifie qu'aucun lien du produit ne mene dans le mur.
#
#   cd coccinelle-saas && npm run build
#   ./design/menage/verifier-liens.sh
#
# POURQUOI CE SCRIPT EXISTE
# Le 13/08/2026, les QUATRE destinations de notification push pointaient sur des
# pages mortes — trois redirections cassees et une page qui n'a jamais existe.
# Personne ne l'avait vu parce que rien ne le regardait : un build vert ne dit
# rien des liens, et une redirection cassee ressemble a une page qui marche tant
# qu'on ne clique pas.
#
# Le script extrait TOUTE URL /dashboard/... referencee dans le code (frontend
# ET backend : e-mails, push, retours OAuth) et verifie pour chacune que la page
# construite existe et n'est pas une page d'erreur.
#
# Sortie 0 = aucun lien mort. Sortie 1 = au moins un lien mort, liste a l'appui.

set -uo pipefail
cd "$(dirname "$0")/../.."

OUT="${MENAGE_OUT:-coccinelle-saas/out}"
[ -d "$OUT" ] || { echo "Build introuvable : $OUT — lancer 'npm run build' d'abord."; exit 2; }

SOURCES="src coccinelle-saas/app coccinelle-saas/components coccinelle-saas/src coccinelle-saas/lib"

# ── Extraction ──
# On ratisse large (href, url:, redirect(), router.push, chaines nues) puis on
# normalise. Les routes dynamiques et les URL construites par interpolation sont
# ecartees : leur cible depend de l'execution, pas du code.
#
# Deux familles de faux positifs sont ecartees AVANT extraction, apprises au
# premier passage :
#   - les chemins d'IMPORT (« components/dashboard/SetupChecklist ») ne sont pas
#     des URL ;
#   - les COMMENTAIRES, sans quoi le script signale les URL mortes citees dans
#     les commentaires qui expliquent... qu'elles etaient mortes.
#
# Les commentaires sont RETIRES avant extraction, pas filtres ligne a ligne :
# un commentaire de bloc ou un {/* … */} de JSX s'etale sur plusieurs lignes, et
# le filtrage ligne a ligne laissait passer celles du milieu. Le script signalait
# ainsi les URL mortes citees dans les commentaires qui expliquent... qu'elles
# ont ete retirees parce qu'elles etaient mortes. Deux fois de suite.
#
# La lecture arriere `(?<!:)` protege les « https:// » : sans elle, on tronquait
# toute ligne contenant une URL absolue.
routes=$(for f in $(find $SOURCES -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' \) 2>/dev/null | grep -v '\.bak'); do
    perl -0777 -pe 's{/\*.*?\*/}{}gs; s{(?<!:)//[^\n]*}{}g' "$f" 2>/dev/null
  done \
  | grep -vE "^\s*import|from '[^']*dashboard/" \
  | grep -oE "/dashboard(/[a-zA-Z0-9_-]+)*" \
  | sed 's#/$##' \
  | sort -u)

total=0; morts=0; erreurs=0
declare -a LISTE_MORTS=()

for r in $routes; do
  # /dashboard tout court = l'accueil
  chemin="$OUT${r}/index.html"
  total=$((total + 1))

  if [ ! -f "$chemin" ]; then
    LISTE_MORTS+=("PAGE ABSENTE     $r")
    morts=$((morts + 1))
    continue
  fi

  if grep -q '__next_error__' "$chemin" 2>/dev/null; then
    LISTE_MORTS+=("PAGE D'ERREUR    $r")
    erreurs=$((erreurs + 1))
  fi
done

echo "── Liens /dashboard references dans le code : $total ──"
echo

if [ ${#LISTE_MORTS[@]} -eq 0 ]; then
  echo "  Aucun lien mort."
else
  echo "  ${#LISTE_MORTS[@]} lien(s) mort(s) :"
  printf '     %s\n' "${LISTE_MORTS[@]}" | sort
fi

echo
echo "  pages absentes : $morts"
echo "  pages d'erreur : $erreurs"

# ── Controle transverse : les destinations de notification push ──
# Elles ne sont pas des liens dans une page, elles voyagent dans un message
# envoye au telephone du client. Un lien mort y coute plus cher qu'ailleurs.
echo
echo "── Destinations des notifications push ──"
grep -oE "type === '[a-z_]+' \? '/dashboard[a-zA-Z0-9/_-]*'" src/utils/notifications.js 2>/dev/null \
  | sed "s/type === '//;s/' ? '/  ->  /;s/'$//" \
  | while read -r ligne; do
      cible=$(echo "$ligne" | sed 's/.*->  //')
      if [ -f "$OUT${cible}/index.html" ] && ! grep -q '__next_error__' "$OUT${cible}/index.html"; then
        echo "     OK   $ligne"
      else
        echo "     MORT $ligne"
      fi
    done

[ $((morts + erreurs)) -eq 0 ] || exit 1
