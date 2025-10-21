#!/usr/bin/env python3
import shutil
from datetime import datetime

# Sauvegarde
backup_name = f"src/index.js.backup_python_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
shutil.copy2('src/index.js', backup_name)
print(f"✅ Backup créé: {backup_name}")

# Lire le fichier
with open('src/index.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"📄 Fichier lu: {len(lines)} lignes")

# BUG 1 - Corriger ligne 407 (index 406 en Python)
old_407 = lines[406].strip()
lines[406] = "    INSERT INTO prospects (id, tenant_id, first_name, last_name, phone, email, status, created_at)\n"
print(f"✏️  Ligne 407 AVANT: {old_407[:80]}...")
print(f"✏️  Ligne 407 APRÈS: {lines[406].strip()[:80]}...")

# BUG 1 - Corriger ligne 408 (index 407)
old_408 = lines[407].strip()
lines[407] = "    VALUES (?, ?, ?, ?, ?, ?, 'contacted', datetime('now'))\n"
print(f"✏️  Ligne 408 AVANT: {old_408[:80]}...")
print(f"✏️  Ligne 408 APRÈS: {lines[407].strip()[:80]}...")

# BUG 2 - Corriger ligne 633 (index 632)
old_633 = lines[632].strip()
lines[632] = "    INSERT INTO prospects (id, tenant_id, first_name, last_name, phone, email, status, source, notes, created_at)\n"
print(f"✏️  Ligne 633 AVANT: {old_633[:80]}...")
print(f"✏️  Ligne 633 APRÈS: {lines[632].strip()[:80]}...")

# BUG 2 - Corriger ligne 634 (index 633)
old_634 = lines[633].strip()
lines[633] = "    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))\n"
print(f"✏️  Ligne 634 AVANT: {old_634[:80]}...")
print(f"✏️  Ligne 634 APRÈS: {lines[633].strip()[:80]}...")

# Écrire le fichier corrigé
with open('src/index.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Fichier corrigé: {len(lines)} lignes")

# Vérification
with open('src/index.js', 'r') as f:
    content = f.read()
    if 'INSERT INTO prospects (id, tenant_id, name,' in content:
        print("❌ ERREUR : Bug toujours présent !")
        exit(1)
    else:
        print("🎉 Bug corrigé avec succès !")
