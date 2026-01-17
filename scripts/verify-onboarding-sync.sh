#!/bin/bash

# =====================================================
# Script de Vérification Post-Onboarding
# Vérifie que la synchronisation Onboarding → Omnichannel a fonctionné
# =====================================================

echo "🔍 Vérification de la Synchronisation Onboarding → Omnichannel"
echo "=============================================================="
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
  fi
}

# Fonction pour exécuter une requête D1
run_query() {
  npx wrangler d1 execute coccinelle-db --remote --command "$1" 2>/dev/null
}

# =====================================================
# 1. Vérifier le Tenant
# =====================================================
echo "📊 1. Vérification du Tenant"
echo "----------------------------"

TENANT_QUERY="SELECT id, company_name, sector FROM tenants ORDER BY created_at DESC LIMIT 1;"
TENANT_RESULT=$(run_query "$TENANT_QUERY")

echo "$TENANT_RESULT" | jq -r '.[] | .results[] | "ID: \(.id)\nNom: \(.company_name)\nSecteur: \(.sector)"'
echo ""

# Extraire le tenant_id pour les requêtes suivantes
TENANT_ID=$(echo "$TENANT_RESULT" | jq -r '.[].results[].id' | head -1)

if [ -z "$TENANT_ID" ]; then
  echo -e "${RED}❌ Aucun tenant trouvé!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Tenant trouvé: $TENANT_ID${NC}"
echo ""

# =====================================================
# 2. Vérifier omni_agent_configs
# =====================================================
echo "🤖 2. Vérification de la Config Agent"
echo "--------------------------------------"

AGENT_CONFIG_QUERY="SELECT id, tenant_id, agent_type, agent_name, voice_provider, voice_id, greeting_message, knowledge_base_ids FROM omni_agent_configs WHERE tenant_id = '$TENANT_ID';"
AGENT_CONFIG_RESULT=$(run_query "$AGENT_CONFIG_QUERY")

# Vérifier si la config existe
AGENT_CONFIG_COUNT=$(echo "$AGENT_CONFIG_RESULT" | jq '.[].results | length')

if [ "$AGENT_CONFIG_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ ERREUR: Aucune config agent trouvée pour ce tenant!${NC}"
  echo -e "${YELLOW}⚠️  La synchronisation a échoué${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Config agent trouvée${NC}"
  echo ""
  echo "$AGENT_CONFIG_RESULT" | jq -r '.[] | .results[] | "Config ID: \(.id)\nAgent Type: \(.agent_type)\nAgent Name: \(.agent_name)\nVoice Provider: \(.voice_provider)\nVoice ID: \(.voice_id)\nGreeting: \(.greeting_message)\nKB IDs: \(.knowledge_base_ids)"'
  echo ""

  # Vérifier que agent_type n'est pas 'custom' par défaut
  AGENT_TYPE=$(echo "$AGENT_CONFIG_RESULT" | jq -r '.[].results[].agent_type')

  if [ "$AGENT_TYPE" = "custom" ]; then
    echo -e "${YELLOW}⚠️  Agent type est 'custom' - Vérifier si c'était le choix voulu${NC}"
  else
    echo -e "${GREEN}✅ Agent type configuré: $AGENT_TYPE${NC}"
  fi
  echo ""
fi

# =====================================================
# 3. Vérifier omni_phone_mappings
# =====================================================
echo "📞 3. Vérification du Phone Mapping"
echo "------------------------------------"

PHONE_MAPPING_QUERY="SELECT id, phone_number, tenant_id, is_active FROM omni_phone_mappings WHERE tenant_id = '$TENANT_ID';"
PHONE_MAPPING_RESULT=$(run_query "$PHONE_MAPPING_QUERY")

PHONE_MAPPING_COUNT=$(echo "$PHONE_MAPPING_RESULT" | jq '.[].results | length')

if [ "$PHONE_MAPPING_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ ERREUR: Aucun phone mapping trouvé!${NC}"
  echo -e "${YELLOW}⚠️  Le numéro de téléphone ne pourra pas router les appels${NC}"
else
  echo -e "${GREEN}✅ Phone mapping trouvé${NC}"
  echo ""
  echo "$PHONE_MAPPING_RESULT" | jq -r '.[] | .results[] | "Mapping ID: \(.id)\nNuméro: \(.phone_number)\nTenant ID: \(.tenant_id)\nActif: \(.is_active)"'
  echo ""
fi

# =====================================================
# 4. Vérifier Knowledge Base
# =====================================================
echo "📚 4. Vérification de la Knowledge Base"
echo "----------------------------------------"

KB_DOCS_QUERY="SELECT id, title, status FROM knowledge_documents WHERE tenant_id = '$TENANT_ID' ORDER BY created_at DESC LIMIT 5;"
KB_DOCS_RESULT=$(run_query "$KB_DOCS_QUERY")

KB_DOCS_COUNT=$(echo "$KB_DOCS_RESULT" | jq '.[].results | length')

if [ "$KB_DOCS_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Aucun document KB trouvé (peut être normal si non uploadé)${NC}"
else
  echo -e "${GREEN}✅ $KB_DOCS_COUNT document(s) KB trouvé(s)${NC}"
  echo ""
  echo "$KB_DOCS_RESULT" | jq -r '.[] | .results[] | "Doc ID: \(.id)\nTitre: \(.title)\nStatus: \(.status)"'
  echo ""

  # Vérifier si les KB sont liés dans agent_configs
  KB_IDS_IN_CONFIG=$(echo "$AGENT_CONFIG_RESULT" | jq -r '.[].results[].knowledge_base_ids')

  if [ "$KB_IDS_IN_CONFIG" = "null" ] || [ -z "$KB_IDS_IN_CONFIG" ]; then
    echo -e "${YELLOW}⚠️  Documents KB non liés à l'agent config${NC}"
  else
    echo -e "${GREEN}✅ Documents KB liés à l'agent: $KB_IDS_IN_CONFIG${NC}"
  fi
  echo ""
fi

# =====================================================
# 5. Vérifier la Session d'Onboarding
# =====================================================
echo "📝 5. Vérification de la Session d'Onboarding"
echo "----------------------------------------------"

ONBOARDING_SESSION_QUERY="SELECT id, status, business_data, vapi_data FROM onboarding_sessions WHERE tenant_id = '$TENANT_ID' ORDER BY created_at DESC LIMIT 1;"
ONBOARDING_SESSION_RESULT=$(run_query "$ONBOARDING_SESSION_QUERY")

echo "$ONBOARDING_SESSION_RESULT" | jq -r '.[] | .results[] | "Session ID: \(.id)\nStatus: \(.status)"'

# Afficher agent_type choisi dans vapi_data
VAPI_DATA=$(echo "$ONBOARDING_SESSION_RESULT" | jq -r '.[].results[].vapi_data')
if [ "$VAPI_DATA" != "null" ]; then
  CHOSEN_AGENT_TYPE=$(echo "$VAPI_DATA" | jq -r '.agent_type // "non spécifié"')
  echo "Agent Type choisi: $CHOSEN_AGENT_TYPE"
fi
echo ""

# =====================================================
# 6. Vérifier les Products (si immobilier)
# =====================================================
echo "🏠 6. Vérification des Produits"
echo "--------------------------------"

PRODUCTS_QUERY="SELECT COUNT(*) as count FROM products WHERE tenant_id = '$TENANT_ID';"
PRODUCTS_RESULT=$(run_query "$PRODUCTS_QUERY")

PRODUCTS_COUNT=$(echo "$PRODUCTS_RESULT" | jq -r '.[].results[].count')

if [ "$PRODUCTS_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Aucun produit trouvé (peut être normal si non importé)${NC}"
else
  echo -e "${GREEN}✅ $PRODUCTS_COUNT produit(s) trouvé(s)${NC}"
fi
echo ""

# =====================================================
# 7. Résumé Global
# =====================================================
echo "========================================"
echo "📊 RÉSUMÉ DE LA VÉRIFICATION"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# Tenant
if [ -n "$TENANT_ID" ]; then
  echo -e "${GREEN}✅ Tenant${NC}"
else
  echo -e "${RED}❌ Tenant${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Agent Config
if [ "$AGENT_CONFIG_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Agent Config${NC}"
else
  echo -e "${RED}❌ Agent Config${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Phone Mapping
if [ "$PHONE_MAPPING_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Phone Mapping${NC}"
else
  echo -e "${RED}❌ Phone Mapping${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Knowledge Base (warning seulement)
if [ "$KB_DOCS_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Knowledge Base ($KB_DOCS_COUNT docs)${NC}"
else
  echo -e "${YELLOW}⚠️  Knowledge Base (0 docs)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "========================================"

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}🎉 Synchronisation réussie!${NC}"
  echo ""
  echo "Vous pouvez maintenant:"
  echo "1. Appeler le numéro Twilio pour tester"
  echo "2. Vérifier que le greeting est personnalisé"
  echo "3. Tester les différents modes de l'agent"
  exit 0
else
  echo -e "${RED}❌ Synchronisation échouée ($ERRORS erreurs)${NC}"
  echo ""
  echo "Actions recommandées:"
  echo "1. Vérifier les logs Cloudflare: npx wrangler tail --format pretty"
  echo "2. Vérifier que completeOnboarding() a bien été appelé"
  echo "3. Relancer l'onboarding si nécessaire"
  exit 1
fi
