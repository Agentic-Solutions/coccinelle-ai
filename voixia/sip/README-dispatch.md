# Règle de dispatch SIP — un room par appel

> Chantier latence au décroché, 20/08/2026.
> **La source de vérité est `lk sip dispatch list`, jamais un fichier de ce répertoire.**

## Pourquoi

La règle active jusqu'au 20/08/2026 était `Direct` sur un room **fixe** :

```
SipDispatchRuleID  Name         SipTrunks         Type     RoomName
SDR_YnG4niKZYk6h   VoixIA-Rule  ST_t32snCUn7y2f   Direct   voixia-sip
```

**LiveKit dispatche un job par ROOM, pas par participant.** Un second appelant qui rejoint un
room déjà occupé n'obtient donc **aucun agent**.

Mesuré le 20/08/2026 — trois appels, deux jobs :

| INVITE SIP | callID | job agent | ce que l'appelant a eu |
|---|---|---|---|
| 08:46:04 | `SCL_bCP8BK6qUWd5` | oui | accueil demandé à +1,8 s, raccroché à 15,2 s |
| 08:46:22 | `SCL_yJta6uqEGxrj` | **aucun** | **10,2 s de silence total** |
| 08:50:47 | `SCL_vRpbh6439JGu` | oui | raccroché à 5,0 s |

Le process de l'appel 1 ne sortait qu'à 08:46:52, soit 48 s après son début : pendant toute
cette fenêtre, le room `voixia-sip` était occupé et tout nouvel appelant tombait dans le vide.

C'est aussi ce qui interdit la montée en charge : en `Direct`, tous les appelants simultanés
partagent un room et s'entendent entre eux.

## Ce que fait le changement

`Direct` → `individual` : un room par appel, nommé avec le préfixe `call`.

`noRandomness` est **figé à `false`** et ce n'est pas décoratif. Le champ proto s'appelle
`no_randomness`, donc l'aléa est actif par défaut — mais sans lui, deux appels du **même
numéro** retomberaient dans le même room et reproduiraient exactement le défaut qu'on corrige.
C'est précisément le scénario de la recette (Youssef rappelle depuis `+33760762153`).

## ⚠️ Portée

Le trunk `ST_t32snCUn7y2f` porte **4 numéros** : `+33162290260`, `+33162290699`,
`+33939035760` (ligne réelle Coccinelle.ai) et `+33939035761` (numéro d'essai). La règle
s'applique au trunk entier — les quatre changent en même temps.

## ⚠️ Forme des commandes — trois pièges payés le 20/08/2026

1. **`urfave/cli` arrête de lire les drapeaux après le premier argument positionnel.**
   `sip dispatch update - --url … --api-key …` échoue en
   `no projects configured; run 'lk cloud auth'` : le `-` avale la suite, et l'auth retombe
   sur les projets configurés (il n'y en a pas). ⇒ **passer l'auth par variables
   d'environnement**, jamais par des drapeaux placés après le `-`. Le CLI confirme en
   affichant « Using url, api-key, api-secret from environment ».
2. **La forme JSON attendue par le CLI Go n'est PAS celle du proto Python.**
   `livekit-protocol` (venv, 1.1.22) décrit `UpdateSIPDispatchRuleRequest` avec un champ
   `update` ; `lk` 2.18.2 le refuse (`unknown field "update"`, et `"replace"` aussi). La forme
   acceptée est **plate** : `rule` à la racine. Vérifié par sonde contre un `sipDispatchRuleId`
   inexistant — `twirp error not_found` prouve que l'auth, stdin et le parsing sont bons sans
   rien modifier en production. **C'est la façon de tester une commande d'écriture sans
   écrire.**
3. **`name` et `trunkIds` sont inclus explicitement.** On ne sait pas si le serveur fusionne ou
   remplace ; en les fournissant, les deux sémantiques convergent vers l'état voulu. Les
   omettre risquerait de détacher le trunk — et une règle sans trunk, c'est **tous les appels
   entrants rejetés**.

Version du CLI utilisée : image `livekit/livekit-cli:latest`, `lk version 2.18.2`.

## Retour arrière — à avoir sous la main AVANT

```bash
ssh root@51.15.130.204
```

Puis, sur le serveur :

```bash
docker run --rm -i --network host \
  -e LIVEKIT_URL=ws://localhost:7880 \
  -e LIVEKIT_API_KEY=devkey \
  -e LIVEKIT_API_SECRET=LU_DEPUIS_LE_SERVEUR \
  livekit/livekit-cli sip dispatch update - <<'JSON'
{"sipDispatchRuleId":"SDR_YnG4niKZYk6h","name":"VoixIA-Rule","trunkIds":["ST_t32snCUn7y2f"],"rule":{"dispatchRuleDirect":{"roomName":"voixia-sip"}}}
JSON
```

Remet exactement l'état relevé le 20/08 à 09h21. Effet immédiat, aucun redémarrage.

## Application

```bash
docker run --rm -i --network host \
  -e LIVEKIT_URL=ws://localhost:7880 \
  -e LIVEKIT_API_KEY=devkey \
  -e LIVEKIT_API_SECRET=LU_DEPUIS_LE_SERVEUR \
  livekit/livekit-cli sip dispatch update - <<'JSON'
{"sipDispatchRuleId":"SDR_YnG4niKZYk6h","name":"VoixIA-Rule","trunkIds":["ST_t32snCUn7y2f"],"rule":{"dispatchRuleIndividual":{"roomPrefix":"call","noRandomness":false}}}
JSON
```

**`update`, jamais `delete` + `create`** : la modification se fait en place, sur le même
`SDR_YnG4niKZYk6h`. Un `delete` suivi d'un `create` ouvrirait une fenêtre — même courte —
pendant laquelle aucune règle ne couvre le trunk, et les appels entrants sont **rejetés**.

## Vérification

```bash
docker run --rm --network host \
  -e LIVEKIT_URL=ws://localhost:7880 \
  -e LIVEKIT_API_KEY=devkey \
  -e LIVEKIT_API_SECRET=LU_DEPUIS_LE_SERVEUR \
  livekit/livekit-cli sip dispatch list
```

Sur une commande de **lecture**, les drapeaux `--url/--api-key/--api-secret` fonctionnent aussi
(aucun argument positionnel ne vient couper l'analyse) — mais autant garder une seule forme.

Attendu : `Type = Individual`, `RoomName` vide, préfixe `call`.

Puis, sur un appel réel, le nom de room réellement attribué se lit dans le journal de l'agent :

```bash
journalctl -u voixia -f --no-pager | grep 'Nouvel appel — room'
```

Il ne doit plus jamais valoir `voixia-sip`.
