#!/bin/bash
# Pose le webhook SMS entrant sur les numeros Twilio — chantier CONSENTEMENT, 17/08/2026.
#
# ── POURQUOI CE SCRIPT EXISTE ──
# Mesure du 17/08/2026 : les 5 numeros du compte ont `SmsUrl` VIDE. Aucun SMS entrant
# n'a jamais ete transmis nulle part — ni les 6 entrants journalises par Twilio en
# decembre 2025, ni le « ARRET » recu du combine de Youssef a 18h39. Le code du refus
# etait complet et correct ; il n'etait simplement jamais appele.
#
# ⚠️ ORDRE NON NEGOCIABLE : la VERIFICATION DE SIGNATURE doit etre DEPLOYEE avant que
# ce script ne soit lance. Sans elle, publier cette URL ouvre une porte non
# authentifiee qui (a) ecrit un refus coupant les SMS d'un client reel — confirmations
# de RDV et rappels compris — et (b) fait repondre le LLM aux frais de l'exploitant.
# Verifie le 17/08 : un simple `curl` sans aucun secret suffisait a faire les deux.
#
# ── QUELS NUMEROS, ET POURQUOI PAS LES AUTRES ──
#   +33939035760  ✅ ligne d'envoi de TOUS les SMS — c'est celui qui recoit les refus
#   +33939035761  ✅ numero d'essai, SMS-capable. Il n'a AUCUN mapping tenant et ne doit
#                    pas en avoir (il est partage entre tous les inscrits en essai) :
#                    depuis la cle par expediteur, un refus y fonctionne sans mapping.
#   +33162290699  ⛔ `capabilities.sms = false` — Twilio refuse en 21661
#   +33162290260  ⛔ idem
#   +19787486848  ⛔ decision Youssef du 17/08 : on n'y attend rien
#
# ── REGION ──
# Les numeros repondent sur l'endpoint IE1 ; le token us1 y echoue en 401. C'est
# l'inverse du journal des MESSAGES, qui vit en us1. Les deux tokens ne sont pas
# interchangeables — voir CLAUDE.md § o.
#
# Idempotent : relancer ne fait que reecrire la meme valeur.

set -euo pipefail

CRED="$HOME/Projects/saas/coccinelle-ai/.credentials.md"
URL="https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/omnichannel/sms"
BASE="https://api.dublin.ie1.twilio.com"
NUMEROS=("+33939035760" "+33939035761")

SID=$(grep -oE 'AC[0-9a-f]{32}' "$CRED" | head -1)
TOK=$(grep -i 'IE1_AUTH_TOKEN' "$CRED" | grep -oE '\b[0-9a-f]{32}\b' | head -1)
# GARDE-FOU : une variable vide produirait un 401 pris pour un echec de configuration.
# C'est exactement le piege documente pour la rotation VOIXIA_API_KEY (§ r.1).
[ ${#SID} -eq 34 ] && [ ${#TOK} -eq 32 ] || { echo "STOP : extraction des identifiants invalide"; exit 1; }

echo "── Verification prealable : la signature est-elle deployee ? ──"
# Un POST non signe DOIT repondre 403. S'il repond 200, le Worker deploye est encore
# l'ancien : poser SmsUrl maintenant ouvrirait la porte decrite plus haut.
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL" -A 'Mozilla/5.0' \
  -d 'MessageSid=SMverif' -d 'From=%2B33600000000' -d 'To=%2B33939035760' -d 'Body=verification')
if [ "$CODE" != "403" ]; then
  echo "STOP : POST non signe -> $CODE (attendu 403)."
  echo "       La verification de signature n'est pas deployee. Deployer le backend d'abord."
  exit 1
fi
echo "  OK : un POST non signe est rejete (403)."
echo

for N in "${NUMEROS[@]}"; do
  PN=$(curl -s -u "$SID:$TOK" \
        "$BASE/2010-04-01/Accounts/$SID/IncomingPhoneNumbers.json?PhoneNumber=${N/+/%2B}" \
       | python3 -c "import sys,json;l=json.load(sys.stdin)['incoming_phone_numbers'];print(l[0]['sid'] if l else '')")
  [ -n "$PN" ] || { echo "STOP : $N introuvable"; exit 1; }

  curl -s -u "$SID:$TOK" -X POST \
    "$BASE/2010-04-01/Accounts/$SID/IncomingPhoneNumbers/$PN.json" \
    --data-urlencode "SmsUrl=$URL" -d "SmsMethod=POST" \
    | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f\"  {d.get('phone_number')} -> SmsUrl={d.get('sms_url')} ({d.get('sms_method')})\")"
done

echo
echo "── Controle final ──"
curl -s -u "$SID:$TOK" "$BASE/2010-04-01/Accounts/$SID/IncomingPhoneNumbers.json?PageSize=20" \
  | python3 -c "
import sys,json
for n in json.load(sys.stdin)['incoming_phone_numbers']:
    print(f\"  {n['phone_number']:16} sms_capable={str(n['capabilities']['sms']):5} SmsUrl={n['sms_url'] or '(vide)'}\")"
echo
echo "RECETTE : envoyer « ARRET » depuis un vrai combine vers +33939035760, puis"
echo "          SELECT * FROM sms_refus;   (attendu : 1 ligne, expediteur=+33939035760)"
echo "⚠️  « STOP » ne remontera PAS : l'operateur francais l'intercepte (mesure du 17/08)."
