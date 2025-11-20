# 📋 Comment fonctionne le système de paramétrage des disponibilités

## 🎯 Vue d'ensemble

Le système de paramétrage permet à votre entreprise de gérer les disponibilités de toute l'équipe (managers et agents) pour que Sara puisse proposer les bons créneaux de rendez-vous aux prospects.

## 🔄 Le Flow Complet

```
1. ÉQUIPE → 2. CALENDRIERS → 3. DISPONIBILITÉS → 4. CRÉNEAUX PROPOSÉS PAR SARA
```

### Étape 1: Gestion de l'équipe 👥

**Où:** Settings → Équipe

**Ce que ça fait:**
- Le manager crée les comptes pour chaque agent commercial
- Chaque membre a un rôle: `Manager` ou `Agent`
- Chaque membre peut être `Actif`, `Inactif` ou `En attente`

**Exemple:**
```
Équipe:
- Jean (Manager) - Actif
- Marie (Agent) - Actif
- Pierre (Agent) - Actif
- Sara (Agent IA) - Actif
```

---

### Étape 2: Synchronisation des calendriers 🗓️

**Où:** Settings → Calendriers

**Ce que ça fait:**
- Chaque membre peut connecter son calendrier professionnel existant
- 4 options disponibles:
  - **Google Calendar** (OAuth)
  - **Outlook/Microsoft 365** (OAuth)
  - **Apple Calendar** (CalDAV)
  - **Calendrier interne Coccinelle**

**Synchronisation bidirectionnelle:**
- ✅ **Activée**: Sara peut créer des RDV dans votre calendrier ET lire vos événements existants
- ⏱️ **Automatique**: Synchronise toutes les 15 minutes
- ⚠️ **Gestion des conflits**: Si un créneau est occupé dans votre calendrier, Sara ne le proposera JAMAIS

**Exemple:**
```
Marie a connecté son Google Calendar
→ Sara voit que Marie a une réunion mercredi 14h-15h
→ Sara ne proposera JAMAIS mercredi 14h-15h pour Marie
```

---

### Étape 3: Configuration des disponibilités ⏰

**Où:** Settings → Disponibilités

**Ce que ça fait:**
- Définir les horaires de travail pour chaque membre de l'équipe
- Configurer les paramètres des RDV (durée, temps de battement)
- Ajouter des périodes d'absence (vacances, congés)

**Sélection du membre:**
Vous choisissez pour qui vous configurez les disponibilités:
```
[Vous (Manager)] [Sara (Agent IA)] [Agent Commercial 1]
     ✓ Actif
```

**Horaires par jour:**
```
Lundi:     09:00-12:00 | 14:00-18:00
Mardi:     09:00-12:00 | 14:00-18:00
Mercredi:  09:00-12:00 | 14:00-18:00
Jeudi:     09:00-12:00 | 14:00-18:00
Vendredi:  09:00-12:00 | 14:00-16:00
Samedi:    ❌ Désactivé
Dimanche:  ❌ Désactivé
```

**Paramètres des RDV:**
- **Durée:** 30 minutes, 1 heure, etc.
- **Temps de battement:** 10 minutes entre chaque RDV (pour prendre des notes)
- **RDV max/jour:** 10 rendez-vous maximum par jour

**Périodes d'absence:**
```
🏖️ Vacances d'été: 01/08/2025 → 15/08/2025
🏥 Formation: 10/09/2025 → 12/09/2025
```

---

### Étape 4: Sara propose les créneaux 🤖

**Comment Sara calcule les créneaux disponibles:**

```javascript
Pour chaque agent:
  ✅ Est actif
  ✅ Horaires de travail configurés
  ✅ Calendrier externe synchronisé (si connecté)
  ✅ Pas de période d'absence
  ✅ Pas d'événement dans le calendrier externe
  ✅ Respect du temps de battement
  ✅ Max RDV/jour pas atteint

→ CRÉNEAU DISPONIBLE ✅
```

**Exemple concret:**

Un prospect appelle Sara le **lundi 10h30**:

```
Sara analyse:

Agent: Marie
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Statut: Actif
✅ Calendrier: Google Calendar connecté
✅ Horaires lundi: 09:00-12:00 | 14:00-18:00

Créneaux théoriques lundi:
🔴 09:00-09:30  → Réunion équipe (calendrier Google)
🔴 09:30-10:00  → Temps de battement après réunion
✅ 10:00-10:30  → LIBRE ✓
✅ 10:30-11:00  → LIBRE ✓
✅ 11:00-11:30  → LIBRE ✓
🔴 11:30-12:00  → RDV déjà pris par Sara
🔴 14:00-14:30  → Déjeuner client (calendrier Google)
✅ 14:30-15:00  → LIBRE ✓
✅ 15:00-15:30  → LIBRE ✓
...
```

Sara propose au prospect:
> "Je peux vous proposer aujourd'hui à **10h00**, **10h30**, **11h00**, ou cet après-midi à **14h30**, **15h00**..."

---

## 🔒 Sécurité & Confidentialité

### Ce que Sara voit:
- ✅ Plages horaires disponibles/occupées
- ✅ Durée des événements

### Ce que Sara ne voit PAS:
- ❌ Titre de vos événements
- ❌ Participants aux réunions
- ❌ Contenu des rendez-vous
- ❌ Localisation des événements

**Exemple:**
```
Votre calendrier Google:
"Rendez-vous confidentiel avec avocat - Divorce" 15:00-16:00

Ce que Sara reçoit:
"Occupé" 15:00-16:00

→ Sara ne proposera jamais ce créneau mais ne sait pas pourquoi!
```

---

## 📊 Cas d'usage réels

### Cas 1: Agent avec calendrier externe
```
Agent: Pierre
Calendrier: Outlook synchronisé

→ Pierre utilise Outlook pour TOUS ses RDV
→ Sara lit Outlook en temps réel
→ Quand Sara prend un RDV, il apparaît dans Outlook de Pierre
→ Pierre n'a qu'un seul calendrier à gérer!
```

### Cas 2: Agent sans calendrier externe
```
Agent: Sophie
Calendrier: Aucun (utilise calendrier interne)

→ Sophie configure ses horaires dans Coccinelle
→ Sara propose uniquement sur ces horaires
→ Les RDV pris par Sara sont visibles dans Coccinelle
→ Sophie gère tout depuis Coccinelle
```

### Cas 3: Équipe mixte
```
Manager Jean: Google Calendar
Agent Marie: Outlook
Agent Pierre: Calendrier interne
Sara (IA): Calendrier interne (toujours disponible)

→ Sara peut proposer des créneaux pour N'IMPORTE qui
→ Chacun garde son outil favori
→ Tout est synchronisé automatiquement
```

---

## ⚙️ Paramètres avancés

### Gestion des conflits

**Blocage préventif** (recommandé: ✅ Activé)
```
RDV pris: 14:00-14:30

Avec blocage préventif:
🔴 13:45-14:00  → Bloqué (arrive 15 min avant)
🔴 14:00-14:30  → RDV
🔴 14:30-14:45  → Bloqué (part 15 min après)

→ Évite les RDV back-to-back impossibles
```

**Notification de conflits**
```
Si Sara détecte:
- Un créneau réservé 2 fois
- Un événement qui chevauche
- Une incohérence

→ Le manager reçoit une alerte immédiate
```

---

## 🚀 Quick Start

Pour démarrer rapidement:

1. **Créer l'équipe** (5 min)
   - Inviter vos agents
   - Assigner les rôles

2. **Connecter les calendriers** (10 min/personne)
   - Google: Cliquer → Autoriser → OK
   - Outlook: Cliquer → Autoriser → OK

3. **Configurer les disponibilités** (5 min/personne)
   - Horaires de travail
   - Durée des RDV
   - Périodes d'absence

4. **Tester** (2 min)
   - Appeler votre numéro Sara
   - Demander un RDV
   - Vérifier qu'il apparaît dans votre calendrier

✅ **C'est prêt!**

---

## ❓ FAQ

**Q: Que se passe-t-il si je modifie un événement dans mon Google Calendar?**
R: Sara synchronise toutes les 15 minutes. Dans les 15 minutes, elle ne proposera plus ce créneau.

**Q: Puis-je bloquer Sara sur certains créneaux sans tout désactiver?**
R: Oui! Créez un événement "Bloqué" dans votre calendrier externe. Sara le verra comme occupé.

**Q: Sara peut-elle annuler des RDV?**
R: Non, seul le manager peut annuler. Sara peut proposer un autre créneau si le prospect demande.

**Q: Comment Sara choisit quel agent proposer?**
R: Sara propose les premiers créneaux disponibles, tous agents confondus. Vous pouvez configurer des préférences (coming soon).

**Q: Puis-je avoir des horaires différents par semaine?**
R: Pour l'instant non. Utilisez les "Périodes d'absence" pour des exceptions ponctuelles.

---

## 📞 Support

Besoin d'aide? Contactez le support Coccinelle.AI
