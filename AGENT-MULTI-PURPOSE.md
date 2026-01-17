# Agent Multi-Purpose - Documentation

## 🎯 Objectif

Permettre à un **seul agent** de gérer **plusieurs types de demandes** sans avoir besoin de créer plusieurs agents distincts.

---

## ✅ Implémenté le 18 Décembre 2025

### Nouveau Type d'Agent: `multi_purpose`

**Nom**: Agent Polyvalent
**Description**: Agent capable de gérer plusieurs types de demandes (RDV, support, recherche)
**Icône**: Sparkles ✨

---

## 🛠️ Capacités de l'Agent Multi-Purpose

### 1. Détection Automatique d'Intention

L'agent analyse les mots-clés du client pour identifier son besoin:

#### Intention: RENDEZ-VOUS
**Mots-clés**: "rendez-vous", "rdv", "visite", "réserver", "planifier", "voir", "venir"

**Comportement**:
1. Demande nom + email (requis)
2. Propose une date/heure
3. Utilise `bookAppointment()`
4. Confirme la réservation

#### Intention: SUPPORT CLIENT
**Mots-clés**: "problème", "question", "aide", "bug", "panne", "réclamation", "ne fonctionne pas"

**Comportement**:
1. Écoute le problème
2. Cherche dans la KB avec `searchKnowledgeBase()`
3. Si solution → explique
4. Si pas de solution → crée ticket avec `createTicket()`

#### Intention: RECHERCHE PRODUIT
**Mots-clés**: "cherche", "trouve", "disponible", "prix", "acheter", "louer"

**Comportement**:
1. Collecte critères (ville, budget, type)
2. Utilise `searchProducts()`
3. Présente résultats UN PAR UN
4. Propose RDV si intéressé

#### Intention: INFORMATION
**Mots-clés**: "horaires", "adresse", "contact", "informations"

**Comportement**:
1. Cherche dans KB si disponible
2. Répond de façon concise
3. Propose autres services

---

## 🔧 Outils Disponibles

L'agent multi-purpose a accès à **4 outils**:

1. **`searchProducts`** - Recherche de produits/biens
2. **`bookAppointment`** - Prise de rendez-vous
3. **`searchKnowledgeBase`** - Recherche dans la base de connaissance
4. **`createTicket`** - Création de ticket support

---

## 💬 Exemples de Conversations

### Exemple 1: Prise de Rendez-Vous

```
Client: Bonjour, je voudrais prendre rendez-vous
Sara: Bonjour, Sara de Nestenn Toulouse Rangueil. Bien sûr, puis-je avoir votre nom complet ?

Client: Jean Dupont
Sara: Merci Jean. Quelle est votre adresse email ?

Client: jean@example.com
Sara: Parfait. Je vous propose demain à 14h, cela vous convient ?

Client: Oui
Sara: [Utilise bookAppointment()] Votre rendez-vous est confirmé pour demain 14h. À bientôt !
```

### Exemple 2: Support Client

```
Client: Bonjour, j'ai un problème avec mon dossier
Sara: Bonjour, Sara de Nestenn Toulouse Rangueil. Je vous écoute, quel est le problème ?

Client: Je n'arrive pas à accéder à mes documents
Sara: [Utilise searchKnowledgeBase("accès documents")]
Sara: Pour accéder à vos documents, connectez-vous sur notre portail client...

Client: Ça ne fonctionne toujours pas
Sara: [Utilise createTicket()] Je crée un ticket support. Un conseiller vous contactera sous 24h.
```

### Exemple 3: Recherche Produit

```
Client: Bonjour, je cherche un appartement
Sara: Bonjour, Sara de Nestenn Toulouse Rangueil. Dans quelle ville ?

Client: Toulouse
Sara: Quel est votre budget ?

Client: 300 000 euros
Sara: Combien de pièces minimum ?

Client: 3 pièces
Sara: [Utilise searchProducts()] Nous avons 5 biens disponibles. Voici un T3 à 295 000€...

Client: Ça m'intéresse
Sara: Souhaitez-vous prendre rendez-vous pour le visiter ?
```

---

## 📋 Configuration dans l'Onboarding

### Option 1: Sélection Directe
Le client sélectionne "Agent Polyvalent" directement dans la liste des types.

### Option 2: Sélection Multiple (À IMPLÉMENTER)
Le client coche plusieurs cases:
- [x] Prise de rendez-vous
- [x] Support client
- [ ] Recherche produits

→ Le système crée automatiquement un agent `multi_purpose`.

---

## 🔍 Avantages vs Inconvénients

### ✅ Avantages

1. **Un seul numéro de téléphone** - Simplicité pour le client
2. **Un seul agent à gérer** - Moins de configuration
3. **Transition naturelle** - Peut passer d'un mode à l'autre dans la même conversation
4. **Coût réduit** - Un seul appel API Claude par conversation
5. **Rapide à déployer** - Pas besoin d'architecture complexe

### ❌ Inconvénients

1. **Moins spécialisé** - Pas aussi performant qu'un agent dédié
2. **Confusion possible** - Si demande ambiguë
3. **Un seul system prompt** - Compromis entre tous les rôles
4. **Pas de transfert** - Ne peut pas passer la main à un expert

---

## 🚀 Cas d'Usage Recommandés

### Idéal pour:
- PME avec volume d'appels moyen (< 100/jour)
- Business avec besoin de flexibilité
- Clients cherchant simplicité et coût réduit
- Demandes variées mais pas ultra-spécialisées

### Pas idéal pour:
- Grande entreprise avec volume élevé
- Besoin de très haute spécialisation
- Support technique complexe
- Plusieurs départements distincts

---

## 📊 Métriques à Suivre

Pour évaluer l'efficacité de l'agent multi-purpose:

1. **Taux de détection d'intention correcte** - L'agent identifie-t-il bien le besoin?
2. **Taux de complétion de tâche** - RDV pris, ticket créé, question répondue?
3. **Satisfaction client** - Feedback après interaction
4. **Temps de résolution** - Combien de tours de conversation?
5. **Taux de transfert humain** - Combien de fois l'agent doit-il escalader?

---

## 🔮 Évolution Future: Multi-Agents avec Routing

### Architecture cible (TODO futur)

```
Appel entrant
    ↓
IVR: "Appuyez 1 pour RDV, 2 pour Support, 3 pour Info"
    ↓
    ├─→ [1] Agent Prise de RDV (spécialisé 100% RDV)
    ├─→ [2] Agent Support (spécialisé 100% SAV)
    └─→ [3] Agent Info (spécialisé 100% renseignements)
```

**Ou avec détection d'intention intelligente**:
```
Appel entrant
    ↓
Agent Orchestrateur (écoute 1-2 phrases)
    ↓
Détection intention + confiance
    ↓
    ├─→ [Confiance > 80%] Route directement vers agent spécialisé
    └─→ [Confiance < 80%] Reste sur multi-purpose
```

### Tables nécessaires (non créées pour l'instant)

```sql
-- Routing rules
CREATE TABLE omni_routing_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_config_id TEXT NOT NULL,
  priority INTEGER DEFAULT 0,

  -- Conditions
  phone_number TEXT,
  ivr_selection TEXT,
  intent_keywords TEXT,  -- JSON
  time_conditions TEXT,  -- JSON

  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (agent_config_id) REFERENCES omni_agent_configs(id)
);

-- Agent roles (pour différencier les agents d'un même tenant)
ALTER TABLE omni_agent_configs ADD COLUMN agent_role TEXT;
-- Ex: 'primary', 'appointments', 'support', 'info'
```

### Logique de transfert

```javascript
// Pendant une conversation
if (intentConfidence < 0.7) {
  // Demander clarification
  "Je ne suis pas sûr de comprendre, souhaitez-vous prendre rendez-vous ou avez-vous une question ?"
}

if (needsTransfer) {
  // Trouver l'agent approprié
  const targetAgent = await findAgentByRole(tenantId, 'support');

  // Transférer la conversation
  await transferConversation(currentConversationId, targetAgent.id);

  // Nouveau greeting du nouvel agent
  "Bonjour, je suis Marc du service support. J'ai bien reçu votre demande concernant..."
}
```

---

## 📝 Notes d'Implémentation

### Fichiers modifiés

1. **`/src/modules/omnichannel/templates/agent-types.js`**
   - Ajout de `multi_purpose` avec system prompt complet
   - 4 outils: searchProducts, bookAppointment, searchKnowledgeBase, createTicket
   - Workflow: greet → identify_intent → route → handle → offer_help → end

2. **`/coccinelle-saas/src/components/onboarding/SaraConfigStep.jsx`**
   - Ajout de l'icône `Sparkles` pour multi_purpose
   - Mapping dans ICON_MAP

3. **Déploiement**
   - Version: `e7d7d435-7521-4808-84ed-82fb5cd6fac0`
   - Date: 18 décembre 2025

### Test de l'API

```bash
curl -s https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/onboarding/agent-types | \
  jq '.agent_types[] | select(.id == "multi_purpose")'
```

Résultat:
```json
{
  "id": "multi_purpose",
  "name": "Agent Polyvalent",
  "description": "Agent capable de gérer plusieurs types de demandes (RDV, support, recherche)",
  "tools": ["searchProducts", "bookAppointment", "searchKnowledgeBase", "createTicket"]
}
```

---

## ✅ Prochaines Étapes

1. **Tester** l'agent multi-purpose en conditions réelles
2. **Mesurer** les métriques de performance
3. **Affiner** le system prompt selon feedback
4. **Évaluer** si besoin de passer à l'architecture multi-agents

---

**Document créé le**: 18 décembre 2025
**Version**: 1.0
**Status**: ✅ Implémenté et déployé
