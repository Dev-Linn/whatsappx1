// Script para diagnosticar e corrigir problema do token

const jwt = require('jsonwebtoken');

// Mesmas credenciais que funcionam
const testCredentials = {
    email: 'linnsilva3636@gmail.com',
    password: 'Edivanio123!'
};

const JWT_SECRET = 'seu_jwt_secret_super_seguro_aqui_123';

// Gerar token válido
const validToken = jwt.sign({
    tenantId: 2,
    email: 'linnsilva3636@gmail.com',
    companyName: 'Teste'
}, JWT_SECRET, { expiresIn: '7d' });

console.log('🔧 [FIX TOKEN] Token válido gerado:');
console.log(validToken);
console.log();

console.log('📋 [FIX TOKEN] Instruções para corrigir:');
console.log('1. Abra o DevTools (F12)');
console.log('2. Vá para Console');
console.log('3. Execute:');
console.log(`   localStorage.clear();`);
console.log(`   localStorage.setItem('whatsapp_bot_token', '${validToken}');`);
console.log(`   localStorage.setItem('whatsapp_bot_tenant', '2');`);
console.log('4. Recarregue a página');
console.log();

console.log('🧪 [FIX TOKEN] Para testar se funcionou:');
console.log('   console.log(localStorage.getItem("whatsapp_bot_token"));'); 