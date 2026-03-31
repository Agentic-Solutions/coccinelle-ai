# Audit de cohérence — Coccinelle.ai

**Date** : 2026-03-28
**Périmètre** : Frontend Next.js (coccinelle-saas) + interactions API Cloudflare Workers

---

## Problèmes identifiés par ordre de priorité

### P0 — CRITIQUE

#### 1. Signup ne set pas le cookie auth_token

**Symptôme** : Après inscription, l'utilisateur peut être redirigé vers /login au lieu de /dashboard.

**Cause** : `app/signup/page.tsx:103-106` stocke le token dans localStorage mais **ne crée pas le cookie** `auth_token`. Or le `middleware.ts:28` lit exclusivement le cookie pour valider l'accès aux routes `/dashboard/*`.

**Comparaison** :
- `app/login/page.tsx:91-96` → `Cookies.set('auth_token', ...)` ✅
- `app/signup/page.tsx:103-106` → Pas de `Cookies.set()` ❌

**Flux cassé** : Signup → Onboarding → Redirect `/dashboard` → Middleware voit pas de cookie → Redirect `/login` → "Token invalide ou expiré"

**Fichiers** : `app/signup/page.tsx`
**Effort** : 5 min — Ajouter `Cookies.set()` identique au login

---

#### 2. Page Profil affiche "Token invalide ou expiré"

**Symptôme** : La page Paramètres/Profil affiche une erreur au chargement.

**Causes multiples** :
1. Bug du cookie ci-dessus (P0-1)
2. `ProfileForm.tsx:27` appelle `/api/v1/auth/me` avec `Bearer ${token}` lu depuis localStorage. Si le token JWT a expiré côté serveur (exp < now), l'API retourne 401. Mais le middleware ne vérifie que l'expiration côté client (décodage base64 sans validation signature), ce qui peut donner un token "valide" pour le middleware mais rejeté par l'API.
3. Pas de refresh token implémenté — quand le JWT expire, l'utilisateur doit se reconnecter manuellement.

**Fichiers** : `middleware.ts`, `hooks/useAuth.ts`, `src/components/settings/ProfileForm.tsx`
**Effort** : 2h — Implémenter un mécanisme de refresh ou allonger la durée du JWT

---

### P1 — MAJEUR

#### 3. company_name : 5 sources, 0 cohérence

L'information `company_name` est stockée/lue à 5 endroits différents avec des noms de champs incohérents :

| Fichier | Lecture | Écriture | Champ utilisé |
|---------|---------|----------|---------------|
| `app/signup/page.tsx:86` | — | POST `/auth/signup` | `company_name: ''` (vide !) |
| `app/onboarding/page.tsx:22` | state local | — | `businessData.company_name` |
| `hooks/useAuth.ts:17` | `tenant.company_name` | — | `company_name` |
| `ProfileForm.tsx:45` | GET `/auth/me` | PUT `/auth/profile` | Lit `tenant.name`, écrit `company_name` |
| `voixia/page.tsx:282-294` | GET `/settings/company` puis GET `/auth/me` | — | `data.company_name` |

**Problèmes concrets** :
- Le signup envoie `company_name: ''` → la DB a un company_name vide
- Le ProfileForm **lit** `data.tenant?.name` mais **écrit** `company_name` → si le champ DB s'appelle `company_name`, la lecture via `.name` retourne undefined
- VoixIA essaie un endpoint `/settings/company` qui n'existe probablement pas, puis fallback sur `/auth/me` avec les headers VoixIA (pas le JWT user)
- L'onboarding collecte `company_name` mais ne semble pas le persister via API

**Fichiers** : Tous les fichiers ci-dessus
**Effort** : 4h — Unifier sur un seul champ `company_name`, un seul endpoint

---

#### 4. Deux systèmes d'authentification parallèles

La page VoixIA utilise un système d'auth complètement séparé :

| Système | Pages | Mécanisme |
|---------|-------|-----------|
| JWT Bearer | Login, Signup, Profil, Dashboard, Onboarding | `Authorization: Bearer <token>` via localStorage |
| VoixIA Keys | VoixIA & Prompts | `X-VoixIA-Key` + `X-VoixIA-Tenant` hardcodés dans le frontend |

**Problèmes** :
- La clé API VoixIA est **exposée en clair** dans le code frontend (`voixia/page.tsx:47-48`)
- Le `companyName` dans VoixIA est récupéré via les headers VoixIA (pas le JWT user) → il reflète le tenant VoixIA hardcodé, pas le tenant de l'utilisateur connecté
- Un utilisateur connecté avec un autre compte verrait quand même les données du tenant hardcodé

**Fichiers** : `app/dashboard/voixia/page.tsx`
**Effort** : 8h — Migrer VoixIA vers le système JWT, ou utiliser un endpoint backend qui mappe JWT → VoixIA tenant

---

#### 5. API URL définie à 6 endroits différents

| Fichier | Valeur |
|---------|--------|
| `app/login/page.tsx:69` | Hardcodé `'https://coccinelle-api.youssef-amrouche.workers.dev'` |
| `app/signup/page.tsx:81` | `process.env.NEXT_PUBLIC_API_URL` |
| `hooks/useAuth.ts:22` | Hardcodé `'https://coccinelle-api.youssef-amrouche.workers.dev'` |
| `lib/config.ts:10-12` | Logique local/env/hardcodé |
| `ProfileForm.tsx:6` | `process.env.NEXT_PUBLIC_API_URL \|\| 'https://...'` |
| `voixia/page.tsx:46` | Hardcodé `API_BASE` |

**Risque** : Si l'URL change, il faut modifier 6 fichiers. Certains utilisent l'env var, d'autres non.

**Fichiers** : Tous les fichiers ci-dessus
**Effort** : 1h — Tout centraliser vers `lib/config.ts` → `buildApiUrl()`

---

### P2 — MINEUR

#### 6. Données redemandées inutilement

| Donnée | Demandée à l'inscription | Demandée à l'onboarding | Demandée dans le profil |
|--------|--------------------------|-------------------------|-------------------------|
| Nom complet | ✅ `name` | ❌ | ✅ `firstName` + `lastName` |
| Email | ✅ | ❌ | ✅ (read-only) |
| company_name | ❌ (envoyé vide) | ✅ Step 1 (BusinessStep) | ✅ |
| Téléphone | ❌ | ✅ Step 1 (BusinessStep) | ✅ |
| Secteur | ❌ | ✅ Step 0 (SectorStep) | ✅ `industry` |
| Nom assistant | ❌ | ✅ Step 5 (AssistantStep) | ❌ |
| Voix | ❌ | ✅ Step 5 (AssistantStep) | ❌ |

**Observations** :
- `company_name` est collectée 2 fois (onboarding + profil) mais PAS au signup
- Le secteur est collecté 2 fois (onboarding + profil)
- Le profil redemande tout ce que l'onboarding a déjà collecté
- Les données de l'onboarding (assistant_name, voix) ne sont pas reprises dans VoixIA

**Effort** : 4h — Pré-remplir le profil depuis l'onboarding, VoixIA depuis le profil

---

#### 7. Incohérence des noms de champs dans l'interface Tenant

| Fichier | Champ lu | Champ DB probable |
|---------|----------|-------------------|
| `useAuth.ts:17` | `tenant.company_name` | `company_name` |
| `ProfileForm.tsx:45` | `tenant.name` | ??? |
| `ProfileForm.tsx:46` | `tenant.sector` puis `tenant.industry` | `sector` ou `industry` ? |
| `onboarding/page.tsx:76` | `tenant.industry` puis `user.industry` | ??? |

Le même champ est lu sous des noms différents selon les pages. Impossible de savoir quel est le vrai nom en DB sans lire le backend.

**Effort** : 2h — Définir un type TypeScript unique pour Tenant et l'utiliser partout

---

#### 8. Sécurité : cookie `secure: false`

`app/login/page.tsx:95` : `secure: false` sur le cookie auth.
En production HTTPS, ce cookie peut transiter en clair sur HTTP.

**Effort** : 5 min — Changer en `secure: process.env.NODE_ENV === 'production'`

---

## Plan de correction

### Phase 1 — Corrections urgentes (1 jour)

| # | Action | Fichier(s) | Effort |
|---|--------|------------|--------|
| 1.1 | Ajouter `Cookies.set()` dans signup (identique au login) | `app/signup/page.tsx` | 5 min |
| 1.2 | Centraliser API_URL → tout passe par `lib/config.ts` | `login/page.tsx`, `useAuth.ts`, `voixia/page.tsx` | 1h |
| 1.3 | Fixer ProfileForm : lire `tenant.company_name` (pas `.name`) | `ProfileForm.tsx:45` | 10 min |
| 1.4 | Fixer ProfileForm : lire `tenant.sector` de manière cohérente | `ProfileForm.tsx:46` | 10 min |
| 1.5 | Cookie `secure: true` en production | `login/page.tsx`, `signup/page.tsx` | 5 min |

### Phase 2 — Unification des sources de données (2-3 jours)

| # | Action | Fichier(s) | Effort |
|---|--------|------------|--------|
| 2.1 | Créer un type `Tenant` unique dans `types/tenant.ts` et l'utiliser partout | Nouveau fichier + tous les consumers | 2h |
| 2.2 | Créer un hook `useTenant()` qui expose company_name, sector, etc. depuis un seul appel `/auth/me` | Nouveau hook + refactor ProfileForm, VoixIA, Dashboard | 4h |
| 2.3 | Migrer VoixIA page vers auth JWT (supprimer les clés hardcodées) | `voixia/page.tsx` + endpoint backend à adapter | 8h |
| 2.4 | Connecter l'onboarding au profil : les données saisies à l'onboarding doivent être persistées via `/auth/profile` | `onboarding/page.tsx`, steps | 4h |

### Phase 3 — Harmonisation UX (1-2 jours)

| # | Action | Fichier(s) | Effort |
|---|--------|------------|--------|
| 3.1 | Pré-remplir le profil depuis les données onboarding (ne jamais redemander) | `ProfileForm.tsx` | 2h |
| 3.2 | Pré-remplir VoixIA `assistantName` depuis le profil/onboarding | `voixia/page.tsx` | 1h |
| 3.3 | Pré-remplir VoixIA `companyName` depuis `useTenant()` | `voixia/page.tsx` | 30 min |
| 3.4 | Ajouter un mécanisme de refresh token ou prolonger la durée JWT | Backend + `hooks/useAuth.ts` | 4h |
| 3.5 | Supprimer le mode démo (code mort dans login + signup) | `login/page.tsx`, `signup/page.tsx`, `lib/mockData.ts` | 1h |

---

## Schéma du flux actuel (cassé)

```
SIGNUP                    ONBOARDING                  PROFIL                    VOIXIA
──────                    ──────────                  ──────                    ──────
name ──────────────────────────────────────────────→ firstName/lastName
email ─────────────────────────────────────────────→ email (read-only)
company_name: "" ────✗    company_name ──✗ (perdu)    tenant.name ← ??? →     /settings/company
                          phone ─────────✗ (perdu)    tenant.phone              (endpoint inexistant?)
                          sector ────────✗ (perdu)    tenant.sector/industry
                          agent_name ────✗ (perdu)                              assistantName (manuel)
                          voice ─────────✗ (perdu)                              selectedVoice (manuel)

Token: localStorage ✅     Token: localStorage ✅      Token: localStorage ✅    Token: X-VoixIA-Key ⚠️
       cookie ❌                                                                       (hardcodé)
```

## Schéma du flux cible (corrigé)

```
SIGNUP                    ONBOARDING                  PROFIL                    VOIXIA
──────                    ──────────                  ──────                    ──────
name ──→ localStorage ──→ pré-rempli ───────────────→ firstName/lastName ──────→ (via useTenant)
email ─→ localStorage ──→ pré-rempli ───────────────→ email (read-only)
                          company_name ──→ API ──────→ tenant.company_name ────→ companyName (auto)
                          phone ─────────→ API ──────→ tenant.phone
                          sector ────────→ API ──────→ tenant.sector ──────────→ promptSecteur (auto)
                          agent_name ────→ API ──────→ (nouveau champ) ────────→ assistantName (auto)
                          voice ─────────→ API ──────→ (nouveau champ) ────────→ selectedVoice (auto)

Token: localStorage ✅     Token: localStorage ✅      Token: localStorage ✅    Token: Bearer JWT ✅
       cookie ✅                  cookie ✅                   cookie ✅                 cookie ✅
```
