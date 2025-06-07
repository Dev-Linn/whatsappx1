#!/bin/bash

echo "🔍 TESTANDO PROBLEMA JWT - WhatsApp Analytics"
echo "=============================================="

# 1. FAZER LOGIN E CAPTURAR TOKEN
echo ""
echo "1️⃣ Fazendo login..."

LOGIN_RESULT=$(curl -s "https://lucrogourmet.shop/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "linnsilva3636@gmail.com", 
    "password": "Edivanio123!"
  }')

echo "LOGIN RESPONSE:"
echo "$LOGIN_RESULT"
echo ""

# Extrair token
TOKEN=$(echo "$LOGIN_RESULT" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ ERRO: Não conseguiu obter token do login!"
    exit 1
fi

echo "✅ TOKEN OBTIDO (primeiros 50 chars): ${TOKEN:0:50}..."
echo ""

# 2. TESTAR ENDPOINT SIMPLES COM O TOKEN
echo "2️⃣ Testando endpoint de teste..."

TEST_RESULT=$(curl -s "https://lucrogourmet.shop/api/v1/analytics/auth/test" \
  -H "Authorization: Bearer $TOKEN")

echo "TEST RESPONSE:"
echo "$TEST_RESULT"
echo ""

# 3. TESTAR GERAÇÃO DE LINK
echo "3️⃣ Testando geração de link..."

LINK_RESULT=$(curl -s "https://lucrogourmet.shop/api/v1/analytics/integration/generate-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "baseUrl": "https://teste.com.br",
    "campaignName": "teste"
  }')

echo "LINK RESPONSE:"
echo "$LINK_RESULT"
echo ""

# 4. DIAGNÓSTICO
echo "🔍 DIAGNÓSTICO:"
echo "==============="

if echo "$LOGIN_RESULT" | grep -q '"success":true'; then
    echo "✅ Login: FUNCIONANDO"
else
    echo "❌ Login: PROBLEMA"
fi

if echo "$TEST_RESULT" | grep -q '"success":true'; then
    echo "✅ Autenticação: FUNCIONANDO"
else
    echo "❌ Autenticação: PROBLEMA - JWT_SECRET inconsistente"
fi

if echo "$LINK_RESULT" | grep -q '"success":true'; then
    echo "✅ Geração de Link: FUNCIONANDO"
else
    echo "❌ Geração de Link: PROBLEMA"
fi

echo ""
echo "🎯 CONCLUSÃO:"
echo "============="
if echo "$TEST_RESULT" | grep -q "Token inválido"; then
    echo "❌ PROBLEMA CONFIRMADO: JWT_SECRET diferente entre login e verificação!"
    echo ""
    echo "🔧 SOLUÇÃO:"
    echo "1. Na VPS, verificar JWT_SECRET no .env"
    echo "2. Reiniciar aplicação: pm2 restart all"
    echo "3. Garantir que toda a aplicação usa a mesma chave"
else
    echo "✅ Sistema funcionando corretamente!"
fi 