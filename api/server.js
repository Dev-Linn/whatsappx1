#!/usr/bin/env node

// WhatsApp Gemini Bot - API REST Server
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Importar database e middleware
const ApiDatabase = require('./database');
const {
    cors,
    helmet,
    compression,
    limiter,
    strictLimiter,
    errorHandler,
    requestLogger,
    responseHelper
} = require('./middleware/cors');

// Importar rotas
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');
const costsRoutes = require('./routes/costs');
const conversationsRoutes = require('./routes/conversations');
const followupRoutes = require('./routes/followup');
const promptsRoutes = require('./routes/prompts');

// Importar middleware de autenticação
const { authenticateToken, tenantIsolation } = require('./middleware/auth');

// Rotas de autenticação (públicas)
const authRoutes = require('./routes/auth');

// Configurar Express
const app = express();
const server = createServer(app);
const PORT = process.env.API_PORT || 3001;

// Middleware global
app.use(helmet);
app.use(compression);
app.use(cors);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use(responseHelper);

// Servir arquivos de áudio estáticos
app.use('/api/v1/audio', express.static(path.join(__dirname, '../backend/audio')));

// Rate limiting
app.use('/api/', limiter);

// Configuração do Socket.IO
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:8080", "http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});

// Socket.IO com autenticação e rooms por tenant
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            throw new Error('Token requerido');
        }

        // Verificar JWT
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('./middleware/auth');
        const decoded = jwt.verify(token, JWT_SECRET);
        
        socket.tenantId = decoded.tenantId;
        socket.email = decoded.email;
        next();
    } catch (error) {
        console.error('❌ Socket.IO auth error:', error.message);
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id} (Tenant: ${socket.tenantId})`);
    
    // Entrar na room do tenant
    socket.join(`tenant_${socket.tenantId}`);
    
    // Enviar status atual do WhatsApp para o tenant
    const tenantStatus = getWhatsAppStatus(socket.tenantId);
    socket.emit('whatsapp-status', tenantStatus);
    
    socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
});

// Socket.IO para WhatsApp
// Estrutura para gerenciar múltiplas instâncias de WhatsApp por tenant
const whatsappInstances = new Map(); // tenant_id -> whatsappStatus

// Controle de rate limiting para auto-inicialização - POR USUÁRIO INDIVIDUAL
const initializationAttempts = new Map(); // userId -> { lastAttempt, attempts }
const MAX_INIT_ATTEMPTS_PER_HOUR = 10; // 10 tentativas por hora POR USUÁRIO
const INIT_COOLDOWN_MS = 1 * 60 * 1000; // 1min entre tentativas POR USUÁRIO

const getDefaultWhatsAppStatus = () => ({
    connected: false,
    authenticated: false,
    qrCode: null,
    message: 'Aguardando conexão...',
    lastUpdate: new Date().toISOString()
});

// Função para verificar se pode tentar inicializar - AGORA POR USUÁRIO
const canAttemptInitialization = (userId) => {
    const now = Date.now();
    const attempts = initializationAttempts.get(userId);
    
    if (!attempts) {
        initializationAttempts.set(userId, { lastAttempt: now, attempts: 1 });
        return true;
    }
    
    // Reset contador se passou mais de 1 hora
    if (now - attempts.lastAttempt > 60 * 60 * 1000) {
        initializationAttempts.set(userId, { lastAttempt: now, attempts: 1 });
        return true;
    }
    
    // Verificar se ainda está no cooldown
    if (now - attempts.lastAttempt < INIT_COOLDOWN_MS) {
        return false;
    }
    
    // Verificar se não excedeu tentativas por hora
    if (attempts.attempts >= MAX_INIT_ATTEMPTS_PER_HOUR) {
        return false;
    }
    
    // Incrementar tentativas
    attempts.attempts++;
    attempts.lastAttempt = now;
    return true;
};

// Função para obter status de um tenant específico
const getWhatsAppStatus = (tenantId) => {
    if (!whatsappInstances.has(tenantId)) {
        whatsappInstances.set(tenantId, getDefaultWhatsAppStatus());
    }
    return whatsappInstances.get(tenantId);
};

// Função para atualizar status de um tenant específico
const updateWhatsAppStatus = (tenantId, status) => {
    const currentStatus = getWhatsAppStatus(tenantId);
    const newStatus = { ...currentStatus, ...status, lastUpdate: new Date().toISOString() };
    
    // Só loga se houve mudança significativa
    const hasSignificantChange = 
        currentStatus.connected !== newStatus.connected ||
        currentStatus.authenticated !== newStatus.authenticated ||
        (currentStatus.qrCode !== newStatus.qrCode && newStatus.qrCode) ||
        currentStatus.message !== newStatus.message;
    
    if (hasSignificantChange) {
        console.log(`🔄 [Tenant ${tenantId}] Status: ${newStatus.message}`);
    }
    
    whatsappInstances.set(tenantId, newStatus);
    
    // Emitir apenas para clientes do tenant específico
    io.to(`tenant_${tenantId}`).emit('whatsapp-status', newStatus);
};

// Routes - Configuradas na função startServer() com banco de dados
// app.use('/api/v1/dashboard', dashboardRoutes);
// app.use('/api/v1/users', usersRoutes);
// app.use('/api/v1/conversations', conversationsRoutes);
// app.use('/api/v1/costs', costsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'WhatsApp Gemini Bot API',
        version: '1.0.0',
        description: 'API REST para análise e gerenciamento do chatbot WhatsApp',
        endpoints: {
            dashboard: '/api/v1/dashboard',
            users: '/api/v1/users',
            conversations: '/api/v1/conversations',
            costs: '/api/v1/costs',
            health: '/health',
            docs: '/api/docs'
        },
        documentation: 'https://github.com/seu-usuario/whatsapp-bot',
        contact: 'your-email@example.com'
    });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'WhatsApp Gemini Bot API - Documentação',
        version: '1.0.0',
        baseUrl: `http://localhost:${PORT}/api/v1`,
        endpoints: {
            dashboard: {
                'GET /dashboard': 'Dashboard completo com todas as estatísticas',
                'GET /dashboard/overview': 'Visão geral básica',
                'GET /dashboard/activity': 'Atividade recente',
                'GET /dashboard/leads': 'Informações sobre leads',
                'GET /dashboard/hot-leads': 'Leads quentes (interessados + positivos)',
                'GET /dashboard/recent-activity': 'Atividade das últimas 24h',
                'GET /dashboard/analytics?days=7': 'Analytics avançados'
            },
            users: {
                'GET /users': 'Lista usuários com filtros e paginação',
                'GET /users/:id': 'Detalhes de um usuário específico',
                'PUT /users/:id': 'Atualizar stage/observações do usuário',
                'GET /users/:id/history': 'Histórico completo do usuário',
                'GET /users/:id/analytics': 'Analytics específicos do usuário',
                'GET /users/search/advanced?q=termo': 'Busca avançada de usuários',
                'GET /users/stats/stages': 'Estatísticas por stage',
                'GET /users/stats/sentiment': 'Estatísticas por sentimento',
                'GET /users/export': 'Exportar dados de usuários',
                'POST /users/:id/trigger-analysis': 'Forçar análise de sentimento'
            },
            costs: {
                'GET /costs': 'Análise completa de custos',
                'GET /costs/summary': 'Resumo financeiro',
                'GET /costs/daily?days=30': 'Custos por dia',
                'GET /costs/monthly': 'Custos mensais',
                'GET /costs/top-users': 'Usuários que mais custam',
                'GET /costs/projections': 'Projeções de gastos',
                'GET /costs/tokens': 'Análise de tokens',
                'GET /costs/alerts': 'Alertas de custos',
                'GET /costs/export': 'Exportar dados de custos'
            },
            conversations: {
                'GET /conversations': 'Lista conversas com filtros',
                'GET /conversations/:id': 'Detalhes de uma conversa',
                'GET /conversations/:id/messages': 'Mensagens de uma conversa',
                'GET /conversations/search/messages?q=termo': 'Buscar mensagens',
                'GET /conversations/stats/overview': 'Estatísticas de conversas',
                'GET /conversations/recent/activity': 'Conversas recentes',
                'GET /conversations/analytics/detailed': 'Analytics detalhados',
                'GET /conversations/export/data': 'Exportar conversas',
                'DELETE /conversations/:id': 'Deletar conversa (admin)'
            }
        },
        queryParameters: {
            pagination: 'page=1&limit=20',
            filters: 'stage=interessado&sentiment=positivo&search=termo',
            sorting: 'sortBy=last_contact&sortOrder=DESC',
            timeRange: 'days=30'
        },
        responseFormat: {
            success: {
                success: true,
                message: 'string',
                data: 'object|array',
                timestamp: 'ISO8601'
            },
            error: {
                success: false,
                error: 'string',
                details: 'object|null',
                timestamp: 'ISO8601'
            }
        }
    });
});

// Initialize database and start server
async function startServer() {
    try {
        console.log('🚀 Iniciando API do WhatsApp Gemini Bot...');
        
        // Inicializar banco de dados
        const db = new ApiDatabase();
        const dbConnected = await db.initialize();
        
        if (!dbConnected) {
            console.error('❌ Falha ao conectar com banco de dados. Abortando...');
            process.exit(1);
        }
        
        // Configurar rotas de autenticação (públicas)
        app.use('/api/v1/auth', authRoutes(db));
        
        // Configurar rotas da API v1 (com autenticação)
        // Rotas protegidas - requerem JWT
        app.use('/api/v1/dashboard', authenticateToken, tenantIsolation, dashboardRoutes(db));
        app.use('/api/v1/users', authenticateToken, tenantIsolation, strictLimiter, usersRoutes(db));
        app.use('/api/v1/costs', authenticateToken, tenantIsolation, costsRoutes(db));
        app.use('/api/v1/conversations', authenticateToken, tenantIsolation, conversationsRoutes(db));
        app.use('/api/v1/followup', authenticateToken, tenantIsolation, followupRoutes(db));
        app.use('/api/v1/prompts', promptsRoutes(db));
        
        // Rotas do WhatsApp (com autenticação)
        app.get('/api/v1/whatsapp/status', authenticateToken, tenantIsolation, async (req, res) => {
            const tenantId = req.tenant?.id;
            
            // Não fazer auto-inicialização automática - apenas retornar status atual
            // A inicialização será feita apenas quando o usuário acessar a página WhatsApp Login
            
            const status = getWhatsAppStatus(tenantId);
            res.success(status, 'Status do WhatsApp obtido com sucesso');
        });

        // Nova rota para inicializar WhatsApp sob demanda
        app.post('/api/v1/whatsapp/initialize', authenticateToken, tenantIsolation, async (req, res) => {
            const tenantId = req.tenant?.id;
            const userId = req.user?.id; // Pegar ID do usuário do token
            
            try {
                // Verificar rate limiting POR USUÁRIO (não por tenant)
                if (!canAttemptInitialization(userId)) {
                    return res.error('Você tentou muitas vezes - aguarde 1 minuto', 429);
                }
                
                // Inicializar instância
                const initResponse = await fetch('http://localhost:3002/initialize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tenant_id: tenantId })
                });
                
                if (initResponse.ok) {
                    const result = await initResponse.json();
                    console.log(`✅ Instância WhatsApp inicializada para tenant ${tenantId} por usuário ${userId}`);
                    res.success(null, 'Instância WhatsApp inicializada com sucesso');
                } else {
                    console.error(`❌ Erro ao inicializar instância para tenant ${tenantId}:`, initResponse.status);
                    res.error('Erro ao inicializar instância WhatsApp', 500);
                }
            } catch (error) {
                console.error(`❌ Erro ao inicializar instância para tenant ${tenantId}:`, error.message);
                res.error('Erro ao comunicar com backend', 500);
            }
        });

        app.post('/api/v1/whatsapp/status', (req, res) => {
            try {
                // Esta rota pode ser chamada pelo backend sem autenticação
                // mas precisa incluir tenant_id no body
                const { qrCode, connected, authenticated, message, tenant_id } = req.body;
                
                if (!tenant_id) {
                    return res.error('tenant_id é obrigatório', 400);
                }
                
                // Atualiza status interno
                updateWhatsAppStatus(tenant_id, {
                    qrCode: qrCode || getWhatsAppStatus(tenant_id).qrCode,
                    connected: connected !== undefined ? connected : getWhatsAppStatus(tenant_id).connected,
                    authenticated: authenticated !== undefined ? authenticated : getWhatsAppStatus(tenant_id).authenticated,
                    message: message || getWhatsAppStatus(tenant_id).message
                });
                
                res.success(getWhatsAppStatus(tenant_id), 'Status atualizado com sucesso');
            } catch (error) {
                console.error('❌ Erro ao processar status:', error);
                res.error('Erro ao atualizar status', error.message);
            }
        });

        app.post('/api/v1/whatsapp/restart', authenticateToken, tenantIsolation, async (req, res) => {
            try {
                const tenantId = req.tenant?.id;
                
                // Atualiza status local primeiro
                updateWhatsAppStatus(tenantId, {
                    message: 'Reiniciando conexão...',
                    connected: false,
                    authenticated: false,
                    qrCode: null
                });
                
                // Chama o backend para realmente reiniciar o cliente do tenant
                try {
                    const backendResponse = await fetch('http://localhost:3002/restart', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ tenant_id: tenantId })
                    });
                    
                    if (backendResponse.ok) {
                        const result = await backendResponse.json();
                        console.log(`✅ Comando de restart enviado ao backend para tenant ${tenantId}:`, result.message);
                        res.success(null, 'Restart iniciado com sucesso');
                    } else {
                        console.error(`❌ Backend retornou erro no restart para tenant ${tenantId}:`, backendResponse.status);
                        res.success(null, 'Comando de restart enviado (verificar logs do backend)');
                    }
                } catch (backendError) {
                    console.error(`❌ Erro ao comunicar com backend para restart tenant ${tenantId}:`, backendError.message);
                    res.success(null, 'Comando de restart enviado (backend pode estar reiniciando)');
                }
                
            } catch (error) {
                console.error('❌ Erro no restart:', error);
                res.error('Erro ao reiniciar WhatsApp', error.message);
            }
        });

        app.post('/api/v1/whatsapp/logout', authenticateToken, tenantIsolation, async (req, res) => {
            try {
                const tenantId = req.tenant?.id;
                
                // Atualiza status local primeiro
                updateWhatsAppStatus(tenantId, {
                    message: 'Fazendo logout...',
                    connected: false,
                    authenticated: false,
                    qrCode: null
                });
                
                // Chama o backend para realmente deslogar o cliente do tenant
                try {
                    const backendResponse = await fetch('http://localhost:3002/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ tenant_id: tenantId })
                    });
                    
                    if (backendResponse.ok) {
                        const result = await backendResponse.json();
                        console.log(`✅ Comando de logout enviado ao backend para tenant ${tenantId}:`, result.message);
                        res.success(null, 'Logout realizado com sucesso');
                    } else {
                        console.error(`❌ Backend retornou erro no logout para tenant ${tenantId}:`, backendResponse.status);
                        res.success(null, 'Comando de logout enviado (verificar logs do backend)');
                    }
                } catch (backendError) {
                    console.error(`❌ Erro ao comunicar com backend para logout tenant ${tenantId}:`, backendError.message);
                    res.success(null, 'Comando de logout enviado (backend pode estar desconectando)');
                }
                
            } catch (error) {
                console.error('❌ Erro no logout:', error);
                res.error('Erro ao fazer logout do WhatsApp', error.message);
            }
        });
        
        // Rota especial para buscar primeiro tenant (para o backend)
        app.get('/api/v1/tenants/first', async (req, res) => {
            try {
                const firstTenant = await db.Tenant.findOne({
                    order: [['created_at', 'ASC']]
                });
                
                if (firstTenant) {
                    res.success(firstTenant, 'Primeiro tenant encontrado');
                } else {
                    res.error('Nenhum tenant encontrado', 404);
                }
            } catch (error) {
                console.error('❌ Erro ao buscar primeiro tenant:', error);
                res.error('Erro ao buscar primeiro tenant', error.message);
            }
        });

        // Rota para listar todos os tenants (para inicialização multi-instância)
        app.get('/api/v1/tenants/all', async (req, res) => {
            try {
                const tenants = await db.Tenant.findAll({
                    order: [['created_at', 'ASC']],
                    attributes: ['id', 'company_name', 'email', 'whatsapp_connected', 'status']
                });
                
                res.success(tenants, 'Tenants encontrados');
            } catch (error) {
                console.error('❌ Erro ao buscar todos os tenants:', error);
                res.error('Erro ao buscar tenants', error.message);
            }
        });

        // Rota para buscar tenant específico por ID
        app.get('/api/v1/tenants/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const tenant = await db.Tenant.findByPk(id, {
                    attributes: ['id', 'company_name', 'email', 'whatsapp_connected', 'status']
                });
                
                if (tenant) {
                    res.success(tenant, 'Tenant encontrado');
                } else {
                    res.error('Tenant não encontrado', 404);
                }
            } catch (error) {
                console.error('❌ Erro ao buscar tenant:', error);
                res.error('Erro ao buscar tenant', error.message);
            }
        });
        
        // Rota para busca global
        app.get('/api/v1/search', async (req, res) => {
            try {
                const { q, limit = 20 } = req.query;
                
                if (!q || q.trim().length < 2) {
                    return res.error('Query de busca deve ter pelo menos 2 caracteres', 400);
                }
                
                const results = await db.search(q.trim(), { limit });
                res.success(results, 'Busca global realizada');
            } catch (error) {
                res.error('Erro na busca global', 500);
            }
        });
        
        // Rota para estatísticas gerais
        app.get('/api/v1/stats', async (req, res) => {
            try {
                const stats = await db.getDashboardStats();
                res.success(stats, 'Estatísticas gerais carregadas');
            } catch (error) {
                res.error('Erro ao carregar estatísticas', 500);
            }
        });
        
        // Rota 404 para API
        app.use('/api/*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint não encontrado',
                message: 'Verifique a documentação em /api/docs',
                timestamp: new Date().toISOString()
            });
        });
        
        // Middleware de erro global
        app.use(errorHandler);

        // Iniciar servidor HTTP (com Socket.IO)
        server.listen(PORT, '0.0.0.0', () => {
            console.log('✅ API REST iniciada com sucesso!');
            console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
            console.log(`📡 Acessível na rede em: http://192.168.1.17:${PORT}`);
            console.log('');
            console.log('📈 Monitoramento em tempo real ativo!');
        });
        
    } catch (error) {
        console.error('❌ Erro ao inicializar API:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
    process.exit(1);
});

// Start the server
startServer().catch((error) => {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
}); 