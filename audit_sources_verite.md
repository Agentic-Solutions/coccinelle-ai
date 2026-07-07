# Audit — Cartographie des sources de vérité (Coccinelle.ai)

> **Date :** 3 juillet 2026 · **Périmètre :** `coccinelle-saas/app/dashboard/**` + onboarding · **Nature :** LECTURE SEULE (aucun code modifié, aucun déploiement, aucune migration).
> **Méthode :** 4 explorations parallèles (front ↔ backend ↔ D1) + vérification directe du schéma prod (`coccinelle-db-eu`). Objectif : permettre à Youssef de décider la **structure cible** avant tout redesign.

---

## Résumé exécutif (les 6 problèmes structurels)

1. **Horaires demandés/stockés 4 fois, zéro synchro** : `tenants.horaires`, `business_hours`, `availability_slots`, + texte dans `tenants.settings`. Changer les horaires quelque part n'a d'effet nulle part ailleurs.
2. **Produits/Services dupliqués** : deux tables (`products` avec `type='service'` **vs** `services`) sur deux menus différents → un « service » créé d'un côté est **invisible** de l'autre (et de l'agent vocal).
3. **Infos entreprise re-saisies** : Paramètres → Mon entreprise redemande nom/secteur/tél/horaires déjà donnés à l'onboarding ; l'**adresse** part à deux endroits incompatibles.
4. **Config canaux & config agent dupliquées** sur deux arbres de pages et deux backends distincts.
5. **`company_name` / `industry` obsolètes** : colonnes fantômes lues par du code legacy (gate onboarding, greeting) → source d'incohérences.
6. **Bugs actifs détectés en passant** : sauvegarde « Mon entreprise » **plante (500)** ; convention `day_of_week` incohérente (1-7 vs 0-6) ; base de connaissances persistée en **localStorage**.

---

## A. Tableau des doublons

| Donnée | Endroits (pages) | Tables / colonnes | Synchro ? | Risque |
|---|---|---|---|---|
| **Horaires d'ouverture** | Onboarding ét.0 · Paramètres › Mon entreprise · Agenda › **Disponibilités** · (retell/booking) | `tenants.horaires` (JSON) ; `availability_slots` ; `business_hours` ; `tenants.settings.business_hours` (texte) | ❌ **aucune** | Élevé — 4 vérités contradictoires, l'agent vocal ne voit pas les changements |
| **Nom entreprise** | Signup · Onboarding ét.0 · Paramètres › Mon entreprise | `tenants.name` **ET** `tenants.company_name` | ⚠️ partielle | Élevé — `company_name` périmé mais lu par gate onboarding + greeting |
| **Secteur** | Signup · Onboarding · Paramètres | `tenants.sector` (+ `tenants.industry` morte) | ⚠️ | Moyen — `industry` legacy, lu en fallback |
| **Téléphone** | Onboarding ét.0 (1 champ) · Paramètres › Mon entreprise | `users.phone` (+`phone_verified`) **ET** `tenants.phone` | ❌ | Élevé — 1 saisie → 2 colonnes ; édition settings désynchronise le n° vérifié |
| **Adresse** | Onboarding ét.2 (Connaissances) · Paramètres › Mon entreprise | `knowledge_documents` (doc_adresse) **vs** `tenants.address` | ❌ | Élevé — colonne `tenants.address` **inexistante** (500 au save) + jamais pré-remplie |
| **Email** | Signup · Paramètres | `users.email` · `tenants.email` (copie) · `tenants.email_pro` · `RESEND_FROM_EMAIL` (env) | ❌ | Moyen — 3 colonnes + env ; `email_pro` sans consommateur identifié |
| **Produits / Services** | Intelligence › « Produits & Services » · Agenda › « Prestations » | `products` (type=product/service) **vs** `services` | ❌ | Élevé — doublon structurel, invisibilité croisée |
| **Config agent vocal (voix/prompt)** | Configuration › Agents IA · Paramètres › Canaux › Téléphone · Onboarding ét.1 | `voixia_configs` + `ai_prompt_versions` **vs** `omni_agent_configs` | ❌ | Élevé — deux magasins de config voix divergents |
| **Config canaux (SMS/WhatsApp/Email)** | `channels/*` (sidebar) · `settings/channels/*` (hors sidebar) | même `channel_configurations` | ⚠️ | Moyen — 2 UIs, la sidebar pointe parfois vers une coquille vide (WhatsApp) |
| **Envoi SMS** | Fiches contact/client · `channels/sms` · config/test | `/sms/send` (module twilio) **vs** `/channels/sms/test` (module channels) | — | Faible — 2 chemins d'envoi |
| **Contacts** | CRM › Contacts (prospects) · Clients (customers) | `prospects` **vs** `customers` | ⚠️ (conversion) | Moyen — 2 tables + 2 fiches quasi identiques |
| **FAQ** | Intelligence › FAQ · (VoixIA) · (site public) | `knowledge_documents` type=faq · `knowledge_faq` · `faq_items` | ❌ | Moyen — 3 tables FAQ |
| **Notifications** | Paramètres › Notifications · `settings/notifications` (page à part) | `notification_preferences` **vs** `users.weekly_report_enabled` | ❌ | Faible — 2 systèmes de préférences |
| **Stats appels** | Dashboard home · Analytics › Appels | `/calls/stats` (2×) | — | Faible — rechargement redondant |

---

## B. Focus HORAIRES

### Les 4 représentations et leurs flux

| Représentation | Format | Écrivains | Lecteurs | Synchro |
|---|---|---|---|---|
| **`tenants.horaires`** | JSON par-jour (`lib/horaires.ts`) | Onboarding ét.0 (`onboarding/routes.js:1106`) ; Paramètres (`settings/routes.js:251`) | Paramètres GET ; onboarding state ; **figé en texte** dans `ai_prompt_versions.system_prompt` au save (`{HORAIRES}`) | ❌ n'alimente rien d'autre |
| **`availability_slots`** | par agent : `day_of_week`, `start_time`, `end_time`, `break_*`, `slot_duration`, `is_available` ; FK `agent_id`→`agents(id)` | **Disponibilités** (`availability/routes.js:149`) ; onboarding auto (`:268`) ; teams | VoixIA `check_availability` (`voixia/routes.js:373`) ; booking public ; retell | ❌ indépendant |
| **`business_hours`** | `day_of_week`, `is_open`, `open_time`, `close_time` | **uniquement** un composant **orphelin** `components/settings/AvailabilitySettings.tsx` (importé par aucune page) | retell `checkBusinessHoursOpen` (`retell/routes.js:1116`) ; fallback booking (`public/booking.js:144`) | ❌ table quasi vide en pratique |
| **`tenants.settings.business_hours`** | texte libre (« 9h-18h ») | ? (legacy) | retell (`retell/routes.js:611-627`) | ❌ 4ᵉ vérité textuelle |

**Constat central :** la page **Disponibilités écrit UNIQUEMENT `availability_slots`** ; Paramètres/Onboarding écrivent UNIQUEMENT `tenants.horaires` ; `business_hours` n'est écrite par **aucune page réellement montée**. **Aucune passerelle** entre les trois. Modifier les horaires dans Paramètres n'a **aucun effet** sur les créneaux VoixIA ni sur le contrôle d'ouverture.

**Bugs réels détectés dans ce cluster :**
- **`day_of_week` 1-7 vs 0-6** : écriture en 1-7 (lundi=1), lecture publique en 0-6 (`public/booking.js:123`, `public/routes.js:170`, `retell:1112`) → créneaux de réservation publique décalés / dimanche cassé.
- **Mauvaise colonne** : `public/routes.js:175` filtre `availability_slots ... AND is_active = 1` alors que la colonne est **`is_available`** → retourne vide silencieusement.
- **Prompt figé** : `resolve-phone` ne relit jamais `tenants.horaires` ; changer les horaires ne met à jour l'agent qu'après régénération d'une version de prompt.

### Proposition — source unique horaires

> **Source unique = `availability_slots`** (déjà le plus riche : par agent, créneaux, pauses, durée) pour la logique de RDV/ouverture, **avec un miroir agrégé « horaires société »** dérivé.

- **Écrivain unique** : la page **Disponibilités** (Agenda). L'onboarding ét.0 et Paramètres deviennent des **éditeurs du même store** (ou sont fusionnés dans Disponibilités).
- **`tenants.horaires`** : conservé comme **cache d'affichage / texte prompt**, **régénéré automatiquement** depuis `availability_slots` (agent « société » par défaut). Plus de double saisie.
- **`business_hours`** et **`tenants.settings.business_hours`** : **dépréciées** (retell est legacy ; VoixIA lit `availability_slots`). Migrer les 2 lecteurs restants vers `availability_slots`.
- **Corriger** la convention `day_of_week` (choisir 1-7 partout) et `is_available` dans le booking public.
- **Lecteurs** : VoixIA, booking public, retell, Paramètres (affichage), prompt (texte régénéré).

**Effort : L** (touche Disponibilités, onboarding, Paramètres, booking public, retell, génération de prompt + backfill de données ; corrections de bugs `day_of_week`/`is_available` incluses).

---

## C. Focus INFOS ENTREPRISE

### Qui écrit / lit quoi

| Donnée | Colonne canonique (règle CLAUDE.md) | Écrivains | Doublon / problème |
|---|---|---|---|
| Nom entreprise | **`tenants.name`** | signup (name **et** company_name) ; onboarding ét.0 ; Paramètres | `tenants.company_name` **périmé** mais lu par le gate `profileCompleted` (`onboarding/routes.js:808`) + greeting legacy (`:346`) |
| Secteur | **`tenants.sector`** | signup ; onboarding ; Paramètres | `tenants.industry` **morte** (jamais écrite, lue en fallback `/me`) |
| Tél pro (Twilio) | **`tenants.phone`** | onboarding ét.0 ; Paramètres | même **saisie unique** que `users.phone` |
| Tél perso (vérifié) | **`users.phone`** (+`phone_verified`) | onboarding (send/verify SMS) | non ré-éditable en Paramètres ; édition du tél société le désynchronise |
| Email compte | **`users.email`** | signup | `tenants.email` = copie signup (doublon) |
| Email pro | `tenants.email_pro` | onboarding (défaut = email compte) ; Paramètres | **consommateur réel introuvable** ; ≠ `RESEND_FROM_EMAIL` (env) |
| **Adresse** | *(aucune — colonne absente)* | Paramètres écrit `tenants.address` ; onboarding écrit `knowledge_documents` | 🔴 **`tenants.address` n'existe pas** → 500 au save ; 2 stockages incompatibles |
| Horaires | `tenants.horaires` | onboarding ; Paramètres | voir section B |

### 🔴 Bug actif confirmé — sauvegarde « Mon entreprise » plante
`PUT /api/v1/settings/company` fait `UPDATE tenants SET ..., address = ? ...` (`settings/routes.js:240`), déclenché à chaque save car le front envoie toujours `address`. Or **`tenants` n'a pas de colonne `address`** (vérifié : `no such column: address`). → **toute sauvegarde de l'onglet Mon entreprise renvoie 500.** (Le chargement, lui, ne plante pas : `tenant.address` vaut `undefined` → `''`.)

### Proposition — source unique infos entreprise

> **Source unique = `tenants.*`** pour l'entreprise, **`users.*`** pour le compte connecté. Éliminer les colonnes fantômes.

- **Nom** : garder `tenants.name`, **supprimer/synchroniser `company_name`** (migrer les 2 lecteurs legacy vers `name`).
- **Secteur** : garder `tenants.sector`, **supprimer `industry`**.
- **Adresse** : **ajouter la colonne `tenants.address`** (migration additive, type comme 0067) **et** faire pointer l'onboarding dessus (au lieu de `knowledge_documents`) → une seule adresse, pré-remplie partout. *(Corrige aussi le 500.)*
- **Téléphone** : clarifier les deux rôles (perso vérifié `users.phone` vs pro Twilio `tenants.phone`) — soit deux champs distincts explicites, soit un seul si c'est le même usage.
- **Email pro** : décider s'il sert (expéditeur ? affichage ?) ou le retirer.
- **Onboarding ↔ Paramètres** : mêmes colonnes → OK pour l'édition ; l'objectif est surtout de **pré-remplir** Paramètres avec ce qui a été saisi (adresse incluse) pour ne rien redemander.

**Effort : S–M** (migration `address` + nettoyage `company_name`/`industry` + repointage onboarding adresse + fix du 500 = S ; réconciliation téléphone = M).

---

## D. Modules mal rangés

| Cas | Situation actuelle | Cible proposée | Effort |
|---|---|---|---|
| **Prestations vs Produits & Services** | « Prestations » (`services`, table `services`) dans **Agenda** ; « Produits & Services » (`products`) dans **Intelligence**. Deux tables, aucune synchro. Un service dans `services` est invisible pour l'agent vocal (`search_products` ne lit que `products`) ; un « service » dans `products` est inutilisable pour la prise de RDV (booking lit `services.duration_minutes`). | **Fusionner** en un seul module « Produits & Services » (source unique). Option A : tout dans `products` + attributs planifiables (durée, membres) ; option B : `services` = sous-ensemble planifiable relié à `products`. Un seul écran, un seul menu. | **L** |
| **« Services » éclaté en 3** | onglet Services de `products` · page Prestations (`services`) · catégorie produit `key='services'` (`product_categories`) créée à l'onboarding | Un seul concept « prestation », les 3 convergent | (inclus ci-dessus) |
| **Config canaux à 2 arbres** | `channels/*` (sidebar) **et** `settings/channels/*` (fonctionnel, hors sidebar) frappent les mêmes endpoints ; WhatsApp sidebar = coquille vide, la version câblée est dans `settings/channels/whatsapp` | **Un seul arbre** (garder `channels/*`, y câbler les pages fonctionnelles, supprimer `settings/channels/*` + stubs `configuration/channels`) | **M** |
| **Config agent à 2 backends** | `agents/configuration` → `voixia_configs`+`ai_prompt_versions` ; `settings/channels/phone` → `omni_agent_configs` | **Un seul backend** (`voixia_configs`/`ai_prompt_versions`, cf. CLAUDE.md §f) ; supprimer `omni_agent_configs` ou le faire pointer dessus | **M** |
| **FAQ à 3 tables** | `knowledge_documents` (type=faq, dashboard) · `knowledge_faq` (VoixIA) · `faq_items` (site) | Une source unique lue par VoixIA + dashboard | **M** |
| **Contacts prospects/customers** | 2 tables, 2 pages, 2 composants Detail quasi identiques | Un modèle « contact » avec statut prospect/client (ou vue unifiée) | **M** |
| **KB en localStorage** | `knowledge/page.tsx` persiste crawl/manuel/fichier en `localStorage` → l'agent vocal (DB) ne les voit pas ; viole « 0 localStorage utilisateur » | Tout écrire en `knowledge_documents` | **M** |
| **Pages stub/legacy** | `configuration/assistant|channels`, `sara`, `voixia`, `appointments`(→rdv), `products`(→knowledge/products) = redirects | Nettoyer le routage | **S** |

---

## E. Recommandation de structure cible

> **Principe : 1 donnée = 1 table source = 1 écran d'édition ; tout le reste est lecteur.**

| Module | Source unique (table) | Écran d'édition unique | Lecteurs |
|---|---|---|---|
| **Entreprise** | `tenants.*` (name, sector, phone, email_pro, **+address**, horaires-cache) | Paramètres › Mon entreprise **=** repris à l'onboarding ét.0 | Onboarding, greeting, /me, prompt |
| **Compte** | `users.*` (name, email, phone+verified, prefs) | Paramètres › Mon compte | /me, dashboard |
| **Horaires** | `availability_slots` (par agent) | Agenda › Disponibilités | VoixIA, booking public, retell, `tenants.horaires` (cache régénéré), prompt |
| **Produits & Prestations** | `products` (unifié, attribut planifiable) | 1 seul écran « Produits & Services » | VoixIA `search_products`, booking (durée), RDV |
| **Connaissances / FAQ** | `knowledge_documents` (+chunks) | Base de connaissances + FAQ | VoixIA `search_knowledge` |
| **Contacts** | modèle unifié (prospects+customers) | CRM | Analytics, RDV, SMS |
| **Config agent vocal** | `voixia_configs` + `ai_prompt_versions` | Configuration › Agents IA | resolve-phone, onboarding |
| **Canaux** | `channel_configurations` | 1 seul arbre `channels/*` | envoi/réception |

### Chantiers priorisés (par ROI × effort)

| # | Chantier | Effort | Pourquoi d'abord |
|---|---|---|---|
| 1 | **Fix `tenants.address` (migration + repointage onboarding)** | **S** | Corrige un **500 actif** + supprime une double saisie |
| 2 | **Nettoyer `company_name` / `industry`** | **S** | Colonnes fantômes lues par du code legacy (risque de blocage onboarding) |
| 3 | **Unifier les horaires sur `availability_slots`** (+ fix `day_of_week`/`is_available`) | **L** | Le doublon le plus visible (3 écrans) + 2 bugs booking public |
| 4 | **Fusionner Produits & Prestations** | **L** | Doublon structurel, invisibilité croisée, confusion testeurs Maze |
| 5 | **Un seul arbre canaux + un seul backend config agent** | **M** | Supprime les coquilles vides et la divergence voix/prompt |
| 6 | **KB : localStorage → DB** | **M** | Docs invisibles pour l'agent vocal |
| 7 | **FAQ : 3 tables → 1 ; contacts unifiés ; nettoyage stubs** | **M/S** | Cohérence + dette |

---

## Annexe — Bugs concrets relevés pendant l'audit (à traiter hors redesign)

1. 🔴 **`PUT /settings/company` → 500** : `UPDATE tenants SET address = ?` sur colonne inexistante. Sauvegarde « Mon entreprise » cassée. *(Quick win : migration `ADD COLUMN address`.)*
2. 🟠 **`day_of_week` 1-7 vs 0-6** : réservation publique + contrôle d'ouverture retell décalés.
3. 🟠 **`public/routes.js:175`** filtre `is_active` au lieu de `is_available` sur `availability_slots` → créneaux vides.
4. 🟡 **KB localStorage** (`knowledge/page.tsx`) : documents non persistés en DB, invisibles pour VoixIA.
5. 🟡 **`business_hours` orpheline** : seul écrivain = composant non monté → table vide, retell tombe toujours sur le fallback « ouvert ».

---

*Rapport généré en lecture seule. Aucune modification de code, aucune migration, aucun déploiement. Sources : cartographie front/back + schéma prod `coccinelle-db-eu` vérifié. Décision de structure cible à la main de Youssef.*
