// Database Manager para API REST
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');

// Configuração do SQLite (conecta ao banco principal)
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../backend/data/whatsapp.db'),
    logging: false,
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});

// Modelos (mesmos do projeto principal)
const Tenant = sequelize.define('tenants', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    whatsapp_connected: { type: DataTypes.BOOLEAN, defaultValue: false },
    whatsapp_session_id: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    status: { 
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
    }
});

const User = sequelize.define('users', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, index: true },
    phone: { type: DataTypes.STRING(20), unique: true, allowNull: false, index: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    first_contact: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    last_contact: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    total_messages: { type: DataTypes.INTEGER, defaultValue: 0 },
    stage: { 
        type: DataTypes.ENUM('lead_frio', 'interessado', 'negociando', 'cliente', 'perdido'),
        defaultValue: 'lead_frio'
    },
    sentiment: {
        type: DataTypes.ENUM('positivo', 'neutro', 'negativo'),
        defaultValue: 'neutro'
    },
    observations: { type: DataTypes.TEXT, allowNull: true },
    last_analysis_at: { type: DataTypes.DATE, allowNull: true },
    messages_since_analysis: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    followup_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    followup_interval_hours: {
        type: DataTypes.INTEGER,
        defaultValue: 24 // 24 horas por padrão
    },
    last_followup_sent: {
        type: DataTypes.DATE,
        allowNull: true
    },
    next_followup_due: {
        type: DataTypes.DATE,
        allowNull: true
    },
    followup_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    followup_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'Oi! Ainda tem interesse nas receitas de pudim? 😊'
    }
});

const Conversation = sequelize.define('conversations', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, index: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, index: true },
    session_id: { type: DataTypes.STRING(50), allowNull: false, index: true },
    date: { type: DataTypes.DATEONLY, allowNull: false, index: true },
    message_count: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Message = sequelize.define('messages', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, index: true },
    conversation_id: { type: DataTypes.INTEGER, allowNull: false, index: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, index: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    is_bot: { type: DataTypes.BOOLEAN, defaultValue: false, index: true },
    message_length: { type: DataTypes.INTEGER, allowNull: false },
    is_audio: { type: DataTypes.BOOLEAN, defaultValue: false },
    audio_path: { type: DataTypes.STRING(500), allowNull: true },
    audio_duration: { type: DataTypes.INTEGER, allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, index: true }
});

const ApiCost = sequelize.define('api_costs', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, index: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true, index: true },
    message_id: { type: DataTypes.INTEGER, allowNull: true },
    input_tokens: { type: DataTypes.INTEGER, allowNull: false },
    output_tokens: { type: DataTypes.INTEGER, allowNull: false },
    total_tokens: { type: DataTypes.INTEGER, allowNull: false },
    cost_usd: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
    cost_brl: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, index: true }
});

const TenantPrompt = sequelize.define('tenant_prompts', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, index: true },
    base_prompt: { type: DataTypes.TEXT, allowNull: false },
    clarification_prompt: { type: DataTypes.TEXT, allowNull: true },
    qualification_prompt: { type: DataTypes.TEXT, allowNull: true },
    ai_model: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'gemini-1.5-flash' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Relacionamentos
Tenant.hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
Tenant.hasMany(Conversation, { foreignKey: 'tenant_id', as: 'conversations' });
Tenant.hasMany(Message, { foreignKey: 'tenant_id', as: 'messages' });
Tenant.hasMany(ApiCost, { foreignKey: 'tenant_id', as: 'costs' });

User.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
User.hasMany(Conversation, { foreignKey: 'user_id', as: 'conversations' });
User.hasMany(Message, { foreignKey: 'user_id', as: 'messages' });
User.hasMany(ApiCost, { foreignKey: 'user_id', as: 'costs' });

Conversation.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Conversation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' });

Message.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
Message.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' });

ApiCost.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
ApiCost.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ApiCost.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });

// Relacionamentos TenantPrompt
Tenant.hasOne(TenantPrompt, { foreignKey: 'tenant_id', as: 'prompt' });
TenantPrompt.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

class ApiDatabase {
    constructor() {
        this.sequelize = sequelize;
        this.Tenant = Tenant;
        this.User = User;
        this.Conversation = Conversation;
        this.Message = Message;
        this.ApiCost = ApiCost;
        this.TenantPrompt = TenantPrompt;
        this.Op = Op;
    }

    async initialize() {
        try {
            await sequelize.authenticate();
            console.log('✅ API conectada ao banco de dados!');
            
            // Sincronizar tabelas automaticamente
            await sequelize.sync({ alter: false });
            console.log('✅ Tabelas da API sincronizadas!');
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar API com banco:', error);
            return false;
        }
    }

    // DASHBOARD METHODS
    async getDashboardStats(tenantId = null) {
        try {
            // Filtro base para tenant
            const tenantFilter = tenantId ? { tenant_id: tenantId } : {};
            
            const [
                totalUsers,
                activeUsers,
                totalConversations,
                totalMessages,
                totalCosts,
                // Leads e stage distribution
                leadsByStage,
                // Sentiment distribution
                sentimentDistribution,
                // Recent activity (last 24h)
                recentUsers,
                recentMessages,
                // Daily activity (last 7 days)
                dailyActivity
            ] = await Promise.all([
                this.User.count({ where: tenantFilter }),
                this.User.count({ where: { ...tenantFilter, is_active: true } }),
                this.Conversation.count({ where: tenantFilter }),
                this.Message.count({ where: tenantFilter }),
                this.ApiCost.sum('cost_brl', { where: tenantFilter }),
                
                // Distribuição por stage
                this.User.findAll({
                    attributes: [
                        'stage',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                    ],
                    where: tenantFilter,
                    group: ['stage']
                }),
                
                // Distribuição por sentimento
                this.User.findAll({
                    attributes: [
                        'sentiment',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                    ],
                    where: { ...tenantFilter, sentiment: { [Op.ne]: null } },
                    group: ['sentiment']
                }),
                
                // Usuários recentes (24h)
                this.User.findAll({
                    where: {
                        ...tenantFilter,
                        last_contact: {
                            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    },
                    order: [['last_contact', 'DESC']],
                    limit: 5
                }),
                
                // Mensagens recentes (24h)
                this.Message.findAll({
                    where: {
                        ...tenantFilter,
                        timestamp: {
                            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    },
                    include: [{
                        model: this.User,
                        as: 'user',
                        attributes: ['name', 'phone']
                    }],
                    order: [['timestamp', 'DESC']],
                    limit: 10
                }),
                
                // Atividade diária (7 dias)
                this.Message.findAll({
                    attributes: [
                        [sequelize.fn('DATE', sequelize.col('timestamp')), 'date'],
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                        'is_bot'
                    ],
                    where: {
                        ...tenantFilter,
                        timestamp: {
                            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    },
                    group: [
                        sequelize.fn('DATE', sequelize.col('timestamp')),
                        'is_bot'
                    ],
                    order: [[sequelize.fn('DATE', sequelize.col('timestamp')), 'ASC']]
                })
            ]);

            // Cálculos
            const periodTotalCosts = parseFloat(totalCosts || 0);
            const allTimeTotalCosts = periodTotalCosts;
            const avgDaily = periodTotalCosts / 7;
            const monthlyAverage = avgDaily * 30;
            const costPerMessage = totalMessages > 0 ? periodTotalCosts / totalMessages : 0;

            return {
                overview: {
                    totalUsers: totalUsers || 0,
                    totalMessages: totalMessages || 0,
                    totalCosts: parseFloat(totalCosts || 0).toFixed(2),
                    activeUsersToday: activeUsers || 0,
                    activeUsersWeek: activeUsers || 0,
                    avgMessagesPerUser: totalUsers > 0 ? (totalMessages / totalUsers).toFixed(1) : 0
                },
                activity: {
                    messagesYesterday: recentMessages.length || 0,
                    messagesThisWeek: recentMessages.length || 0,
                    costsToday: parseFloat(dailyActivity.find(d => d.date === new Date().toLocaleDateString('pt-BR'))?.count || 0).toFixed(4),
                    costsThisMonth: parseFloat(dailyActivity.find(d => new Date(d.date).getMonth() + 1 === new Date().getMonth())?.count || 0).toFixed(2)
                },
                leads: {
                    hotLeads: leadsByStage.find(s => s.stage === 'interessado')?.count || 0,
                    sentimentDistribution: sentimentDistribution.map(s => ({
                        sentiment: s.sentiment,
                        count: parseInt(s.dataValues.count)
                    })),
                    stageDistribution: leadsByStage.map(s => ({
                        stage: s.stage,
                        count: parseInt(s.dataValues.count)
                    }))
                }
            };
        } catch (error) {
            console.error('❌ Erro ao gerar dashboard:', error);
            throw error;
        }
    }

    // USERS METHODS
    async getUsers(filters = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search,
                stage,
                sentiment,
                sortBy = 'last_contact',
                sortOrder = 'DESC',
                tenant_id
            } = filters;

            const offset = (page - 1) * limit;
            const whereClause = {};

            // Filtrar por tenant se fornecido
            if (tenant_id) {
                whereClause.tenant_id = tenant_id;
            }

            if (search && search.trim()) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { phone: { [Op.like]: `%${search}%` } },
                    { observations: { [Op.like]: `%${search}%` } }
                ];
            }

            if (stage && stage !== 'all') {
                whereClause.stage = stage;
            }

            if (sentiment && sentiment !== 'all') {
                whereClause.sentiment = sentiment;
            }

            const { count, rows } = await this.User.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset,
                order: [[sortBy, sortOrder]],
                include: [
                    {
                        model: this.Message,
                        as: 'messages',
                        limit: 1,
                        order: [['timestamp', 'DESC']],
                        required: false,
                        where: tenant_id ? { tenant_id } : {}
                    }
                ]
            });

            return {
                users: rows.map(user => ({
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    stage: user.stage,
                    sentiment: user.sentiment,
                    totalMessages: user.total_messages,
                    firstContact: user.first_contact,
                    lastContact: user.last_contact,
                    observations: user.observations,
                    lastAnalysis: user.last_analysis_at,
                    lastMessage: user.messages[0] ? {
                        content: user.messages[0].content.substring(0, 100) + '...',
                        timestamp: user.messages[0].timestamp,
                        isBot: user.messages[0].is_bot
                    } : null
                })),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Erro ao buscar usuários:', error);
            throw error;
        }
    }

    async getUserById(id, tenantId = null) {
        try {
            const whereClause = { id };
            
            // Adicionar filtro de tenant se fornecido
            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const user = await this.User.findOne({
                where: whereClause,
                include: [
                    {
                        model: this.Message,
                        as: 'messages',
                        order: [['timestamp', 'ASC']],
                        limit: 100
                    },
                    {
                        model: this.ApiCost,
                        as: 'costs',
                        order: [['timestamp', 'DESC']],
                        limit: 20
                    }
                ]
            });

            if (!user) return null;

            const totalCost = await this.ApiCost.sum('cost_brl', {
                where: { 
                    user_id: id,
                    ...(tenantId && { tenant_id: tenantId })
                }
            });

            return {
                id: user.id,
                name: user.name,
                phone: user.phone,
                stage: user.stage,
                sentiment: user.sentiment,
                observations: user.observations,
                totalMessages: user.total_messages,
                firstContact: user.first_contact,
                lastContact: user.last_contact,
                lastAnalysis: user.last_analysis_at,
                messagesSinceAnalysis: user.messages_since_analysis,
                isActive: user.is_active,
                totalCost: parseFloat(totalCost || 0).toFixed(4),
                messages: user.messages.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    isBot: msg.is_bot,
                    timestamp: msg.timestamp,
                    length: msg.message_length
                })),
                recentCosts: user.costs.map(cost => ({
                    id: cost.id,
                    inputTokens: cost.input_tokens,
                    outputTokens: cost.output_tokens,
                    totalTokens: cost.total_tokens,
                    costBRL: parseFloat(cost.cost_brl).toFixed(4),
                    timestamp: cost.timestamp
                }))
            };
        } catch (error) {
            console.error('❌ Erro ao buscar usuário:', error);
            throw error;
        }
    }

    async updateUser(id, data) {
        try {
            const user = await this.User.findByPk(id);
            if (!user) return null;

            const allowedFields = ['stage', 'observations', 'is_active'];
            const updateData = {};
            
            Object.keys(data).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = data[key];
                }
            });

            await user.update(updateData);
            return await this.getUserById(id);
        } catch (error) {
            console.error('❌ Erro ao atualizar usuário:', error);
            throw error;
        }
    }

    // COSTS METHODS
    async getCostsAnalysis(filters = {}) {
        try {
            const { days = 30, tenant_id } = filters;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Filtro base para tenant
            const tenantFilter = tenant_id ? { tenant_id } : {};

            const [
                totalCosts,
                totalRequests,
                avgCostPerRequest,
                dailyCosts,
                topUsers,
                totalCostsAllTime,
                modelStats
            ] = await Promise.all([
                // Custos do período
                this.ApiCost.sum('cost_brl', {
                    where: { 
                        ...tenantFilter,
                        timestamp: { [Op.gte]: startDate } 
                    }
                }),
                // Requests do período
                this.ApiCost.count({
                    where: { 
                        ...tenantFilter,
                        timestamp: { [Op.gte]: startDate } 
                    }
                }),
                // Média por request
                this.ApiCost.findOne({
                    attributes: [[sequelize.fn('AVG', sequelize.col('cost_brl')), 'avg']],
                    where: { 
                        ...tenantFilter,
                        timestamp: { [Op.gte]: startDate } 
                    }
                }),
                // Custos por dia
                this.ApiCost.findAll({
                    attributes: [
                        [sequelize.fn('DATE', sequelize.col('timestamp')), 'date'],
                        [sequelize.fn('SUM', sequelize.col('cost_brl')), 'total_cost'],
                        [sequelize.fn('COUNT', sequelize.col('api_costs.id')), 'requests'],
                        [sequelize.fn('SUM', sequelize.col('total_tokens')), 'total_tokens']
                    ],
                    where: { 
                        ...tenantFilter,
                        timestamp: { [Op.gte]: startDate } 
                    },
                    group: [sequelize.fn('DATE', sequelize.col('timestamp'))],
                    order: [[sequelize.fn('DATE', sequelize.col('timestamp')), 'ASC']]
                }),
                // Top usuários
                this.ApiCost.findAll({
                    attributes: [
                        'user_id',
                        [sequelize.fn('SUM', sequelize.col('cost_brl')), 'total_cost'],
                        [sequelize.fn('COUNT', sequelize.col('api_costs.id')), 'requests'],
                        [sequelize.fn('SUM', sequelize.col('total_tokens')), 'total_tokens']
                    ],
                    include: [{
                        model: this.User,
                        as: 'user',
                        attributes: ['name', 'phone'],
                        where: tenant_id ? { tenant_id } : {} // Filtrar usuários por tenant
                    }],
                    where: { 
                        ...tenantFilter,
                        timestamp: { [Op.gte]: startDate } 
                    },
                    group: ['user_id'],
                    order: [[sequelize.fn('SUM', sequelize.col('cost_brl')), 'DESC']],
                    limit: 10
                }),
                // Total geral (todos os tempos)
                this.ApiCost.sum('cost_brl', { where: tenantFilter }),
                // Estatísticas do modelo (análise de tokens)
                this.ApiCost.findOne({
                    attributes: [
                        [sequelize.fn('SUM', sequelize.col('input_tokens')), 'total_input'],
                        [sequelize.fn('SUM', sequelize.col('output_tokens')), 'total_output'],
                        [sequelize.fn('SUM', sequelize.col('total_tokens')), 'total_tokens'],
                        [sequelize.fn('SUM', sequelize.col('cost_brl')), 'total_cost'],
                        [sequelize.fn('COUNT', sequelize.col('id')), 'total_usage']
                    ],
                    where: { 
                        ...tenantFilter,
                        timestamp: { [Op.gte]: startDate } 
                    }
                })
            ]);

            // Cálculos
            const periodTotalCosts = parseFloat(totalCosts || 0);
            const allTimeTotalCosts = parseFloat(totalCostsAllTime || 0);
            const avgDaily = periodTotalCosts / days;
            const monthlyAverage = avgDaily * 30;
            const costPerMessage = totalRequests > 0 ? periodTotalCosts / totalRequests : 0;

            // Gerar dados do modelo atual (Gemini 1.5)
            const modelData = modelStats?.dataValues || {};
            const costsByModel = [];
            
            if (modelData.total_cost && parseFloat(modelData.total_cost) > 0) {
                costsByModel.push({
                    model: 'Gemini 1.5',
                    cost: parseFloat(modelData.total_cost || 0),
                    usage: parseInt(modelData.total_usage || 0),
                    tokens: parseInt(modelData.total_tokens || 0),
                    status: 'active'
                });
            }

            return {
                summary: {
                    totalCosts: allTimeTotalCosts, // Total geral (all time)
                    monthlyAverage: monthlyAverage, // Média mensal baseada no período
                    dailyAverage: avgDaily, // Média diária
                    costPerMessage: costPerMessage, // Custo por mensagem
                    totalRequests: totalRequests || 0,
                    periodCosts: periodTotalCosts, // Custos do período analisado
                    
                    // Para os gráficos
                    costsByDay: dailyCosts.map(day => ({
                        date: new Date(day.dataValues.date).toLocaleDateString('pt-BR'),
                        cost: parseFloat(day.dataValues.total_cost || 0),
                        messages: parseInt(day.dataValues.requests || 0)
                    })),
                    
                    // Dados reais do modelo
                    costsByModel: costsByModel
                },
                dailyBreakdown: dailyCosts.map(day => ({
                    date: day.dataValues.date,
                    cost: parseFloat(day.dataValues.total_cost || 0).toFixed(4),
                    requests: parseInt(day.dataValues.requests || 0),
                    tokens: parseInt(day.dataValues.total_tokens || 0)
                })),
                topUsers: topUsers.map(record => ({
                    userId: record.user_id,
                    userName: record.user?.name || 'Usuário',
                    userPhone: record.user?.phone || '',
                    totalCost: parseFloat(record.dataValues.total_cost || 0).toFixed(4),
                    requests: parseInt(record.dataValues.requests || 0)
                }))
            };
        } catch (error) {
            console.error('❌ Erro ao analisar custos:', error);
            throw error;
        }
    }

    // CONVERSATIONS METHODS
    async getConversations(filters = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                userId,
                date,
                sortBy = 'last_contact',
                sortOrder = 'DESC',
                groupByUser = true,
                tenant_id
            } = filters;

            const offset = (page - 1) * limit;

            if (groupByUser) {
                const where = {};
                if (userId) where.id = userId;
                if (tenant_id) where.tenant_id = tenant_id;

                const { count, rows } = await this.User.findAndCountAll({
                    where,
                    limit: parseInt(limit),
                    offset,
                    order: [[sortBy, sortOrder]],
                    include: [
                        {
                            model: this.Conversation,
                            as: 'conversations',
                            limit: 1,
                            order: [['created_at', 'DESC']],
                            required: true,
                            where: tenant_id ? { tenant_id } : {},
                            include: [
                                {
                                    model: this.Message,
                                    as: 'messages',
                                    limit: 1,
                                    order: [['timestamp', 'DESC']],
                                    required: false,
                                    where: tenant_id ? { tenant_id } : {}
                                }
                            ]
                        }
                    ]
                });

                return {
                    conversations: rows.map(user => {
                        const latestConv = user.conversations[0];
                        
                        // Validar se há conversas para este usuário
                        if (!latestConv) {
                            return null; // Retorna null para filtrar depois
                        }
                        
                        return {
                            id: latestConv.id,
                            userId: user.id,
                            user: {
                                id: user.id,
                                name: user.name,
                                phone: user.phone,
                                stage: user.stage,
                                sentiment: user.sentiment
                            },
                            sessionId: latestConv.session_id,
                            date: latestConv.date,
                            messageCount: latestConv.message_count,
                            lastContact: user.last_contact,
                            lastMessage: latestConv.messages && latestConv.messages[0] ? {
                                content: latestConv.messages[0].content.substring(0, 100) + '...',
                                timestamp: latestConv.messages[0].timestamp,
                                isBot: latestConv.messages[0].is_bot
                            } : null,
                            createdAt: latestConv.created_at,
                            updatedAt: latestConv.updated_at
                        };
                    }).filter(conv => conv !== null), // Remove conversas null
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(count / limit)
                    }
                };
            }

            const where = {};
            if (userId) where.user_id = userId;
            if (date) where.date = date;
            if (tenant_id) where.tenant_id = tenant_id;

            const { count, rows } = await this.Conversation.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset,
                order: [[sortBy, sortOrder]],
                include: [
                    {
                        model: this.User,
                        as: 'user',
                        attributes: ['name', 'phone', 'stage', 'sentiment'],
                        where: tenant_id ? { tenant_id } : {}
                    },
                    {
                        model: this.Message,
                        as: 'messages',
                        limit: 1,
                        order: [['timestamp', 'DESC']],
                        required: false,
                        where: tenant_id ? { tenant_id } : {}
                    }
                ]
            });

            return {
                conversations: rows.map(conv => {
                    // Validar se conversation e user existem
                    if (!conv || !conv.user) {
                        return null; // Retorna null para filtrar depois
                    }
                    
                    return {
                        id: conv.id,
                        sessionId: conv.session_id,
                        date: conv.date,
                        messageCount: conv.message_count,
                        user: {
                            id: conv.user.id,
                            name: conv.user.name,
                            phone: conv.user.phone,
                            stage: conv.user.stage,
                            sentiment: conv.user.sentiment
                        },
                        lastMessage: conv.messages && conv.messages[0] ? {
                            content: conv.messages[0].content.substring(0, 100) + '...',
                            timestamp: conv.messages[0].timestamp,
                            isBot: conv.messages[0].is_bot
                        } : null,
                        createdAt: conv.created_at,
                        updatedAt: conv.updated_at
                    };
                }).filter(conv => conv !== null), // Remove conversas null
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('❌ Erro ao buscar conversas:', error);
            throw error;
        }
    }

    async getConversationMessages(conversationId, tenantId = null) {
        try {
            const whereClause = { id: conversationId };
            
            // Adicionar filtro de tenant se fornecido
            if (tenantId) {
                whereClause.tenant_id = tenantId;
            }

            const conversation = await this.Conversation.findOne({
                where: whereClause,
                include: [
                    {
                        model: this.User,
                        as: 'user',
                        attributes: ['name', 'phone', 'stage', 'sentiment'],
                        where: tenantId ? { tenant_id: tenantId } : {} // Filtrar usuário por tenant
                    },
                    {
                        model: this.Message,
                        as: 'messages',
                        order: [['timestamp', 'ASC']],
                        where: tenantId ? { tenant_id: tenantId } : {} // Filtrar mensagens por tenant
                    }
                ]
            });

            if (!conversation) return null;

            return {
                id: conversation.id,
                sessionId: conversation.session_id,
                date: conversation.date,
                messageCount: conversation.message_count,
                user: conversation.user,
                messages: conversation.messages.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    isBot: msg.is_bot,
                    timestamp: msg.timestamp,
                    length: msg.message_length,
                    isAudio: msg.is_audio || false,
                    audioPath: msg.audio_path || null,
                    audioDuration: msg.audio_duration || null
                }))
            };
        } catch (error) {
            console.error('❌ Erro ao buscar mensagens da conversa:', error);
            throw error;
        }
    }

    // SEARCH METHODS
    async search(query, filters = {}) {
        try {
            const { limit = 20 } = filters;
            
            const users = await this.User.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: `%${query}%` } },
                        { phone: { [Op.like]: `%${query}%` } },
                        { observations: { [Op.like]: `%${query}%` } }
                    ]
                },
                limit: parseInt(limit),
                order: [['last_contact', 'DESC']]
            });

            const messages = await this.Message.findAll({
                where: {
                    content: { [Op.like]: `%${query}%` }
                },
                include: [{
                    model: this.User,
                    as: 'user',
                    attributes: ['name', 'phone']
                }],
                limit: parseInt(limit),
                order: [['timestamp', 'DESC']]
            });

            return {
                users: users.map(user => ({
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    stage: user.stage,
                    sentiment: user.sentiment,
                    lastContact: user.last_contact,
                    observations: user.observations
                })),
                messages: messages.map(msg => ({
                    id: msg.id,
                    content: msg.content.substring(0, 200) + '...',
                    isBot: msg.is_bot,
                    timestamp: msg.timestamp,
                    user: msg.user
                }))
            };
        } catch (error) {
            console.error('❌ Erro na busca:', error);
            throw error;
        }
    }

    // TENANT PROMPT METHODS
    async getTenantPrompt(tenantId) {
        try {
            // Primeiro buscar prompt ativo
            let prompt = await this.TenantPrompt.findOne({
                where: { tenant_id: tenantId, is_active: true }
            });

            if (prompt) {
                return {
                    id: prompt.id,
                    base_prompt: prompt.base_prompt,
                    clarification_prompt: prompt.clarification_prompt,
                    qualification_prompt: prompt.qualification_prompt,
                    ai_model: prompt.ai_model || 'gemini-1.5-flash',
                    is_active: prompt.is_active,
                    last_updated: prompt.last_updated,
                    is_default: false
                };
            }

            // Se não encontrou ativo, buscar qualquer prompt para este tenant
            const existingPrompt = await this.TenantPrompt.findOne({
                where: { tenant_id: tenantId }
            });

            const defaultPromptText = `VOCÊ É UMA PESSOA REAL QUE VENDE RECEITAS DE PUDIM

## SUA IDENTIDADE
- Você vende receitas de pudim online há um tempo
- Produto: Ebook com receitas testadas por 10 reais
- Link: go.perfectpay.com.br/PPU38CPPKIQ
- Converse como uma pessoa normal conversaria

## COMO FALAR
- Seja direta e natural
- Use linguagem do dia a dia: "oi", "pra", "tô", "né"
- Não seja fake nem exageradamente animada
- Responda só o que foi perguntado
- Seja confiante mas não insistente

## REGRAS PRINCIPAIS

**FAZER:**
- Responder direto ao que foi perguntado
- Ser natural e espontânea
- Variar completamente as respostas
- Falar das receitas sem ser técnica demais

**NÃO FAZER:**
- Repetir "Oi Marcelinha! Tudo bem?" toda hora
- Usar sempre as mesmas palavras
- Falar do link em toda resposta
- Ser robótica ou fake
- Dar respostas longas demais

**LEMBRE-SE: Você é uma pessoa normal vendendo receitas, não um robô de vendas**`;

            if (existingPrompt) {
                // Se existe mas está inativo, reativar com dados padrão
                prompt = await existingPrompt.update({
                    base_prompt: defaultPromptText,
                    clarification_prompt: 'Peça esclarecimento de forma natural: "Não entendi bem. Pode me explicar melhor?" ou "Como assim? Me conta mais detalhes"',
                    qualification_prompt: 'Identifique se a pessoa tem interesse real em comprar receitas para vender doces ou apenas curiosidade.',
                    ai_model: 'gemini-1.5-flash',
                    is_active: true,
                    last_updated: new Date()
                });
            } else {
                // Se não existe nenhum, criar novo
                prompt = await this.TenantPrompt.create({
                    tenant_id: tenantId,
                    base_prompt: defaultPromptText,
                    clarification_prompt: 'Peça esclarecimento de forma natural: "Não entendi bem. Pode me explicar melhor?" ou "Como assim? Me conta mais detalhes"',
                    qualification_prompt: 'Identifique se a pessoa tem interesse real em comprar receitas para vender doces ou apenas curiosidade.',
                    ai_model: 'gemini-1.5-flash',
                    is_active: true,
                    last_updated: new Date()
                });
            }

            return {
                id: prompt.id,
                base_prompt: prompt.base_prompt,
                clarification_prompt: prompt.clarification_prompt,
                qualification_prompt: prompt.qualification_prompt,
                ai_model: prompt.ai_model || 'gemini-1.5-flash',
                is_active: prompt.is_active,
                last_updated: prompt.last_updated,
                is_default: true
            };
        } catch (error) {
            console.error('❌ Erro ao buscar prompt do tenant:', error);
            throw error;
        }
    }

    async updateTenantPrompt(tenantId, promptData) {
        try {
            const { base_prompt, clarification_prompt, qualification_prompt, ai_model } = promptData;

            // Validar que o prompt base existe
            if (!base_prompt || base_prompt.trim().length === 0) {
                throw new Error('Prompt base é obrigatório');
            }

            // Validar modelo AI
            const validModels = [
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gemini-2.0-flash',
                'gemini-2.5-pro-preview-05-06',
                'gemini-2.5-flash-preview-04-17'
            ];
            
            const modelToUse = ai_model && validModels.includes(ai_model) ? ai_model : 'gemini-1.5-flash';

            // Verificar se já existe um prompt para este tenant
            const existingPrompt = await this.TenantPrompt.findOne({
                where: { tenant_id: tenantId }
            });

            let prompt;
            if (existingPrompt) {
                // Atualizar existente
                prompt = await existingPrompt.update({
                    base_prompt: base_prompt.trim(),
                    clarification_prompt: clarification_prompt ? clarification_prompt.trim() : null,
                    qualification_prompt: qualification_prompt ? qualification_prompt.trim() : null,
                    ai_model: modelToUse,
                    last_updated: new Date(),
                    is_active: true
                });
            } else {
                // Criar novo
                prompt = await this.TenantPrompt.create({
                    tenant_id: tenantId,
                    base_prompt: base_prompt.trim(),
                    clarification_prompt: clarification_prompt ? clarification_prompt.trim() : null,
                    qualification_prompt: qualification_prompt ? qualification_prompt.trim() : null,
                    ai_model: modelToUse,
                    is_active: true,
                    last_updated: new Date()
                });
            }

            return {
                id: prompt.id,
                base_prompt: prompt.base_prompt,
                clarification_prompt: prompt.clarification_prompt,
                qualification_prompt: prompt.qualification_prompt,
                ai_model: prompt.ai_model,
                is_active: prompt.is_active,
                last_updated: prompt.last_updated
            };
        } catch (error) {
            console.error('❌ Erro ao atualizar prompt do tenant:', error);
            throw error;
        }
    }

    async resetTenantPrompt(tenantId) {
        try {
            // Desativar prompt customizado se existir
            const existingPrompt = await this.TenantPrompt.findOne({
                where: { tenant_id: tenantId }
            });

            if (existingPrompt) {
                await existingPrompt.update({ is_active: false });
            }

            // Retornar prompt padrão
            return this.getTenantPrompt(tenantId);
        } catch (error) {
            console.error('❌ Erro ao resetar prompt do tenant:', error);
            throw error;
        }
    }

    async close() {
        await sequelize.close();
    }
}

module.exports = ApiDatabase; 