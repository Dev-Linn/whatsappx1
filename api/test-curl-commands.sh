#!/bin/bash

echo "🔐 TESTE HTTP COMPLETO - WhatsApp Analytics"
echo "═══════════════════════════════════════════"

API_BASE="https://lucrogourmet.shop/api/v1"

# 1. FAZER LOGIN
echo ""
echo "1️⃣ FAZENDO LOGIN..."
echo "-------------------"

LOGIN_RESPONSE=$(curl -s -w "\nSTATUS:%{http_code}" -X POST \
  "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "linnsilva3636@gmail.com",
    "password": "Edivanio123!"
  }')

echo "Response: $LOGIN_RESPONSE"
echo ""

# Extrair token da resposta (assumindo formato JSON)
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ ERRO: Token não encontrado na resposta do login"
    exit 1
fi

echo "✅ TOKEN OBTIDO: ${TOKEN:0:50}..."
echo ""

# 2. TESTAR AUTENTICAÇÃO
echo "2️⃣ TESTANDO AUTENTICAÇÃO..."
echo "---------------------------"

AUTH_TEST=$(curl -s -w "\nSTATUS:%{http_code}" \
  "${API_BASE}/analytics/auth/test" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $AUTH_TEST"
echo ""

# 3. TESTAR MÉTRICAS
echo "3️⃣ TESTANDO MÉTRICAS..."
echo "----------------------"

METRICS_RESPONSE=$(curl -s -w "\nSTATUS:%{http_code}" \
  "${API_BASE}/analytics/integration/metrics" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $METRICS_RESPONSE"
echo ""

# 4. TESTAR GERAÇÃO DE LINK
echo "4️⃣ TESTANDO GERAÇÃO DE LINK..."
echo "------------------------------"

LINK_RESPONSE=$(curl -s -w "\nSTATUS:%{http_code}" -X POST \
  "${API_BASE}/analytics/integration/generate-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "baseUrl": "https://teste.com.br/produto",
    "campaignName": "teste_curl"
  }')

echo "Response: $LINK_RESPONSE"
echo ""

# 5. TESTAR CONFIGURAÇÃO DE INTEGRAÇÃO
echo "5️⃣ TESTANDO CONFIGURAÇÃO DE INTEGRAÇÃO..."
echo "----------------------------------------"

SETUP_RESPONSE=$(curl -s -w "\nSTATUS:%{http_code}" -X POST \
  "${API_BASE}/analytics/integration/setup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "siteUrl": "https://teste.com.br",
    "trackingOption": "automatic",
    "conversionTypes": ["visits", "purchases"]
  }')

echo "Response: $SETUP_RESPONSE"
echo ""

echo "🏁 TESTE COMPLETO FINALIZADO!"
echo "═══════════════════════════════" 