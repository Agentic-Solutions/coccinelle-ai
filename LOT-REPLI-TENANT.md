# Lot — le repli `VOIXIA_TENANT_ID` fait travailler les outils chez l'éditeur

> Ouvert le 20/08/2026, à la demande de Youssef, à traiter **après** le chantier latence.
> État : **cadré, mesuré, arbitré. Aucun code écrit.** R4 — plan avant tout code.
> Décision : *échouer proprement* (voir § Arbitrage).

## Le défaut

`tools/context.py` — quand la résolution du tenant échoue, le contexte n'est pas posé, et
les outils retombent sur la variable d'environnement :

```python
def set_call_context(tenant_id, api_key=None):
    if tenant_id:
        _tenant_id.set(tenant_id)
    else:
        # On ne vide pas : mieux vaut le secours .env qu'un en-tete vide qui
        # ferait echouer tous les outils avec un 401 en plein appel.
        logger.warning("Contexte d'appel sans tenant_id — repli sur VOIXIA_TENANT_ID (.env)")

def get_tenant_id() -> str:
    return _tenant_id.get() or os.environ.get("VOIXIA_TENANT_ID", "")
```

Mesuré le 20/08 sur le serveur :

| | valeur |
|---|---|
| `VOIXIA_TENANT_ID` dans `/opt/voixia/.env` | `tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy` |
| ce tenant en base | **`Agentic solutions`** (secteur `ia_voix`) — **l'éditeur** |
| ce qu'il contient | 8 documents de base de connaissances, 15 rendez-vous, 22 prospects |

**Six modules d'outils** lisent ce contexte : `knowledge`, `messaging`, `transfer`, `crm`,
`appointments`, `products`. Sur le chemin de repli, un appelant d'un garage interroge donc la
base de connaissances de **Coccinelle.ai / Agentic solutions**, et `book_appointment` /
`create_prospect` **écrivent** chez l'éditeur.

C'est la famille exacte de l'incident du 08/08/2026 (LightRAG servait la documentation
commerciale de l'éditeur à tous les clients, avec des tarifs d'abonnement répondus à une
question de vidange) et de celui du 11/08 (4 outils sur 8 ancrés sur un tenant figé).
Voir `CLAUDE.md` § i règle 21, et [[voixia-outils-ancrage-tenant]].

## Pourquoi ça devient urgent maintenant

Ce chemin existait déjà, mais il n'était atteint qu'après **15,9 s** d'échecs de résolution —
autant dire jamais sans panne franche. Le chantier latence du 20/08 ramène ce plafond à
**1,5 s** : le repli devient atteignable dès qu'un `resolve-phone` est lent, pas seulement
quand le backend est mort. **Nous avons rendu un chemin dangereux plus facile à emprunter.**

Deux entrées mènent au repli, pas une :
1. `resolve_tenant` échoue ou dépasse son budget → `tenant_id` vide → repli ;
2. **pas de métadonnées SIP du tout** → `set_call_context` n'est *jamais appelé*
   (`main.py`, l'appel est à l'intérieur du `if sip_to_number:`) → repli également.

## Constat annexe, à trancher dans le même lot

`resolve_tenant` ne renvoie **aucun champ `api_key`** — vérifié. Donc
`set_call_context(tenant_info.get("tenant_id"), tenant_info.get("api_key"))` passe toujours
`None`, et `get_api_key()` retombe **systématiquement** sur le `.env`. Ce n'est pas un bug
aujourd'hui (la clé VoixIA est unique et globale), mais le paramètre donne l'illusion d'une
clé par tenant qui n'existe pas. À supprimer, ou à alimenter — pas à laisser ambigu.
Lié au point ouvert de `CLAUDE.md` § r.1 : clé globale + tenant choisi par en-tête.

## ⚖️ ARBITRAGE RENDU — 20/08/2026, Youssef

> **« Échouer proprement » (piste 1).** Un outil qui répond faux avec assurance est pire
> qu'un outil qui échoue — **c'est la règle zéro invention du produit.**

La piste 2 (drapeau d'autorisation du secours) est donc **écartée** : elle laisse le
comportement dangereux disponible, et un drapeau finit toujours par être posé. Le repli vers
un autre tenant disparaît, il ne se met pas sous condition.

Ce que cela implique concrètement, à écrire au lancement du lot :
- `get_tenant_id()` ne consulte plus `VOIXIA_TENANT_ID` sur le chemin d'un appel ; le secours
  `.env` ne survit, s'il survit, que pour les scripts hors appel — et par un chemin distinct,
  pas par la même fonction ;
- sur contexte absent, les 6 outils rendent une **non-réponse explicite** (« je n'ai pas cette
  information »), jamais une réponse venue d'ailleurs. L'agent a déjà le chemin
  conversationnel : porte de sortie conditionnée + `create_task` obligatoire (règle 6ter) —
  un rappel promis sans `create_task` n'existe pas ;
- vérifier les 6 modules **un par un**. `messaging` (un SMS partirait sous l'identité de
  l'éditeur) et `transfer` (transfert vers le numéro d'un autre tenant) sont les deux où
  l'échec silencieux serait le plus coûteux.

Rattachement doctrinal : `CLAUDE.md` § i règle 6ter (ZÉRO INVENTION — ni invention **ni
approximation**) et règle 21 (un outil ne lit jamais le tenant dans l'environnement).

**Ordonnancement : après le chantier latence**, une fois les postes 1 à 4 déployés et recettés.

## Ce que le commentaire d'origine avait manqué

Le raisonnement du 08/08/2026 derrière le repli est écrit en toutes lettres dans
`tools/context.py` : « mieux vaut le secours `.env` qu'un en-tête vide qui ferait échouer tous
les outils avec un 401 en plein appel ». C'est **le bon souci et la mauvaise réponse** : il
compare un outil qui échoue à un outil qui réussit, alors que la vraie alternative est un
outil qui **répond juste** contre un outil qui **répond faux avec assurance**.

Un agent qui dit « je n'ai pas cette information, je vous fais rappeler » est un moindre mal
qu'un agent qui annonce le tarif d'une autre entreprise. C'est déjà la porte de sortie prévue
par `TOOL_ORDER_BLOCK`. L'arbitrage ci-dessus tranche dans ce sens.

⚠️ Ce commentaire est à **réécrire** en même temps que le code : laissé tel quel, il
justifierait le retour du repli à la première relecture. C'est la leçon du 20/08 sur
`BarreEnregistrement` — un commentaire qui décrit une intention périmée rend le défaut
invisible ([[defaut-ui-se-mesure]]).

## Recette envisagée

- appel avec `resolve-phone` rendu indisponible → aucun outil ne doit toucher
  `Agentic solutions` ; vérifiable côté Worker (aucune requête portant ce `tenant_id`) ;
- appel sans métadonnées SIP → même exigence ;
- appel nominal → comportement strictement inchangé ;
- banc automatisé sur `tools/context.py`, à ajouter à `npm test`.

## Ce que ce lot ne fait pas

Il ne touche ni au `system_prompt` (précédent du 08/08), ni à la clé API globale (chantier
séparé, § r.1).
