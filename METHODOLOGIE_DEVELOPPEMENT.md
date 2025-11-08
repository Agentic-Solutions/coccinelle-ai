# METHODOLOGIE DEVELOPPEMENT
Voir fichier pour details

---

## 📊 RÈGLE TOKENS (CRITIQUE)

**OBLIGATOIRE à CHAQUE réponse de Claude :**

À la fin de chaque réponse, Claude DOIT afficher :
```
📊 Tokens : X / 190,000 (Y% restants)
```

**Pourquoi ?**
- Éviter dépassement limite
- Planifier fin de session
- Optimiser continuité

**Format exact :**
```markdown
## 📊 Tokens
**Usage :** 100,567 / 190,000  
**Restants :** 89,433 (47%)
```

cd ~/match-immo-mcp/coccinelle-ai && cat >> METHODOLOGIE_DEVELOPPEMENT.md << 'ENDOFFILE'

---

## 🚨 CONSIGNES STRICTES UTILISATEUR

### 1. TOKENS OBLIGATOIRES
**À CHAQUE réponse, Claude DOIT afficher :**
```
## 📊 Tokens
**Usage :** X / 190,000
**Restants :** Y (Z%)
```

### 2. COMMANDES UNIQUES SANS COMMENTAIRES
- ❌ JAMAIS de commentaires dans les blocs de commandes
- ✅ TOUJOURS une seule ligne avec `&&`
- ✅ Format : `cd DIR && backup && action && verify && git && status`

### 3. PAS DE CONFIRMATIONS INTERMÉDIAIRES
- Claude donne la commande complète directement
- Pas de "Veux-tu que je..." entre les étapes
- L'utilisateur lance et montre le résultat

### 4. DÉVELOPPEUR DÉBUTANT
- Toujours expliquer clairement
- Pas à pas détaillé
- Vérifications systématiques

### 5. ARCHITECTURE PARFAITE D'ABORD
- Privilégier la qualité du code
- Modularité et propreté
- Moins de manipulations possibles

