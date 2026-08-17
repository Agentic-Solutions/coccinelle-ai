# Chantier NAVIGATION — plan de mise en œuvre (FINAL, avant code)

> Branche `chantier-navigation`. R4 : ce plan précède le code.
> Maquette validée : `design/navigation/navigation-6-ecrans.html`, lue avec
> `design/cx2/extraire-maquette.cjs`. Le HTML visible ne fait pas foi.

**Décisions actées le 14/08** : « Aide » en 3ᵉ ligne de pied · pause et
suspension affichées mais non branchées · `ADVANCED_NAV` supprimé · la recherche
de Réglages indexe **les pages autant que les réglages**.

---

## 0. Un défaut corrigé au passage

`design/cx2/extraire-maquette.js` était **cassé depuis sa mise au dépôt** le
13/08 : le `package.json` déclare `"type": "module"`, donc son `require` échouait.
Il marchait quand je l'exécutais depuis le scratchpad — hors du dépôt, hors de
cette règle — et je ne l'ai jamais rejoué après l'avoir versionné, alors que
CLAUDE.md § s le désigne comme *la* façon de lire les maquettes.

Renommé `.cjs`, testé, et les 3 références corrigées (`PLAN-CX2.md`, `CLAUDE.md`).

---

## 1. La charte des 6 écrans

Identique à CX-2 (fond `#f6f6f5`, encre `#1a1a19`, cartes blanches bordées
`#e2e2de` radius 14, Schibsted Grotesk + JetBrains Mono) — `components/cx2/theme.ts`
est réutilisé tel quel. Nouveautés :

| Élément | Valeur |
|---|---|
| Bordure de section | `#dcdbd6`, radius 16 |
| Chevron de ligne | `#c2c1ba`, 14 px |
| Séparateur de liste | `#f4f4f0` |
| Carte « en pause » | fond `#f7f2dd`, bordure `#e6d9a4`, texte `#5f5a45` |
| Point d'état pause | `oklch(0.72 0.13 65)` |
| Pastille de succès | fond `#e6ece6`, coche `#2f6b45` |

### La barre latérale (5 écrans sur 6)

```
256 px · blanc · bordure droite #e2e2de
┌ carré noir 30px r9 + « Coccinelle.ai » 16px/600      (padding 22 20 18)
├ Mon activité    (barres)   ─┐ 15px/500, nowrap, gap 3px
├ Mon assistant   (micro)     │ actif : fond #f2f2ee, encre #1a1a19
├ Mes clients     (personnes) ┘
│                              (flex: 1 — pousse le reste en bas)
├ ─ border-top #f2f2ee ─
├ pilule « Essai · 13 j »      bordée #ebebe7, jours en mono
├ Réglages      14px #6b6b66
└ Déconnexion   14px #6b6b66
```

**Aucun bouton d'action en haut.** La pastille d'essai descend **en bas**, au
dessus du pied — elle était en haut dans l'application actuelle.

⚠️ **Écart assumé** : la maquette ne montre **pas** d'entrée « Aide ». Elle est
ajoutée en 3ᵉ ligne de pied sur ta décision — même style que Réglages et
Déconnexion.

### Écran 1 — Mon activité

h2 26px « Mon activité » · « Ce que votre assistant a fait aujourd'hui, mardi
13 août » · à droite « mis à jour à 17:04 » en mono `#a3a39c`.

Trois blocs (label à gauche, **valeur 30px en mono à droite**, note dessous) :
Appels reçus **9** « 2 en dehors des horaires » · Messages envoyés **12**
« 8 devis, 4 rappels de rendez-vous » · Rendez-vous pris **4** « dont 1 pour
demain matin ».

Puis grille `1.35fr / 1fr` : « Appels reçus » (qui · sujet · durée · heure ·
chevron) et, à droite, « Rendez-vous pris » puis « Messages envoyés ».

### Écrans 2 et 3 — Mon assistant, deux onglets

```
Ses réponses │ Ce qu'il sait        ← 14.5px/500, padding 11px 18px
─────────────┴──────────────────      actif : border-bottom 2px #1a1a19, #1a1a19
                                      inactif : transparent, #8a8a83
                                      sur une barre border-bottom 1px #e2e2de
```

**Onglet 1 — Ses réponses** (`/dashboard/assistant`) : bouton Enregistrer en
haut à droite, grille `62/38`. Les 3 scénarios ; le séparateur est
**INTITULÉ puis trait** (à gauche), et non trait—texte—trait comme dans CX-2.
Colonne droite : Horaires **ouverte, bordure noire**, 6 jours lun–sam sur
`1fr auto auto` — **sans pilule Ouvert/Fermé**, seulement les deux heures ; puis
3 cartes repliées `titre + valeur en mono + chevron` (« Voix de l'assistant /
Julien », « Transfert vers un humain / 06 14 22 88 03 », « Ce qu'il sait
répondre / 29 fiches ») ; puis bandeau `#efeeeb` avec le numéro d'essai répété
en 20px mono.

**Onglet 2 — Ce qu'il sait** (`/dashboard/savoir`) : en haut à droite, un état
« Correction enregistrée à 17:06 » avec pastille verte. Le reste est la page
CX-2 existante (chips, fil, 3 cartes) — inchangée.

Les deux URL restent valides : les onglets sont un habillage au-dessus des deux
pages, pas une troisième page qui les absorbe.

### Écran 4 — Mes clients

« Leurs coordonnées et leur prochain rendez-vous, au même endroit ». Recherche
« Rechercher un client » + bouton « Ajouter un client ». Grille `1.5fr / 1fr` :
liste (nom · téléphone mono · véhicule · **PROCHAIN RDV** + date mono · chevron)
et « Rendez-vous à venir / Les 3 prochains jours », groupé par jour.

### Écran 5 — Réglages, une seule page

« Tout est sur cette page. Cliquez sur une ligne pour la modifier. »
Recherche en haut à droite, **bordure noire quand active**, avec un compteur
« 1 réglage » en mono. Grille `200px / 1fr`, sommaire collant + la mention
« Le sommaire suit votre défilement ».

Ligne en lecture : `label + aide 12.5px · valeur à droite · chevron`.
Ligne en édition : `titre + « Modification en cours » · choix en pilules · aide ·
Enregistrer / Annuler`.

Quatre sections : **Mon atelier** · **Numéros et messages** · **Mon équipe** ·
**Abonnement et documents**.

### Écran 6 — Avant de supprimer

Une seule page, 760 px : « Pourquoi partez-vous ? » (6 motifs en pilules + zone
libre, non obligatoire) · « Suspendez plutôt que de supprimer » (**bordure
noire**, 1/2/3 mois, 4 lignes Conservé/Arrêté/Facturé/Reprise) · « Ce que la
suppression efface » (4 puces + encart 48 h / 30 jours) · **deux boutons de poids
équivalent** en `1fr 1fr` : « Suspendre 3 mois » (plein) et « Supprimer
définitivement » (bordé noir) · « Aucun autre écran ne vous sera demandé. »

---

## 2. Réglages : ce que la maquette affiche vs ce qui existe

C'est le point le plus lourd du chantier. Sur les **22 lignes** de la maquette,
**7 ne correspondent à aucun réglage réel.**

| Section / ligne | Source réelle | État |
|---|---|---|
| **Mon atelier** | | |
| Nom de l'atelier | `tenants.name` | ✅ |
| Adresse et accès | `tenants.address` | ✅ |
| Jours de fermeture exceptionnels | — | ❌ **n'existe pas** |
| Durée des rendez-vous | — (`appointment-types` porte des durées par type, pas un défaut) | ❌ **n'existe pas** |
| Langue du tableau de bord | — | ❌ figée en français |
| **Numéros et messages** | | |
| Numéro de l'atelier | `TRIAL_PHONE_NUMBER` / `tenants.phone` | ✅ lecture seule |
| Numéro affiché sur vos messages | — | ❌ **n'existe pas** |
| Messages écrits après un appel | `shared/sms-booking-link.js` | ◐ pas de bascule |
| **Rappel avant rendez-vous** (2 h / 24 h / 48 h / aucun) | `cron/reminders.js` | ❌ **figé à J-1, 17 h UTC** dans `wrangler.toml` |
| Réponse automatique aux e-mails | — | ❌ **n'existe pas** |
| Boîte e-mail reliée | OAuth Gmail/Outlook/Yahoo | ✅ |
| Messages le dimanche | — | ❌ **n'existe pas** |
| **Mon équipe** | | |
| Personnes autorisées · Rôles | `teams`, `permissions` | ✅ |
| Me prévenir par message / e-mail | `notification_preferences` (migr. 0070) | ✅ |
| Résumé de la journée (19h30) | `users.weekly_report_enabled` | ◐ **hebdomadaire**, pas quotidien, et sans heure |
| **Abonnement et documents** | | |
| Formule · Paiement · Factures | `subscriptions`, `billing_*` | ✅ |
| Export appels / clients | `analytics/export` | ✅ |

⚠️ **La ligne montrée en édition dans la maquette est justement l'une des
manquantes** : « Rappel avant rendez-vous » avec ses quatre choix. Le rappel est
aujourd'hui un cron fixe (`0 17 * * *`), identique pour tous les tenants.

**Ma proposition** : n'afficher que les 15 réglages réels. Les 7 autres seraient
des mensonges d'interface — exactement ce que le ménage vient d'enlever, et ce
qu'on s'est interdit sur la pause. Pour illustrer l'édition en place, j'utilise
« Me prévenir par e-mail », qui existe et a bien plusieurs valeurs.

Si tu veux les 7 : compter **3 à 4 j** (colonnes, routes, et surtout rendre le
rappel paramétrable par tenant — le cron devient une requête par délai).

---

## 3. Rangement des 77 pages

**Mon activité** — accueil, `analytics/calls`, `analytics/transcripts`, les
5 vues `analytics/*`, `conversations`, `conversations/appels`, `channels/inbox`,
`tasks`.

**Mon assistant** — onglet 1 `/dashboard/assistant` (+ `agents/*`,
`availability`, `proactive`, `channels/*`) ; onglet 2 `/dashboard/savoir`
(+ `knowledge/*`, `services`).

**Mes clients** — `crm/prospects` (+ fiche), `customers` (+ fiche), `rdv`
(+ fiche), `appointment-types`, `rdv/calendars`, `rdv/settings`,
`appointments/calendar`, `teams`.

**Réglages** — `settings`, `settings/notifications`, `billing/*` (5),
`integrations`, `integrations/new`, `channels/numbers`.

**Pied** — `support` (« Aide »).

**Hors menu, atteignables** — les 18 redirections, `channels` (retour OAuth
Google), `channels/email` (retours Yahoo/Outlook), `channels/whatsapp` (gel
volontaire), `settings/channels/*`, `products/new|import|[id]`, `crm`,
`conversations`, `knowledge/docs`.

Aucune page supprimée. Aucune URL cassée.

---

## 4. Backend : pause, suspension, rétention

### Ce que la vérification a montré

**`resolve-phone` ne consulte jamais le statut du tenant résolu** — la chaîne
`omni_phone_mappings → tenants → voixia_configs → ai_prompt_versions` ne filtre
que sur `m.is_active` et `channel_type='voice'`. Mettre `status='suspended'`
n'empêcherait pas l'assistant de décrocher.

Et désactiver le mapping ne donne pas le silence : `resolve_tenant` échoue côté
Python et **l'agent décroche quand même**, avec un nom et un prompt génériques.
Ni message, ni sonnerie dans le vide — un assistant anonyme.

⇒ Les deux comportements que la maquette propose (« un message est diffusé puis
la ligne raccroche », « les appels sonnent dans le vide ») **n'existent ni l'un
ni l'autre**.

### Ce qu'il faudrait — prérequis à l'activation

| Brique | Jours |
|---|---|
| Migration : `tenants.pause_etat`, `pause_message`, `pause_depuis` ; `subscriptions.suspendu_jusqu_au` | 0,5 |
| `resolve-phone` renvoie un mode explicite (`repondre` / `message` / `silence`) | 0,5 |
| **Agent Python : honorer ce mode** — diffuser puis raccrocher, ou ne pas décrocher. N'existe pas du tout | **1 – 1,5** |
| Routes pause / reprise | 0,5 |
| Suspension Stripe (`pause_collection` ou prix « garde-numéro » 5 €/mois, plafond 6 mois, reprise) | 1,5 – 2 |
| Rétention : suspension 1/2/3 mois + journalisation du motif | 0,5 |
| **Total** | **4,5 – 5,5 j** |

### Ce que je livre dans ce chantier

| Niveau | Livré |
|---|---|
| **Pause** | affichée, interrupteur **désactivé**, encart « Nous contacter » |
| **Suspension** | affichée avec ses 4 conditions, bouton → « Nous contacter » |
| **Suppression** | **réelle**, avec l'écran de rétention complet (motifs + proposition 1/2/3 mois + les 2 boutons). Le bouton « Suspendre 3 mois » renvoie lui aussi vers « Nous contacter » tant que la brique n'existe pas |

La carte jaune « En pause depuis mardi 17:12 » et son bandeau ne sont **pas**
implémentés : c'est l'état d'après-bascule, sans objet tant que la pause ne coupe
rien. Le composant est écrit et prêt, mais jamais monté.

---

## 5. ADVANCED_NAV et la recherche des pages

`ADVANCED_NAV` supprimé, ainsi que le hook `useUiMode` et la bascule.
`users.ui_mode` (migr. 0083) devient morte : **la colonne reste** (aucune
migration dans ce chantier), elle se nettoiera avec le prochain lot de schéma.

La recherche de Réglages indexe **deux familles** :
1. les réglages de la page (label + aide) ;
2. **les 77 pages** — libellé, chemin et synonymes.

C'est ton accès aux ~40 pages hors menu, et la contrepartie explicite de la
suppression du mode Avancé. Taper « transcript », « WhatsApp » ou « facture »
doit sortir la page, pas seulement un réglage.

---

## 6. Liens entrants

| Source | Action |
|---|---|
| Checklist (4 cibles) | **aucune** — toutes restent valides |
| Notifications push (4 cibles) | **aucune** — toutes restent valides |
| Retours OAuth Google / Yahoo / Outlook | **aucune** — pages conservées |
| Stripe / facturation | **aucune** |
| E-mail rapport hebdo → `/dashboard/settings/notifications` | la page fusionne dans Réglages → **redirection meta refresh à ajouter** |
| Tour produit (`/beta`), 13 cibles | **réécrites** : `crm` et `customers` → `crm/prospects` ; `products` → `savoir` ; `channels` et `conversations` → destinations correspondantes ; `knowledge` → `savoir` |

`verifier-liens.sh` tourne avant et après ; il échoue au premier lien mort.

---

## 7. Ordre d'exécution

1. **Barre latérale** — 3 entrées, pied à 3 lignes, pastille d'essai en bas,
   retrait de la bascule, du bouton d'action et d'`ADVANCED_NAV`.
2. **Onglets « Mon assistant »** — habillage au-dessus des deux pages.
3. **Mes clients** — clients + rendez-vous.
4. **Mon activité** — accueil aux 3 blocs et 3 listes.
5. **Réglages** — page unique, recherche (réglages **et** pages), 15 réglages
   réels, édition en place.
6. **Les trois niveaux d'arrêt** + écran de rétention (suppression seule
   branchée).
7. **Tour produit** et redirection `settings/notifications`.

Contrôles : `tsc` ≤ **142**, build vert, `verifier-liens.sh` vert,
0 `__next_error__`, recette sur Garage Toulouse.

---

## 8. Décisions qu'il me reste à te demander

1. **Les 7 réglages inexistants** — je ne les affiche pas (recommandé), ou tu
   veux les 3–4 j pour les construire ?
2. **« Rendez-vous » disparaît du menu** : la maquette le range dans « Mes
   clients ». Un garagiste qui cherche son planning cliquera-t-il « Mes
   clients » ? La maquette répond en affichant « Rendez-vous à venir » dans
   l'écran — je m'y tiens, mais c'est le pari le plus risqué du chantier.
3. **`customers` vs `crm/prospects`** : deux listes de clients coexistent
   toujours. « Mes clients » doit en désigner une — je prends `crm/prospects`
   (menu actuel, 817 lignes, fiche détail liée). L'autre reste atteignable.

---

## 9. Ce que le codage a révélé (14/08/2026)

### 9.1 — Les réglages fictifs étaient douze, pas sept

Le plan écartait **sept** réglages sans colonne ni route. En câblant la page,
j'en ai trouvé **cinq de plus**, d'une espèce plus coûteuse : ils ont une route
d'écriture, l'interface confirme « Enregistré », et **personne ne les relit**.

| Réglage | Écrit par | Lu par |
|---|---|---|
| `notification_preferences.email_after_call` | `PUT /settings/notifications` | **personne** |
| `notification_preferences.sms_reminder_j1` | idem | **personne** |
| `notification_preferences.weekly_summary` | idem | **personne** |
| `notification_preferences.quota_alerts` | idem | **personne** |
| `users.weekly_report_enabled` | `PUT /auth/profile` | `POST /reports/weekly/cron`, **que rien ne déclenche** |

Deux conséquences à connaître :

- **Le rappel J-1 part d'un cron en dur.** `wrangler.toml` ne déclare qu'un seul
  cron, `0 17 * * *`, qui exécute `sendTomorrowReminders`. Il ne consulte jamais
  `notification_preferences` : décocher « rappeler le rendez-vous par SMS »
  n'aurait rien arrêté. C'est le réglage que tu voulais en tête du backlog — il
  est plus proche qu'il n'y paraît, la table existe déjà, il manque la lecture.
- **Le récapitulatif hebdomadaire n'est jamais envoyé.** La route existe, elle
  lit bien `weekly_report_enabled`, mais aucun cron ne l'appelle. La page
  `settings/notifications` promettait donc « chaque lundi » depuis toujours.

**Conséquence sur ta consigne.** Tu m'avais demandé d'illustrer l'édition en
place avec « Me prévenir par e-mail ». Ce réglage n'existant pas, l'illustration
se fait sur **« Nom de l'entreprise »** — un champ réellement écrit en base, dont
la valeur est prononcée à chaque appel. La démonstration est même meilleure :
on voit l'effet.

### 9.2 — `settings/notifications` ne stockait rien côté serveur

Ses réglages (canal préféré, matrice de notifications) vivaient dans le
`localStorage` du navigateur. Changer d'appareil « perdait » les réglages : ils
n'avaient jamais quitté la machine. Page remplacée par une redirection meta
refresh vers `/dashboard/settings`.

### 9.3 — Un titre resté en arrière, que seul le navigateur pouvait voir

`app/dashboard/page.tsx` porte **deux** titres : celui de l'état de chargement et
celui de la page rendue. J'avais changé le premier. `tsc` et le build étaient
verts ; la page affichait « Dashboard ». C'est la recette navigateur qui l'a
attrapé — la même leçon que la page `/booking` du 11/08.

### 9.4 — Sept composants orphelins dans `src/components/settings/`

`APIKeysForm`, `AvailabilitySettings`, `EmailConfiguration`,
`NotificationsSettings`, `ProfileForm`, `SecuritySettings`, `TeamManagement` :
aucun consommateur. Hors périmètre NAVIGATION — c'est du lot MÉNAGE reporté.

### 9.5 — Recette locale : le CORS interdit le navigateur

Le Worker n'autorise pas `localhost`, donc un navigateur local ne reçoit que des
erreurs réseau et l'application conclut « non connecté ». La méthode qui marche :
**capturer les vraies réponses au curl** avec le jeton, puis les rejouer par
`page.route()`. Un bouchon inventé ne vaut rien — les miens ont fait planter
trois pages qui, sur les payloads réels, fonctionnent parfaitement.

---

## 10. Backlog — par ordre de valeur (arbitré le 14/08/2026)

Rien de ceci n'est construit dans ce chantier : les réglages correspondants sont
**masqués**, pas grisés ni « bientôt disponibles ». Une case qui ne fait rien
coûte plus cher qu'une case absente — le client la coche, y croit, et découvre
la panne au pire moment.

### 1. Rappel J-1 paramétrable par tenant

**Le plus proche et le plus utile.** La table `notification_preferences` existe
(migration 0070) et `PUT /settings/notifications` l'écrit déjà. Il manque **la
lecture** : `sendTomorrowReminders()` (`src/cron/reminders.js`, cron `0 17 * * *`)
sélectionne les rendez-vous du lendemain sans jamais consulter la préférence du
tenant. Un garagiste qui ne veut pas de SMS de rappel n'a aujourd'hui aucun
moyen de les arrêter.

Travail : une jointure sur `notification_preferences` dans la requête du cron,
plus la ligne de réglage à réafficher. Attention au `DEFAULT` — un tenant sans
ligne dans la table doit continuer à recevoir les rappels (règle i.17).

### 2. Récapitulatif hebdomadaire : l'envoyer, ou retirer la promesse

`POST /api/v1/reports/weekly/cron` existe, lit `users.weekly_report_enabled`,
génère et envoie l'e-mail — mais **aucun cron ne l'appelle**. `wrangler.toml`
ne déclare que `0 17 * * *` (le rappel J-1). Le récapitulatif n'a donc jamais
été envoyé à personne.

Deux issues, à trancher : ajouter un cron hebdomadaire (`0 7 * * 1`) et
distinguer les deux déclenchements dans `handleScheduled` par `event.cron` ; ou
retirer la fonction. Ne pas laisser l'état actuel : du code qui marche, que rien
n'appelle, finit par être « corrigé » par quelqu'un qui croit à une panne.

### 3. Les 4 `notification_preferences` : lues, ou supprimées

`email_after_call`, `sms_reminder_j1`, `weekly_summary`, `quota_alerts` sont
écrites par `PUT /api/v1/settings/notifications` et relues par **personne** dans
tout le backend. Le point 1 traite `sms_reminder_j1`. Restent trois colonnes à brancher
sur leurs émetteurs respectifs (notification d'appel, récapitulatif, alerte de
quota), ou à supprimer avec leur route.

⚠️ **Piège du PUT** : il applique un `DEFAULT` à 1 sur tout champ absent du
corps. Envoyer la seule case modifiée réactive silencieusement les trois autres.
Toute interface qui les réaffichera devra poster l'état complet des quatre —
c'est ce que fait déjà le code retiré, conservé dans l'historique du chantier.

---

## 11. Chantier NAVIGATION 2 (14/08/2026) — retours de recette en production

### 11.1 — « 0 canal actif » : le 13ᵉ réglage fictif

La pastille « Mes canaux » lisait `channel_configurations.enabled`. Cette table
contient **deux lignes dans toute la base**, les deux à `enabled=0` : elle
affichait donc « 0 canal actif » aux sept tenants, dont un garage ayant reçu
**dix appels**.

Rien, dans le chemin qui fait marcher le produit, ne l'écrit — ni le signup, ni
l'onboarding, ni la provision d'un numéro. Et rien ne la relit : ni
`resolve-phone`, ni l'agent vocal, ni `shared/sms-envoi.js`. Deux requêtes de
`twilio/routes.js` joignent bien sur `cc.enabled = 1`, mais ne peuvent donc
rien remonter : ce sont des chemins hérités, supplantés par
`omni_phone_mappings` et `resolve-phone`.

**`channel_configurations` rejoint donc les douze de la section 10 comme 13ᵉ
réglage fictif** — avec une circonstance aggravante : les douze autres ne
faisaient rien, celui-ci affirmait au client que rien ne marchait alors que tout
marchait.

**Correctif** : `GET /api/v1/channels/etat` constate au lieu de déclarer.

| Canal | Actif si | Vérifié en base |
|---|---|---|
| Téléphone | mapping voice actif **ou** un utilisateur `phone_verified=1` | 5 tenants sur 7 |
| SMS | toujours — `env.TWILIO_PHONE_NUMBER`, aucun réglage tenant | 7/7 |
| E-mail | un jeton dans `oauth_google/outlook/yahoo_tokens` | 1 tenant |
| WhatsApp | jamais — gelé, annoncé « bientôt » | 0 |

Garage Toulouse passe de « 0 canal actif » à « **2 canaux actifs** ».
`GET /api/v1/channels` reste inchangée : les pages `channels/*` éditent une
configuration, ce n'est pas la même question.

### 11.2 — Réglages : une rubrique à la fois

La page unique s'est révélée trop longue en conditions réelles. Le sommaire
**commande** désormais l'affichage au lieu de le suivre : une seule rubrique
montée, « Mon entreprise » par défaut.

Deux détails qui ne se voient qu'à l'usage :

- **`hashchange` en plus du montage.** Sans lui, coller `#compte` dans la barre
  d'adresse d'un onglet DÉJÀ ouvert ne fait rien — la page ne se remonte pas.
- **La recherche balaie toutes les rubriques**, pas seulement l'ouverte. C'est
  la contrepartie du repliement : on cherche justement un réglage dont on ne
  sait plus où il est rangé. Elle rend une liste plate, chaque résultat portant
  le nom de sa rubrique, et un clic l'ouvre.

Les trois blocs d'arrêt vivent dans « Mon compte ».

### 11.3 — « Bien démarrer » : le repli existait, mais ne survivait pas

L'état replié existait déjà (`expanded`) mais **n'était pas persisté** : chaque
navigation rouvrait le bloc en pleine hauteur. Et le bouton « masquer
définitivement » n'apparaît qu'aux 5 étapes faites — un compte à **4/5**, comme
Garage Toulouse, restait donc coincé avec le bloc ouvert, sans aucun moyen de le
réduire durablement.

Repli persisté en `localStorage` (préférence d'affichage, par appareil) ; le
masquage définitif reste en base (`users.checklist_dismissed_at`), sinon il ne
suivrait pas le client d'un poste à l'autre. Repliée, la checklist tient sur une
ligne : sous-titre et barre de progression sont masqués avec le reste — les
garder aurait laissé trois lignes et le repli n'aurait rien rendu.

### 11.4 — L'essai : un seul compteur

Le nombre de jours restants s'affichait en bloc de 64 px au **milieu** de « Mon
activité » **et** en pastille au bas de la barre latérale. Deux compteurs pour un
même chiffre. Le bloc du milieu devient un bandeau fin en tête ; la pastille perd
son compteur et ne garde que le nom de la formule. Le bandeau d'essai **expiré**
est conservé pleine largeur : ce n'est plus un compte à rebours mais un compte
qui ne fonctionne plus.

### 11.5 — La « vue agenda » n'existait pas

`/dashboard/appointments/calendar` n'avait **aucune grille** malgré son URL :
c'était un doublon quasi exact de `/dashboard/rdv`, en plus pauvre (pas de
synchronisation Google/Outlook). Redirigée par meta refresh. Détail dans
l'en-tête du fichier.

### 11.6 — Les tickets d'aide n'arrivaient nulle part

`POST /support/tickets` envoyait un unique e-mail — **au client**, en accusé de
réception promettant « nous reviendrons vers vous ». Personne chez Coccinelle
n'était prévenu : `support@coccinelle.ai` n'apparaissait que dans le `from`.
Rattraper par la base était impossible, `GET /support/tickets` filtrant sur
`tenant_id` — même un admin ne voit que les tickets de son propre tenant, et
aucune page back-office ne lit `support_tickets`. **Zéro ticket en base** avait
caché le défaut depuis le début.

Désormais **deux envois distincts** : vers `support@coccinelle.ai` avec
`reply_to` sur le client, puis l'accusé de réception. Deux envois et non un `to`
à deux adresses, sinon le client voit l'adresse interne et un « répondre à tous »
lui expédie nos échanges. Sans `RESEND_API_KEY`, un **WARN explicite** est
journalisé : un ticket perdu en silence est pire qu'une erreur visible.
Les valeurs venant du client sont échappées — elles partent dans un e-mail HTML
que nous lisons.

---

## 12. Backlog — ajouts du 14/08/2026

Ces deux entrées viennent après les trois de la section 10.

### 4. Vraie vue agenda — grille mensuelle (1,5–2 j)

Aucune vue calendaire n'existe dans le produit : `/dashboard/rdv` est une liste,
et `appointments/calendar` n'en était pas une malgré son nom. Un garagiste pense
son planning en semaine, pas en liste triée par date. À écrire quand les
premiers clients arriveront.

### 5. `channel_configurations` — lue, ou supprimée

La table est écrite par trois écrans de configuration et relue par deux requêtes
héritées de `twilio/routes.js` qui ne peuvent plus rien remonter. Soit les pages
`channels/*` deviennent la source d'un vrai réglage par tenant — ce qui suppose
de décider ce que « désactiver le SMS » signifie quand l'envoi est une capacité
plateforme — soit la table et ses écrans disparaissent.

---

## 13. Chantier NAVIGATION 3 (14/08/2026)

### 13.1 — « Passer » : le blocage était dans l'API, pas dans le bouton

`POST /onboarding/checklist/dismiss` recalculait la checklist côté serveur et
renvoyait **409 « Checklist incomplete »** tant que les 5 étapes n'étaient pas
faites. Afficher le bouton sans toucher au backend aurait produit un clic qui
échoue en silence.

La garde confondait deux choses : **avoir terminé** est un fait que le serveur
calcule, **vouloir masquer** est une décision du client. En production, l'effet
était l'inverse du but : un compte bloqué à 4/5 — Garage Toulouse, faute
d'équipe à inviter — gardait le bloc ouvert en tête de son tableau de bord,
définitivement et sans recours.

Garde retirée, bouton « Passer » discret visible à tout avancement, avec une
confirmation en ligne (le geste est irréversible depuis l'interface). Aucune
migration : `users.checklist_dismissed_at` existe depuis la 0083. Le masquage
reste en base — il doit suivre le client d'un appareil à l'autre — là où le
`localStorage` ne gouverne que le repli.

### 13.2 — Pastilles de canaux : où elles mènent

| Canal | État | Cible |
|---|---|---|
| Téléphone | actif | `/dashboard/channels/numbers` |
| Téléphone | inactif | `/dashboard/settings#joindre` (numéro vérifié) |
| SMS | toujours actif | `/dashboard/channels/sms` |
| E-mail | actif ou non | `/dashboard/channels/email` |
| WhatsApp | gelé | **aucun lien** |

WhatsApp n'est pas cliquable : une pastille menant à « bientôt disponible »
promettrait deux fois.

**Découverte au passage — le canal e-mail était inactivable depuis le produit.**
Aucune page du frontend n'appelait `/api/v1/oauth/google/authorize` : le mot
`authorize` n'apparaissait qu'une fois dans tout `app/`, `src/`, `lib/`,
`components/`, dans un composant orphelin. `channels/email` ne réglait que
l'**envoi** (expéditeur Resend, test, historique), jamais la **réception**.
Le backend, lui, fonctionne : `GOOGLE_CLIENT_ID` et `GOOGLE_REDIRECT_URI` sont
dans `wrangler.toml`, `GOOGLE_CLIENT_SECRET` est en secret, et la route répond
**302** vers Google (vérifié en production). Le bouton manquant était un lien,
pas une fonctionnalité. Gmail seul : Outlook et Yahoo ne sont pas fonctionnels
à 100 %, et un bouton qui mène à une déception coûte plus qu'un bouton absent.

### 13.3 — L'agenda, et les trois règles qui l'empêchent d'être un doublon

`/dashboard/rdv/agenda` — sous `rdv` et non à côté : l'URL dit elle-même
« autre vue du même contenu ». Trois règles, vérifiées en recette :

1. **elle ne crée rien** — pas de modale ; un jour vide renvoie sur la liste ;
2. **elle ne filtre rien** — statut, agent, recherche restent sur la liste ;
3. **même source, même fiche** — `GET /api/v1/appointments`, chaque rendez-vous
   mène à `/dashboard/rdv/{id}`.

Bascule « Liste · Agenda » en tête des deux pages. « Voir l'agenda » remplace
« Tout voir » sur la carte « Rendez-vous à venir » : à cet endroit on cherche un
planning, pas un tableau trié par date.

Le piège du fuseau est réel ici plus qu'ailleurs : un rendez-vous de **23 h**
relu comme de l'UTC passerait au **lendemain** — il changerait de case. Vérifié
sur un cas à 23:00 : il reste au bon jour.

---

## 14. Backlog — ajout du 14/08/2026

### 0. 🔴 PRIORITAIRE — jeton court à usage unique pour l'OAuth (0,5 j)

`GET /api/v1/oauth/google/authorize` attend le JWT **dans l'URL** (`?token=`).
Depuis le bouton « Connecter ma boîte Gmail », un jeton de **30 jours** part
donc dans l'historique du navigateur, dans les journaux de tout intermédiaire,
et dans l'en-tête `Referer` envoyé à Google.

C'est le contrat existant du backend, antérieur à ce chantier — mais le bouton
le met en pratique. **Ce n'est pas un confort, c'est une dette de sécurité.**

Remplacement : une route authentifiée par en-tête qui rend un jeton à usage
unique et de courte durée (60 s), le `authorize` n'acceptant plus que celui-là.
Passe devant les entrées 1 à 5 des sections 10 et 12.

---

## 15. Chantier NAVIGATION 4 (14/08/2026)

### 15.1 — Le canal e-mail : deux états, pas un interrupteur

La page affichait « Inactif » et proposait « Activer ». Testé en production :

```
POST /api/v1/channels/email/enable
→ 400 {"error":"Canal non configuré. Veuillez d'abord configurer le canal."}
```

`enableChannel` exige une ligne `channel_configurations` avec `configured = 1`.
**Cinq tenants sur sept n'en ont aucune.** Et le frontend ne testait que
`res.ok`, sans `else` : le client cliquait, rien ne bougeait, **aucun message**
n'apparaissait. Ce n'était donc pas « un bouton qui ne change rien de réel »,
c'était un bouton qui échoue sans le dire.

Pendant ce temps `resend_configured: true` — **l'envoi fonctionnait**. La page
annonçait « Inactif » sur un canal qui marche.

Un badge unique ne pouvait pas dire la vérité, parce que les deux sens ne
s'activent pas de la même façon :

| Sens | Dépend de | Portée |
|---|---|---|
| Envoi | clé Resend | plateforme |
| Réception | jeton OAuth (`/channels/etat`) | par tenant |

Deux lignes d'état, aucun interrupteur — il n'y a rien à basculer. La réception
s'active en reliant une boîte, ce que fait le bouton Gmail livré au chantier 3.
Les routes `enable`/`disable` restent : d'autres pages `channels/*` s'en servent.

### 15.2 — La page calendrier était une maquette, entièrement

`CalendarIntegration` (504 lignes) ne faisait **aucun appel réseau** — ni
`fetch`, ni `buildApiUrl`. Son contenu vivait dans son état initial :
`manager@entreprise.com`, `eventsCount: 42`, `lastSync` calculé à « il y a
15 min », et deux événements d'agence immobilière (« Visite appartement 3
pièces ») affichés à un garage.

Les boutons simulaient : `handleConnect` portait le commentaire
`// Simulate OAuth flow` et ajoutait une ligne après un `setTimeout` ;
« Déconnecter » retirait une ligne en mémoire, et `manager@entreprise.com`
revenait au rechargement.

**Le danger n'était pas cosmétique** : un client qui croit son agenda
synchronisé cesse de vérifier ses créneaux, et laisse l'assistant poser des
rendez-vous sur des heures où il est déjà pris.

Côté serveur, rien à brancher : aucune route `calendar`, et les trois tables
(`calendar_blocks`, `integration_sync_logs`, `integration_sync_queue`) sont
vides — `calendar_blocks` n'est écrite par aucune ligne de code.

La page reste (elle est liée depuis `/dashboard/rdv`) et dit désormais la
vérité, en renvoyant vers `Disponibilités` qui, elle, fonctionne. Composant
supprimé. **`tsc` passe de 142 à 141** : une erreur de la baseline vivait dans
ce fichier.

### 15.3 — Le glisser-déposer fonctionnait : c'est la promesse qui était trop large

Vérifié en navigateur : déposer `tarifs.csv` colle bien son contenu dans le
champ ; déposer un `.pdf` est refusé. Le dépôt lit le fichier **côté navigateur**
(`f.text()`) — aucun réseau, donc ni le 501 de `/documents/upload` ni le blocage
multipart n'entrent en jeu.

La limite est le **format**, pas le transport. Le placeholder disait « glissez un
fichier » sans dire lequel, et le refus se contentait d'énoncer une liste
d'extensions. Désormais le placeholder nomme `.txt` et `.csv`, et le refus d'un
PDF donne la marche à suivre : ouvrir, copier, coller.

---

## 16. Backlog — ordre arrêté le 14/08/2026

0. ✅ ~~**Fermer la fenêtre de rotation `VOIXIA_API_KEY`**~~ — **FAIT le 15/08/2026.**
   Contrôle final : `401` sur l'ancienne clé, `200` sur la nouvelle,
   `VOIXIA_API_KEY_ROTATION` supprimé, sauvegarde serveur purgée. La clé publiée
   dans 23 commits n'ouvre plus rien. Détail et procédure réutilisable :
   CLAUDE.md § r.1 et § j.

   Reste sur le même sujet, **non planifié** : la clé est **unique et globale**, le
   tenant venant d'un en-tête fourni par l'appelant. Quiconque la détient agit sur
   n'importe quel tenant. La rotation a fermé la fuite, pas le modèle.

0bis. **`/dashboard/channels` est une maquette entière** (0,5 j) — ajouté le
   15/08/2026, trouvé en retirant les promesses d'e-mail.

   Quatre compteurs **écrits en dur** — 47 appels, 34 SMS, 28 WhatsApp, 15
   e-mails — et **aucun appel serveur** dans toute la page. C'est la famille de
   `CalendarIntegration` (§ 15.2) : un client y lit des chiffres qui ne sont pas
   les siens. La tuile e-mail a été retirée (canal hors périmètre) ; les trois
   autres restent, et retirer un quart d'un mensonge ne le corrige pas.

   ⚠️ Aucun lien de l'interface n'y mène. Ses seules références entrantes étaient
   les redirections par défaut de l'OAuth Google (`modules/oauth/google.js`), un
   flux devenu inatteignable depuis le retrait du bouton Gmail. À trancher :
   la brancher sur `/analytics/overview`, ou la supprimer comme les sept pages de
   `app/client/`.

0ter. **Les 27 adresses e-mail de contacts : purger ou documenter la conservation**
   (0,5 j) — échéance **fin 2026**, ajouté le 15/08/2026.

   L'e-mail vers les clients est coupé (lot `chantier-email-invisible`) mais les
   **27 adresses sur 34 prospects** sont conservées : ces contacts les ont données
   pour être contactés, la finalité est **suspendue, pas disparue**, et le canal
   revient avec MailIA. Une purge serait irréversible pour une décision produit
   qui peut changer.

   ⚠️ Cet arbitrage a une date de péremption. **Si l'e-mail n'est pas revenu d'ici
   la fin de l'année**, la conservation n'a plus de finalité présente et il faut
   trancher : purger `prospects.email` (+ `appointments.customer_email`), ou
   documenter formellement la conservation dans la politique de confidentialité
   avec sa durée et sa base légale. Laisser courir sans décision, c'est le défaut
   que le retrait du champ de réservation corrigeait au même moment.

0quater. **L'avis après rendez-vous ne vit plus** (0,5 j) — ajouté le 15/08/2026.

   `POST /appointments/send-followups` est neutralisée : elle demandait l'avis par
   e-mail. Or **toute la fonction ne vivait que par cet e-mail** — `feedback`
   compte 0 ligne, son unique écrivain était cette route, et le seul chemin vers la
   page publique `/feedback` était le lien de ce message.

   La page reste en ligne mais ne recevra plus jamais de jeton. À trancher : la
   faire revivre par SMS (le lien tiendrait dans un segment), ou la retirer avec sa
   page — comme les sept pages de `app/client/`.

1. 🔴 **Jeton OAuth court à usage unique** (0,5 j) — cf. § 14. Un JWT de 30 jours
   part aujourd'hui dans l'URL, l'historique et le `Referer` vers Google.
   ⚠️ **Moins urgent depuis le 15/08** : la page qui déclenchait ce flux a perdu
   son bouton (l'e-mail est hors périmètre). La route `authorize` existe toujours
   et garde le défaut ; plus rien ne la mène.

1bis. **`/api/v1/oauth/google/disconnect` affirme « Gmail déconnecté » sans rien
   déconnecter** (0,5 j) — ajouté le 15/08/2026.

   La route fait un `DELETE FROM oauth_google_tokens` et répond
   `{ success: true, message: 'Gmail déconnecté' }`. Elle **n'appelle jamais**
   `POST https://oauth2.googleapis.com/revoke`. L'autorisation reste donc active
   dans le compte Google du client, listée dans ses applications tierces — et un
   `refresh_token` qui aurait fuité par une sauvegarde resterait utilisable.

   Le message est donc faux : le client croit avoir coupé l'accès, il a seulement
   fait oublier le jeton à Coccinelle.

   **À corriger quand l'e-mail reviendra avec MailIA** : révoquer chez Google
   AVANT de supprimer la ligne — l'ordre inverse perd le seul moyen de révoquer.
   C'est exactement la manœuvre faite à la main le 15/08 sur les deux jetons
   existants (un `200`, un `400 invalid_token` = déjà mort).
2. **Synchronisation calendrier réelle** (5–7 j). C'est la brique qui a le plus
   de valeur métier : sans elle, l'agent vocal peut poser un rendez-vous sur un
   créneau déjà occupé. Elle suppose : le scope `calendar` ajouté à l'OAuth
   Google (**reconsentement obligatoire** — le jeton actuel ne couvre que
   Gmail), la lecture des événements, l'écriture des RDV vers Google,
   l'alimentation de `calendar_blocks`, le croisement avec `check_availability`
   de l'agent vocal, et un cron de synchronisation (le seul cron déclaré
   aujourd'hui est le rappel J-1).
3. **Upload et lecture de PDF** (3–4 j). ⚠️ **Exigence UE : aucun service hors
   Europe pour l'extraction de texte.** Cela exclut les API d'extraction
   américaines et impose une bibliothèque WASM exécutée dans le Worker, ou un
   traitement sur le serveur Hetzner. Le transport est déjà résolu par ailleurs
   (corps JSON base64, comme `compliance/documents`) ; c'est l'extraction qui
   porte le coût.
4. Rappel J-1 paramétrable par tenant — cf. § 10.
5. Récapitulatif hebdomadaire envoyé, ou promesse retirée — cf. § 10.
6. Les quatre `notification_preferences`, lues ou masquées — cf. § 10.
7. Vraie vue agenda… **livrée au chantier 3**, cette entrée est close.
8. `channel_configurations` — lue, ou supprimée avec ses écrans. cf. § 12.
9. 🔴 **Les deux pages CX-2 sont illisibles sur téléphone** (0,5 j) — ajouté le
   15/08/2026, trouvé en construisant « Mes communications ».

   `/dashboard/assistant` et `/dashboard/savoir` portent leur grille en style
   **inline** (`gridTemplateColumns: 'minmax(0, 65fr) minmax(0, 35fr)'` et
   `'60fr / 40fr'`), pour rester au hex près sur les maquettes Claude Design. Or
   **un style inline ne peut pas porter de `@media`** : la grille reste donc à
   deux colonnes quelle que soit la largeur, et donne sur un téléphone deux
   colonnes d'environ 170 px où chaque mot part à la ligne. Constaté en
   navigateur à 390 px sur la page CX-3 avant correction — les deux pages CX-2
   n'ont pas été retouchées.

   **Ce n'est pas cosmétique, et c'est là que le classement se joue** : les
   clients sont des artisans, ils consultent leur tableau de bord au téléphone,
   entre deux interventions. C'est leur écran PRINCIPAL, pas la version dégradée
   — et « Mon assistant » est la page qui porte le prénom, la voix et les
   horaires de l'agent. Une page de réglage qu'on ne peut pas lire là où on la
   consulte n'est pas une page de réglage.

   Le correctif existe déjà et est livré : `src/components/cx2/useEcranLarge.ts`
   (`matchMedia`, premier rendu à UNE colonne — se tromper vers une colonne donne
   une page lisible partout, se tromper vers deux donne un instant d'illisible
   sur mobile). Il reste à l'appliquer aux deux pages : la grille, le `padding`
   du conteneur (`36px 40px` → `24px 16px`) et celui des cartes.

---

## 16. Backlog ajouté par le chantier ANTI-ROBOT (16/08/2026)

### 6. 🔴 Les quotas annoncés ne sont appliqués nulle part

À réconcilier **avant la première signature payante**. Trois sources se
contredisent, et aucune ne gouverne quoi que ce soit :

| Source | Ce qu'elle dit pour Essentiel |
|---|---|
| Page Tarifs (front) | 50 SMS/mois |
| `planQuotas` (code) | **0** |
| Le code d'envoi | rien — aucun contrôle de quota n'existe |

Un client d'Essentiel peut donc envoyer autant de SMS qu'il veut, et un client
qui compte sur ses 50 SMS n'a aucun compteur pour le lui dire. C'est vendable
tant que personne ne paie ; ça devient un litige au premier abonnement.

Le plafond quotidien livré par ce chantier **ne règle pas ce point** : il borne
le coût d'un abus (20/jour public, 100/jour authentifié), il ne mesure pas un
droit d'usage mensuel. Les deux compteurs sont distincts et doivent le rester —
un plafond anti-robot qui servirait de quota commercial refuserait un SMS
légitime au nom de la facturation.

Travail : trancher la grille réelle, la porter dans **une** source, brancher le
décompte mensuel sur `sms_compteurs_jour` (l'agrégat par jour existe déjà, la
somme du mois est une requête), et afficher le compteur au client.

### 7. Rate limit réellement partagé (dépend de l'infrastructure)

Le limiteur de `src/utils/rate-limiter.js` est une `Map` **en mémoire du
Worker** : un compteur par isolate, remis à zéro à chaque éviction. Il élève le
coût d'un balayage, il ne l'interdit pas. C'est vrai du rate limit posé devant la
validation de clé VoixIA par ce chantier comme de celui qui existait déjà.

Un vrai plafond de requêtes exige l'un des deux :
- une **zone Cloudflare** sur le domaine de l'API (`api.coccinelle.ai` plutôt que
  `*.workers.dev`), qui donne accès aux règles de rate limiting du bord — c'est
  la voie courte ;
- ou un **compteur partagé** (KV, Durable Object), à déclarer dans les liaisons.

⇒ **À traiter avec la migration Scaleway**, pas avant : c'est le même
déplacement de domaine. En attendant, ce qui borne réellement le risque est le
plafond quotidien de SMS (le coût) et le compteur de 401 (la visibilité), pas le
limiteur.

### 8. 🔴 Le fuseau des dates naïves — un `lib/dates` et 15 sites (balayage du 16/08/2026)

**En tête du backlog.** Le balayage dédié est fait ; il ne reste que le chantier.

**La règle 10quinquies est mal lue, et c'est le cœur du problème.** Elle dit « ne
jamais passer `scheduled_at` à `new Date()` puis reformater avec un `timeZone` ».
Elle a été comprise comme « `new Date()` est interdit », ce qui est trop large et
fait manquer le vrai critère : **c'est le `timeZone` qui est interdit, pas le
`new Date()`**. `scheduled_at` vaut `"2026-08-20 14:30:00"` — naïf, déjà local.
Dans un Worker (fuseau UTC), `new Date(naïf)` puis `getUTCHours()` rend 14, juste ;
`toLocaleString({timeZone:'Europe/Paris'})` rend 16:30, faux.

**Ce qui reste à faire, par ordre de valeur :**

1. **`lib/dates.ts` (front) + son pendant backend** : `lireDateNaive()` qui lit les
   composantes du texte sans jamais passer par un fuseau. Puis les **15 sites** de
   10 fichiers : `app/booking/[slug]`, `dashboard/rdv` (+`agenda`, +`[id]`),
   `dashboard/communications`, `dashboard/analytics`, `cx2/RendezVousAVenir`,
   `dashboard/SmartAlerts`, `lib/ai-insights`, `lib/live-updates`.
   Aujourd'hui chacun refait `new Date(a.scheduled_at)` : correct pour un
   utilisateur **en France**, faux pour tout autre fuseau — un client qui consulte
   son agenda depuis les Antilles ou le Canada voit des heures décalées. `lib/`
   porte déjà `horaires.ts` comme source unique des horaires ; il n'existe **rien**
   pour les dates, et c'est pour ça que le défaut est réapparu trois fois.
2. **Durcir les 2 sites backend justes par coïncidence** : `voixia/routes.js:422`
   (`getUTCHours()`) et `twilio/conversation.js:636` (`getDay()`). Ils marchent
   parce que le runtime du Worker est en UTC et que deux erreurs s'annulent. Le jour
   où ce n'est plus vrai, ils basculent ensemble et silencieusement.

**Déjà traité, ne pas rechercher :** les 4 applications de `timeZone` sont saines
(deux portent `'UTC'`, qui EST le correctif ; `proactive/routes.js:105` s'applique à
`new Date()` sans argument, donc à un instant réel). Le second envoyeur de rappels
J-1 qui portait le défaut a été supprimé le 16/08.

### 9. `getDay()` contre `day_of_week` — le reste est du code mort

Balayage complet du 16/08/2026 sur les 21 usages de `getDay()`/`getUTCDay()`. La
convention est **1 = lundi … 7 = dimanche**, validée par `availability/routes.js:91`.

**Corrigé** : `twilio/conversation.js:637` (dimanche toujours indisponible).

**Défectueux mais INERTE — `src/modules/retell/routes.js`, module commenté dans
`index.js` (lignes 24 et 474) :**
- `:711` — `(getDay() + 6) % 7` donne 0=lundi face à une colonne 1-7 : **décalé
  d'un jour pour TOUS les jours**, un mardi lisant les horaires du lundi. Plus grave
  que le défaut du dimanche, et invisible puisque inatteignable.
- `:1117` — `getUTCDay()` brut contre `business_hours.day_of_week` : dimanche seul.

⇒ **Décision à prendre sur le module `retell` : le supprimer ou le réparer.** Le
laisser commenté garantit qu'une réactivation un jour livrera ces deux défauts. Ne
pas corriger du code mort au cas par cas — c'est la décision qu'il faut, pas le
correctif.

**Vérifiés corrects, ne pas y revenir** : `public/booking.js:130`,
`public/routes.js:169`, `voixia/routes.js:310` (les trois convertissent 0→7), les
deux graphiques d'analytics (`strftime('%w')` = 0=dimanche, indexé sur un tableau
qui commence par « Dim »), et l'agenda (`(getDay()+6)%7` pour l'affichage).
Variable morte au passage : `twilio/conversation.js:577`, jamais relue.

### 10. Chaîne SMS morte dans le FRONTEND — 1 314 lignes, et un jeton Twilio en puissance

Découverte par `scripts/verifier-sms.mjs` le 17/08/2026, en dehors du cadrage du lot.

`coccinelle-saas/src/modules/orchestrator/channelOrchestrator.ts` →
`channels/sms/smsService.ts` → `channels/sms/twilioClient.ts` construit un client Twilio
avec `accountSid` **et `authToken`**, et appelle `Messages.json` en `fetch` direct.

**Mesuré : la chaîne est ENTIÈREMENT MORTE.** Zéro page ou composant n'importe
`channelOrchestrator`, zéro occurrence dans le bundle construit. **Rien n'a fuité.**

⚠️ Mais c'est un piège armé : le jour où quelqu'un branche cette chaîne sur une page,
un **jeton d'authentification Twilio part dans le bundle du navigateur** — la faute
exacte des clés VoixIA de `dashboard/proactive/page.tsx` et `dashboard/voixia/page.tsx`
(§ r.1), où une clé n'était pas « exposée par le dépôt » mais **publiée par le produit**,
à chaque chargement.

⇒ **À supprimer.** C'est du code mort, et le supprimer désarme le piège. Ce n'est pas
fait dans le lot COMPACTION parce que c'est un autre sujet : ce lot traite les chemins
d'envoi du Worker.

⇒ Et **`scripts/verifier-sms.mjs` exclut aujourd'hui `coccinelle-saas/` et
`voixia-portal/`** pour cette raison — sans quoi `npm test` serait rouge en permanence
sur un problème connu. Le motif est écrit dans le fichier. **Retirer cette exclusion le
jour où la chaîne est supprimée**, sinon le garde-fou ne surveille plus le frontend, qui
est précisément là où un jeton dans le bundle ferait le plus de dégâts.

### 11. Déduplication des routes de test SMS

Trois routes envoient un SMS de test et font la même chose :
`POST /channels/sms/test` (`testSmsChannel`), `POST /channels/test-sms`
(`handleTestSMS`), et `POST /public/test/sms` (fermée par `ENABLE_TEST_ENDPOINTS`).

Les trois ont été migrées à l'identique au lot COMPACTION — supprimer une route pendant
un lot de compaction mélangerait deux sujets. En garder **une** est le travail restant.

### 12. Secret `RETELL_API_KEY` sans lecteur

Le module `retell` a été supprimé le 17/08/2026, mais `RETELL_API_KEY` est toujours dans
les secrets du Worker. Plus aucun code ne le lit. À supprimer :
`npx wrangler@latest secret delete RETELL_API_KEY`.

## 13. Conformité SMS — second lot (diagnostic du 17/08/2026)

Le premier lot (verrouillage) est fait : garde de destinataire, suppression des routes à
contenu libre, traitement du STOP, retrait de l'onglet Préférences. **Ce qui suit est la
conformité positive** — donner une pièce à produire, plutôt qu'empêcher.

### 13.1 🔴 Une trace de consentement (2,5 h)

Il n'existe **aucune** colonne de consentement dans tout le schéma D1. Le refus est
désormais enregistré (`sms_refus`, migration 0088), mais l'**accord** ne l'est pas.

⚠️ **Et la réserve sur le rappel J-1, qui est le vrai sujet** : il est **légitime par
nature** — message de service strictement nécessaire à une prestation que la personne a
elle-même demandée en prenant rendez-vous, sans contenu promotionnel, l'entreprise
nommée — mais il est **invérifiable par la trace**. Si quelqu'un se plaint, on ne peut
produire aucune pièce : ni consentement recueilli, ni horodatage. La légitimité tient au
contexte, pas à un document. C'est exactement ce que cette entrée corrige.

Travail : `sms_consent_at` + `sms_consent_source` (horodatés) sur `prospects`, la case
sur le formulaire public de réservation, et l'affichage dans la fiche — **cette fois
alimenté par l'API, pas par des littéraux**.

### 13.2 🟠 Renommer le type `prospection` (0,5 h)

Les 6 gabarits de `proactive_templates` ne sont **pas** de la prospection : « votre
véhicule est prêt », « votre devis est disponible », « vos résultats d'analyses sont
disponibles » sont des messages de service sur un dossier en cours. Le nom mentait, et
il pilote la règle du lien de réservation (`prospection: true`). → `suivi_dossier`.

### 13.3 🟠 La plage horaire du proactif n'est pas respectée (0,5 h)

`proactive/routes.js` lit `hours_start`/`hours_end` (8h–19h), calcule l'heure de Paris
ligne 107 — et **la variable `heure` n'est jamais utilisée**. Les lignes suivantes ne
choisissent qu'un canal. Rien ne bloque un SMS à 23h, alors que la page affiche la
plage. Réglage fictif, et c'est l'envoi nocturne qui déclenche un signalement.

### 13.4 🟡 Contraindre le `to` du tool `send_sms` (1 h)

`voixia/routes.js:610` : le numéro vient du corps de la requête, donc **du LLM**. Le
prompt lui dit d'utiliser celui de l'appelant, rien ne le contraint côté serveur. Une KB
empoisonnée ou un prompt manipulé pourrait faire envoyer ailleurs. La garde de contact
posée au premier lot le couvre partiellement (le destinataire doit être un contact connu),
mais elle n'impose pas que ce soit **l'appelant en cours**.

### 13.5 🟡 Une permission RBAC sur l'envoi sortant (1 h)

Aucune des routes SMS n'était protégée par une permission. Un salarié invité avec des
droits minimaux pouvait envoyer. Les routes libres sont supprimées, mais les chemins
restants (test, proactif) méritent une permission.

### 13.6 🟡 Mention de refus dans les messages non transactionnels (0,5 h)

Identification de l'expéditeur : ✅ présente (`{entreprise}` dans tous les gabarits).
Moyen de refus affiché : ❌ absent. Toléré sur du transactionnel, pas sur un envoi à
l'initiative de l'entreprise — et c'est aussi ce qui déclenche le filtrage opérateur.

### 13.7 🟡 Envoi manuel par gabarit nommé (1,5 h)

La modale « Envoyer un SMS » des fiches contact a été **retirée** au premier lot avec la
route `/api/v1/sms/send`. `MODELES` ne contient qu'un gabarit (`confirmation_rdv`), qui
n'a aucun sens comme message manuel. Si le besoin revient **d'un vrai client**, la voie
est un choix parmi des gabarits nommés — jamais un champ libre.
