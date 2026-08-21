# Pare-feu VoixIA — fermeture des ports Docker exposés

Ferme `7880`, `7881`, `6380` et `8081`, qui écoutaient sur `0.0.0.0` **et** `[::]` sans
aucun consommateur externe légitime. Le plus grave était `6380` : le Redis de LiveKit,
`requirepass` vide, joignable **en écriture** depuis Internet — on pouvait y détourner le
routage des appels (`sip_dispatch_rule`) sans jamais toucher au port 7880 ni connaître la
clé d'administration.

> ⚠️ `ufw deny 7880` ne fermerait **rien**. Le trafic IPv4 vers un port publié par Docker
> est DNAT en `nat/PREROUTING` puis traverse **FORWARD** — il ne voit jamais les règles
> `INPUT` d'ufw. C'est `DOCKER-USER` qui fait foi. Le trafic IPv6, lui, passe par
> `docker-proxy` en espace utilisateur, donc par `INPUT` (Docker IPv6 est désactivé ici).
> Une règle posée au mauvais endroit donne l'illusion d'une fermeture.

## Ce qui n'est PAS fermé

`22` (SSH), `5060` (SIP — nécessaire depuis Twilio) et `50100-50500/udp` (média WebRTC).
Le RTP de `livekit-sip` utilise des ports **dynamiques** : un `default DROP` sur l'UDP
couperait l'audio. Restreindre 5060 aux plages SIP de Twilio est un lot séparé, à mesurer.

## Installation

```bash
scp voixia-firewall.sh      root@51.15.130.204:/opt/voixia/firewall/
scp voixia-firewall.service root@51.15.130.204:/etc/systemd/system/
ssh root@51.15.130.204 'chmod 750 /opt/voixia/firewall/voixia-firewall.sh && \
  systemctl daemon-reload && systemctl enable --now voixia-firewall'
```

## Vérification — depuis une machine extérieure, jamais depuis le serveur

Un port en `DROP` ne répond pas : `nc -w` de macOS n'applique pas son délai à la phase de
connexion et reste pendu. Utiliser un vrai délai côté socket.

```bash
python3 - <<'PY'
import socket
def test(host, port, fam=socket.AF_INET):
    s = socket.socket(fam, socket.SOCK_STREAM); s.settimeout(4)
    try: s.connect((host, port)); s.close(); return "OUVERT ⚠️"
    except socket.timeout: return "fermé (timeout = DROP)"
    except OSError as e:  return f"fermé ({e.strerror})"
for p in (7880, 7881, 6380, 8081): print(f"  {p:<6}{test('51.15.130.204', p)}")
print(f"  22    {test('51.15.130.204', 22)}  (doit être OUVERT)")
PY
```

⚠️ Tester aussi en **IPv6** (l'adresse publique de la machine — voir `.credentials.md`, elle
n'a pas à figurer sur un dépôt public), mais seulement depuis un réseau qui a une route IPv6
sortante. Sur un lien sans IPv6, l'échec ne prouve rien : vérifier d'abord par un témoin
(`2606:4700:4700::1111:53`). C'est le piège du 20/08 — le test « passait » depuis un Mac
qui n'avait aucune connectivité IPv6.

Puis le seul test qui vaut : **un appel réel au `+33939035761`**.

## Pourquoi une unité dédiée plutôt que `iptables-persistent`

`netfilter-persistent` restaure un instantané de **toutes** les tables, y compris les
chaînes que Docker reconstruit lui-même à chaque démarrage (`DOCKER`, `DOCKER-ISOLATION-*`,
`nat/DOCKER` avec un DNAT par conteneur). Restaurer cet instantané **avant** `dockerd`
réinjecte des règles de NAT pointant vers des IP de conteneurs qui n'existent plus. Ici on
ne gère que nos règles ; Docker garde les siennes.

L'unité est ordonnée `After=docker.service`, mais cela garantit seulement que l'unité Docker
a démarré — pas que la chaîne `DOCKER-USER` existe. Le script l'attend donc explicitement
(30 s max) et **échoue bruyamment** si elle n'apparaît pas : sans ces règles, Redis est
joignable en écriture depuis Internet, un échec silencieux serait pire que pas de règle.

Le script est **idempotent** (il retire toutes les occurrences avant d'en poser une seule) :
le relancer ne produit pas de doublon. Les règles posées à la main le 20/08 l'étaient en
double dans les trois chaînes.

## Deuxième barrière

Un **Security Group Scaleway** (`voixia-prod-sg`, rattaché à `voixia-prod`) filtre en amont
de la machine et survit à une réinstallation du pare-feu local. Les deux se cumulent — cette
unité reste utile si le Security Group est un jour détaché ou élargi.

## Rappel

L'IP du conteneur Redis est résolue **à chaud** par le script. La figer en dur donnerait une
règle qui devient fausse en silence le jour où le réseau Docker est recréé.
