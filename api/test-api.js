#!/usr/bin/env node

// Script de teste para validar a API REST
const baseUrl = 'http://localhost:3001';

async function testEndpoint(method, endpoint, body = null) {
    const url = `${baseUrl}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        
        console.log(`✅ ${method} ${endpoint} - ${response.status}`);
        if (!response.ok) {
            console.log(`   ❌ Erro: ${data.error}`);
        } else {
            console.log(`   📊 Dados: ${JSON.stringify(data.data).substring(0, 100)}...`);
        }
        return { success: response.ok, data };
    } catch (error) {
        console.log(`❌ ${method} ${endpoint} - ERRO DE CONEXÃO`);
        console.log(`   💥 ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('🧪 INICIANDO TESTES DA API REST\n');
    
    // Health Check
    console.log('1️⃣ HEALTH CHECK');
    await testEndpoint('GET', '/health');
    console.log('');
    
    // API Info
    console.log('2️⃣ API INFO');
    await testEndpoint('GET', '/api');
    await testEndpoint('GET', '/api/docs');
    console.log('');
    
    // Dashboard
    console.log('3️⃣ DASHBOARD');
    await testEndpoint('GET', '/api/v1/dashboard');
    await testEndpoint('GET', '/api/v1/dashboard/overview');
    await testEndpoint('GET', '/api/v1/dashboard/activity');
    await testEndpoint('GET', '/api/v1/dashboard/leads');
    await testEndpoint('GET', '/api/v1/dashboard/hot-leads');
    await testEndpoint('GET', '/api/v1/dashboard/recent-activity');
    await testEndpoint('GET', '/api/v1/dashboard/analytics?days=7');
    console.log('');
    
    // Users
    console.log('4️⃣ USUÁRIOS');
    await testEndpoint('GET', '/api/v1/users');
    await testEndpoint('GET', '/api/v1/users?page=1&limit=5');
    await testEndpoint('GET', '/api/v1/users?stage=interessado');
    await testEndpoint('GET', '/api/v1/users?sentiment=positivo');
    await testEndpoint('GET', '/api/v1/users/stats/stages');
    await testEndpoint('GET', '/api/v1/users/stats/sentiment');
    await testEndpoint('GET', '/api/v1/users/search/advanced?q=test');
    await testEndpoint('GET', '/api/v1/users/export');
    
    // Teste com usuário específico (se existir)
    const usersResponse = await testEndpoint('GET', '/api/v1/users?limit=1');
    if (usersResponse.success && usersResponse.data.users.length > 0) {
        const userId = usersResponse.data.users[0].id;
        await testEndpoint('GET', `/api/v1/users/${userId}`);
        await testEndpoint('GET', `/api/v1/users/${userId}/history`);
        await testEndpoint('GET', `/api/v1/users/${userId}/analytics`);
        
        // Teste de atualização
        await testEndpoint('PUT', `/api/v1/users/${userId}`, {
            observations: 'Teste automatizado da API'
        });
        
        await testEndpoint('POST', `/api/v1/users/${userId}/trigger-analysis`);
    }
    console.log('');
    
    // Costs
    console.log('5️⃣ CUSTOS');
    await testEndpoint('GET', '/api/v1/costs');
    await testEndpoint('GET', '/api/v1/costs/summary');
    await testEndpoint('GET', '/api/v1/costs/daily?days=7');
    await testEndpoint('GET', '/api/v1/costs/monthly');
    await testEndpoint('GET', '/api/v1/costs/top-users');
    await testEndpoint('GET', '/api/v1/costs/projections');
    await testEndpoint('GET', '/api/v1/costs/tokens');
    await testEndpoint('GET', '/api/v1/costs/alerts');
    await testEndpoint('GET', '/api/v1/costs/export');
    console.log('');
    
    // Conversations
    console.log('6️⃣ CONVERSAS');
    await testEndpoint('GET', '/api/v1/conversations');
    await testEndpoint('GET', '/api/v1/conversations?limit=5');
    await testEndpoint('GET', '/api/v1/conversations/search/messages?q=test');
    await testEndpoint('GET', '/api/v1/conversations/stats/overview');
    await testEndpoint('GET', '/api/v1/conversations/recent/activity');
    await testEndpoint('GET', '/api/v1/conversations/analytics/detailed?days=7');
    await testEndpoint('GET', '/api/v1/conversations/export/data?days=7');
    
    // Teste com conversa específica (se existir)
    const conversationsResponse = await testEndpoint('GET', '/api/v1/conversations?limit=1');
    if (conversationsResponse.success && conversationsResponse.data.conversations.length > 0) {
        const conversationId = conversationsResponse.data.conversations[0].id;
        await testEndpoint('GET', `/api/v1/conversations/${conversationId}`);
        await testEndpoint('GET', `/api/v1/conversations/${conversationId}/messages`);
    }
    console.log('');
    
    // Global endpoints
    console.log('7️⃣ ENDPOINTS GLOBAIS');
    await testEndpoint('GET', '/api/v1/search?q=test');
    await testEndpoint('GET', '/api/v1/stats');
    console.log('');
    
    // Error handling
    console.log('8️⃣ TRATAMENTO DE ERROS');
    await testEndpoint('GET', '/api/v1/users/999999'); // Usuário inexistente
    await testEndpoint('GET', '/api/v1/conversations/999999'); // Conversa inexistente
    await testEndpoint('GET', '/api/v1/nonexistent'); // Endpoint inexistente
    await testEndpoint('PUT', '/api/v1/users/999999', { stage: 'invalid' }); // Dados inválidos
    console.log('');
    
    console.log('✅ TESTES CONCLUÍDOS!');
    console.log('📊 Verifique os resultados acima para validar a API.');
    console.log('🔗 Documentação completa: http://localhost:3001/api/docs');
}

// Verificar se a API está rodando
async function checkApiStatus() {
    try {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok) {
            console.log('🟢 API está rodando e acessível!');
            return true;
        } else {
            console.log('🟡 API respondeu mas com erro');
            return false;
        }
    } catch (error) {
        console.log('🔴 API não está acessível!');
        console.log('💡 Certifique-se de que a API está rodando:');
        console.log('   cd api/ && npm run dev');
        return false;
    }
}

// Main
async function main() {
    console.log('🚀 TESTADOR DA API REST - WhatsApp Gemini Bot\n');
    
    const isRunning = await checkApiStatus();
    if (!isRunning) {
        process.exit(1);
    }
    
    console.log('');
    await runTests();
}

// Polyfill fetch para Node.js mais antigo
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

main().catch(error => {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
}); 