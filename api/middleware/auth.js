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
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Token de acesso requerido',
            details: 'Faça login para acessar este recurso'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                error: 'Token inválido ou expirado',
                details: 'Faça login novamente'
            });
        }

        req.tenant = {
            id: decoded.tenantId,
            email: decoded.email,
            companyName: decoded.companyName
        };

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