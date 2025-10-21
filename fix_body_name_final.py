#!/usr/bin/env python3
import shutil
from datetime import datetime

# Sauvegarde
backup_name = f"src/index.js.backup_final_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
shutil.copy2('src/index.js', backup_name)
print(f"✅ Backup créé: {backup_name}")

# Lire le fichier
with open('src/index.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"📄 Fichier lu: {len(lines)} lignes")

# Correction ligne 648 : name: body.name
for i in range(645, 655):
    if lines[i].strip() == 'name: body.name':
        print(f"✏️  Ligne {i+1} AVANT: {lines[i].strip()}")
        # Calculer le nom complet à partir de first_name et last_name
        lines[i] = "    name: `${body.first_name || ''} ${body.last_name || ''}`.trim() || 'Prospect'\n"
        print(f"✏️  Ligne {i+1} APRÈS: {lines[i].strip()}")
        break

# Correction ligne 773 : name: body.name dans notifyNBN
for i in range(770, 780):
    if 'name: body.name' in lines[i]:
        print(f"✏️  Ligne {i+1} AVANT: {lines[i].strip()}")
        lines[i] = lines[i].replace('name: body.name', "name: `${body.first_name || ''} ${body.last_name || ''}`.trim() || 'Prospect'")
        print(f"✏️  Ligne {i+1} APRÈS: {lines[i].strip()}")
        break

# Écrire le fichier corrigé
with open('src/index.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Fichier corrigé: {len(lines)} lignes")

# Vérification finale
with open('src/index.js', 'r') as f:
    content = f.read()
    if 'body.name' in content:
        print("❌ ATTENTION : body.name encore présent quelque part")
        # Trouver où
        for i, line in enumerate(content.split('\n'), 1):
            if 'body.name' in line:
                print(f"   Ligne {i}: {line.strip()[:80]}")
    else:
        print("🎉 Plus aucun body.name dans le code !")
