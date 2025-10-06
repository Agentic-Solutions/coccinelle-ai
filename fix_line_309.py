#!/usr/bin/env python3
with open('src/index.js', 'r') as f:
    lines = f.readlines()

# Supprimer les lignes 309-314 (indices 308-313) et insérer la correction
del lines[308:314]
lines.insert(308, '  const formattedDate = localDate;\n')

with open('src/index.js', 'w') as f:
    f.writelines(lines)

print("✅ Correction appliquée")
