# Parcours Utilisateur Coccinelle AI - Analyse Complète

## Vue d'ensemble
Cette analyse documente l'ensemble du parcours utilisateur de Coccinelle AI, depuis la découverte jusqu'à la production, en identifiant toutes les pages et routes disponibles.

---

## 1. PAGES D'AUTHENTIFICATION

### 1.1 Landing Page (Public)
- **Route**: `/`
- **Fichier**: `/app/page.tsx`
- **Fonction**: Page d'accueil avec présentation de la plateforme
  - Hero section avec CTA ("Démarrer gratuitement", "Voir la démo")
  - Sections de features (Assistant vocal IA, Omnicanal, RDV auto, CRM, Analytics, Base de connaissance)
  - Use cases par secteur
  - Témoignages clients
  - Section tarification (Starter, Pro, Enterprise)
  - Section sécurité et conformité (RGPD, ISO 27001, Hébergement EU)
  - Footer avec liens légaux

### 1.2 Login
- **Route**: `/login`
- **Fichier**: `/app/login/page.tsx`
- **Fonction**: Authentification des utilisateurs existants
  - Formulaire email/mot de passe
  - Validation en temps réel
  - Gestion mode démo vs production
  - Cookies et localStorage pour persistence session
  - Options OAuth (Google, Apple, Twitter, Telegram)
  - Lien "Mot de passe oublié"
  - Lien création compte

### 1.3 Signup
- **Route**: `/signup`
- **Fichier**: `/app/signup/page.tsx`
- **Fonction**: Création de nouveau compte utilisateur
  - Formulaire avec champs: companyName, name, email, password, phone, sector
  - Validation des champs (minimum 8 caractères pour mot de passe)
  - Sélection du secteur d'activité via dropdown
  - Gestion mode démo vs production
  - Redirection vers onboarding après inscription
  - Options OAuth
  - Lien vers conditions d'utilisation

---

## 2. PAGES D'ONBOARDING (Setup Initial)

### 2.1 Onboarding Principal
- **Route**: `/onboarding`
- **Fichier**: `/app/onboarding/page.tsx`
- **Fonction**: Flow d'onboarding avec étapes dynamiques
  - Progress bar avec navigation back/next
  - Étapes:
    1. Bienvenue (WelcomeStep)
    2. Sélection des canaux (ChannelSelectionStep)
    3. Configuration par canal (PhoneConfigStep, SMSConfigStep, EmailConfigStep, WhatsAppConfigStep)
    4. Base de connaissances (KnowledgeBaseStep)
    5. Completion (CompletionStep)
  - Sauvegarde progressive dans localStorage
  - Redirection vers dashboard à la fin

### 2.2 Onboarding Client (Post-Signup)
- **Route**: `/client/onboarding`
- **Fichier**: `/app/client/onboarding/page.tsx`
- **Fonction**: Onboarding spécifique pour client avec étapes de configuration des canaux

#### 2.2.1 Email Setup
- **Route**: `/client/onboarding/email-setup`
- **Fichier**: `/app/client/onboarding/email-setup/page.tsx`
- **Fonction**: Configuration de l'intégration email

#### 2.2.2 SMS Setup
- **Route**: `/client/onboarding/sms-setup`
- **Fichier**: `/app/client/onboarding/sms-setup/page.tsx`
- **Fonction**: Configuration SMS (Twilio, Vonage, etc.)

#### 2.2.3 Phone Setup
- **Route**: `/client/onboarding/phone-setup`
- **Fichier**: `/app/client/onboarding/phone-setup/page.tsx`
- **Fonction**: Configuration des numéros téléphoniques et IVR

#### 2.2.4 WhatsApp Setup
- **Route**: `/client/onboarding/whatsapp-setup`
- **Fichier**: `/app/client/onboarding/whatsapp-setup/page.tsx`
- **Fonction**: Configuration intégration WhatsApp Business

#### 2.2.5 Completion
- **Route**: `/client/onboarding/complete`
- **Fichier**: `/app/client/onboarding/complete/page.tsx`
- **Fonction**: Confirmation d'onboarding complété avec redirection dashboard

### 2.3 Client Preferences
- **Route**: `/client/preferences`
- **Fichier**: `/app/client/preferences/page.tsx`
- **Fonction**: Préférences utilisateur post-onboarding

---

## 3. PAGES DASHBOARD (Utilisateurs Authentifiés)

### 3.1 Dashboard Principal
- **Route**: `/dashboard`
- **Fichier**: `/app/dashboard/page.tsx`
- **Fonction**: Hub central avec KPIs et accès rapide
  - Stats: appels, documents, RDV
  - Smart Alerts pour alertes intelligentes
  - Notification Center
  - Getting Started Checklist
  - Live updates en temps réel
  - Toast notifications
  - Sidebar collapsible
  - 6 modules principaux:
    * Knowledge (Base de connaissance)
    * Channels (Canaux de communication)
    * Conversations (Historique conversations)
    * CRM (Gestion prospects)
    * Appointments (Rendez-vous)
    * Analytics (Rapports)

---

## 4. PAGES CANAUX DE COMMUNICATION

### 4.1 Vue d'ensemble Canaux
- **Route**: `/dashboard/channels`
- **Fichier**: `/app/dashboard/channels/page.tsx`
- **Fonction**: Vue globale des canaux avec stats
  - Stats par canal: Téléphone (appels), SMS (messages), WhatsApp (conversations), Email (emails traités)
  - Accès rapide configuration par canal

### 4.2 Configuration Téléphone
- **Route**: `/dashboard/channels/phone`
- **Fichier**: `/app/dashboard/channels/phone/page.tsx`
- **Fonction**: Configuration des numéros et options d'appel

### 4.3 Configuration SMS
- **Route**: `/dashboard/channels/sms`
- **Fichier**: `/app/dashboard/channels/sms/page.tsx`
- **Fonction**: Gestion des campagnes et réponses SMS

### 4.4 Configuration WhatsApp
- **Route**: `/dashboard/channels/whatsapp`
- **Fichier**: `/app/dashboard/channels/whatsapp/page.tsx`
- **Fonction**: Configuration et gestion WhatsApp Business

### 4.5 Configuration Email
- **Route**: `/dashboard/channels/email`
- **Fichier**: `/app/dashboard/channels/email/page.tsx`
- **Fonction**: Configuration des paramètres email

### 4.6 Inbox Centralisée
- **Route**: `/dashboard/channels/inbox`
- **Fichier**: `/app/dashboard/channels/inbox/page.tsx`
- **Fonction**: Vue unifiée de tous les messages entrants

### 4.7 Dashboard Inbox
- **Route**: `/dashboard/inbox`
- **Fichier**: `/app/dashboard/inbox/page.tsx`
- **Fonction**: Gestion des messages d'inbox (doublonné?)

---

## 5. PAGES CONVERSATIONS

### 5.1 Vue d'ensemble Conversations
- **Route**: `/dashboard/conversations`
- **Fichier**: `/app/dashboard/conversations/page.tsx`
- **Fonction**: Historique centralisé des conversations tous canaux

### 5.2 Conversations Appels
- **Route**: `/dashboard/conversations/appels`
- **Fichier**: `/app/dashboard/conversations/appels/page.tsx`
- **Fonction**: Conversations spécifiques aux appels téléphoniques

### 5.3 Conversations SARA
- **Route**: `/dashboard/conversations/sara`
- **Fichier**: `/app/dashboard/conversations/sara/page.tsx`
- **Fonction**: Conversations avec l'IA SARA (agent vocal)

### 5.4 Page Appels (Alternative)
- **Route**: `/dashboard/appels`
- **Fichier**: `/app/dashboard/appels/page.tsx`
- **Fonction**: Vue dédiée aux appels (probablement doublonné avec conversations/appels)

---

## 6. PAGES GESTION DES RENDEZ-VOUS

### 6.1 Vue d'ensemble RDV
- **Route**: `/dashboard/appointments` ou `/dashboard/rdv`
- **Fichier**: `/app/dashboard/appointments/page.tsx` ou `/app/dashboard/rdv/page.tsx`
- **Fonction**: Gestion des rendez-vous pris automatiquement

### 6.2 Calendrier
- **Route**: `/dashboard/appointments/calendar`
- **Fichier**: `/app/dashboard/appointments/calendar/page.tsx`
- **Fonction**: Vue calendrier des RDV

### 6.3 Paramètres Calendrier
- **Route**: `/dashboard/appointments/calendar/settings`
- **Fichier**: `/app/dashboard/appointments/calendar/settings/page.tsx`
- **Fonction**: Configuration des disponibilités et synchronisation (Google/Outlook)

### 6.4 Paramètres RDV (Alternative)
- **Route**: `/dashboard/rdv/settings`
- **Fichier**: `/app/dashboard/rdv/settings/page.tsx`
- **Fonction**: Configuration des rendez-vous

---

## 7. PAGES CRM & PROSPECTS

### 7.1 Vue d'ensemble CRM
- **Route**: `/dashboard/crm`
- **Fichier**: `/app/dashboard/crm/page.tsx`
- **Fonction**: Hub CRM avec gestion prospects et scoring IA

### 7.2 Liste Prospects
- **Route**: `/dashboard/crm/prospects`
- **Fichier**: `/app/dashboard/crm/prospects/page.tsx`
- **Fonction**: Liste de tous les prospects avec filtres et tri
  - Scoring automatique
  - Enrichissement données
  - Segmentation intelligente

### 7.3 Détail Prospect
- **Route**: `/dashboard/crm/prospects/[id]`
- **Fichier**: `/app/dashboard/crm/prospects/[id]/page.tsx`
- **Fonction**: Fiche prospect détaillée
  - Historique complet interactions
  - Données enrichies
  - Actions possibles

### 7.4 Liste Customers (Clients)
- **Route**: `/dashboard/customers`
- **Fichier**: `/app/dashboard/customers/page.tsx`
- **Fonction**: Gestion des clients confirmés

### 7.5 Détail Customer
- **Route**: `/dashboard/customers/[id]`
- **Fichier**: `/app/dashboard/customers/[id]/page.tsx`
- **Fonction**: Fiche client avec historique

---

## 8. PAGES ANALYTICS & MONITORING

### 8.1 Analytics Principal
- **Route**: `/dashboard/analytics`
- **Fichier**: `/app/dashboard/analytics/page.tsx`
- **Fonction**: Tableaux de bord analytics
  - KPIs temps réel
  - Graphiques performance
  - Exports automatiques
  - Prédictions IA

### 8.2 SARA Analytics
- **Route**: `/dashboard/sara-analytics`
- **Fichier**: `/app/dashboard/sara-analytics/page.tsx`
- **Fonction**: Analytics spécifiques à l'agent vocal SARA

---

## 9. PAGES AGENT IA (SARA)

### 9.1 Configuration SARA
- **Route**: `/dashboard/sara`
- **Fichier**: `/app/dashboard/sara/page.tsx`
- **Fonction**: Configuration de l'agent vocal IA
  - Paramètres de conversation
  - Voix et langage
  - Comportement et tone
  - Intégrations

---

## 10. PAGES CONNAISSANCES & DOCUMENTS

### 10.1 Base de Connaissances
- **Route**: `/dashboard/knowledge`
- **Fichier**: `/app/dashboard/knowledge/page.tsx`
- **Fonction**: Gestion de la base de connaissance
  - Import depuis site web (web scraping)
  - Upload documents PDF/Word
  - Création FAQ personnalisée
  - Enrichissement IA

---

## 11. PAGES PROPRIÉTÉS (Immobilier)

### 11.1 Liste Propriétés
- **Route**: `/dashboard/properties`
- **Fichier**: `/app/dashboard/properties/page.tsx`
- **Fonction**: Gestion du portefeuille de propriétés (spécifique au secteur immobilier)

---

## 12. PAGES PARAMÈTRES

### 12.1 Paramètres Principal
- **Route**: `/dashboard/settings`
- **Fichier**: `/app/dashboard/settings/page.tsx`
- **Fonction**: Hub de configuration avec tabs:
  
  #### Compte & Personnel
  - Profile: Profil utilisateur
  - Notifications: Paramètres notifications
  - Security: Sécurité compte
  
  #### Configuration Business
  - Availability: Disponibilités et heures de bureau
  - Calendar: Intégration calendriers (Google/Outlook)
  - Email: Configuration email
  - Channels: Canaux de communication (lien vers `/dashboard/settings/channels`)
  
  #### Équipe & Développement
  - Team: Gestion équipe
  - API: Clés API

### 12.2 Paramètres Canaux
- **Route**: `/dashboard/settings/channels`
- **Fichier**: `/app/dashboard/settings/channels/page.tsx`
- **Fonction**: Configuration détaillée des canaux

#### 12.2.1 Paramètres Téléphone
- **Route**: `/dashboard/settings/channels/phone`
- **Fichier**: `/app/dashboard/settings/channels/phone/page.tsx`

#### 12.2.2 Paramètres SMS
- **Route**: `/dashboard/settings/channels/sms`
- **Fichier**: `/app/dashboard/settings/channels/sms/page.tsx`

#### 12.2.3 Paramètres Email
- **Route**: `/dashboard/settings/channels/email`
- **Fichier**: `/app/dashboard/settings/channels/email/page.tsx`

#### 12.2.4 Paramètres WhatsApp
- **Route**: `/dashboard/settings/channels/whatsapp`
- **Fichier**: `/app/dashboard/settings/channels/whatsapp/page.tsx`

### 12.3 Paramètres Intégrations
- **Route**: `/dashboard/settings/integrations`
- **Fichier**: `/app/dashboard/settings/integrations/page.tsx`
- **Fonction**: Gestion des intégrations externes (CRM, calendriers, etc.)

### 12.4 Paramètres Notifications
- **Route**: `/dashboard/settings/notifications`
- **Fichier**: `/app/dashboard/settings/notifications/page.tsx`
- **Fonction**: Configuration des alertes et notifications

---

## 13. PAGES INTÉGRATIONS CRM

### 13.1 Vue d'ensemble Intégrations
- **Route**: `/dashboard/integrations`
- **Fichier**: `/app/dashboard/integrations/page.tsx`
- **Fonction**: Liste des intégrations disponibles et actives

### 13.2 Nouvelle Intégration
- **Route**: `/dashboard/integrations/new`
- **Fichier**: `/app/dashboard/integrations/new/page.tsx`
- **Fonction**: Assistant création d'intégration

---

## 14. PAGES DE TEST

### 14.1 Test Canaux
- **Route**: `/dashboard/test-channels`
- **Fichier**: `/app/dashboard/test-channels/page.tsx`
- **Fonction**: Tester les canaux configurés avant production

---

## 5. API ROUTES (Backend)

### 5.1 Canaux
- `POST /api/channels/auto` - Configuration automatique canaux
- `POST /api/channels/email/send` - Envoi emails
- `POST /api/channels/sms/send` - Envoi SMS (Twilio)
- `POST /api/channels/whatsapp/send` - Envoi WhatsApp

### 5.2 CRM & Intégrations
- `GET/POST /api/crm/integrations` - Gestion intégrations CRM
- `POST /api/crm/sync` - Synchronisation CRM
- `POST /api/crm/webhooks/hubspot` - Webhook HubSpot
- `POST /api/crm/webhooks/salesforce` - Webhook Salesforce

### 5.3 Base de Connaissances
- `GET/POST /api/knowledge/documents` - Gestion documents
- `POST /api/knowledge/documents/upload` - Upload documents
- `POST /api/knowledge/crawl` - Web scraping/crawling
- `POST /api/knowledge/import-google` - Import depuis Google Drive
- `POST /api/knowledge/ask` - Requête vers la base de connaissance
- `POST /api/knowledge/structure-ai` - Structuration IA des documents

### 5.4 Webhooks (Entrants)
- `POST /api/webhooks/twilio/sms` - Webhook SMS entrants
- `POST /api/webhooks/whatsapp` - Webhook WhatsApp entrants

---

## FLUX UTILISATEUR COMPLET

### Phase 1: Découverte & Acquisition
1. Utilisateur arrive sur `/` (landing page)
2. Clique "Essai gratuit" ou "Démarrer gratuitement"
3. Redirection vers `/signup`

### Phase 2: Inscription
1. Remplit formulaire: entreprise, nom, email, mot de passe, téléphone, secteur
2. Validation et création compte
3. Redirection `/onboarding`

### Phase 3: Onboarding Initial
1. Étape 1: Bienvenue (WelcomeStep)
2. Étape 2: Sélection canaux (Téléphone, SMS, Email, WhatsApp)
3. Étapes 3-6: Configuration par canal sélectionné
7. Étape 7: Base de connaissances (import site ou documents)
8. Étape 8: Completion et redirection dashboard

### Phase 4: Configuration Avancée
1. Utilisateur accède `/dashboard`
2. Peut configurer:
   - `/dashboard/sara` - Paramètres de l'IA
   - `/dashboard/settings` - Tous les paramètres
   - `/dashboard/knowledge` - Base de connaissance
   - `/dashboard/channels` - Configuration canaux avancée

### Phase 5: Exploitation & Monitoring
1. **Communications**:
   - `/dashboard/conversations` - Voir tous les appels/messages
   - `/dashboard/inbox` - Messages entrants
   - `/dashboard/channels/inbox` - Inbox centralisée

2. **Prospects & Clients**:
   - `/dashboard/crm/prospects` - Gestion prospects
   - `/dashboard/customers` - Gestion clients confirmés
   - `/dashboard/crm/prospects/[id]` - Détails prospect

3. **Rendez-vous**:
   - `/dashboard/appointments` - Vue RDV
   - `/dashboard/appointments/calendar` - Calendrier
   - Synchronisation Google/Outlook

4. **Analytics**:
   - `/dashboard/analytics` - Tableaux de bord
   - `/dashboard/sara-analytics` - Stats agent IA
   - Export automatiques

### Phase 6: Intégrations
1. `/dashboard/integrations` - Voir intégrations
2. `/dashboard/integrations/new` - Ajouter intégration
3. `/dashboard/settings/integrations` - Configurer intégrations
4. Webhooks reçoivent données depuis CRM

---

## ARCHITECTURE TECHNIQUE

### Stack
- **Framework**: Next.js 15+ (App Router)
- **Frontend**: React, Tailwind CSS, Lucide Icons
- **State Management**: React Hooks, localStorage
- **Authentification**: JWT tokens + cookies
- **Mode**: Demo mode (mock data) et Production mode

### Structures clés
- **Authentication**: Token JWT stocké en localStorage + cookie
- **Tenant Isolation**: Multi-tenant avec tenant_id
- **Live Updates**: Hook `useLiveUpdates` pour notifications temps réel
- **Toast Notifications**: ToastContainer pour feedback utilisateur
- **Layout**: Dashboard layout avec sidebar collapsible

---

## SÉCURITÉ

- RGPD 100% conforme
- ISO 27001 certifié
- Hébergement EU (données en France)
- Chiffrement SSL/TLS 256-bit
- HTTPS enforced

---

## FONCTIONNALITÉS PRINCIPALES

### 1. Agent Vocal IA (SARA)
- Conversations naturelles en français
- Qualification automatique prospects
- Prise de RDV auto
- Transcription temps réel
- Disponibilité 24/7

### 2. Communication Omnicanal
- SMS & WhatsApp intégrés
- Email avec suggestions IA
- Appels entrants/sortants
- Historique par prospect
- Relances automatiques

### 3. Gestion RDV
- Prise de RDV automatique
- Synchronisation calendrier (Google/Outlook)
- Rappels intelligents
- Gestion annulations

### 4. CRM Intelligent
- Base prospects enrichie automatiquement
- Scoring IA automatique
- Segmentation intelligente
- Historique complet interactions

### 5. Analytics
- Tableaux de bord personnalisés
- Exports automatiques
- Prédictions IA
- KPIs temps réel

### 6. Base de Connaissance
- Import site en 1 clic
- Upload documents (PDF, Word)
- FAQ personnalisée
- Enrichissement IA

---

## LIMITATIONS & AMÉLIORATIONS POSSIBLES

### Pages doublonnées identifiées
- `/dashboard/appointments` et `/dashboard/rdv` - À fusionner
- `/dashboard/conversations/appels` et `/dashboard/appels` - À fusionner
- `/dashboard/channels/inbox` et `/dashboard/inbox` - À fusionner

### Opportunités de refactorisation
- Consolidation des routes de paramètres
- Harmonisation des noms de routes
- Intégration des pages client/onboarding au flow principal
- Suppression des pages de test en production

---

## CONCLUSION

Coccinelle AI propose un parcours utilisateur complet de 50+ pages couvrant:
- Authentification (landing, login, signup)
- Onboarding multi-étapes avec configuration canaux
- Dashboard principal avec 6 modules
- Configuration avancée des canaux
- Gestion CRM et prospects
- Conversation omnicanal
- Gestion rendez-vous automatisée
- Analytics et monitoring
- Intégrations externes
- Paramètres complets

Le produit est conçu pour être rapide à déployer (5 min) tout en offrant une profondeur de configuration pour les usages avancés.

