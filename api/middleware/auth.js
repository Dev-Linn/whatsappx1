const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

// Secret para JWT (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'whatsapp-bot-jwt-secret-key-2024';

// Debug para verificar se o JWT_SECRET está sendo carregado
if (!process.env.JWT_SECRET) {
    console.log('⚠️ JWT_SECRET não encontrado nas variáveis de ambiente, usando chave padrão');
} else {
    console.log('✅ JWT_SECRET carregado das variáveis de ambiente');
}

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    console.log('🔍 [AUTH DEBUG] ===================');
    console.log('🔍 [AUTH DEBUG] URL:', req.originalUrl);
    console.log('🔍 [AUTH DEBUG] Método:', req.method);
    console.log('🔍 [AUTH DEBUG] Headers:', JSON.stringify(req.headers, null, 2));
    
    const authHeader = req.headers['authorization'];
    console.log('🔍 [AUTH DEBUG] Auth header:', authHeader);
    
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log('🔍 [AUTH DEBUG] Token extraído:', token ? `${token.substring(0, 20)}...` : 'NULL/UNDEFINED');

    if (!token) {
        console.log('❌ [AUTH DEBUG] Token não fornecido - retornando 401');
        return res.status(401).json({
            success: false,
            error: 'Token de acesso requerido',
            details: 'Faça login para acessar este recurso'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('❌ [AUTH DEBUG] Erro na verificação do JWT:', err.message);
            return res.status(403).json({
                success: false,
                error: 'Token inválido ou expirado',
                details: 'Faça login novamente'
            });
        }

        console.log('✅ [AUTH DEBUG] Token válido. Decoded:', JSON.stringify(decoded, null, 2));

        // Adiciona informações do tenant ao request
        req.tenant = {
            id: decoded.tenantId,
            email: decoded.email,
            companyName: decoded.companyName
        };

        console.log('✅ [AUTH DEBUG] Tenant info adicionado:', JSON.stringify(req.tenant, null, 2));
        next();
    });
};

// Middleware de isolamento por tenant
const tenantIsolation = (req, res, next) => {
    // Este middleware deve ser usado APÓS authenticateToken
    if (!req.tenant || !req.tenant.id) {
        return res.status(403).json({
            success: false,
            error: 'Informações de tenant não encontradas',
            details: 'Token inválido'
        });
    }

    // Adiciona filtro automático de tenant em todas as queries
    const originalQuery = req.query;
    req.query = {
        ...originalQuery,
        tenant_id: req.tenant.id
    };

    next();
};

// Função para gerar JWT
const generateToken = (tenant) => {
    return jwt.sign(
        {
            tenantId: tenant.id,
            email: tenant.email,
            companyName: tenant.company_name
        },
        JWT_SECRET,
        { 
            expiresIn: '7d' // Token válido por 7 dias
        }
    );
};

// Função para hash de senha
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

// Função para verificar senha
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Função para validar email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Função para validar senha forte
const isValidPassword = (password) => {
    // Pelo menos 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

module.exports = {
    authenticateToken,
    tenantIsolation,
    generateToken,
    hashPassword,
    verifyPassword,
    isValidEmail,
    isValidPassword,
    JWT_SECRET
}; 