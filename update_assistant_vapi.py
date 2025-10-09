#!/usr/bin/env python3
"""
Script de mise à jour de l'Assistant Vapi Sara v2.0
Optimisation latence et détection de parole
Coccinelle.ai v1.13.1
"""

import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

VAPI_API_KEY = os.getenv('VAPI_API_KEY')
VAPI_BASE_URL = 'https://api.vapi.ai'
ASSISTANT_ID = '40ccfe18-e4c7-4e5b-99d5-2f2654001335'

if not VAPI_API_KEY:
    print("❌ ERREUR : VAPI_API_KEY non trouvée")
    sys.exit(1)

print("🔧 Mise à jour de l'Assistant Vapi Sara v2.0...")
print(f"🆔 Assistant ID: {ASSISTANT_ID}")
print()

headers = {
    'Authorization': f'Bearer {VAPI_API_KEY}',
    'Content-Type': 'application/json'
}

system_prompt = """Tu es Sara, une assistante virtuelle professionnelle et réactive.

## RÈGLES CRITIQUES
- Réponds RAPIDEMENT, en 1-2 phrases courtes maximum
- Une seule action à la fois

## FLOW
1. ACCUEIL: "Bonjour, je suis Sara. Un instant."
   → Appelle checkAvailability avec date du jour

2. PROPOSITION: "J'ai 9 heures, 10 heures, 14 heures. Lequel ?"
   → Attends réponse

3. COLLECTE: "Prénom ?", "Nom ?", "Téléphone chiffre par chiffre ?", "Email avec AROBASE et POINT ?"

4. CONFIRMATION: Appelle createAppointment
   "RDV confirmé. SMS envoyé. Au revoir !"

## PRONONCIATION
- "9 heures" jamais "9h"
- "AROBASE" pas "at", "POINT" pas "dot"

Phrases ultra-courtes. Pas de répétition."""

update_config = {
    "model": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.5,
        "maxTokens": 200,
        "messages": [{"role": "system", "content": system_prompt}]
    },
    "silenceTimeoutSeconds": 10.0,
    "responseDelaySeconds": 0.5,
    "maxDurationSeconds": 600,
    "backgroundSound": "off"
}

try:
    response = requests.patch(
        f'{VAPI_BASE_URL}/assistant/{ASSISTANT_ID}',
        headers=headers,
        json=update_config,
        timeout=30
    )
    
    if response.status_code == 200:
        print("✅ SUCCÈS ! Assistant optimisé !")
        print("📞 Teste à nouveau : +33 9 39 03 57 61")
        
        with open('assistant_update_log.json', 'w') as f:
            json.dump({'updated_at': datetime.now().isoformat(), 'version': '1.13.1'}, f, indent=2)
    else:
        print(f"❌ ERREUR : {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"❌ ERREUR : {e}")
    sys.exit(1)

print("✅ Terminé !")
