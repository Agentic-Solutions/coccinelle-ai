#!/bin/bash
# Script pour assigner des agents aux produits via l'API

API_URL="${API_URL:-http://localhost:8787}"
TENANT_ID="${TENANT_ID:-tenant_nestenn_test}"
AGENT_ID="${AGENT_ID:-agent_nestenn_1}"

echo "🏠 Assignation d'agents aux produits"
echo "======================================"
echo "API: $API_URL"
echo "Tenant: $TENANT_ID"
echo "Agent: $AGENT_ID"
echo ""

# 1. Récupérer la liste des produits sans agent
echo "📋 Récupération des produits sans agent..."
PRODUCTS=$(curl -s "${API_URL}/api/v1/products?tenant_id=${TENANT_ID}" \
  -H "x-tenant-id: ${TENANT_ID}")

echo "$PRODUCTS" | jq -r '.products[] | select(.agent_id == null) | "\(.id) - \(.title)"' | while read -r line; do
  PRODUCT_ID=$(echo "$line" | cut -d' ' -f1)
  PRODUCT_TITLE=$(echo "$line" | cut -d'-' -f2-)

  echo ""
  echo "🔄 Assignation: ${PRODUCT_TITLE}"

  # Mettre à jour le produit
  RESULT=$(curl -s -X PUT "${API_URL}/api/v1/products/${PRODUCT_ID}" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: ${TENANT_ID}" \
    -d "{
      \"agent_id\": \"${AGENT_ID}\",
      \"assignment_type\": \"exclusive\"
    }")

  if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
    echo "  ✅ Assigné à l'agent ${AGENT_ID}"
  else
    echo "  ❌ Erreur: $(echo "$RESULT" | jq -r '.error // "Unknown error"')"
  fi
done

echo ""
echo "✅ Assignation terminée!"
echo ""
echo "📊 Vérification..."
curl -s "${API_URL}/api/v1/products?tenant_id=${TENANT_ID}&agent_id=${AGENT_ID}" \
  -H "x-tenant-id: ${TENANT_ID}" | jq '.count'
echo " produits assignés à l'agent ${AGENT_ID}"
