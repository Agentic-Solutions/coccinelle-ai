#!/usr/bin/env python3
"""
Script de création d'un Assistant Vapi pour Sara
Coccinelle.ai v1.13.0
"""

import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Configuration
VAPI_API_KEY = os.getenv('VAPI_API_KEY')
VAPI_BASE_URL = 'https://api.vapi.ai'
TOOL_CHECK_AVAILABILITY = os.getenv('VAPI_TOOL_CHECK_AVAILABILITY')
TOOL_CREATE_APPOINTMENT = os.getenv('VAPI_TOOL_CREATE_APPOINTMENT')

# Vérifier que la clé API existe
if not VAPI_API_KEY:
    print("❌ ERREUR : VAPI_API_KEY non trouvée dans .env")
    sys.exit(1)

print("🚀 Création de l'Assistant Vapi pour Sara...")
print(f"📡 API Key: {VAPI_API_KEY[:20]}...")
print(f"🔧 Tool checkAvailability: {TOOL_CHECK_AVAILABILITY}")
print(f"🔧 Tool createAppointment: {TOOL_CREATE_APPOINTMENT}")
print()

# Headers pour l'API Vapi
headers = {
    'Authorization': f'Bearer {VAPI_API_KEY}',
    'Content-Type': 'application/json'
}

# Prompt système complet pour Sara
system_prompt = """Tu es Sara, une assistante virtuelle professionnelle et chaleureuse spécialisée dans la prise de rendez-vous.

## TON RÔLE
Tu aides les clients à prendre un rendez-vous en vérifiant les disponibilités et en collectant leurs informations de contact.

## ÉTAPES DE LA CONVERSATION

### 1. ACCUEIL (1 phrase courte)
- Dis bonjour et présente-toi brièvement
- Indique que tu vas vérifier les disponibilités

### 2. VÉRIFICATION DES DISPONIBILITÉS
- Utilise IMMÉDIATEMENT la fonction checkAvailability avec la date du jour
- NE demande PAS la date au client, vérifie DIRECTEMENT pour aujourd'hui et demain
- Une fois les créneaux récupérés, propose les 3-5 premiers créneaux disponibles

### 3. CHOIX DU CRÉNEAU
- Demande au client quel créneau lui convient
- Confirme son choix avant de continuer

### 4. COLLECTE DES INFORMATIONS (une question à la fois)
Pose ces questions dans cet ordre précis :
a) "Quel est votre PRÉNOM ?" (attends la réponse)
b) "Et votre NOM DE FAMILLE ?" (attends la réponse)
c) "Quel est votre NUMÉRO DE TÉLÉPHONE ? Dictez-le CHIFFRE PAR CHIFFRE, par exemple : zéro, six, un, deux..." (attends la réponse complète)
d) "Quelle est votre ADRESSE EMAIL ? Dictez-la TRÈS LENTEMENT en épelant les lettres. Par exemple : j, o, h, n, AROBASE, g, m, a, i, l, POINT, c, o, m" (attends la réponse)

### 5. CRÉATION DU RENDEZ-VOUS
- Une fois TOUTES les informations collectées, utilise la fonction createAppointment
- Paramètres requis :
  * firstName : le prénom du client
  * lastName : le nom du client
  * phone : le numéro de téléphone (format : 0612345678)
  * email : l'adresse email
  * datetime : le créneau choisi au format ISO 8601 (ex: 2025-10-08T14:00:00Z)

### 6. CONFIRMATION
- Confirme que le rendez-vous est créé
- Indique que le client recevra un SMS et un email de confirmation
- Remercie et dis au revoir

## RÈGLES IMPORTANTES POUR LA PRONONCIATION

### Pour les HEURES :
- ❌ Ne dis JAMAIS "9h" ou "14h"
- ✅ Dis TOUJOURS "9 heures", "10 heures", "14 heures", "15 heures"
- Prononce bien "heures" en entier, pas juste "h"

### Pour les EMAILS :
- Demande au client de dicter TRÈS LENTEMENT
- Dis "AROBASE" pour @ (jamais "at")
- Dis "POINT" pour . (jamais "dot")
- Exemple : "j, o, h, n, AROBASE, g, m, a, i, l, POINT, c, o, m"

### Pour les TÉLÉPHONES :
- Demande CHIFFRE PAR CHIFFRE
- Exemple : "zéro, six, un, deux, trois, quatre, cinq, six, sept, huit"
- Répète le numéro pour confirmation

### Pour les DATES :
- ❌ Ne dis JAMAIS "2025-10-08"
- ✅ Dis "le 8 octobre 2025" ou "mercredi 8 octobre"

## STYLE DE COMMUNICATION
- Sois naturelle, professionnelle et chaleureuse
- Utilise des phrases courtes et claires
- Une seule question à la fois
- Confirme chaque information donnée par le client
- Ne parle PAS trop vite, articule bien

## GESTION DES ERREURS
- Si le client ne comprend pas, reformule avec d'autres mots
- Si un créneau n'est plus disponible, propose-en un autre
- Si une information est manquante, redemande poliment

Tu es prête à commencer ! Sois efficace, souriante et professionnelle."""

# Configuration de l'assistant
assistant_config = {
    "name": "Sara RDV v2.0 - Assistant",
    "firstMessage": "Bonjour ! Je suis Sara, votre assistante. Je vais vous aider à prendre un rendez-vous. Laissez-moi vérifier mes disponibilités.",
    "transcriber": {
        "provider": "deepgram",
        "model": "nova-2",
        "language": "fr"
    },
    "model": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 500,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            }
        ],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "checkAvailability",
                    "description": "Vérifie les créneaux disponibles pour une date donnée. Retourne une liste de créneaux horaires disponibles.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "date": {
                                "type": "string",
                                "description": "Date au format YYYY-MM-DD (ex: 2025-10-08)"
                            }
                        },
                        "required": ["date"]
                    }
                },
                "server": {
                    "url": "https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/vapi/function-call",
                    "secret": "sk_test_demo123456789"
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "createAppointment",
                    "description": "Crée un nouveau rendez-vous avec les informations du client. Tous les champs sont requis.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "firstName": {
                                "type": "string",
                                "description": "Prénom du client"
                            },
                            "lastName": {
                                "type": "string",
                                "description": "Nom de famille du client"
                            },
                            "phone": {
                                "type": "string",
                                "description": "Numéro de téléphone (10 chiffres)"
                            },
                            "email": {
                                "type": "string",
                                "description": "Adresse email du client"
                            },
                            "datetime": {
                                "type": "string",
                                "description": "Date et heure du RDV au format ISO 8601 (ex: 2025-10-08T14:00:00Z)"
                            }
                        },
                        "required": ["firstName", "lastName", "phone", "datetime"]
                    }
                },
                "server": {
                    "url": "https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/vapi/function-call",
                    "secret": "sk_test_demo123456789"
                }
            }
        ]
    },
    "voice": {
        "provider": "cartesia",
        "voiceId": "a167e0f3-df7e-4d52-a9c3-f949145efdab",
        "model": "sonic-multilingual"
    },
    "serverUrl": "https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/vapi/function-call",
    "serverMessages": [
        "end-of-call-report",
        "tool-calls"
    ]
}

print("📤 Envoi de la requête à l'API Vapi...")
print(f"🔗 URL: {VAPI_BASE_URL}/assistant")
print()

try:
    # Créer l'assistant
    response = requests.post(
        f'{VAPI_BASE_URL}/assistant',
        headers=headers,
        json=assistant_config,
        timeout=30
    )
    
    # Vérifier le statut
    if response.status_code == 201 or response.status_code == 200:
        assistant_data = response.json()
        assistant_id = assistant_data.get('id', 'N/A')
        
        print("✅ SUCCÈS ! Assistant créé avec succès !")
        print()
        print("=" * 60)
        print("📋 INFORMATIONS DE L'ASSISTANT")
        print("=" * 60)
        print(f"🆔 Assistant ID : {assistant_id}")
        print(f"📝 Nom : {assistant_data.get('name', 'N/A')}")
        print(f"🔗 URL Dashboard : https://dashboard.vapi.ai/assistants/{assistant_id}")
        print("=" * 60)
        print()
        print("🎉 L'assistant est maintenant disponible dans ton Dashboard Vapi !")
        print()
        print("📞 PROCHAINES ÉTAPES :")
        print("1. Va sur https://dashboard.vapi.ai/phone-numbers")
        print("2. Clique sur ton numéro +33939035761")
        print("3. Dans 'Assistant', sélectionne 'Sara RDV v2.0 - Assistant'")
        print("4. Sauvegarde")
        print("5. Appelle le numéro pour tester ! 🎉")
        print()
        
        # Sauvegarder les infos de l'assistant
        with open('assistant_info.json', 'w', encoding='utf-8') as f:
            json.dump({
                'assistant_id': assistant_id,
                'created_at': datetime.now().isoformat(),
                'name': assistant_data.get('name'),
                'phone_number': '+33939035761',
                'dashboard_url': f'https://dashboard.vapi.ai/assistants/{assistant_id}',
                'full_response': assistant_data
            }, f, indent=2, ensure_ascii=False)
        
        print("💾 Informations sauvegardées dans : assistant_info.json")
        
    else:
        print(f"❌ ERREUR : Code de statut {response.status_code}")
        print(f"📄 Réponse : {response.text}")
        print()
        print("🔍 Détails de l'erreur :")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2, ensure_ascii=False))
        except:
            print(response.text)

except requests.exceptions.RequestException as e:
    print(f"❌ ERREUR de connexion : {e}")
    print()
    print("💡 Vérifications à faire :")
    print("   - Ta connexion internet fonctionne ?")
    print("   - La clé API Vapi est correcte ?")
    print("   - Le VPN est désactivé ?")
    sys.exit(1)

except Exception as e:
    print(f"❌ ERREUR inattendue : {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print()
print("✅ Script terminé !")
