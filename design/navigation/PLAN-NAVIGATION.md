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
