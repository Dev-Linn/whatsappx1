const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/v1/analytics';

// Dados de teste
const testData = {
    siteUrl: 'https://test.com.br',
    trackingOption: 'automatic',
    conversionTypes: ['visits', 'time', 'products', 'purchases']
};

const testToken = 'test_token'; // Token de teste

async function testEndpoints() {
    console.log('🚀 Testando endpoints de integração...');
    
    try {
        // 1. Testar configuração de integração
        console.log('\n1️⃣ Testando configuração de integração...');
        const setupResponse = await fetch(`${API_BASE}/integration/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            },
            body: JSON.stringify(testData)
        });
        
        if (setupResponse.ok) {
            const setupResult = await setupResponse.json();
            console.log('✅ Setup configurado:', setupResult);
        } else {
            const error = await setupResponse.text();
            console.log('❌ Erro no setup:', error);
        }
        
        // 2. Testar busca de métricas
        console.log('\n2️⃣ Testando busca de métricas...');
        const metricsResponse = await fetch(`${API_BASE}/integration/metrics`, {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        
        if (metricsResponse.ok) {
            const metricsResult = await metricsResponse.json();
            console.log('✅ Métricas obtidas:', JSON.stringify(metricsResult, null, 2));
        } else {
            const error = await metricsResponse.text();
            console.log('❌ Erro nas métricas:', error);
        }
        
        // 3. Testar geração de link
        console.log('\n3️⃣ Testando geração de link...');
        const linkResponse = await fetch(`${API_BASE}/integration/generate-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            },
            body: JSON.stringify({
                baseUrl: 'https://test.com.br/produto',
                campaignName: 'teste_campanha'
            })
        });
        
        if (linkResponse.ok) {
            const linkResult = await linkResponse.json();
            console.log('✅ Link gerado:', linkResult);
        } else {
            const error = await linkResponse.text();
            console.log('❌ Erro na geração de link:', error);
        }
        
    } catch (error) {
        console.error('💥 Erro geral:', error.message);
        console.log('\n⚠️  Certifique-se de que a API está rodando em localhost:3001');
    }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    testEndpoints();
}

module.exports = testEndpoints; 