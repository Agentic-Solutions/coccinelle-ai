#!/usr/bin/env python3
"""
Script de création du workflow Vapi pour Sara
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

print("🚀 Création du workflow Vapi pour Sara...")
print(f"📡 API Key: {VAPI_API_KEY[:20]}...")
print(f"🔧 Tool checkAvailability: {TOOL_CHECK_AVAILABILITY}")
print(f"🔧 Tool createAppointment: {TOOL_CREATE_APPOINTMENT}")
print()

# Headers pour l'API Vapi
headers = {
    'Authorization': f'Bearer {VAPI_API_KEY}',
    'Content-Type': 'application/json'
}

# Configuration du workflow
workflow_config = {
    "name": "Sara RDV Automatique v2.0",
    "model": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 500,
        "emotionRecognitionEnabled": True
    },
    "voice": {
        "provider": "cartesia",
        "voiceId": "sonic-french",
        "speed": 1.0,
        "stability": 0.5,
        "similarityBoost": 0.75
    },
    "transcriber": {
        "provider": "deepgram",
        "model": "nova-2-phonecall",
        "language": "fr"
    },
    "firstMessage": "Bonjour ! Je suis Sara, votre assistante virtuelle. Je vais vous aider à prendre un rendez-vous. Laissez-moi vérifier mes disponibilités.",
    "serverUrl": "https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/vapi/function-call",
    "serverUrlSecret": "sk_test_demo123456789",
    "nodes": [
        {
            "type": "start",
            "name": "Début de l'appel",
            "id": "node_start"
        },
        {
            "type": "conversation",
            "name": "Accueil Sara",
            "id": "node_accueil",
            "messages": {
                "firstMessage": "Bonjour ! Je suis Sara, votre assistante virtuelle. Je vais vous aider à prendre un rendez-vous. Laissez-moi vérifier mes disponibilités."
            }
        },
        {
            "type": "tool",
            "name": "Vérifier Disponibilités",
            "id": "node_check_availability",
            "toolId": TOOL_CHECK_AVAILABILITY,
            "input": {
                "date": "{{$today}}"
            },
            "messages": {
                "requestStart": "Un instant s'il vous plaît, je vérifie mes disponibilités...",
                "requestComplete": "Parfait, j'ai trouvé plusieurs créneaux disponibles !",
                "requestFailed": "Désolée, je n'arrive pas à accéder au calendrier pour le moment."
            }
        },
        {
            "type": "conversation",
            "name": "Proposer Créneaux",
            "id": "node_proposer_creneaux",
            "messages": {
                "firstMessage": "J'ai plusieurs créneaux disponibles aujourd'hui. Je peux vous proposer 9 heures, 10 heures, 11 heures, 14 heures, 15 heures, 16 heures ou 17 heures. Quel créneau vous convient le mieux ?"
            },
            "inputSchema": {
                "type": "object",
                "properties": {
                    "creneauChoisi": {
                        "type": "string",
                        "description": "Le créneau horaire choisi par le client"
                    }
                },
                "required": ["creneauChoisi"]
            }
        },
        {
            "type": "conversation",
            "name": "Collecter Prénom",
            "id": "node_prenom",
            "messages": {
                "firstMessage": "Parfait ! Pour finaliser votre rendez-vous, quel est votre prénom ?"
            },
            "inputSchema": {
                "type": "object",
                "properties": {
                    "prenom": {
                        "type": "string",
                        "description": "Le prénom du client"
                    }
                },
                "required": ["prenom"]
            }
        },
        {
            "type": "conversation",
            "name": "Collecter Nom",
            "id": "node_nom",
            "messages": {
                "firstMessage": "Merci {{prenom}}. Et quel est votre nom de famille ?"
            },
            "inputSchema": {
                "type": "object",
                "properties": {
                    "nom": {
                        "type": "string",
                        "description": "Le nom de famille du client"
                    }
                },
                "required": ["nom"]
            }
        },
        {
            "type": "conversation",
            "name": "Collecter Téléphone",
            "id": "node_telephone",
            "messages": {
                "firstMessage": "Quel est votre numéro de téléphone ? Dictez-le chiffre par chiffre s'il vous plaît. Par exemple : zéro, six, un, deux, etc."
            },
            "inputSchema": {
                "type": "object",
                "properties": {
                    "telephone": {
                        "type": "string",
                        "description": "Le numéro de téléphone du client",
                        "pattern": "^[0-9]{10}$"
                    }
                },
                "required": ["telephone"]
            }
        },
        {
            "type": "conversation",
            "name": "Collecter Email",
            "id": "node_email",
            "messages": {
                "firstMessage": "Et enfin, quelle est votre adresse e-mail ? Dictez-la lentement en épelant les lettres. Par exemple : j, o, h, n, arobase, e, x, a, m, p, l, e, point, c, o, m."
            },
            "inputSchema": {
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "L'adresse email du client",
                        "format": "email"
                    }
                }
            }
        },
        {
            "type": "tool",
            "name": "Créer Rendez-vous",
            "id": "node_create_appointment",
            "toolId": TOOL_CREATE_APPOINTMENT,
            "input": {
                "firstName": "{{prenom}}",
                "lastName": "{{nom}}",
                "phone": "{{telephone}}",
                "email": "{{email}}",
                "datetime": "{{creneauChoisi}}"
            },
            "messages": {
                "requestStart": "Parfait ! Je crée votre rendez-vous...",
                "requestComplete": "Votre rendez-vous est confirmé !",
                "requestFailed": "Je suis désolée, une erreur s'est produite lors de la création du rendez-vous."
            }
        },
        {
            "type": "conversation",
            "name": "Confirmation",
            "id": "node_confirmation",
            "messages": {
                "firstMessage": "Votre rendez-vous est confirmé pour le {{creneauChoisi}}. Vous allez recevoir un SMS et un e-mail de confirmation avec tous les détails. Merci et à très bientôt !"
            }
        },
        {
            "type": "end",
            "name": "Fin de l'appel",
            "id": "node_end"
        }
    ],
    "edges": [
        {"from": "node_start", "to": "node_accueil"},
        {"from": "node_accueil", "to": "node_check_availability"},
        {"from": "node_check_availability", "to": "node_proposer_creneaux"},
        {"from": "node_proposer_creneaux", "to": "node_prenom"},
        {"from": "node_prenom", "to": "node_nom"},
        {"from": "node_nom", "to": "node_telephone"},
        {"from": "node_telephone", "to": "node_email"},
        {"from": "node_email", "to": "node_create_appointment"},
        {"from": "node_create_appointment", "to": "node_confirmation"},
        {"from": "node_confirmation", "to": "node_end"}
    ]
}

print("📤 Envoi de la requête à l'API Vapi...")
print(f"🔗 URL: {VAPI_BASE_URL}/workflow")
print()

try:
    # Créer le workflow
    response = requests.post(
        f'{VAPI_BASE_URL}/workflow',
        headers=headers,
        json=workflow_config,
        timeout=30
    )
    
    # Vérifier le statut
    if response.status_code == 201 or response.status_code == 200:
        workflow_data = response.json()
        workflow_id = workflow_data.get('id', 'N/A')
        
        print("✅ SUCCÈS ! Workflow créé avec succès !")
        print()
        print("=" * 60)
        print("📋 INFORMATIONS DU WORKFLOW")
        print("=" * 60)
        print(f"🆔 Workflow ID : {workflow_id}")
        print(f"📝 Nom : {workflow_data.get('name', 'N/A')}")
        print(f"🔗 URL Dashboard : https://dashboard.vapi.ai/workflows/{workflow_id}")
        print("=" * 60)
        print()
        print("🎉 Le workflow est maintenant disponible dans ton Dashboard Vapi !")
        print("📞 Tu peux le tester en appelant Sara au : +33939035761")
        print()
        
        # Sauvegarder les infos du workflow
        with open('workflow_info.json', 'w', encoding='utf-8') as f:
            json.dump({
                'workflow_id': workflow_id,
                'created_at': datetime.now().isoformat(),
                'name': workflow_data.get('name'),
                'full_response': workflow_data
            }, f, indent=2, ensure_ascii=False)
        
        print("💾 Informations sauvegardées dans : workflow_info.json")
        
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
