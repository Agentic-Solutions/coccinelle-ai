#!/bin/bash

# Test End-to-End : Nestenn Toulouse Rangueil
# Site: https://immobilier-toulouse-rangueil.nestenn.com/
# Tel: 0760762153

API_URL="https://coccinelle-api.youssef-amrouche.workers.dev"

echo "🚀 Test End-to-End Nestenn Toulouse Rangueil"
echo "=============================================="

# 1. Démarrer une session d'onboarding
echo ""
echo "📝 Étape 1: Création de la session d'onboarding..."
ONBOARDING_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/onboarding/start" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_nestenn_test" \
  -H "x-user-id: anonymous" \
  -d '{}')

SESSION_ID=$(echo $ONBOARDING_RESPONSE | jq -r '.session.id')
echo "✅ Session créée: $SESSION_ID"

# 2. Sauvegarder les données business (Étape 2)
echo ""
echo "🏢 Étape 2: Configuration entreprise..."
curl -s -X PUT "${API_URL}/api/v1/onboarding/${SESSION_ID}/step" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_nestenn_test" \
  -d '{
    "step": 2,
    "data": {
      "company_name": "Nestenn Toulouse Rangueil",
      "industry": "real_estate",
      "phone": "0760762153",
      "email": "contact@nestenn-toulouse-rangueil.fr",
      "website": "https://immobilier-toulouse-rangueil.nestenn.com/",
      "address": "79 Route de Narbonne, 31400 Toulouse"
    }
  }' | jq '.'

# 3. Auto-générer les agents + catégories
echo ""
echo "👥 Étape 3: Génération automatique des agents et catégories..."
AGENTS_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/onboarding/${SESSION_ID}/agents/auto-generate" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_nestenn_test")

echo $AGENTS_RESPONSE | jq '.'
echo "✅ Agents et catégories créés"

# 4. Auto-configurer Twilio ConversationRelay
echo ""
echo "🤖 Étape 4: Configuration Twilio ConversationRelay (assistant vocal)..."
curl -s -X POST "${API_URL}/api/v1/onboarding/${SESSION_ID}/twilio/auto-configure" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_nestenn_test" | jq '.'

# 5. Initialiser la Knowledge Base + Crawl
echo ""
echo "📚 Étape 5: Initialisation Knowledge Base + Crawl du site..."
curl -s -X POST "${API_URL}/api/v1/onboarding/${SESSION_ID}/kb/initialize" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_nestenn_test" \
  -d '{
    "crawlUrl": "https://immobilier-toulouse-rangueil.nestenn.com/"
  }' | jq '.'

# 6. Marquer comme terminé
echo ""
echo "✅ Étape 6: Finalisation de l'onboarding..."
curl -s -X POST "${API_URL}/api/v1/onboarding/${SESSION_ID}/complete" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant_nestenn_test" | jq '.'

echo ""
echo "🎉 =============================================="
echo "🎉 Test End-to-End terminé !"
echo "🎉 =============================================="
echo ""
echo "📊 Résumé:"
echo "  - Tenant: tenant_nestenn_test"
echo "  - Entreprise: Nestenn Toulouse Rangueil"
echo "  - Site crawlé: https://immobilier-toulouse-rangueil.nestenn.com/"
echo "  - Téléphone: 0760762153"
echo ""
echo "🔍 Prochaines étapes:"
echo "  1. Vérifier les catégories: http://localhost:3000/dashboard/products"
echo "  2. Consulter la KB: http://localhost:3000/dashboard/knowledge"
echo "  3. Tester l'assistant: http://localhost:3000/dashboard/conversations/sara"
echo "  4. Appeler le numéro VAPI pour tester"
