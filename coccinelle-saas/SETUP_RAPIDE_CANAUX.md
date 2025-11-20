# 🚀 SETUP RAPIDE - CANAUX OPÉRATIONNELS EN 15 MINUTES
**Date**: 2025-11-14
**Status**: Routes API créées ✅ | Reste: Configuration clés API

---

## ✅ **CE QUI EST DÉJÀ FAIT**

- ✅ **4 routes API opérationnelles** (SMS, Email, WhatsApp, Orchestrator)
- ✅ **Page de test** connectée aux vraies API
- ✅ **Page de préférences** pour les utilisateurs
- ✅ **33 templates** prêts à l'emploi
- ✅ **Orchestrator intelligent** avec 9 critères de routage
- ✅ **3 675 lignes de code** production-ready

---

## ⏱️ **TEMPS ESTIMÉ: 15 MINUTES**

### Étape 1️⃣ : Copier le fichier d'environnement (30 secondes)

```bash
# Dans le dossier coccinelle-saas/
cp .env.local.example .env.local
```

---

### Étape 2️⃣ : Créer un compte Twilio (5 min) - SMS + WhatsApp

#### A. Inscription
1. Aller sur https://www.twilio.com/try-twilio
2. S'inscrire (email + téléphone)
3. **$15 de crédit gratuit** offerts ! 🎉

#### B. Obtenir les clés
1. Aller sur https://console.twilio.com
2. Copier **Account SID** et **Auth Token**
3. Coller dans `.env.local` :
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
   ```

#### C. Obtenir un numéro de téléphone
1. Console → **Phone Numbers** → **Buy a number**
2. Choisir France (+33) ou autre pays
3. Acheter le numéro (~1€/mois, débité sur crédit gratuit)
4. Copier le numéro dans `.env.local` :
   ```env
   TWILIO_PHONE_NUMBER=+33xxxxxxxxx
   ```

#### D. Activer WhatsApp Sandbox (optionnel, pour tests)
1. Console → **Messaging** → **Try it out** → **Try WhatsApp**
2. Scanner le QR code avec WhatsApp
3. Envoyer le code d'activation (ex: "join abc-def")
4. Copier le numéro sandbox dans `.env.local` :
   ```env
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

---

### Étape 3️⃣ : Créer un compte Resend (5 min) - Email

#### A. Inscription
1. Aller sur https://resend.com/signup
2. S'inscrire (email uniquement)
3. **3000 emails/mois gratuits** ! 🎉

#### B. Obtenir la clé API
1. Dashboard → **API Keys**
2. Créer une clé → **Create API Key**
3. Copier la clé dans `.env.local` :
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   FROM_EMAIL=noreply@votre-domaine.com
   FROM_NAME=Votre Entreprise
   ```

#### C. Vérifier un domaine (optionnel, pour production)
Pour l'instant, vous pouvez utiliser `onboarding@resend.dev` comme FROM_EMAIL pour tester.

---

### Étape 4️⃣ : Tester ! (2 min)

```bash
# 1. Relancer le serveur si besoin
npm run dev

# 2. Ouvrir dans le navigateur
http://localhost:3000/dashboard/test-channels

# 3. Sélectionner un canal et envoyer !
```

---

## 🎯 **RÉSULTAT ATTENDU**

### Avec les clés API configurées :

**Test SMS** :
```
✅ SMS
Message envoyé avec succès
Envoyé au +33612345678
De: +33xxxxxxxxx
ID: SM123abc...
```

**Test Email** :
```
✅ Email
Email envoyé avec succès
Envoyé à test@example.com
Sujet: Message de test Coccinelle.AI
ID: abc123def...
```

**Test Auto (Orchestrator)** :
```
✅ Orchestrator
Canal choisi: EMAIL
Préférence utilisateur; Email très coût-efficace; Message long
Confidence: 75%
Coût: 0.0006€
Délai: 60s

✅ EMAIL
Message envoyé via email
ID: xyz789...
Statut: queued
```

---

### Sans les clés API (erreur claire) :

```
❌ SMS
Twilio credentials not configured.
Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env.local
```

---

## 💰 **COÛTS RÉELS**

### Avec les comptes gratuits :

| Service | Plan Gratuit | Coût Test (50 messages) |
|---------|--------------|------------------------|
| **Twilio SMS** | $15 crédit | ~2.50€ (50 SMS) |
| **Resend Email** | 3000/mois | Gratuit |
| **WhatsApp Sandbox** | Illimité | Gratuit |
| **Total** | | ~2.50€ ou moins |

Le crédit Twilio de $15 permet d'envoyer environ **300 SMS** !

---

## 🧪 **SCÉNARIOS DE TEST RECOMMANDÉS**

### Test 1 : SMS Simple
```
Canal: SMS
Téléphone: VOTRE numéro
Message: "Test SMS Coccinelle.AI - ça marche !"
→ Vous devriez recevoir le SMS en ~10 secondes
```

### Test 2 : Email avec HTML
```
Canal: Email
Email: VOTRE email
Message: "Test Email Coccinelle.AI

Ceci est un test avec plusieurs lignes.

Merci !"
→ Vous devriez recevoir l'email en ~1 minute
```

### Test 3 : Orchestrator Intelligent
```
Canal: Auto
Téléphone: VOTRE numéro
Email: VOTRE email
Message: "Message de test long pour voir quel canal l'Orchestrator va choisir. Ceci est un message avec plusieurs phrases pour dépasser 160 caractères et voir la décision du système."
→ L'Orchestrator devrait choisir Email (coût optimal, message long)
```

### Test 4 : WhatsApp Sandbox
```
Canal: WhatsApp
Téléphone: VOTRE numéro (qui a rejoint le sandbox)
Message: "Test WhatsApp Coccinelle.AI 🚀"
→ Vous devriez recevoir sur WhatsApp en ~30 secondes
```

---

## 🐛 **TROUBLESHOOTING**

### Erreur : "Twilio credentials not configured"
➡️ Vérifiez que `.env.local` contient bien `TWILIO_ACCOUNT_SID` et `TWILIO_AUTH_TOKEN`
➡️ Redémarrez le serveur : `npm run dev`

### Erreur : "Email provider not configured"
➡️ Vérifiez que `.env.local` contient bien `RESEND_API_KEY`
➡️ Redémarrez le serveur : `npm run dev`

### Erreur Twilio : "The 'From' number is not a valid phone number"
➡️ Vérifiez le format : `+33xxxxxxxxx` (avec le +)
➡️ Vérifiez que le numéro est bien acheté dans votre compte Twilio

### Erreur Twilio : "The number is not verified"
➡️ En mode trial, vous devez vérifier les numéros destinataires
➡️ Console → **Phone Numbers** → **Verified Caller IDs** → Ajouter votre numéro

### Email non reçu
➡️ Vérifiez les spams
➡️ Vérifiez que `FROM_EMAIL` est valide
➡️ Pour tester, utilisez `onboarding@resend.dev` comme FROM_EMAIL

### WhatsApp ne fonctionne pas
➡️ Vérifiez que vous avez rejoint le sandbox (envoi du code "join xxx")
➡️ Le numéro sandbox expire après 72h d'inactivité
➡️ Ré-envoyez le code pour réactiver

---

## 📊 **DASHBOARD DE MONITORING**

### Twilio
- Console → **Monitor** → **Logs** → **Messages**
- Voir tous les SMS/WhatsApp envoyés
- Statuts de livraison en temps réel

### Resend
- Dashboard → **Emails**
- Voir tous les emails envoyés
- Taux d'ouverture, clics, bounces

---

## 🎓 **PROCHAINES ÉTAPES**

Une fois que tout fonctionne :

### Court Terme
- [ ] Tester les 4 canaux (SMS, Email, WhatsApp, Auto)
- [ ] Personnaliser les templates (33 disponibles)
- [ ] Configurer les préférences utilisateur
- [ ] Tester l'Inbox unifiée

### Moyen Terme
- [ ] Acheter un numéro WhatsApp Business (production)
- [ ] Vérifier un domaine sur Resend (branding)
- [ ] Créer des templates personnalisés
- [ ] Intégrer avec la base de données

### Long Terme
- [ ] Automatiser les rappels RDV
- [ ] Analytics et métriques
- [ ] A/B testing des messages
- [ ] IA pour réponses automatiques

---

## 🎉 **RÉCAP EXPRESS**

```bash
# 1. Copier le fichier d'environnement
cp .env.local.example .env.local

# 2. Créer comptes Twilio + Resend (10 min)
# - Twilio: https://www.twilio.com/try-twilio
# - Resend: https://resend.com/signup

# 3. Copier les clés dans .env.local

# 4. Relancer le serveur
npm run dev

# 5. Tester !
http://localhost:3000/dashboard/test-channels
```

**Temps total : 15 minutes**
**Coût : $0 (crédits gratuits suffisent)**
**Résultat : Canaux opérationnels comme les agents voix !** 🚀

---

## 📞 **BESOIN D'AIDE ?**

- Documentation complète : `GUIDE_UTILISATION_CANAUX.md`
- Module SMS : `MODULE_SMS_COMPLETE.md`
- Module Email : `MODULE_EMAIL_COMPLETE.md`
- Module WhatsApp : `MODULE_WHATSAPP_COMPLETE.md`
- Orchestrator : `MODULE_ORCHESTRATOR_COMPLETE.md`

---

*Guide de setup rapide créé le 2025-11-14*
*Ready to go!* ✅
