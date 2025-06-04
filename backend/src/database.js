// Sistema de Banco de Dados para WhatsApp Chatbot
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Configuração do SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../data/chatbot.db'),
    logging: false, // Mude para console.log para debug
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    },
    dialectOptions: {
        // Configurações específicas do SQLite
        foreign_keys: false // Desabilita chaves estrangeiras temporariamente
    }
});

// Modelo de Usuários
const User = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    phone: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false,
        index: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    first_contact: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    last_contact: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    total_messages: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    stage: {
        type: DataTypes.ENUM('lead_frio', 'interessado', 'negociando', 'cliente', 'perdido'),
        defaultValue: 'lead_frio'
    },
    sentiment: {
        type: DataTypes.ENUM('positivo', 'neutro', 'negativo'),
        defaultValue: 'neutro'
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Resumo de 1 linha da conversa gerado pela IA'
    },
    last_analysis_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que a IA analisou sentimento e observações'
    },
    messages_since_analysis: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Contador de mensagens desde a última análise'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
    }
});

// Modelo de Sessões de Conversa (simplificado)
const Conversation = sequelize.define('conversations', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
    },
    session_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        index: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        index: true
    },
    message_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
    }
});

// Modelo de Mensagens (simplificado)
const Message = sequelize.define('messages', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_bot: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        index: true
    },
    message_length: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    is_audio: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Indica se a mensagem é um áudio'
    },
    audio_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Caminho do arquivo de áudio'
    },
    audio_duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duração do áudio em segundos'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        index: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
    }
});

// Modelo de Custos da API
const ApiCost = sequelize.define('api_costs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        index: true
    },
    message_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    input_tokens: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    output_tokens: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    total_tokens: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    cost_usd: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false
    },
    cost_brl: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        index: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        index: true
    }
});

// Definir Relacionamentos
User.hasMany(Conversation, { foreignKey: 'user_id', as: 'conversations' });
User.hasMany(Message, { foreignKey: 'user_id', as: 'messages' });
User.hasMany(ApiCost, { foreignKey: 'user_id', as: 'costs' });

Conversation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' });

Message.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' });
Message.hasOne(ApiCost, { foreignKey: 'message_id', as: 'cost' });

ApiCost.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ApiCost.belongsTo(Message, { foreignKey: 'message_id', as: 'message' });

// Classe principal do Database Manager
class DatabaseManager {
    constructor() {
        this.sequelize = sequelize;
        this.User = User;
        this.Conversation = Conversation;
        this.Message = Message;
        this.ApiCost = ApiCost;
    }

    // Inicializar banco de dados
    async initialize() {
        try {
            await sequelize.authenticate();
            console.log('✅ Conexão com banco de dados estabelecida!');
            
            await sequelize.sync(); // Sincronização simples
            console.log('✅ Tabelas sincronizadas!');
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar com banco:', error);
            return false;
        }
    }

    // Buscar ou criar usuário
    async findOrCreateUser(phone, name, tenantId) {
        try {
            // Primeiro, tenta buscar o usuário existente
            let user = await User.findOne({
                where: { 
                    phone,
                    tenant_id: tenantId
                }
            });

            if (user) {
                // Usuário existe, apenas atualiza última conversa e nome se mudou
                await user.update({
                    name: name || user.name,
                    last_contact: new Date()
                });
                return user;
            }

            // Usuário não existe, tenta criar
            try {
                user = await User.create({
                    phone,
                    name: name || 'Usuário',
                    tenant_id: tenantId,
                    first_contact: new Date(),
                    last_contact: new Date()
                });
                
                console.log(`👤 Novo usuário criado: ${name} (${phone}) - Tenant ${tenantId}`);
                return user;
            } catch (createError) {
                // Se falhar na criação (constraint único), tenta buscar novamente
                // Isso pode acontecer em condições de corrida
                if (createError.name === 'SequelizeUniqueConstraintError') {
                    console.log(`🔄 Constraint único detectado, buscando usuário existente: ${phone} - Tenant ${tenantId}`);
                    
                    user = await User.findOne({
                        where: { 
                            phone,
                            tenant_id: tenantId
                        }
                    });
                    
                    if (user) {
                        // Atualiza dados se encontrou
                        await user.update({
                            name: name || user.name,
                            last_contact: new Date()
                        });
                        return user;
                    }
                }
                
                throw createError; // Re-throw se não conseguiu resolver
            }

        } catch (error) {
            console.error(`❌ Erro ao buscar/criar usuário ${phone} (Tenant ${tenantId}):`, error.message);
            return null;
        }
    }

    // Buscar ou criar conversa (reutiliza conversa do mesmo dia)
    async findOrCreateConversation(userId, tenantId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Buscar conversa existente do dia
            let conversation = await Conversation.findOne({
                where: {
                    user_id: userId,
                    tenant_id: tenantId,
                    date: today
                },
                order: [['created_at', 'DESC']] // Pega a mais recente do dia
            });
            
            // Se não existe, criar nova
            if (!conversation) {
                const sessionId = `${today}-${Date.now()}`;
                conversation = await Conversation.create({
                    user_id: userId,
                    tenant_id: tenantId,
                    session_id: sessionId,
                    date: today
                });
                console.log(`📝 Nova conversa criada para hoje: ${sessionId}`);
            } else {
                console.log(`🔄 Continuando conversa existente: ${conversation.session_id}`);
            }
            
            return conversation;
        } catch (error) {
            console.error('❌ Erro ao buscar/criar conversa:', error);
            return null;
        }
    }

    // Criar nova conversa (método antigo - mantido para compatibilidade)
    async createConversation(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const sessionId = `${today}-${Date.now()}`;

            const conversation = await Conversation.create({
                user_id: userId,
                session_id: sessionId,
                date: today
            });

            return conversation;
        } catch (error) {
            console.error('❌ Erro ao criar conversa:', error);
            return null;
        }
    }

    // Salvar mensagem
    async saveMessage(userId, conversationId, content, isBot = false, isAudio = false, audioPath = null, audioDuration = null, tenantId) {
        try {
            const message = await Message.create({
                conversation_id: conversationId,
                user_id: userId,
                tenant_id: tenantId,
                content: content,
                is_bot: isBot,
                message_length: content.length,
                is_audio: isAudio,
                audio_path: audioPath,
                audio_duration: audioDuration,
                timestamp: new Date()
            });

            // Atualizar contador de mensagens do usuário
            await User.increment('total_messages', { where: { id: userId } });

            // Atualizar contador da conversa
            await Conversation.increment('message_count', { where: { id: conversationId } });

            return message;
        } catch (error) {
            console.error('❌ Erro ao salvar mensagem:', error);
            return null;
        }
    }

    // Buscar contexto para IA
    async getContextForAI(userId, tenantId, limit = 10) {
        try {
            const messages = await Message.findAll({
                where: { 
                    user_id: userId,
                    tenant_id: tenantId
                },
                order: [['timestamp', 'DESC']],
                limit: limit,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['name', 'phone'],
                    where: { tenant_id: tenantId }
                }]
            });

            return messages.reverse(); // Ordem cronológica
        } catch (error) {
            console.error('❌ Erro ao buscar contexto:', error);
            return [];
        }
    }

    // Verificar se é usuário recorrente
    async isReturningUser(userId, tenantId) {
        try {
            const messageCount = await Message.count({
                where: { 
                    user_id: userId,
                    tenant_id: tenantId
                }
            });
            return messageCount > 1;
        } catch (error) {
            console.error('❌ Erro ao verificar usuário recorrente:', error);
            return false;
        }
    }

    // Registrar custo da API
    async logApiCost(userId, messageId, inputTokens, outputTokens, costUsd, costBrl, tenantId) {
        try {
            const cost = await ApiCost.create({
                user_id: userId,
                message_id: messageId,
                tenant_id: tenantId,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                total_tokens: inputTokens + outputTokens,
                cost_usd: costUsd,
                cost_brl: costBrl
            });

            return cost;
        } catch (error) {
            console.error('❌ Erro ao registrar custo da API:', error);
            return null;
        }
    }

    // Relatório de usuários
    async getUserReport() {
        try {
            const totalUsers = await User.count();
            const totalMessages = await Message.count();
            const activeUsers = await User.count({
                where: {
                    last_contact: {
                        [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            });

            const topUsers = await User.findAll({
                order: [['total_messages', 'DESC']],
                limit: 10,
                attributes: ['name', 'phone', 'total_messages', 'last_contact']
            });

            return {
                totalUsers,
                totalMessages,
                activeUsers,
                topUsers,
                avgMessagesPerUser: totalUsers > 0 ? (totalMessages / totalUsers).toFixed(1) : 0
            };
        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
            return null;
        }
    }

    // Incrementar contador de mensagens desde última análise
    async incrementMessagesSinceAnalysis(userId) {
        try {
            await User.increment('messages_since_analysis', { where: { id: userId } });
        } catch (error) {
            console.error('❌ Erro ao incrementar contador de análise:', error);
        }
    }

    // Verificar se precisa fazer análise automática
    async needsAnalysis(userId, threshold = 5) {
        try {
            const user = await User.findByPk(userId);
            if (!user) return false;

            // Analisa se:
            // 1. Nunca foi analisado OU
            // 2. Tem mais mensagens que o threshold desde a última análise
            return !user.last_analysis_at || user.messages_since_analysis >= threshold;
        } catch (error) {
            console.error('❌ Erro ao verificar necessidade de análise:', error);
            return false;
        }
    }

    // Atualizar análise automática (sentimento, observações, stage)
    async updateAnalysis(userId, sentiment, observations, stage = null) {
        try {
            const updateData = {
                sentiment: sentiment,
                observations: observations,
                last_analysis_at: new Date(),
                messages_since_analysis: 0
            };

            // Só atualiza stage se fornecido
            if (stage) {
                updateData.stage = stage;
            }

            await User.update(updateData, { where: { id: userId } });
            
            console.log(`🧠 Análise atualizada para usuário ${userId}: ${sentiment} - "${observations}"`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar análise:', error);
            return false;
        }
    }

    // Buscar mensagens para análise (últimas 20)
    async getMessagesForAnalysis(userId, limit = 20) {
        try {
            const messages = await Message.findAll({
                where: { user_id: userId },
                order: [['timestamp', 'DESC']],
                limit: limit,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['name']
                }]
            });

            return messages.reverse(); // Ordem cronológica
        } catch (error) {
            console.error('❌ Erro ao buscar mensagens para análise:', error);
            return [];
        }
    }

    // Fechar conexão
    async close() {
        await sequelize.close();
        console.log('🔌 Conexão com banco fechada');
    }
}

module.exports = DatabaseManager; 