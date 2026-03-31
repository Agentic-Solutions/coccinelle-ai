# AUDIT DE LANCEMENT — Coccinelle.ai

**Date** : 28 mars 2026
**Lancement** : 1er avril 2026
**Presentation Nubbo** : 3 avril 2026
**Statut** : PRE-LANCEMENT

---

## 1. SCORE DE READINESS PAR MODULE (0-10)

| Module | Score | Statut |
|--------|-------|--------|
| Authentification (signup/login/logout) | 7/10 | Fonctionnel avec reserves |
| Onboarding | 6/10 | Fonctionnel, gestion erreurs faible |
| Dashboard principal | 5/10 | Donnees hardcodees |
| VoixIA (config agent) | 8/10 | Operationnel |
| CRM — Clients | 8/10 | Production-ready |
| CRM — Rendez-vous | 7/10 | Fonctionnel |
| CRM — Appels | 7/10 | Fonctionnel |
| CRM — Conversations/Leads/Taches | 2/10 | Pages "A venir" |
| Facturation | 3/10 | Donnees mock hardcodees |
| Parametres / Profil | 8/10 | Corrige (401 + refresh token) |
| Backend API | 7/10 | Fonctionnel, securite a renforcer |
| **SCORE GLOBAL** | **6.5/10** | **Lancement possible avec precautions** |

---

## 2. LISTE DES PROBLEMES

### ROUGE — Bloquant (a corriger AVANT le 1er avril)

1. **Dashboard : metriques de croissance hardcodees**
   - `+12%`, `+5%`, `+8%` affiches en dur dans le dashboard principal
   - Impact : Un prospect ou investisseur qui teste verra des chiffres faux
   - Fichier : `app/dashboard/page.tsx`
   - Fix : Afficher `—` ou `0%` si pas de donnees, ou masquer les pourcentages

2. **Dashboard : "Quick Wins" et "Top 5 Questions" hardcodes**
   - Liste statique de suggestions et questions affichees comme si elles venaient de l'IA
   - Impact : Perte de credibilite si un utilisateur remarque que les donnees ne changent pas
   - Fix : Afficher un etat vide "Pas encore de donnees" ou retirer ces widgets

3. **Facturation : tenant_123 hardcode**
   - Les pages invoices, payment-methods et usage utilisent `tenant_123` au lieu du vrai tenant
   - Impact : Aucune donnee reelle affichee, erreurs possibles
   - Fichiers : `app/dashboard/billing/invoices/page.tsx`, `payment-methods/page.tsx`, `usage/page.tsx`
   - Fix : Utiliser le tenant reel depuis localStorage/useAuth

4. **CRM : 3 modules affichent "A venir"**
   - Conversations, Leads, Taches sont des pages placeholder
   - Impact : Impression d'un produit inacheve
   - Fix : Soit retirer du menu, soit afficher "Bientot disponible" avec design soigne

5. **Facturation : stats canaux mock**
   - Les statistiques de consommation par canal sont des donnees fictives
   - Fix : Afficher "Pas de donnees" ou retirer le widget

### ORANGE — Important (a corriger avant le 3 avril / demo Nubbo)

6. **Backend : JWT non verifie cryptographiquement dans le middleware**
   - Le middleware decode le JWT et verifie `exp` mais ne valide pas la signature
   - Impact : Un token forge avec un `exp` futur passerait la verification
   - Fichier : `middleware.ts`
   - Fix : Utiliser une verification de signature cote middleware ou deleguer au backend

7. **Backend : pas de rate limiting sur /auth/refresh et /auth/forgot-password**
   - Risque de brute force ou d'abus
   - Fix : Ajouter un rate limiter (Cloudflare ou applicatif)

8. **Backend : pas d'invalidation de session au changement de mot de passe**
   - Apres un reset password, les anciens tokens restent valides
   - Fix : Incrementer un compteur de version dans le JWT ou invalider les sessions

9. **Signup : company_name vide a l'inscription**
   - Le champ company_name n'est pas collecte au signup, seulement a l'onboarding
   - Si l'onboarding echoue cote API, le tenant reste sans nom
   - Impact : `{COMPANY_NAME}` non remplace dans les prompts VoixIA
   - Fix : S'assurer que l'onboarding synchronise bien le nom d'entreprise

10. **Onboarding : pas de retry si l'API echoue**
    - Si la requete PUT /tenants/:id echoue, l'onboarding continue quand meme
    - Les donnees sont sauvees localement mais pas sur le serveur
    - Fix : Afficher une erreur et bloquer la progression

11. **Canaux : activation partielle silencieuse**
    - Si un canal sur trois echoue a s'activer, l'erreur est masquee
    - Fix : Afficher le statut de chaque canal individuellement

12. **VoixIA : cles API visibles dans le code client**
    - `X-VoixIA-Key` et `X-VoixIA-Tenant` sont dans le code frontend
    - Impact : Faible si les cles sont par tenant, mais mauvaise pratique
    - Fix : Proxifier les appels VoixIA via le backend authentifie

### VERT — Nice to have (post-lancement)

13. **Email de verification non requis pour le trial**
    - Un utilisateur peut s'inscrire avec un faux email et utiliser la plateforme
    - Fix : Rendre la verification obligatoire ou limiter les fonctionnalites

14. **Dashboard analytics : totalCost/totalClients potentiellement incoherents**
    - Les metriques calculees pourraient ne pas correspondre aux donnees reelles
    - Fix : Verifier les calculs cote backend

15. **Ameliorer le design des pages "A venir"**
    - Les placeholders actuels sont basiques
    - Fix : Ajouter un design avec illustration et "Coming soon"

16. **Ajouter des tests automatises**
    - Aucun test unitaire ou e2e detecte dans le projet
    - Fix : Ajouter Vitest + Playwright post-lancement

17. **Internationalisation**
    - Mix francais/anglais dans le code et l'UI
    - Fix : Uniformiser en francais pour le marche cible

---

## 3. PLAN JOUR PAR JOUR

### Samedi 29 mars

| Priorite | Tache | Temps estime |
|----------|-------|-------------|
| ROUGE | Remplacer les metriques hardcodees du dashboard par des etats vides | 1h |
| ROUGE | Remplacer `tenant_123` par le vrai tenant dans la facturation | 30min |
| ROUGE | Masquer ou retirer Quick Wins / Top 5 Questions hardcodes | 30min |

### Dimanche 30 mars

| Priorite | Tache | Temps estime |
|----------|-------|-------------|
| ROUGE | Masquer les 3 modules CRM "A venir" du menu OU les remplacer par un design "Bientot" | 1h |
| ROUGE | Remplacer les stats canaux mock dans billing/usage | 30min |
| ORANGE | Ajouter retry/erreur dans l'onboarding si l'API echoue | 1h |

### Lundi 31 mars

| Priorite | Tache | Temps estime |
|----------|-------|-------------|
| ORANGE | Ajouter verification de signature JWT dans le middleware | 1-2h |
| ORANGE | Proxifier les appels VoixIA via le backend (retirer cles du client) | 1-2h |
| TEST | Test complet du parcours : signup → onboarding → dashboard → VoixIA → CRM | 2h |

### Mardi 1er avril — JOUR J

| Priorite | Tache | Temps estime |
|----------|-------|-------------|
| DEPLOY | Deploiement final Cloudflare Pages + Workers | 30min |
| TEST | Smoke test production | 30min |
| PREP | Preparer le compte demo pour Nubbo | 1h |

### Mercredi 2 avril — PREPARATION NUBBO

| Priorite | Tache | Temps estime |
|----------|-------|-------------|
| DEMO | Creer un tenant demo avec donnees realistes | 1h |
| DEMO | Preparer le script de demo (voir section 4) | 1h |
| DEMO | Test du parcours demo sur le reseau Nubbo | 30min |

---

## 4. RECOMMANDATIONS POUR LA DEMO NUBBO (3 avril)

### Parcours de demo recommande (15-20 min)

1. **Accroche** (2 min)
   - Montrer le probleme : appels manques = clients perdus
   - "Coccinelle.ai repond a vos appels 24/7 avec une IA vocale naturelle"

2. **Signup en live** (3 min)
   - Creer un compte en direct devant le public
   - Montrer l'onboarding : choix du secteur, nom d'entreprise, activation des canaux
   - Impression de rapidite et simplicite

3. **Configuration VoixIA** (5 min)
   - Selectionner le secteur → le template se charge automatiquement
   - Personnaliser le nom de l'assistant et le prompt
   - Montrer que c'est adaptable a n'importe quel metier

4. **Appel de demonstration** (5 min)
   - Appeler le numero VoixIA en direct
   - Montrer une conversation naturelle avec l'IA
   - L'appel apparait en temps reel dans le CRM

5. **CRM et suivi** (3 min)
   - Montrer l'appel enregistre dans les appels
   - Montrer le client cree automatiquement
   - Montrer le rendez-vous pris par l'IA

6. **Conclusion** (2 min)
   - Plans tarifaires
   - "Disponible maintenant, essai gratuit 14 jours"

### Points a eviter pendant la demo

- **NE PAS** naviguer vers les pages Conversations, Leads, Taches (pas pretes)
- **NE PAS** ouvrir la page Facturation > Usage (donnees mock)
- **NE PAS** montrer le dashboard principal sauf si les metriques sont corrigees
- **NE PAS** rester trop longtemps sur les parametres (peu spectaculaire)
- **NE PAS** tester sur un reseau instable — preparer un hotspot de backup

### Compte demo a preparer

- Creer un tenant `demo-nubbo` avec :
  - Secteur : `immobilier` (parlant pour tout le monde)
  - Nom : "Agence Coccinelle"
  - Agent configure et fonctionnel
  - 5-10 appels de test deja enregistres pour montrer l'historique
  - 3-5 clients dans le CRM
  - 2-3 rendez-vous

### Materiel necessaire

- Laptop avec Chrome (pas de mode sombre)
- 2 telephones : un pour appeler, un en backup
- Hotspot 4G en backup
- URL de demo ouverte dans un onglet, pret a presenter

---

## RESUME EXECUTIF

Coccinelle.ai est **fonctionnel pour un lancement** avec les reserves suivantes :

- Le coeur de valeur (VoixIA + CRM appels/clients) fonctionne bien (**8/10**)
- Le dashboard et la facturation affichent des donnees fictives (**3-5/10**)
- 3 modules CRM sont des placeholders
- La securite est acceptable pour un MVP mais doit etre renforcee rapidement

**Decision** : Lancement possible le 1er avril a condition de :
1. Corriger les 5 items ROUGE avant le 31 mars (effort : ~4h)
2. Preparer un parcours de demo maitrise qui evite les zones fragiles
3. Planifier les corrections ORANGE dans la semaine suivant le lancement
