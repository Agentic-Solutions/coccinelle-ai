# COCCINELLE.AI - RAPPORT DE TEST UX COMPLET
**Date**: 2025-11-14
**Version**: 1.0
**Serveur**: http://localhost:3000
**Environnement**: Development (Mode Démo)

---

## RÉSUMÉ EXÉCUTIF

### Structure Globale
- **21 pages** mappées (4 publiques + 1 onboarding + 16 dashboard)
- **8 modules principaux** dans le dashboard
- **15+ composants** spécialisés
- **15+ endpoints API** intégrés

### Serveur de Développement
✅ **FONCTIONNEL** - Next.js 15.5.6 (Turbopack)
- Port: 3000
- Compilation: Réussie
- Hot Reload: Actif
- Warnings: 1 (config turbo deprecated - non critique)

---

## PLAN DE TEST DÉTAILLÉ

### 1. PARCOURS AUTHENTIFICATION

#### 1.1 Page de Connexion (`/login`)
**URL**: http://localhost:3000/login

**Éléments à tester**:
- [ ] Affichage du formulaire (email + password)
- [ ] Logo Coccinelle pixelisé présent
- [ ] Boutons OAuth sociaux (Google, Apple, X, Telegram) - NOUVEAU
- [ ] Validation en temps réel (isFormValid)
- [ ] État de chargement (loading spinner)
- [ ] Messages d'erreur (timeout 10s, credentials invalides)
- [ ] Lien vers /signup
- [ ] Checkbox "Se souvenir de moi"
- [ ] Lien "Mot de passe oublié"
- [ ] Style: fond gris clair, bouton noir, pas d'émojis

**Flux de données**:
```
1. Saisie email + password
2. Submit → POST /api/v1/auth/login
3. Réponse: {success, token, user, tenant}
4. Stockage: localStorage + cookie (7 jours)
5. Redirect → /dashboard
```

**Cas de test**:
- ✅ Email vide → bouton désactivé
- ✅ Password vide → bouton désactivé
- ✅ Timeout 10s → message "requête trop longue"
- ✅ Credentials invalides → message "email ou mot de passe incorrect"
- ✅ Succès → redirect dashboard

#### 1.2 Page d'Inscription (`/signup`)
**URL**: http://localhost:3000/signup

**Éléments à tester**:
- [ ] Formulaire complet (6 champs)
  - Nom entreprise
  - Nom complet
  - Email professionnel
  - Mot de passe (min 8 car.)
  - Téléphone
  - Secteur d'activité (dropdown)
- [ ] Boutons OAuth sociaux (Google, Apple, X, Telegram) - NOUVEAU
- [ ] Validation (tous les champs requis)
- [ ] Liste d'erreurs affichée
- [ ] État de chargement
- [ ] Lien vers /login
- [ ] CGU/Politique de confidentialité

**Flux de données**:
```
1. Saisie formulaire complet
2. Validation client-side
3. Submit → POST /api/v1/auth/signup
4. Réponse: {token, user, tenant}
5. Stockage: localStorage
6. Redirect → /onboarding (pas /dashboard!)
```

**Cas de test**:
- Password < 8 caractères → erreur
- Champ manquant → liste d'erreurs
- Succès → redirect onboarding

---

### 2. DASHBOARD PRINCIPAL

#### 2.1 Hub Dashboard (`/dashboard`)
**URL**: http://localhost:3000/dashboard

**Header**:
- [ ] Logo Coccinelle (48px)
- [ ] Titre "Coccinelle.AI"
- [ ] Indicateur "Live" (vert avec animation pulse)
- [ ] Notification Center avec badge unread
- [ ] Bouton Paramètres → /dashboard/settings
- [ ] Bouton Déconnexion

**Stats Cards (3)**:
- [ ] Appels Sara (total)
- [ ] Documents KB (total)
- [ ] Rendez-vous (confirmés)

**Modules disponibles (8 cards)**:
1. [ ] Agent Vocal Sara → /dashboard/appels (noir)
2. [ ] Knowledge Base → /dashboard/knowledge (noir)
3. [ ] Rendez-vous → /dashboard/rdv (noir)
4. [ ] **Catalogue de biens** → /dashboard/properties (bleu, border-2)
5. [ ] Analytics → /dashboard/analytics (noir)
6. [ ] **Configuration Sara** → /dashboard/sara (rouge, border-2)
7. [ ] **Sara Analytics** → /dashboard/sara-analytics (gris-900, badge NEW)

**Smart Alerts**:
- [ ] Composant SmartAlerts visible
- [ ] Basé sur calls + appointments

**Toast Notifications**:
- [ ] ToastContainer en haut à droite
- [ ] Notifications live updates (5s auto-remove)

**Live Updates**:
- [ ] Hook useLiveUpdates actif
- [ ] Polling 5 secondes
- [ ] onNewNotification → toast

---

### 3. MODULE AGENT VOCAL (APPELS)

#### 3.1 Liste des Appels (`/dashboard/appels`)
**URL**: http://localhost:3000/dashboard/appels

**Stats (4 cards)**:
- [ ] Total appels
- [ ] RDV créés
- [ ] Taux de conversion
- [ ] Durée moyenne

**Filtres (8)**:
- [ ] Statut (tous/réussi/raté/rappel)
- [ ] Date (période)
- [ ] Durée (min/max)
- [ ] Coût
- [ ] Prospect (nom)
- [ ] RDV (oui/non)
- [ ] Recherche texte

**Table**:
- [ ] Pagination (20/page)
- [ ] Colonnes: ID, Date, Contact, Durée, Statut, RDV, Coût
- [ ] Click row → /dashboard/appels/[callId]
- [ ] Export Excel

#### 3.2 Détail Appel (`/dashboard/appels/[callId]`)

**Informations (8 champs)**:
- [ ] Call ID
- [ ] Date/heure
- [ ] Durée
- [ ] Contact (nom + phone)
- [ ] Statut
- [ ] RDV créé (oui/non)
- [ ] Coût
- [ ] Sentiment

**Sections**:
- [ ] Résumé de l'appel
- [ ] Transcription complète
- [ ] Bouton retour

---

### 4. MODULE RENDEZ-VOUS

#### 4.1 Liste RDV (`/dashboard/rdv`)

**Stats (4)**:
- [ ] Total RDV
- [ ] À venir
- [ ] Confirmés
- [ ] Taux de présence

**Actions**:
- [ ] Bouton "+ Nouveau RDV" (modal)
- [ ] Export Excel

**Filtres (4)**:
- [ ] Statut
- [ ] Agent
- [ ] Période
- [ ] Recherche

**Table**:
- [ ] Pagination
- [ ] Click → /dashboard/rdv/[appointmentId]

#### 4.2 Détail RDV (`/dashboard/rdv/[appointmentId]`)

**Sections**:
- [ ] Info RDV (date, heure, durée, statut)
- [ ] Info Prospect (nom, email, phone, préférences)
- [ ] Info Agent (assigné)
- [ ] Notes
- [ ] Bouton Modifier (modal)
- [ ] Bouton Supprimer (confirmation)

---

### 5. MODULE KNOWLEDGE BASE

**URL**: `/dashboard/knowledge`

**Tabs (3)**:

#### 5.1 Tab "Auto-Builder"
- [ ] Composant KnowledgeBuilder
- [ ] Génération automatique depuis données

#### 5.2 Tab "Documents"
- [ ] Mode: Crawl URL
  - [ ] Input URL
  - [ ] Limite 3 pages
  - [ ] Bouton "Crawler"
- [ ] Mode: Manuel
  - [ ] Titre
  - [ ] Contenu (textarea)
  - [ ] Bouton "Ajouter"

#### 5.3 Tab "Test RAG"
- [ ] Input question
- [ ] Bouton "Tester"
- [ ] Affichage réponse
- [ ] Sources citées
- [ ] Historique (3 dernières)

---

### 6. MODULE CATALOGUE DE BIENS

**URL**: `/dashboard/properties`

**Stats (6 cards)**:
- [ ] Total
- [ ] Disponibles (vert)
- [ ] Sous offre (orange)
- [ ] Vendus (gris)
- [ ] Prix moyen (bleu)
- [ ] **IA Matches** (purple, gradient)

**Filtres**:
- [ ] Recherche (titre/localisation)
- [ ] Type (appartement/maison/terrain/commercial)
- [ ] Statut (disponible/sous offre/vendu)
- [ ] Bouton "+ Ajouter un bien" (noir)

**Grid (3 colonnes)**:
- [ ] Cards avec image placeholder
- [ ] Titre + localisation
- [ ] Type + Badge "X matches IA" (purple)
- [ ] Prix (gros, bold)
- [ ] Specs (chambres, salles de bain, surface)
- [ ] Actions: Voir / Modifier / Supprimer

**Mock Data**:
- [ ] 4 biens affichés (T3 Paris, Maison Versailles, Studio Lyon, Terrain Fontainebleau)

---

### 7. MODULE ANALYTICS

**URL**: `/dashboard/analytics`

**Tabs (2)**:

#### 7.1 Tab "Analytics"
- [ ] Sélecteur période (7j, 30j, 90j, 1an)
- [ ] 6 KPI Cards
- [ ] 4 Graphiques:
  - [ ] Line chart (évolution appels)
  - [ ] Bar chart (RDV par jour semaine)
  - [ ] Pie chart (distribution statuts)
  - [ ] Area chart (coûts)
- [ ] Top 5 questions fréquentes
- [ ] Performance agents
- [ ] Section ROI (3 métriques)
- [ ] Bouton "Export PDF"

#### 7.2 Tab "AI Insights"
- [ ] Composant AIInsightsPanel

---

### 8. MODULE SARA CONFIGURATION

**URL**: `/dashboard/sara`

**Stats Header (4 cards)**:
- [ ] Statut (Actif/Inactif)
- [ ] Appels aujourd'hui
- [ ] Taux qualification
- [ ] Durée moyenne

**Tabs (4)**:

#### 8.1 Voix & Audio
- [ ] Sélecteur voix (4 options françaises)
- [ ] Slider vitesse
- [ ] Slider pitch
- [ ] Bouton "Tester la voix"

#### 8.2 Personnalité
- [ ] Sélecteur ton
- [ ] Niveau formalité (slider)
- [ ] Slider enthousiasme

#### 8.3 Scripts
- [ ] Textarea script principal
- [ ] Aide variables ({{nom}}, {{rdv}}, etc.)

#### 8.4 Qualification
- [ ] Checkboxes critères (budget, localisation, etc.)

**Actions**:
- [ ] Bouton "Sauvegarder" (noir)

---

### 9. MODULE SARA ANALYTICS

**URL**: `/dashboard/sara-analytics`

**Score Global**:
- [ ] Score/100 avec badge (Excellent/Bien/Moyen/Faible)
- [ ] Cercle visualisation (SVG progressif)
- [ ] 3 métriques rapides:
  - Taux prise en charge
  - Conversion RDV
  - RDV créés

**Tabs (3)**:

#### 9.1 Funnel d'appels
- [ ] Composant CallFunnelComponent
- [ ] Analyse du flow

#### 9.2 Performance
- [ ] Composant CallPerformanceComponent
- [ ] Métriques de performance

#### 9.3 Recommandations
- [ ] Composant CallInsights
- [ ] Liste insights
- [ ] Badge avec nombre d'insights (rouge)

**Actions**:
- [ ] Bouton "Rafraîchir"

---

### 10. MODULE SETTINGS

**URL**: `/dashboard/settings`

**Layout**:
- [ ] Sidebar gauche (7 tabs)
- [ ] Contenu à droite (composant dynamique)

**Tabs (7)**:

#### 10.1 Disponibilités
- [ ] Composant AvailabilitySettings
- [ ] Sélection membres équipe
- [ ] Calendrier disponibilités
- [ ] Créneaux horaires
- [ ] Style: cards blanches, border gris, boutons noirs

#### 10.2 Équipe
- [ ] Composant TeamManagement
- [ ] Liste membres
- [ ] Bouton "+ Ajouter"
- [ ] Actions: Modifier/Supprimer

#### 10.3 Calendriers
- [ ] Composant CalendarIntegration
- [ ] Intégrations Google Calendar, Outlook, iCal
- [ ] OAuth connections

#### 10.4 Profil
- [ ] Composant ProfileForm
- [ ] Nom, email, phone
- [ ] Bouton "Sauvegarder"

#### 10.5 Clés API
- [ ] Composant APIKeysForm
- [ ] Liste clés
- [ ] Bouton "Générer nouvelle clé"
- [ ] Copier/Révoquer

#### 10.6 Notifications
- [ ] Composant NotificationsSettings
- [ ] Toggles email/SMS/push
- [ ] Préférences par type d'événement

#### 10.7 Sécurité
- [ ] Composant SecuritySettings
- [ ] Changer mot de passe
- [ ] Sessions actives
- [ ] Authentification 2FA
- [ ] Bouton "Supprimer compte" (rouge)
- [ ] Style: light theme, pas d'émojis

---

## TESTS TRANSVERSAUX

### Navigation
- [ ] Tous les liens dashboard → modules fonctionnent
- [ ] Bouton retour (ArrowLeft) présent dans tous les modules
- [ ] Logo cliquable → /dashboard
- [ ] Breadcrumbs corrects

### Style Coccinelle.AI
- [ ] **Fond**: blanc ou gris clair (bg-gray-50, bg-white)
- [ ] **Boutons principaux**: noir (bg-gray-900, hover:bg-gray-800)
- [ ] **Bordures**: grises (border-gray-200, border-gray-300)
- [ ] **Textes**: gris-900 (titres), gris-600 (descriptions)
- [ ] **Pas d'émojis** dans l'interface
- [ ] **Cards**: ombres subtiles (shadow-sm), bordures grises
- [ ] **Logo**: Coccinelle pixelisée rouge (48px dans headers)

### OAuth Social (NOUVEAU)
- [ ] Présent sur `/login`
- [ ] Présent sur `/signup`
- [ ] 4 boutons: Google, Apple, X, Telegram
- [ ] Style: bordures grises, fond blanc, icons couleur
- [ ] Divider "Ou continuer avec"
- [ ] Grid 4 colonnes

### Composants Communs
- [ ] Logo partout cohérent
- [ ] NotificationCenter fonctionnel
- [ ] ToastNotifications apparaissent
- [ ] Live indicator (pulse vert)

### API Integration
- [ ] Mode démo fonctionne (isDemoMode)
- [ ] Mock data chargée
- [ ] Pas d'erreurs console critiques
- [ ] Loading states affichés

### Performance
- [ ] Compilation Turbopack rapide
- [ ] Hot reload fonctionne
- [ ] Pas de lag navigation
- [ ] Images optimisées

---

## STATUT DES TESTS

### ✅ TESTS RÉUSSIS
_(À compléter au fur et à mesure)_

### ❌ TESTS ÉCHOUÉS
_(À compléter au fur et à mesure)_

### ⚠️ AVERTISSEMENTS
1. Config turbo deprecated → migration vers config.turbopack recommandée (non critique)
2. Fast Refresh full reload (rare, non bloquant)

---

## PROBLÈMES IDENTIFIÉS

_(À compléter)_

---

## RECOMMANDATIONS

_(À compléter après tests)_

---

## CONCLUSION

_(À compléter après tous les tests)_
