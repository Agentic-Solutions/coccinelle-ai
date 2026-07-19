# WhatsApp V2 — État des lieux, architecture cible et plan de chantier

> Session d'analyse du 19/07/2026. **Aucun code produit, aucune modification** (R4 strict).
> Lecture seule sur le code et sur `coccinelle-db-eu`.
> Sources : audit du dépôt + requêtes D1 production + docs primaires Meta/Twilio (juillet 2026).

---

## 1. ÉTAT DES LIEUX — WhatsApp V1

### 1.1 Verdict en une ligne

**V1 n'a jamais quitté le labo.** Le code existe en quantité (≈ 2 000 lignes réparties sur 11 modules
backend + 2 modules frontend morts), mais la production ne contient que des traces de tests de
développement de janvier 2026. Il n'y a **rien à migrer et aucun utilisateur à casser**.

### 1.2 Ce que dit la production (D1 `coccinelle-db-eu`, 19/07/2026)

| Mesure | Valeur | Lecture |
|---|---|---|
| `omni_messages` où `channel='whatsapp'` | **9** | Tous datés du **28/01/2026**, smoke tests |
| `channel_messages_log` où `channel_type='whatsapp'` | **0** | Le chemin « officiel » de log n'a jamais servi |
| `channel_configurations` WhatsApp | **2** | 2 tenants `test-wa2-…` / `test-final-…`, jetables |
| `omni_phone_mappings` WhatsApp | **3** | 2 numéros bac à sable Meta (`+1555…`) + 1 numéro FR |
| Tenants en base | 156 | **0 tenant réel n'a jamais utilisé WhatsApp** |

Les 9 messages sont des allers-retours « Bonjour, quels sont vos horaires ? » → réponse générique
(« En tant qu'assistant virtuel… »). **La base de connaissances n'était même pas branchée** sur les
réponses WhatsApp : l'agent répondait hors-sol.

### 1.3 Inventaire du code existant

**Backend — 5 chemins d'envoi concurrents, 2 fournisseurs différents :**

| Chemin | Fichier | Fournisseur | Credentials |
|---|---|---|---|
| 1. Webhook Meta (principal) | `src/modules/omnichannel/webhooks/meta-whatsapp.js` | Meta Graph v22.0 | `META_WHATSAPP_ACCESS_TOKEN` (global) |
| 2. Orchestrateur VoixIA | `src/modules/voixia/orchestrator.js:547-598` | Meta Graph v22.0 | `META_WHATSAPP_ACCESS_TOKEN` + `META_PHONE_NUMBER_ID` |
| 3. Test canal | `src/modules/channels/routes.js:550-624` | Meta Graph v22.0 | `WHATSAPP_ACCESS_TOKEN` (**autre secret !**) |
| 4. Test public | `src/modules/public/routes.js:466-522` | Meta Graph v22.0 | `WHATSAPP_ACCESS_TOKEN` |
| 5. Legacy Twilio | `src/modules/omnichannel/webhooks/whatsapp.js` | Twilio Messages API | `TWILIO_*` |

Les **deux familles de secrets sont réellement provisionnées** sur le Worker
(`META_WHATSAPP_ACCESS_TOKEN` *et* `WHATSAPP_ACCESS_TOKEN` apparaissent dans `wrangler secret list`).
Deux implémentations vivantes, deux fournisseurs, deux jeux de clés — pour zéro usage réel.

**Autres surfaces :** OAuth Embedded Signup (`controllers/whatsapp-oauth.js`), CRUD phone-mappings,
`omnicanal/orchestrator.js:280` (`onWhatsAppReceived`), `channel-switcher.js`, `usage-tracker.js:179`
(`trackWhatsApp`, **jamais appelé** → aucune facturation).

**Frontend — deux pages contradictoires en production :**
- `app/dashboard/channels/whatsapp/page.tsx` → « Bientôt disponible », aucun appel API. ✅
- `app/dashboard/settings/channels/whatsapp/page.tsx` (718 l.) → page de config complète, formulaire
  token Meta, bouton de test, message **« Votre compte WhatsApp est connecté et opérationnel »**. ❌
  Contient un faux OAuth : `handleOAuthConnect()` simule le succès avec un `setTimeout(2000)` et
  code en dur `whatsappNumber: '+33 6 12 34 56 78'`.

**Code mort confirmé (aucun importeur) :** `src/modules/channels/whatsapp/whatsappService.ts` (559 l.),
`whatsappClient.ts` (370 l.), `src/templates/whatsapp/whatsappTemplates.ts` (434 l., 12 templates
immobiliers). Ces trois fichiers visent **Twilio**, alors que le backend vit sur **Meta** — deux
architectures divergentes, aucune branchée.

### 1.4 Ce qui ne marche pas — par gravité

**🔴 Sécurité — à traiter indépendamment du redo**

1. **Aucune vérification `X-Hub-Signature-256`.** `grep` sur tout `src/` : zéro occurrence.
   `META_APP_SECRET` est disponible mais jamais utilisé pour ça. N'importe qui connaissant l'URL du
   webhook peut POSTer un faux message entrant.
2. **Fallback multi-tenant dangereux.** Si le `phone_number_id` entrant n'est pas mappé :
   ```js
   // meta-whatsapp.js:54 — et le même à whatsapp.js:55
   SELECT id FROM tenants WHERE status = 'active' LIMIT 1
   ```
   Le message est attribué à un tenant arbitraire, **sa** base de connaissances est chargée, une
   réponse IA est générée et **envoyée**. Combiné au point 1 : fuite inter-tenant + dépense sur votre
   compte Meta, déclenchables sans authentification.
3. **Token de vérification en dur** : `META_WEBHOOK_VERIFY_TOKEN` retombe sur le littéral
   `'coccinelle_meta_verify_2026'` (`meta-whatsapp.js:26`).
4. **Secrets en clair en base.** `omni_phone_mappings.meta_access_token` est stocké en clair ;
   `channel_configurations.config_encrypted` contient un simple `JSON.stringify` — malgré son nom.
5. Les clés Meta ayant été exposées sur GitHub public, ces routes sont à considérer comme
   **compromises jusqu'à rotation**.

**🟠 Architecture**

6. **Dérive de schéma.** Les colonnes `channel_type`, `meta_phone_number_id`, `meta_waba_id`,
   `meta_access_token`, `display_name` **existent en production** sur `omni_phone_mappings` — je l'ai
   vérifié — mais **aucune migration de `migrations/` ne les crée**. Elles ont été appliquées
   hors-bande. Un rebuild depuis les migrations produit un schéma différent de la prod.
7. **Le token par tenant est écrit mais jamais lu.** `whatsapp-oauth.js:68` persiste
   `meta_access_token` ; aucun `SELECT` ne le relit nulle part. Le multi-tenant réel **ne fonctionne
   donc pas** : tous les envois passent par le token global.
8. **`phone_number` est `UNIQUE`** sur `omni_phone_mappings` → un même numéro ne peut pas porter une
   ligne `voice` et une ligne `whatsapp`. Bloquant pour un numéro mixte.
9. Divergences de colonnes entre code et schéma (`current_channel_type` vs `current_channel`,
   `client_phone` vs `customer_phone`) → la recherche de conversation existante ne matche jamais,
   une nouvelle conversation est créée à chaque message.

**🟡 Fonctionnel — tout le cœur métier manque**

10. **Aucune gestion de la fenêtre 24 h.** Tous les envois sont en `type:'text'` libre → rejet Meta
    (erreur 131047) hors fenêtre, échec seulement loggé.
11. **Aucune gestion de templates HSM.** Seul `hello_world`/`en_US` codé en dur, deux fois.
12. **Statuts de livraison ignorés.** `value.statuses[]` n'est jamais lu ; pas de colonne `status`
    ni d'ID fournisseur sur `omni_messages`. Aucun accusé de réception, aucune détection d'échec.
13. **Médias jetés.** `if (message.type !== 'text') continue;` → images, audio, documents,
    localisation, réponses interactives : perdus en silence.
14. **Aucune idempotence** (pas de dédup sur `message.id`) et **aucun retry**. Le webhook renvoie
    toujours `200`, donc Meta ne redélivre jamais. Une erreur d'envoi interrompt le traitement de
    **tous** les messages restants du batch.
15. **Aucune facturation.** `trackWhatsApp()` n'a aucun appelant.

### 1.5 Conclusion de l'état des lieux

La décision « full redo V2 » est la bonne, et elle est **moins coûteuse qu'elle n'en a l'air** : il n'y
a aucune donnée réelle à préserver. Le vrai travail n'est pas de réparer V1 mais de **supprimer 5
chemins d'envoi, 2 fournisseurs, 3 fichiers morts et 2 pages contradictoires** avant d'en écrire un
seul propre.

---

## 2. ARCHITECTURE V2 — Twilio BSP vs Meta Cloud API direct

### 2.1 Le modèle de prix a changé (et vos hypothèses datent)

**Meta est passé au prix par message le 1er juillet 2025.** Le modèle « par conversation 24 h » est
officiellement déprécié. On ne paie que la **délivrance d'un template**, par catégorie et par pays.

**Tarifs France — source primaire, rate cards CSV+PDF de Meta, en vigueur au 01/07/2026 :**

| Catégorie | Coût Meta France |
|---|---|
| Marketing | **0,0712 €** |
| Utility | **0,0248 €** |
| Authentication | 0,0248 € |
| **Service** | **gratuit** (depuis le 01/11/2024) |

> ⚠️ **Vos cibles de prix sont calées sur l'ancienne grille.** France marketing était à ~0,1186 €
> jusqu'au 01/01/2026, date à laquelle Meta l'a baissé d'environ 40 %. Utility n'a pas bougé.

**Conséquences immédiates sur le pricing annoncé (0,12 € marketing / 0,02 € utility) :**

- **Marketing 0,12 €** contre 0,0712 € de coût → marge ≈ **41 %**, alors que l'ancienne grille vous
  laissait ≈ 0 %. Vous pouvez garder le prix et encaisser la marge, ou casser les prix : beaucoup de
  concurrents publient encore 0,1186 € pour la France.
- **Utility 0,02 €** contre 0,0248 € de coût → **vous vendez à perte**, avant même la marge Twilio.
  ❗ C'est la correction la plus urgente du plan.

**Là où vos économies se jouent vraiment :** les **messages de service sont gratuits**, et les
templates *utility* délivrés dans une fenêtre de service ouverte sont gratuits aussi (depuis le
01/11/2024). Or **votre produit est réactif** : le client vous écrit, l'agent IA répond dans la
fenêtre. Dans ce régime, **le coût Meta est quasi nul** et la seule dépense marginale est la marge
du BSP.

### 2.2 Comparatif

| Dimension | **Twilio (Tech Provider Program)** | **Meta Cloud API direct** |
|---|---|---|
| **Coût — scénario réactif** (10k msg/mois, fenêtre de service) | **50 $/mois** (0,005 $ × 10 000) | **0 €** |
| **Coût — scénario templates** (5k marketing + 5k utility FR) | ≈ 480 € + 50 $ → **~10 % de marge** | ≈ 480 € |
| **Marge Twilio** | 0,005 $/message **entrant ET sortant** (Meta ne facture pas l'entrant) + 0,001 $ par échec | — |
| **Délai de mise en route** | 3–4 semaines (App Review + Access Verification ~5 j ouvrés + rattachement Twilio 1–2 j) | Business verification « plusieurs semaines » **puis** App Review (aucun SLA publié) |
| **Qui paie Meta** | ✅ Meta → Twilio → vous → tenant. **Vous maîtrisez la facturation.** | ❌ **Chaque tenant doit saisir son propre moyen de paiement Meta** |
| **Ergonomie multi-tenant** | 1 sous-compte Twilio = 1 WABA ; **Senders API** (GA 19/11/2025) ; 200 nouveaux clients / 7 jours glissants | Graph API brut : échange de tokens, souscription webhook, enregistrement des numéros à votre charge |
| **Vos numéros** | ✅ Numéros Twilio **auto-vérifiés par SMS** ; `only_waba_sharing` supprime même les écrans de saisie de numéro | OTP manuel ; **piège IVR** (voir ci-dessous) |
| **Effort d'intégration depuis Workers** | Faible — même surface REST, même auth, même style de webhook que voix/SMS | Élevé |
| **Réutilisation de l'existant** | ✅ Twilio porte déjà voix + SMS + **bundle réglementaire FR approuvé** | Aucune |
| **Maintenance** | Twilio absorbe les ruptures d'API Meta | À votre charge (ex. **Embedded Signup v2 meurt le 15/10/2026**) |

### 2.3 Recommandation — **Twilio Tech Provider Program**

Le prix n'est pas le facteur décisif : à vos volumes, la marge Twilio représente ≈ **50 $/mois pour
10 000 messages**, soit du bruit face à un abonnement CRM. Trois arguments décident :

1. **Vos tenants n'ont pas à créer un moyen de paiement Meta.** En voie directe, Tech Provider
   impose que *« les clients ajoutent leurs propres moyens de paiement »*. Ajouter « saisissez votre
   carte bancaire dans Meta Business Manager » à un tunnel qui convertit déjà à 8/145 serait
   de l'auto-sabotage.
2. **Le piège OTP/IVR vous vise directement.** Meta est explicite : *« si le numéro est rattaché à un
   système IVR ou à un système téléphonique piloté par ordinateur, vous ne pouvez pas recevoir
   d'OTP »*. Tous vos numéros tenants pointent vers l'agent LiveKit. En passant par Twilio, la
   vérification par SMS est **automatique** et le problème disparaît.
3. Vous rouvrez **zéro nouveau front de conformité Meta** en parallèle du bundle FR Twilio que vous
   venez tout juste de faire accepter (17/07).

**Bonne nouvelle sur le conflit de numéro que je redoutais :** Meta est formel — *« les numéros
enregistrés peuvent toujours servir à un usage courant, appels et SMS compris »*. **Enregistrer un
numéro sur WhatsApp ne casse ni la voix ni le SMS.** `+33939035761` peut donc rester le numéro
d'essai VoixIA et servir WhatsApp. Règle de conception à graver : **n'enregistrer que des numéros
Twilio SMS-capables**, jamais compter sur l'OTP vocal.

**À réviser seulement si** l'outbound marketing par templates devient une part majeure du volume —
c'est le seul régime où les 10 % de marge Twilio commencent à peser.

### 2.4 Contraintes structurantes à intégrer dès la conception

- **Limites d'envoi par portefeuille, pas par numéro** (changement du 07/10/2025). Paliers :
  **250 → 2 000 → 10 000 → 100 000 → illimité**. Montée en < 6 h si vous consommez ≥ la moitié du
  palier sur 7 jours. L'état « Flagged » a été supprimé.
- **Chaque tenant possède son propre portefeuille Meta** via Embedded Signup → chaque tenant
  **démarre à 250 messages/24 h** et monte indépendamment. Corollaire : **aucune remise de volume
  mutualisée**, dans les deux architectures.
- **Plafond de 2 numéros** par nouveau portefeuille, porté à 20 après vérification métier.
- **Construire Embedded Signup v4** — la v2 est supprimée le **15/10/2026**.
- Février 2026 : les champs webhook `max_daily_conversation_per_phone` et `current_limit` ont été
  retirés ; utiliser `max_daily_conversations_per_business`.

### 2.5 Points non vérifiés — à lever avant engagement

- ❌ **Résidence des données EU** pour Cloud API et pour Twilio WhatsApp. Non résolu, et **matériel
  pour votre positionnement souveraineté** (voir décision D6).
- ❌ Liste exacte des documents acceptés par Meta pour la vérification métier d'une SASU française.
  Le dossier Kbis + INSEE + pièce du représentant monté pour le bundle Twilio est *probablement*
  suffisant, non prouvé.
- ❌ Délai réel d'App Review (Meta ne publie aucun SLA).
- ⚠️ Une affirmation tierce très relayée — « les entreprises sur l'API doivent supporter un nouveau
  cadre d'identifiants avant juin 2026 au titre du DMA » — est **contredite par l'absence de toute
  mention** dans l'annonce Meta et le changelog développeur. **Ne pas planifier dessus.**

---

## 3. PLAN DE CHANTIER

Estimations en heures de développement effectif, hors temps d'attente administratif.

### Lot 0 — Gel et sécurisation *(à faire cette semaine, indépendant du reste)* — **6 h**

Ce lot n'est pas « du WhatsApp V2 », c'est de la réduction de risque immédiate. Il est le seul du
plan à ne dépendre de rien.

- Désactiver la route webhook `/webhooks/meta/whatsapp*` (kill switch env) — la faille signature +
  fallback tenant est exploitable aujourd'hui.
- Révoquer `META_WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `META_APP_SECRET`,
  `META_WEBHOOK_VERIFY_TOKEN` (déjà au TODO P0 depuis l'exposition GitHub).
- Purger les 3 `omni_phone_mappings` WhatsApp et les 2 `channel_configurations` de test.
- Neutraliser `app/dashboard/settings/channels/whatsapp/page.tsx` (la page « opérationnel »).
- **Dépendances :** aucune.

### Lot 1 — Démolition V1 — **5 h**

- Supprimer les 5 chemins d'envoi et le webhook Twilio legacy.
- Supprimer le code mort frontend (`whatsappService.ts`, `whatsappClient.ts`, `whatsappTemplates.ts`).
- Aligner la nomenclature des secrets (une seule famille).
- **Dépendances :** Lot 0.

### Lot 2 — Prérequis administratifs Meta/Twilio — **8 h de travail, 4–8 semaines d'attente** ⏰

**Chemin critique du projet. À lancer en tout premier, en parallèle de tout le reste.**

- Vérification métier Meta de la SASU (« plusieurs semaines » selon Twilio).
- Création de l'app Meta, App Review pour accès avancé `whatsapp_business_messaging` +
  `whatsapp_business_management` — **deux vidéos requises** (création de template, envoi de message),
  et la note au relecteur doit dire *« We are applying to become a WhatsApp Tech Provider »*.
- Meta Access Verification (~5 j ouvrés), puis rattachement Partner Solution chez Twilio (1–2 j).
- **Dépendances :** aucune. **Bloque les lots 4 et 11.**

### Lot 3 — Socle de données — **8 h**

- Migration rattrapant la **dérive de schéma** (§1.4-6) : régulariser les colonnes déjà en prod.
- Remplacer `phone_number UNIQUE` par un unique composite `(phone_number, channel_type)`.
- Ajouter `status` + `provider_message_id` sur `omni_messages` ; corriger les divergences de colonnes.
- Chiffrement réel des tokens au repos.
- **Dépendances :** Lot 1.

### Lot 4 — Onboarding tenant (Embedded Signup v4 + Senders API) — **16 h**

- Sous-compte Twilio par tenant (Accounts API), 1 sous-compte = 1 WABA.
- Embedded Signup **v4** côté dashboard, `featureType: only_waba_sharing` pour les numéros Twilio.
- `POST /v2/Channels/Senders` + suivi du cycle `CREATING → VERIFYING → OFFLINE → ONLINE`.
- **Dépendances :** Lots 2 et 3.

### Lot 5 — Envoi / réception unifiés — **20 h**

- **Un seul** `sendWhatsApp(env, tenantId, to, payload)`.
- Vérification `X-Hub-Signature-256` (HMAC-SHA256 sur le corps brut, avant `JSON.parse`).
- Résolution stricte du tenant — **suppression du fallback « premier tenant actif »**.
- Idempotence sur `message.id`, retries, isolation d'erreur par message.
- Traitement de `value.statuses[]` → persistance des accusés.
- Support des médias (image, audio, document, localisation, interactif).
- **Dépendances :** Lot 3.

### Lot 6 — Templates HSM et fenêtre 24 h — **14 h**

- CRUD templates, synchronisation avec Meta, suivi du statut d'approbation.
- Logique de fenêtre de service : texte libre si ouverte, template sinon.
- **Optimisation de coût directe :** router en *utility dans fenêtre ouverte* = gratuit.
- **Dépendances :** Lot 5.

### Lot 7 — Intégration IA et CRM — **12 h**

- Brancher la **base de connaissances** sur les réponses WhatsApp (jamais fait en V1 — voir §1.2).
- Réutiliser les 8 tools VoixIA (RDV, KB, prospects, tâches) sur le canal texte.
- Câbler `onWhatsAppReceived` → règles omnicanal, fil de conversation unifié.
- **Dépendances :** Lot 5.

### Lot 8 — Facturation et quotas — **10 h**

- Réveiller `trackWhatsApp()` ; compteurs par tenant et par catégorie.
- Gestion du palier **250 msg/24 h** au démarrage de chaque tenant + remontée de palier.
- Application du pricing retenu (cf. décision D1).
- **Dépendances :** Lots 5 et 6.

### Lot 9 — UI dashboard — **14 h**

- Page de connexion WhatsApp (Embedded Signup), état du sender, santé du numéro.
- Gestion des templates, inbox unifiée, quotas.
- Supprimer la contradiction entre les deux pages actuelles.
- **Dépendances :** Lots 4 et 6.

### Lot 10 — Réactivation marketing — **4 h**

Aujourd'hui, ~26 emplacements publics annoncent WhatsApp comme disponible, dont
`FeaturesSection.tsx:108` (« Activez chaque canal en quelques clics »), la table de comparaison
`pricing/page.tsx:65` (✓ en Pro/Business) — alors que la **même page** dit « WhatsApp bientôt
disponible » ligne 398. Le menu desktop porte un badge « Bientôt », **le menu mobile non**.

- **Phase A (immédiat, dans le Lot 0) :** badge « Bientôt disponible » partout, cohérence des accents,
  extraction d'un composant unique (la mécanique `comingSoon` existe déjà et est câblée dans
  `settings/channels/page.tsx:281` — il suffit d'ajouter le flag).
- **Phase B (à la livraison) :** retrait des badges, activation.
- **Dépendances :** Lot 9 pour la phase B.

### Lot 11 — Recette E2E — **10 h**

- Parcours complet sur 2 tenants pilotes : onboarding → réception → réponse IA → RDV → template.
- Tests d'isolation multi-tenant (le point le plus dangereux de V1).
- **Dépendances :** tous.

### Récapitulatif

| Lot | Charge | Chemin critique |
|---|---|---|
| 0. Gel et sécurisation | 6 h | — *(à faire maintenant)* |
| 1. Démolition V1 | 5 h | |
| 2. Prérequis Meta/Twilio | 8 h + **4–8 sem. d'attente** | ⏰ **bloquant** |
| 3. Socle de données | 8 h | |
| 4. Onboarding tenant | 16 h | après lot 2 |
| 5. Envoi/réception | 20 h | |
| 6. Templates + fenêtre 24 h | 14 h | |
| 7. IA + CRM | 12 h | |
| 8. Facturation | 10 h | |
| 9. UI | 14 h | |
| 10. Marketing | 4 h | |
| 11. Recette | 10 h | |
| **Total** | **≈ 127 h** | |

**Séquencement conseillé :** lancer le **Lot 2 aujourd'hui** (l'attente administrative est le vrai
chemin critique), traiter le **Lot 0 cette semaine** (risque de sécurité actif), puis dérouler
3 → 5 → 6 → 7 pendant l'attente Meta. Les lots 4, 9 et 11 se referment une fois l'App Review obtenue.

---

## 4. DÉCISIONS — ACTÉES LE 19/07/2026

| # | Sujet | Décision |
|---|---|---|
| **D1** | Fournisseur | **Twilio BSP (Tech Provider Program)** acté |
| **D2** | Pricing **Coccinelle** (TPE) | Extension **49 €/mois** — 500 conversations incluses, 1 numéro, **service IA réactive illimitée**, **+19 €/mois** par numéro supplémentaire. Exige un abonnement Coccinelle actif |
| **D3** | Pricing **VoixIA** (revendeurs) | Conso pure — marketing **0,10 €**, utility **0,04 €**, service **gratuit**, **+15 €/mois** par sender |
| **D4** | Fenêtre de service | **Gratuite pour le client** → **argument commercial** différenciant |
| **D5** | Numéros | **`+33939035761` cumule voix + WhatsApp** (confirmé possible côté Meta) |
| **D6** | Sécurité webhook | **Lot 0 prioritaire, semaine du 19/07** |
| **D7** | Lot 2 (Meta) | **À lancer dès que l'app Meta est accessible** — 8 h à planifier |
| **D8** | Résidence EU | **Ne bloque pas.** À creuser plus tard |

### Conséquences sur le plan

- Le « gratuit dans la fenêtre de service » n'est pas qu'une optimisation de coût, c'est la
  **promesse produit** : le client ne paie que ce qu'il initie, jamais les réponses à ses clients.
  → Le Lot 6 doit implémenter le routage « utility dans fenêtre ouverte = gratuit » **en priorité**,
  et il **reste sur le chemin critique** : on ne peut pas livrer un « réactif seul » en sautant la
  gestion de fenêtre, puisque c'est elle qui rend la promesse tenable.
- **Le Lot 8 (facturation)** doit gérer **deux modèles distincts** (forfait Coccinelle vs conso
  VoixIA), un compteur de conversations incluses, et exposer les lignes séparément — sinon
  l'argument commercial est invisible.
- **`+33939035761` porte désormais deux rôles** (numéro d'essai voix QW8 + sender WhatsApp).
  ⚠️ Contrainte à ne pas perdre : **n'enregistrer que des numéros Twilio SMS-capables** — l'OTP
  vocal est impossible sur un numéro rattaché à l'agent LiveKit (IVR).

---

## 5. PRICING ACTÉ — ET SES DEUX PIÈGES

### 5.1 Coccinelle (TPE) — forfait

| Élément | Prix |
|---|---|
| Extension WhatsApp | **49 €/mois** (vs 79 € chez Fonio) |
| Inclus | **500 conversations**, **1 numéro**, **réponses service (IA réactive) ILLIMITÉES** |
| Numéro supplémentaire | **+19 €/mois** |
| Prérequis | Abonnement Coccinelle actif |

### 5.2 VoixIA (revendeurs) — consommation

| Élément | Prix de vente | Coût Meta FR | Coût Twilio | **Marge** |
|---|---|---|---|---|
| Marketing | **0,10 €/msg** | 0,0712 € | ~0,0043 € | **≈ 24 %** |
| Utility | **0,04 €/msg** | 0,0248 € | ~0,0043 € | **≈ 27 %** |
| Service | **gratuit** | 0 € | ~0,0043 € | **négative, à couvrir** |
| Sender | **+15 €/mois** | — | — | couvre ≈ 3 500 msg de service |

> Coûts Meta = rate cards officiels au 01/07/2026 (grille post-baisse de janvier). Twilio =
> **0,005 $/message**, converti à ~1,16 USD/EUR → à re-vérifier, le taux bouge.

### 5.3 ⚠️ Piège n° 1 — « service illimité » n'est PAS gratuit pour nous

Meta ne facture pas les messages de service. **Twilio, si — et dans les deux sens** : 0,005 $ par
message entrant *et* sortant, là où Meta ne facture pas l'entrant du tout. Le « service illimité »
du forfait Coccinelle a donc un coût réel, linéaire et non plafonné :

| Messages de service / mois | Coût Twilio | Part des 49 € |
|---|---|---|
| 1 000 | ≈ 4,3 € | 9 % |
| 5 000 | ≈ 21,5 € | **44 %** |
| 10 000 | ≈ 43 € | **88 %** |
| 20 000 | ≈ 86 € | **perte** |

Une TPE normale ne fera pas 10 000 messages. Mais **un seul tenant atypique** (standard téléphonique
très sollicité, campagne qui tourne mal, boucle d'automatisation) suffit à manger la marge, et rien
dans le modèle ne l'en empêche.

→ **Recommandation : ajouter une clause d'usage raisonnable** (ex. 3 000 messages de service/mois,
au-delà on contacte le client) et **instrumenter le compteur dès le Lot 8**, avant la mise en vente.
« Illimité » reste l'argument commercial ; le garde-fou est contractuel, pas affiché.

### 5.4 ⚠️ Piège n° 2 — « conversation » n'est plus une unité Meta

Meta a supprimé la facturation par conversation le **01/07/2025** : tout est **par message** depuis.
« 500 conversations incluses » ne correspond donc à **aucun compteur fourni par la plateforme** — il
faudra le définir et l'implémenter nous-mêmes.

Définition à trancher (cf. décisions ouvertes) : le plus simple et le plus défendable est
**500 messages template facturables/mois** (marketing + utility confondus), les messages de service
n'étant jamais décomptés. Coût maximal correspondant si les 500 sont du marketing :
500 × 0,0712 € = **35,60 €**, soit 73 % des 49 € — marge faible mais positive. Si c'est de l'utility :
500 × 0,0248 € = 12,40 €, soit 25 %. **Le mix marketing/utility détermine entièrement la marge du
forfait** : à surveiller dès les premiers tenants.

### 5.5 Cohérence entre les deux grilles

Un revendeur VoixIA paie 0,10 €/marketing. Un client Coccinelle qui consommerait ses 500 incluses en
marketing paie l'équivalent de 0,098 €/message. **Les deux grilles sont alignées**, ce qui évite
l'arbitrage entre les deux offres — c'est sain, et à préserver si les prix bougent.

### Restées ouvertes (non bloquantes)

- **Définition de « conversation »** pour les 500 incluses (cf. § 5.4) — recommandation :
  500 messages template facturables/mois, service jamais décompté.
- **Clause d'usage raisonnable** sur le service illimité (cf. § 5.3) — à fixer avant mise en vente.
- **Périmètre V2.1** : le Lot 6 reste sur le chemin critique (D4 rend la fenêtre de service
  centrale), donc pas de « réactif seul » possible.
- **Sous-comptes Twilio** : « 1 sous-compte = 1 WABA » doit s'articuler avec `reseller` et le modèle
  « 1 agent = 1 tenant enfant » (migr. 0073). Réutiliser la hiérarchie ou en créer une seconde ?
- **Souveraineté** : WhatsApp fait transiter chaque message par Meta, en tension avec le
  positionnement « LLM et RAG en Europe ». Arbitrage d'argumentaire à faire avant le Lot 10.
- **Plafond de 2 numéros par portefeuille Meta** (porté à 20 après vérification métier) : impact sur
  la stratégie « numéro dédié par client » à mesurer au premier tenant pilote.

---

## Annexe — Fichiers clés

| Sujet | Fichier |
|---|---|
| Webhook Meta (à réécrire) | `src/modules/omnichannel/webhooks/meta-whatsapp.js` |
| Webhook Twilio legacy (à supprimer) | `src/modules/omnichannel/webhooks/whatsapp.js` |
| OAuth Embedded Signup | `src/modules/omnichannel/controllers/whatsapp-oauth.js` |
| Envoi VoixIA | `src/modules/voixia/orchestrator.js:547-598` |
| Config canaux + test | `src/modules/channels/routes.js:550-624` |
| Page « opérationnel » (à neutraliser) | `coccinelle-saas/app/dashboard/settings/channels/whatsapp/page.tsx` |
| Page « bientôt » (référence) | `coccinelle-saas/app/dashboard/channels/whatsapp/page.tsx` |
| Mécanique `comingSoon` réutilisable | `coccinelle-saas/app/dashboard/settings/channels/page.tsx:281` |
| Code mort frontend | `coccinelle-saas/src/modules/channels/whatsapp/`, `src/templates/whatsapp/` |
| Doc obsolète (nov. 2025) | `CHANNELS_STATUS.md` |
