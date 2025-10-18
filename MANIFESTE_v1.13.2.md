
---

## 📂 ACCÈS RAPIDE AU CODE

### Fichier Principal Backend
```bash
# Ouvrir le fichier principal
code src/index.js
# OU
nano src/index.js

# Voir le nombre de lignes
wc -l src/index.js
# Résultat attendu: 1541 src/index.js
```

### Fichiers de Backup
```bash
# Backup avant Phase 2
src/index.js.old (1389 lignes)
src/index.js.backup-avant-phase2 (1389 lignes)

# Fichier fonctions crawler original
src/crawler-functions.js (si existant)
```

### Vérifications Rapides
```bash
# Vérifier que les 8 fonctions crawler sont présentes
grep -c "function extractTextFromHTML\|function crawlWebsite" src/index.js
# Résultat attendu: 1

# Vérifier les 3 routes knowledge
grep "knowledge/crawl\|knowledge/documents" src/index.js
# Doit afficher les 3 routes

# Voir les dernières lignes (export)
tail -10 src/index.js
```

### Structure Projet
```
~/match-immo-mcp/coccinelle-ai/
├── src/
│   └── index.js (1541 lignes) ← FICHIER PRINCIPAL
├── database/
│   ├── schema-knowledge-v2-fixed.sql
│   └── seed-knowledge-v2-fixed.sql
├── MANIFESTE_v1.13.2.md
└── README.md
```

