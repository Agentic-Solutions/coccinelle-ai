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

## Retour arrière — à avoir sous la main AVANT

```bash
ssh root@51.15.130.204
cd /opt/voixia/sip
docker run --rm -i --network host livekit/livekit-cli sip dispatch update - \
  --url ws://localhost:7880 \
  --api-key devkey --api-secret LU_DEPUIS_LE_SERVEUR \
  < 00-RETOUR-ARRIERE-dispatch-direct.json
```

Remet exactement l'état relevé le 20/08 à 09h21. Effet immédiat, aucun redémarrage.

## Application

```bash
ssh root@51.15.130.204
cd /opt/voixia/sip
docker run --rm -i --network host livekit/livekit-cli sip dispatch update - \
  --url ws://localhost:7880 \
  --api-key devkey --api-secret LU_DEPUIS_LE_SERVEUR \
  < 01-dispatch-individual.json
```

**`update`, jamais `delete` + `create`** : la modification se fait en place, sur le même
`SDR_YnG4niKZYk6h`. Un `delete` suivi d'un `create` ouvrirait une fenêtre — même courte —
pendant laquelle aucune règle ne couvre le trunk, et les appels entrants sont **rejetés**.

## Vérification

```bash
docker run --rm --network host livekit/livekit-cli sip dispatch list \
  --url ws://localhost:7880 \
  --api-key devkey --api-secret LU_DEPUIS_LE_SERVEUR
```

Attendu : `Type = Individual`, `RoomName` vide, préfixe `call`.

Puis, sur un appel réel, le nom de room réellement attribué se lit dans le journal de l'agent :

```bash
journalctl -u voixia -f --no-pager | grep 'Nouvel appel — room'
```

Il ne doit plus jamais valoir `voixia-sip`.
