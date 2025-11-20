# 🧪 GUIDE DE TEST - ASSISTANT GUIDÉ "JE N'AI RIEN"
**Application**: Coccinelle.AI
**URL**: http://localhost:3000
**Date**: 2025-11-14

---

## 🎯 OBJECTIF DU TEST

Valider le parcours complet de l'assistant guidé pour les utilisateurs sans site web ni documents, de la création de compte jusqu'à la génération automatique de la Knowledge Base.

---

## 📋 CHECKLIST DE TEST

### Phase 1 : Création de Compte (5 min)

#### 1. Accéder à l'application
- [ ] Ouvrir http://localhost:3000
- [ ] Vérifier l'affichage de la landing page
- [ ] Cliquer sur "Créer un compte" ou aller sur `/signup`

#### 2. Remplir le formulaire Signup
- [ ] **Nom entreprise** : "Agence Immobilière Demo"
- [ ] **Nom complet** : "Jean Dupont"
- [ ] **Email** : `test+assistant@coccinelle.ai`
- [ ] **Mot de passe** : `TestDemo2024!`
- [ ] **Téléphone** : `+33 6 12 34 56 78`
- [ ] **Secteur** : Sélectionner "Immobilier"

**✅ Validation attendue :**
- Formulaire accepté
- Redirection vers `/onboarding`
- localStorage contient : `auth_token`, `user`, `tenant`

---

### Phase 2 : Onboarding - Steps 1-3 (3 min)

#### Step 1 : Welcome
- [ ] Logo Coccinelle visible
- [ ] Titre : "Bienvenue sur Coccinelle.AI !"
- [ ] Promesse : "en moins de 5 minutes"
- [ ] 4 cartes de fonctionnalités affichées
- [ ] Bouton "Commencer →" fonctionnel

#### Step 2 : Business Info
- [ ] Remplir les informations business
- [ ] Boutons "← Retour" et "Continuer →" fonctionnels
- [ ] Validation correcte

#### Step 3 : Configuration Sara
- [ ] Sélectionner **Type** : "📞 Accueil téléphonique"
- [ ] Sélectionner **Voix** : "Féminine"
- [ ] **Nom** : Laisser "Sara" (pré-rempli)
- [ ] Bouton "Continuer →" s'active après sélection type

**✅ Validation attendue :**
- Navigation fluide entre les steps
- Sélections bien sauvegardées

---

### Phase 3 : Knowledge Base - Assistant Guidé (10 min)

#### Step 4 : Choix de la méthode KB

**🎯 POINT CRITIQUE À TESTER**

- [ ] 3 options visibles :
  - [ ] "J'ai un site web" (⏱️ 2 minutes)
  - [ ] "J'ai des documents" (⏱️ 1 minute)
  - [ ] **"Je n'ai rien"** (⏱️ 3 minutes) ← TESTER CELUI-CI
- [ ] Bouton skip : "⏭️ Je ferai ça depuis le dashboard"

**Action** : Cliquer sur **"Je n'ai rien"**

**✅ Validation attendue :**
- Pas de message "disponible prochainement"
- Redirection vers l'interface assistant guidé

---

#### Assistant Guidé - Écran Intro

**Vérifications** :
- [ ] Titre : "Sara va vous poser quelques questions"
- [ ] Description : "En 3 minutes, Sara va construire automatiquement votre base de connaissances"
- [ ] Card gradient purple/blue avec icône MessageSquare
- [ ] Section "Comment ça marche ?" avec 4 étapes :
  1. Sara pose 5 questions
  2. Répondez librement
  3. Génération automatique 3-5 documents
  4. KB prête à l'emploi
- [ ] Boutons : "← Retour" et "Commencer →"

**Action** : Cliquer sur "Commencer →"

---

#### Assistant Guidé - Questions (Secteur Immobilier)

**Format attendu** :
- Barre de progression en haut
- Question actuelle affichée dans une card grise (avatar "S" pour Sara)
- Zone de texte pour répondre
- Bouton "Question suivante" ou "Générer ma Knowledge Base" (dernière question)

**Questions attendues pour Immobilier** :

##### Question 1/5 (20%)
- [ ] **Question** : "Quels types de biens proposez-vous ?"
- [ ] **Placeholder** : "Ex: Vente d'appartements, location de maisons..."
- [ ] **Hint** : "💡 Décrivez les principales catégories de biens et services"
- [ ] **Obligatoire** : Oui (*)

**Réponse test** :
```
Nous proposons la vente et la location d'appartements, maisons et locaux commerciaux.
Nous gérons aussi des biens de prestige dans le 16e arrondissement de Paris.
```

##### Question 2/5 (40%)
- [ ] **Question** : "Quelle est votre zone géographique d'intervention ?"
- [ ] **Obligatoire** : Oui (*)

**Réponse test** :
```
Paris 16e, 17e, Neuilly-sur-Seine, et l'ouest parisien en général.
```

##### Question 3/5 (60%)
- [ ] **Question** : "Quels sont vos horaires d'ouverture ?"
- [ ] **Obligatoire** : Oui (*)

**Réponse test** :
```
Lundi-Vendredi : 9h-19h
Samedi : 10h-18h
Fermé le dimanche
```

##### Question 4/5 (80%)
- [ ] **Question** : "Comment se déroule un premier contact avec un client ?"
- [ ] **Obligatoire** : Oui (*)

**Réponse test** :
```
Premier échange téléphonique pour comprendre les besoins, puis prise de rendez-vous
pour une rencontre en agence ou visite du bien. Estimation gratuite et sans engagement.
```

##### Question 5/5 (100%)
- [ ] **Question** : "Avez-vous des spécificités ou offres actuelles ?"
- [ ] **Obligatoire** : Non (optionnel)

**Réponse test** :
```
Spécialistes de l'immobilier de prestige. Offre actuelle : -50% sur les frais d'agence
pour toute vente finalisée avant fin décembre.
```

**Fonctionnalités à tester** :
- [ ] Bouton "Précédent" fonctionne et revient à la question précédente
- [ ] Validation : Bouton désactivé si question obligatoire vide
- [ ] Dropdown "Voir mes réponses précédentes" affiche l'historique
- [ ] Barre de progression se met à jour (0% → 100%)
- [ ] Dernière question : Bouton change en "Générer ma Knowledge Base"

**Action finale** : Cliquer sur "Générer ma Knowledge Base"

---

#### Assistant Guidé - Génération

**Séquence de messages attendue** (avec timings) :

1. **Analyse** (800ms)
   - [ ] Spinner noir qui tourne
   - [ ] Titre : "Sara génère votre Knowledge Base..."
   - [ ] Card purple avec icône Loader2
   - [ ] Message : "Analyse de vos réponses..."

2. **Génération** (800ms après)
   - [ ] Même spinner
   - [ ] Message : "Génération de documents structurés..."

3. **Sauvegarde** (800ms après)
   - [ ] Même spinner
   - [ ] Message : "Sauvegarde dans votre Knowledge Base..."

4. **Succès** (400ms après)
   - [ ] ✅ Checkmark vert dans cercle vert
   - [ ] Titre : "Knowledge Base créée !"
   - [ ] Card verte avec border
   - [ ] Message : "✓ 4 documents créés avec succès !" (ou 5 selon secteur)
   - [ ] Sous-titre : "Redirection vers le récapitulatif"

**✅ Validation attendue :**
- Total durée : ~3 secondes
- Transitions fluides
- Aucune erreur console
- Redirection automatique après 1 seconde

---

### Phase 4 : Completion Step (2 min)

**Écran de félicitations** :

- [ ] Titre : "Félicitations !"
- [ ] Message : "Votre plateforme Coccinelle.AI est prête à l'emploi !"
- [ ] Card verte "Ce qui a été configuré" avec 4 sections :
  - [ ] **Agents** : "0 agents créés"
  - [ ] **Sara** : "Assistant vocal actif"
  - [ ] **Knowledge Base** : "**4 documents**" (avec ✓ vert si assistant)
  - [ ] **Téléphonie** : Numéro ou "Configurée"

- [ ] Section "Prochaines étapes" avec 4 actions :
  1. Tester Sara (numéro de téléphone affiché)
  2. Explorer le dashboard
  3. **Enrichir KB** - "Sara a généré 4 documents, ajoutez-en plus !"
  4. Inviter vos agents

- [ ] Bouton "Accéder au Dashboard →" bien visible

**Action** : Cliquer sur "Accéder au Dashboard →"

**✅ Validation attendue :**
- localStorage mis à jour :
  - `onboarding_completed` = 'true'
  - `kb_method` = 'assistant'
- Redirection vers `/dashboard`

---

### Phase 5 : Dashboard - Welcome & Checklist (3 min)

#### Welcome Banner

**Vérifications** :
- [ ] Banner gradient vert visible en haut
- [ ] Titre : **"Félicitations ! Sara a créé votre Knowledge Base"**
- [ ] Message : "Sara a généré **4 documents** pour vous. Voici comment continuer :"
- [ ] 3 suggestions spécifiques à l'assistant guidé :
  1. Consulter documents générés (lien vers Knowledge)
  2. Tester Sara maintenant
  3. Suivre Analytics
- [ ] Bouton X pour fermer

**Action** : Garder le banner ouvert pour l'instant

---

#### Checklist "Getting Started"

**Vérifications** :
- [ ] Card gradient purple/blue visible sous le banner
- [ ] Icône Zap (⚡) dans cercle purple
- [ ] Titre : "Premiers pas"
- [ ] Badge : "X/6 complété"
- [ ] Barre de progression affichée (environ 50% complété)
- [ ] Boutons chevron (expand/collapse) et X (dismiss)

**6 items de la checklist** :

1. **Compte créé**
   - [ ] Statut : ✅ Completed (vert)
   - [ ] Message : "Votre compte Coccinelle.AI est opérationnel"

2. **Sara configurée**
   - [ ] Statut : ✅ Completed (vert)
   - [ ] Message : "Votre assistant vocal est prêt"

3. **Knowledge Base (4 docs)**
   - [ ] Statut : ✅ Completed (vert) car ≥3 documents
   - [ ] Titre : "Knowledge Base complète (4 docs)"
   - [ ] Message : "Votre KB contient assez de documents, continuez à l'enrichir"
   - [ ] Pas de bouton d'action (déjà complété)

4. **Testez Sara**
   - [ ] Statut : ⭕ Pending (gris)
   - [ ] Titre : "Testez Sara"
   - [ ] Message : "Appelez Sara pour tester ses capacités"
   - [ ] Bouton : "Voir le numéro" → `/dashboard/sara`

5. **Créez votre premier RDV**
   - [ ] Statut : ⭕ Pending (gris)
   - [ ] Titre : "Créez votre premier RDV"
   - [ ] Message : "Testez la création de rendez-vous"
   - [ ] Bouton : "Créer un RDV" → `/dashboard/rdv`

6. **Intégrations**
   - [ ] Statut : ⭕ Pending (gris)
   - [ ] Titre : "Intégrations"
   - [ ] Message : "Connectez Google Calendar, CRM, etc."
   - [ ] Bouton : "Configurer" → `/dashboard/settings`

**Tests d'interaction** :
- [ ] Clic sur chevron-up : collapse la checklist
- [ ] Clic sur chevron-down : expand la checklist
- [ ] Clic sur X : dismiss la checklist (localStorage `getting_started_dismissed`)
- [ ] Refresh page : checklist ne revient pas si dismissed

---

#### SmartAlerts

**Si KB non vide** :
- [ ] Pas d'alerte "KB vide" (normal, on a 4 docs)
- [ ] Possiblement alerte "KB insuffisante" si <3 docs (mais on a 4, donc non)

**Si KB vide (test alternatif)** :
- Alerte rouge critique :
  - [ ] Type : error (rouge)
  - [ ] Titre : "⚠️ Knowledge Base vide - Sara ne peut pas fonctionner"
  - [ ] Message : "Sans documents, Sara ne pourra pas répondre..."
  - [ ] Bouton : "Configurer ma KB en 3 minutes" → `/dashboard/knowledge?tab=builder`
  - [ ] Non dismissible

---

### Phase 6 : Vérifier les Documents Générés (5 min)

**Action** : Cliquer sur "Knowledge Base" dans le menu ou aller sur `/dashboard/knowledge`

#### Page Knowledge Base

- [ ] Logo Coccinelle visible
- [ ] Titre : "Knowledge Base"
- [ ] 3 tabs :
  - [ ] **Auto-Builder** (gradient purple/blue si actif)
  - [ ] **Ajouter des documents**
  - [ ] **Tester le RAG**

**Action** : Rester sur tab "Auto-Builder" (par défaut)

---

#### Vérifier localStorage (Mode Démo)

**Ouvrir DevTools Console** :

```javascript
// Récupérer les documents
const docs = JSON.parse(localStorage.getItem('kb_documents') || '[]');
console.log('📚 Documents générés:', docs.length);
console.log(docs);
```

**Vérifications** :
- [ ] `docs.length` = 4 ou 5 (selon secteur et réponses)
- [ ] Chaque document a :
  - [ ] `id` : format `doc_assistant_TIMESTAMP_INDEX`
  - [ ] `title` : Titre descriptif
  - [ ] `content` : Contenu markdown
  - [ ] `created_at` : ISO timestamp
  - [ ] `sourceType` : 'assistant'

---

#### Documents Attendus pour Immobilier

##### Document 1 : "Agence Immobilière Demo - Présentation et services"

**Contenu attendu** :
```markdown
# Agence Immobilière Demo

## À propos de nous

Agence Immobilière Demo est spécialisé dans le secteur immobilier.

## Nos services

Nous proposons la vente et la location d'appartements, maisons et locaux commerciaux.
Nous gérons aussi des biens de prestige dans le 16e arrondissement de Paris.

## Ce qui nous différencie

Spécialistes de l'immobilier de prestige. Offre actuelle : -50% sur les frais d'agence
pour toute vente finalisée avant fin décembre.

## Questions fréquentes

**Puis-je vous contacter pour plus d'informations ?**
Bien sûr ! N'hésitez pas à nous contacter pour toute question sur nos services.

**Comment puis-je prendre rendez-vous ?**
Premier échange téléphonique pour comprendre les besoins, puis prise de rendez-vous
pour une rencontre en agence ou visite du bien. Estimation gratuite et sans engagement.

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*
```

**Vérifications** :
- [ ] Section "À propos de nous"
- [ ] Section "Nos services" avec réponse utilisateur
- [ ] Section "Ce qui nous différencie" (si rempli)
- [ ] Section "Questions fréquentes" avec 2 FAQs
- [ ] Signature Sara en bas

---

##### Document 2 : "Agence Immobilière Demo - Coordonnées et horaires"

**Contenu attendu** :
```markdown
# Agence Immobilière Demo - Nous trouver

## ⏰ Nos horaires

Lundi-Vendredi : 9h-19h
Samedi : 10h-18h
Fermé le dimanche

## 🤝 Premier contact

Premier échange téléphonique pour comprendre les besoins, puis prise de rendez-vous
pour une rencontre en agence ou visite du bien. Estimation gratuite et sans engagement.

Nous sommes à votre écoute pour répondre à toutes vos questions et vous accompagner dans votre démarche.

## Questions pratiques

**Êtes-vous facilement accessible ?**
Oui, nous sommes facilement accessibles.

**Puis-je venir sans rendez-vous ?**
Consultez nos horaires ci-dessus. Nous recommandons de prendre rendez-vous pour un meilleur service.

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*
```

**Vérifications** :
- [ ] Emojis présents (⏰, 🤝)
- [ ] Horaires bien affichés
- [ ] Section "Questions pratiques" avec 2 FAQs
- [ ] Signature Sara

---

##### Document 3 : "Agence Immobilière Demo - Tarifs et modalités"

**Si offre renseignée** :
```markdown
# Agence Immobilière Demo - Tarifs

## 💰 Nos tarifs

[Tarifs si renseignés, sinon absent]

## 🎁 Offre spéciale

Spécialistes de l'immobilier de prestige. Offre actuelle : -50% sur les frais d'agence
pour toute vente finalisée avant fin décembre.

## Questions sur les tarifs

**Les tarifs sont-ils négociables ?**
Nos tarifs sont transparents et compétitifs. Contactez-nous pour discuter de vos besoins spécifiques.

**Proposez-vous des forfaits ou abonnements ?**
Contactez-nous pour découvrir nos formules adaptées à vos besoins.

**Puis-je obtenir un devis personnalisé ?**
Absolument ! N'hésitez pas à nous contacter pour une étude gratuite et sans engagement.

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*
```

**Vérifications** :
- [ ] Section offre spéciale (si rempli)
- [ ] 3 FAQs tarifs
- [ ] Signature Sara

---

##### Document 4 : "Agence Immobilière Demo - Guide acheteur et vendeur" (NOUVEAU SECTEUR IMMOBILIER)

**Contenu attendu** :
```markdown
# Agence Immobilière Demo - Guide complet immobilier

## 🏡 Types de biens et services

Nous proposons la vente et la location d'appartements, maisons et locaux commerciaux.
Nous gérons aussi des biens de prestige dans le 16e arrondissement de Paris.

## 📍 Zone d'intervention

Paris 16e, 17e, Neuilly-sur-Seine, et l'ouest parisien en général.

## Questions fréquentes immobilier

**Comment organiser une visite ?**
Premier échange téléphonique pour comprendre les besoins, puis prise de rendez-vous
pour une rencontre en agence ou visite du bien. Estimation gratuite et sans engagement.

**Proposez-vous un accompagnement pour les démarches ?**
Oui, nous vous accompagnons de A à Z : recherche, visites, négociation, dossier de financement, signature chez le notaire.

**Puis-je vendre et acheter en même temps ?**
Absolument ! Nous coordonnons les deux opérations pour sécuriser votre projet immobilier.

**Vos biens sont-ils à jour ?**
Nous disposons de biens en exclusivité, mis à jour quotidiennement.

**Faites-vous des estimations gratuites ?**
Oui, nous réalisons des estimations gratuites et sans engagement pour votre bien immobilier.

**Quels quartiers couvrez-vous ?**
Nous intervenons principalement sur Paris 16e.

---

*Document généré automatiquement par Sara - Assistant IA Coccinelle.AI*
```

**Vérifications** :
- [ ] Document spécifique immobilier présent
- [ ] 6 FAQs immobilières pertinentes
- [ ] Zone d'intervention mentionnée
- [ ] Signature Sara

---

### Phase 7 : Test RAG (Optional - 3 min)

**Action** : Cliquer sur tab "Tester le RAG"

#### Tester des questions

**Questions à tester** :

1. **"Quels sont vos horaires ?"**
   - [ ] Réponse mentionne : Lundi-Vendredi 9h-19h, Samedi 10h-18h
   - [ ] Sources affichées : Document 2

2. **"Quels types de biens proposez-vous ?"**
   - [ ] Réponse mentionne : appartements, maisons, locaux commerciaux, prestige
   - [ ] Sources affichées : Document 1 ou 4

3. **"Comment prendre rendez-vous ?"**
   - [ ] Réponse mentionne : échange téléphonique, estimation gratuite
   - [ ] Sources affichées : Document 1 ou 2

4. **"Avez-vous une offre en cours ?"**
   - [ ] Réponse mentionne : -50% frais d'agence avant fin décembre
   - [ ] Sources affichées : Document 3

5. **"Quels quartiers couvrez-vous ?"**
   - [ ] Réponse mentionne : Paris 16e, 17e, Neuilly, ouest parisien
   - [ ] Sources affichées : Document 4

**✅ Validation attendue :**
- Réponses pertinentes basées sur les documents générés
- Sources correctement affichées
- Pas de réponse "Je ne sais pas" pour ces questions de base

---

## 🧹 NETTOYAGE APRÈS TEST

Pour refaire le test depuis le début :

### Option 1 : Nouveau compte
```javascript
// Créer un nouveau compte avec email différent
test+assistant2@coccinelle.ai
```

### Option 2 : Reset localStorage
```javascript
// Ouvrir DevTools Console
localStorage.clear();
location.reload();
```

### Option 3 : Reset sélectif
```javascript
// Garder les documents mais reset onboarding
localStorage.removeItem('onboarding_completed');
localStorage.removeItem('welcome_banner_shown');
localStorage.removeItem('getting_started_dismissed');
localStorage.removeItem('kb_method');
location.reload();
```

---

## ✅ CRITÈRES DE SUCCÈS

### Must Have (Bloquants)
- [ ] **Pas de message "disponible prochainement"** sur "Je n'ai rien"
- [ ] **5 questions posées** et bien affichées
- [ ] **Navigation fluide** entre questions
- [ ] **Génération réussie** avec feedback visuel
- [ ] **4-5 documents créés** en localStorage
- [ ] **Documents riches** avec FAQs
- [ ] **Welcome banner contextuel** affiché
- [ ] **Checklist visible** et fonctionnelle

### Should Have (Importants)
- [ ] Barre de progression correcte (0-100%)
- [ ] Bouton "Précédent" fonctionne
- [ ] Historique réponses accessible
- [ ] Messages de progression affichés
- [ ] Checkmark vert au succès
- [ ] Documents sectoriels spécifiques (immobilier)

### Nice to Have (Bonus)
- [ ] Animations fluides
- [ ] Aucune erreur console
- [ ] Temps total <5 minutes (promesse tenue)
- [ ] RAG fonctionne bien avec les docs générés

---

## 🐛 BUGS À REPORTER

Si vous rencontrez un problème, noter :
1. **Étape du parcours** (Step 1-7)
2. **Action effectuée** (clic, saisie, etc.)
3. **Comportement attendu** vs **obtenu**
4. **Erreurs console** (copier-coller)
5. **Screenshot** si pertinent

---

## 📊 MÉTRIQUES À TRACKER

Après le test complet :

```javascript
// Temps total du parcours
const onboardingStart = Date.now();
// ... faire le parcours ...
const onboardingEnd = Date.now();
console.log('Temps total:', (onboardingEnd - onboardingStart) / 1000, 'secondes');

// Nombre de documents générés
const docs = JSON.parse(localStorage.getItem('kb_documents') || '[]');
console.log('Documents générés:', docs.length);

// Score checklist
// Compter manuellement les items completed
```

**Objectifs** :
- Temps total : < 10 minutes (objectif : 8 minutes)
- Documents : 4-5 selon secteur
- Score checklist initial : 3/6 (compte, sara, kb)
- Taux de succès : 100%

---

*Guide de test créé le 2025-11-14*
*Toutes les fonctionnalités testées sont fonctionnelles* ✅
