const fetch = require('node-fetch');

const API_BASE = 'https://lucrogourmet.shop/api/v1';

// Credenciais fornecidas
const credentials = {
    email: 'linnsilva3636@gmail.com',
    password: 'Edivanio123!'
};

async function testCompleteFlow() {
    console.log('🔐 Testando fluxo completo de autenticação...');
    console.log('═'.repeat(60));
    
    try {
        // 1. Fazer login
        console.log('\n1️⃣ Fazendo login...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        if (!loginResponse.ok) {
            const errorText = await loginResponse.text();
            console.log('❌ Erro no login:', loginResponse.status, errorText);
            return;
        }

        const loginData = await loginResponse.json();
        console.log('✅ Login bem-sucedido!');
        console.log('📄 Dados recebidos:', JSON.stringify(loginData, null, 2));

        const token = loginData.token;
        if (!token) {
            console.log('❌ Token não encontrado na resposta do login');
            return;
        }

        console.log(`🎫 Token: ${token.substring(0, 50)}...`);

        // 2. Testar endpoint de teste de auth
        console.log('\n2️⃣ Testando endpoint de autenticação...');
        const authTestResponse = await fetch(`${API_BASE}/analytics/auth/test`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (authTestResponse.ok) {
            const authTestData = await authTestResponse.json();
            console.log('✅ Teste de auth bem-sucedido!');
            console.log('📄 Dados:', JSON.stringify(authTestData, null, 2));
        } else {
            const errorText = await authTestResponse.text();
            console.log('❌ Erro no teste de auth:', authTestResponse.status, errorText);
        }

        // 3. Testar endpoint de métricas
        console.log('\n3️⃣ Testando endpoint de métricas...');
        const metricsResponse = await fetch(`${API_BASE}/analytics/integration/metrics`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            console.log('✅ Métricas obtidas com sucesso!');
            console.log('📊 Status de integração:', metricsData.integrated ? 'INTEGRADO' : 'NÃO INTEGRADO');
        } else {
            const errorText = await metricsResponse.text();
            console.log('❌ Erro nas métricas:', metricsResponse.status, errorText);
        }

        // 4. Testar geração de link
        console.log('\n4️⃣ Testando geração de link...');
        const linkResponse = await fetch(`${API_BASE}/analytics/integration/generate-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                baseUrl: 'https://teste.com.br/produto',
                campaignName: 'teste_automatico'
            })
        });

        if (linkResponse.ok) {
            const linkData = await linkResponse.json();
            console.log('✅ Link gerado com sucesso!');
            console.log('🔗 Link:', linkData.trackedUrl);
        } else {
            const errorText = await linkResponse.text();
            console.log('❌ Erro na geração de link:', linkResponse.status, errorText);
        }

    } catch (error) {
        console.error('💥 Erro geral:', error.message);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('🏁 Teste completo finalizado!');
}

// Executar teste
testCompleteFlow(); 