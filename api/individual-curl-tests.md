# 🌐 COMANDOS CURL INDIVIDUAIS

## 1️⃣ FAZER LOGIN
```bash
curl -X POST "https://lucrogourmet.shop/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "linnsilva3636@gmail.com",
    "password": "Edivanio123!"
  }'
```

## 2️⃣ TESTAR AUTENTICAÇÃO (substitua SEU_TOKEN)
```bash
curl "https://lucrogourmet.shop/api/v1/analytics/auth/test" \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 3️⃣ BUSCAR MÉTRICAS
```bash
curl "https://lucrogourmet.shop/api/v1/analytics/integration/metrics" \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 4️⃣ GERAR LINK RASTREADO
```bash
curl -X POST "https://lucrogourmet.shop/api/v1/analytics/integration/generate-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "baseUrl": "https://teste.com.br/produto",
    "campaignName": "teste_manual"
  }'
```

## 5️⃣ CONFIGURAR INTEGRAÇÃO
```bash
curl -X POST "https://lucrogourmet.shop/api/v1/analytics/integration/setup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "siteUrl": "https://teste.com.br",
    "trackingOption": "automatic",
    "conversionTypes": ["visits", "purchases"]
  }'
```

---

## 🚀 EXECUÇÃO DO TESTE COMPLETO:

**No Windows (PowerShell):**
```powershell
bash api/test-curl-commands.sh
```

**No Linux/Mac:**
```bash
chmod +x api/test-curl-commands.sh
./api/test-curl-commands.sh
```

---

## 🔍 COMO INTERPRETAR OS RESULTADOS:

- **STATUS:200** = Sucesso ✅
- **STATUS:401** = Token inválido/ausente ❌ 
- **STATUS:403** = Token expirado ❌
- **STATUS:500** = Erro interno do servidor ❌

## 📝 PASSOS:

1. **Execute o comando de LOGIN** primeiro
2. **Copie o token** da resposta 
3. **Substitua SEU_TOKEN** nos outros comandos
4. **Execute os testes** um por um 