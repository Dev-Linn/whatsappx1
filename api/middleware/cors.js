const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Configuração CORS
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080',
        // Aceitar qualquer IP da rede local nas portas comuns
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:(3000|3001|8080|5173)$/,
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(3000|3001|8080|5173)$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:(3000|3001|8080|5173)$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: {
        error: 'Muitas requisições, tente novamente em 15 minutos'
    }
});

// Rate limiting mais restritivo para endpoints de escrita
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // máximo 20 requests de escrita por IP
    message: {
        error: 'Muitas operações de escrita, tente novamente em 15 minutos'
    }
});

// Middleware de erro global
const errorHandler = (error, req, res, next) => {
    console.error('❌ Erro na API:', error);
    
    // Erro de validação do Sequelize
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: error.errors.map(e => e.message)
        });
    }
    
    // Erro de banco de dados
    if (error.name === 'SequelizeDatabaseError') {
        return res.status(500).json({
            error: 'Erro interno do banco de dados'
        });
    }
    
    // Erro genérico
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

// Middleware de log de requests
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, url } = req;
        const { statusCode } = res;
        
        console.log(`📡 ${method} ${url} - ${statusCode} (${duration}ms)`);
    });
    
    next();
};

// Middleware de resposta padronizada
const responseHelper = (req, res, next) => {
    // Success response
    res.success = (data, message = 'Sucesso') => {
        res.json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    };
    
    // Error response
    res.error = (message, statusCode = 400, details = null) => {
        res.status(statusCode).json({
            success: false,
            error: message,
            details,
            timestamp: new Date().toISOString()
        });
    };
    
    next();
};

module.exports = {
    cors: cors(corsOptions),
    helmet: helmet(),
    compression: compression(),
    limiter,
    strictLimiter,
    errorHandler,
    requestLogger,
    responseHelper
}; 