# Scripts de narration vocale pour ElevenLabs

Ces textes doivent être convertis en fichiers audio avec ElevenLabs pour la démonstration interactive.

## Configuration recommandée ElevenLabs
- **Voix**: Choisir une voix professionnelle française (ex: "Antoine", "Charlotte")
- **Style**: Clair, dynamique, professionnel
- **Vitesse**: Normale à légèrement rapide
- **Format**: MP3, 128kbps minimum

---

## Étape 1 - Base de connaissance
**Fichier**: `step-1-knowledge-base.mp3`

**Texte**:
```
L'IA apprend vos produits, services et expertise en crawlant votre site, en lisant vos documents, ou via création manuelle de contenu personnalisé.
```

---

## Étape 2 - Multi-canal
**Fichier**: `step-2-multi-channel.mp3`

**Texte**:
```
Téléphone, SMS, WhatsApp, Email : tous vos canaux de communication client centralisés en un seul endroit.
```

---

## Étape 3 - Conversations IA
**Fichier**: `step-3-conversations.mp3`

**Texte**:
```
L'IA comprend chaque demande, répond avec le bon niveau de détail, et peut basculer de canal si nécessaire. Que ce soit par appel, SMS, WhatsApp ou Email.
```

---

## Étape 4 - CRM intégré
**Fichier**: `step-4-crm.mp3`

**Texte**:
```
Chaque appel, SMS ou message crée automatiquement un contact qualifié avec son score, ses intérêts, et tout l'historique des échanges.
```

---

## Étape 5 - Gestion de RDV
**Fichier**: `step-5-appointments.mp3`

**Texte**:
```
L'IA planifie les rendez-vous selon vos disponibilités, envoie les rappels automatiques 24h avant, et confirme par SMS ou Email.
```

---

## Étape 6 - Analytics
**Fichier**: `step-6-analytics.mp3`

**Texte**:
```
Tableaux de bord en temps réel pour suivre vos conversions, comparer les canaux, et identifier les opportunités d'amélioration.
```

---

## Instructions d'intégration

### Après génération des fichiers audio:

1. Créer le dossier `/public/audio/` dans le projet
2. Y placer les 6 fichiers MP3 générés
3. Mettre à jour le fichier `OnboardingAnimation.tsx` en remplaçant chaque `audioUrl: undefined` par:
   ```typescript
   audioUrl: '/audio/step-X-xxx.mp3'
   ```

### Exemple de remplacement:
```typescript
// Avant
audioUrl: undefined

// Après
audioUrl: '/audio/step-1-knowledge-base.mp3'
```

### URLs finales à utiliser:
- Étape 1: `/audio/step-1-knowledge-base.mp3`
- Étape 2: `/audio/step-2-multi-channel.mp3`
- Étape 3: `/audio/step-3-conversations.mp3`
- Étape 4: `/audio/step-4-crm.mp3`
- Étape 5: `/audio/step-5-appointments.mp3`
- Étape 6: `/audio/step-6-analytics.mp3`
