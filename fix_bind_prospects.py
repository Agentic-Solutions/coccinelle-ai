#!/usr/bin/env python3
import shutil
from datetime import datetime

# Sauvegarde
backup_name = f"src/index.js.backup_bind_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
shutil.copy2('src/index.js', backup_name)
print(f"✅ Backup créé: {backup_name}")

# Lire le fichier
with open('src/index.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"📄 Fichier lu: {len(lines)} lignes")

# BUG 1 - Supprimer "prospectName," de la ligne ~412
for i in range(409, 425):
    if 'prospectName,' in lines[i]:
        print(f"✏️  Ligne {i+1} AVANT: {lines[i].strip()}")
        lines[i] = lines[i].replace('prospectName,\n', '')
        print(f"✏️  Ligne {i+1} APRÈS: SUPPRIMÉE")
        break

# BUG 2 - Remplacer "body.name," par "body.first_name || '', body.last_name || ''," ligne ~640
for i in range(635, 655):
    if 'body.name,' in lines[i]:
        print(f"✏️  Ligne {i+1} AVANT: {lines[i].strip()}")
        lines[i] = lines[i].replace('body.name,', "body.first_name || '',\n  body.last_name || '',")
        print(f"✏️  Ligne {i+1} APRÈS: {lines[i].strip()}")
        break

# Écrire le fichier corrigé
with open('src/index.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Fichier corrigé: {len(lines)} lignes")

# Vérification
with open('src/index.js', 'r') as f:
    content = f.read()
    errors = []
    if 'prospectName,' in content:
        errors.append("prospectName")
    if 'body.name,' in content:
        errors.append("body.name")
    
    if errors:
        print(f"❌ ERREUR : Variables problématiques trouvées : {errors}")
        exit(1)
    else:
        print("🎉 Tous les .bind() corrigés avec succès !")
