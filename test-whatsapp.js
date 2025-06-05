const fetch = require('node-fetch');

async function testWhatsAppInit() {
    console.log('🔧 Testando comunicação com backend WhatsApp...');
    
    try {
        // Testar status primeiro
        console.log('1. Testando status do backend...');
        const statusResponse = await fetch('http://159.223.164.124:3002/status');
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('✅ Status backend:', statusData);
        } else {
            console.log('❌ Erro no status:', statusResponse.status);
            return;
        }

        // Testar inicialização
        console.log('2. Testando inicialização...');
        const initResponse = await fetch('http://159.223.164.124:3002/initialize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tenant_id: '1' })
        });

        if (initResponse.ok) {
            const initData = await initResponse.json();
            console.log('✅ Inicialização OK:', initData);
        } else {
            const errorText = await initResponse.text();
            console.log('❌ Erro na inicialização:', initResponse.status, errorText);
        }

    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

testWhatsAppInit(); 