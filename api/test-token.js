const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'whatsapp-bot-jwt-secret-key-2024';

console.log('🔍 Debug de Token JWT');
console.log('═'.repeat(50));

// Simular um token exemplo
const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // Exemplo do log

if (process.argv[2]) {
    const token = process.argv[2];
    console.log('🎯 Testando token fornecido:');
    console.log(`Token: ${token.substring(0, 50)}...`);
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token VÁLIDO!');
        console.log('📄 Dados do token:', JSON.stringify(decoded, null, 2));
        
        // Verificar expiração
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = decoded.exp - now;
        
        if (timeLeft > 0) {
            console.log(`⏰ Token expira em: ${Math.floor(timeLeft / 3600)} horas e ${Math.floor((timeLeft % 3600) / 60)} minutos`);
        } else {
            console.log('⚠️ Token EXPIRADO!');
        }
        
    } catch (error) {
        console.log('❌ Token INVÁLIDO!');
        console.log('Erro:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            console.log('🕐 Motivo: Token expirado');
        } else if (error.name === 'JsonWebTokenError') {
            console.log('🔧 Motivo: Token malformado ou assinatura inválida');
        }
    }
} else {
    console.log('ℹ️  Como usar:');
    console.log('node test-token.js "SEU_TOKEN_AQUI"');
    console.log('');
    console.log('💡 Exemplo de token válido para teste:');
    
    // Criar um token de teste
    const testPayload = {
        tenantId: 1,
        email: 'test@test.com',
        companyName: 'Test Company'
    };
    
    const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '7d' });
    console.log('🧪 Token de teste gerado:');
    console.log(testToken);
    
    console.log('\n🔧 Configurações:');
    console.log(`JWT_SECRET: ${JWT_SECRET.substring(0, 10)}...`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
}

console.log('\n🛠️  Para testar manualmente:');
console.log('curl -H "Authorization: Bearer SEU_TOKEN" https://lucrogourmet.shop/api/v1/analytics/integration/metrics'); 