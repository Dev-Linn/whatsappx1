const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // GET /api/v1/conversations - Lista conversas com filtros
    router.get('/', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            
            const filters = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                userId: req.query.userId ? parseInt(req.query.userId) : undefined,
                date: req.query.date,
                sortBy: req.query.sortBy || 'last_contact',
                sortOrder: req.query.sortOrder || 'DESC',
                groupByUser: req.query.groupByUser !== 'false', // Por padrão agrupa, só não agrupa se explicitamente false
                tenant_id: tenantId // Adicionar tenant_id aos filtros
            };

            const result = await db.getConversations(filters);
            res.success(result, 'Conversas carregadas com sucesso');
        } catch (error) {
            res.error('Erro ao carregar conversas', 500);
        }
    });

    // GET /api/v1/conversations/:id - Detalhes de uma conversa específica
    router.get('/:id', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const conversationId = parseInt(req.params.id);
            if (!conversationId) {
                return res.error('ID de conversa inválido', 400);
            }

            const conversation = await db.getConversationMessages(conversationId, tenantId);
            if (!conversation) {
                return res.error('Conversa não encontrada', 404);
            }

            res.success(conversation, 'Conversa carregada com sucesso');
        } catch (error) {
            res.error('Erro ao carregar conversa', 500);
        }
    });

    // GET /api/v1/conversations/:id/messages - Mensagens de uma conversa
    router.get('/:id/messages', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const conversationId = parseInt(req.params.id);
            if (!conversationId) {
                return res.error('ID de conversa inválido', 400);
            }

            const conversation = await db.getConversationMessages(conversationId, tenantId);
            if (!conversation) {
                return res.error('Conversa não encontrada', 404);
            }

            res.success({
                conversationId: conversation.id,
                sessionId: conversation.sessionId,
                date: conversation.date,
                messageCount: conversation.messageCount,
                user: conversation.user,
                messages: conversation.messages
            }, 'Mensagens da conversa carregadas');
        } catch (error) {
            res.error('Erro ao carregar mensagens da conversa', 500);
        }
    });

    // GET /api/v1/conversations/search - Buscar conversas
    router.get('/search/messages', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { q, limit = 20, userId } = req.query;
            
            if (!q || q.trim().length < 2) {
                return res.error('Query de busca deve ter pelo menos 2 caracteres', 400);
            }

            const where = {
                content: { [db.Op.like]: `%${q.trim()}%` },
                tenant_id: tenantId // Filtrar por tenant
            };

            if (userId) {
                where.user_id = parseInt(userId);
            }

            const messages = await db.Message.findAll({
                where,
                include: [
                    {
                        model: db.User,
                        as: 'user',
                        attributes: ['name', 'phone', 'stage', 'sentiment'],
                        where: { tenant_id: tenantId } // Filtrar usuários por tenant
                    },
                    {
                        model: db.Conversation,
                        as: 'conversation',
                        attributes: ['id', 'session_id', 'date'],
                        where: { tenant_id: tenantId } // Filtrar conversas por tenant
                    }
                ],
                limit: parseInt(limit),
                order: [['timestamp', 'DESC']]
            });

            res.success(messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                isBot: msg.is_bot,
                timestamp: msg.timestamp,
                length: msg.message_length,
                user: msg.user,
                conversation: msg.conversation
            })), 'Busca em mensagens realizada');
        } catch (error) {
            res.error('Erro ao buscar mensagens', 500);
        }
    });

    // GET /api/v1/conversations/stats - Estatísticas de conversas
    router.get('/stats/overview', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { days = 30 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            const tenantFilter = { tenant_id: tenantId };

            const [
                totalConversations,
                totalMessages,
                avgMessagesPerConversation,
                conversationsByDay,
                messagesByDay,
                topActiveUsers
            ] = await Promise.all([
                // Total de conversas
                db.Conversation.count({
                    where: { 
                        ...tenantFilter,
                        created_at: { [db.Op.gte]: startDate } 
                    }
                }),

                // Total de mensagens
                db.Message.count({
                    where: { 
                        ...tenantFilter,
                        timestamp: { [db.Op.gte]: startDate } 
                    }
                }),

                // Média de mensagens por conversa
                db.Conversation.findOne({
                    attributes: [[db.sequelize.fn('AVG', db.sequelize.col('message_count')), 'avg']],
                    where: { 
                        ...tenantFilter,
                        created_at: { [db.Op.gte]: startDate } 
                    }
                }),

                // Conversas por dia
                db.Conversation.findAll({
                    attributes: [
                        [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                    ],
                    where: { 
                        ...tenantFilter,
                        created_at: { [db.Op.gte]: startDate } 
                    },
                    group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
                    order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']]
                }),

                // Mensagens por dia
                db.Message.findAll({
                    attributes: [
                        [db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'date'],
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                        'is_bot'
                    ],
                    where: { 
                        ...tenantFilter,
                        timestamp: { [db.Op.gte]: startDate } 
                    },
                    group: [db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'is_bot'],
                    order: [[db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'ASC']]
                }),

                // Usuários mais ativos
                db.Message.findAll({
                    attributes: [
                        'user_id',
                        [db.sequelize.fn('COUNT', db.sequelize.col('messages.id')), 'message_count']
                    ],
                    include: [{
                        model: db.User,
                        as: 'user',
                        attributes: ['name', 'phone', 'stage'],
                        where: { tenant_id: tenantId }
                    }],
                    where: { 
                        ...tenantFilter,
                        timestamp: { [db.Op.gte]: startDate },
                        is_bot: false
                    },
                    group: ['user_id'],
                    order: [[db.sequelize.fn('COUNT', db.sequelize.col('messages.id')), 'DESC']],
                    limit: 10
                })
            ]);

            const avgMessages = avgMessagesPerConversation?.dataValues?.avg || 0;

            res.success({
                period: `Últimos ${days} dias`,
                summary: {
                    totalConversations: totalConversations || 0,
                    totalMessages: totalMessages || 0,
                    avgMessagesPerConversation: parseFloat(avgMessages).toFixed(1)
                },
                conversationsByDay: conversationsByDay.map(row => ({
                    date: row.dataValues.date,
                    count: parseInt(row.dataValues.count)
                })),
                messagesByDay: messagesByDay.map(row => ({
                    date: row.dataValues.date,
                    count: parseInt(row.dataValues.count),
                    isBot: row.is_bot
                })),
                topActiveUsers: topActiveUsers.map(row => ({
                    userId: row.user_id,
                    user: row.user,
                    messageCount: parseInt(row.dataValues.message_count)
                }))
            }, 'Estatísticas de conversas carregadas');
        } catch (error) {
            res.error('Erro ao carregar estatísticas de conversas', 500);
        }
    });

    // GET /api/v1/conversations/recent - Conversas recentes
    router.get('/recent/activity', async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);

            const recentConversations = await db.Conversation.findAll({
                where: {
                    updated_at: { [db.Op.gte]: yesterday }
                },
                include: [
                    {
                        model: db.User,
                        as: 'user',
                        attributes: ['name', 'phone', 'stage', 'sentiment']
                    },
                    {
                        model: db.Message,
                        as: 'messages',
                        limit: 1,
                        order: [['timestamp', 'DESC']],
                        required: false
                    }
                ],
                order: [['updated_at', 'DESC']],
                limit: parseInt(limit)
            });

            res.success(recentConversations.map(conv => ({
                id: conv.id,
                sessionId: conv.session_id,
                date: conv.date,
                messageCount: conv.message_count,
                user: conv.user,
                lastMessage: conv.messages[0] ? {
                    content: conv.messages[0].content.substring(0, 100) + '...',
                    timestamp: conv.messages[0].timestamp,
                    isBot: conv.messages[0].is_bot
                } : null,
                updatedAt: conv.updated_at
            })), 'Conversas recentes carregadas');
        } catch (error) {
            res.error('Erro ao carregar conversas recentes', 500);
        }
    });

    // GET /api/v1/conversations/analytics - Analytics avançados
    router.get('/analytics/detailed', async (req, res) => {
        try {
            const { days = 7 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            const [
                hourlyDistribution,
                weeklyDistribution,
                averageResponseTime,
                conversationLengths,
                topKeywords
            ] = await Promise.all([
                // Distribuição por hora do dia
                db.Message.findAll({
                    attributes: [
                        [db.sequelize.fn('strftime', '%H', db.sequelize.col('timestamp')), 'hour'],
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                    ],
                    where: { timestamp: { [db.Op.gte]: startDate } },
                    group: [db.sequelize.fn('strftime', '%H', db.sequelize.col('timestamp'))],
                    order: [[db.sequelize.fn('strftime', '%H', db.sequelize.col('timestamp')), 'ASC']]
                }),

                // Distribuição por dia da semana
                db.Message.findAll({
                    attributes: [
                        [db.sequelize.fn('strftime', '%w', db.sequelize.col('timestamp')), 'day_of_week'],
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                    ],
                    where: { timestamp: { [db.Op.gte]: startDate } },
                    group: [db.sequelize.fn('strftime', '%w', db.sequelize.col('timestamp'))],
                    order: [[db.sequelize.fn('strftime', '%w', db.sequelize.col('timestamp')), 'ASC']]
                }),

                // Tempo médio de resposta (aproximado)
                db.Message.findOne({
                    attributes: [[db.sequelize.fn('AVG', db.sequelize.col('message_length')), 'avg_length']],
                    where: { 
                        timestamp: { [db.Op.gte]: startDate },
                        is_bot: true
                    }
                }),

                // Distribuição de tamanhos de conversa
                db.Conversation.findAll({
                    attributes: [
                        'message_count',
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'conversation_count']
                    ],
                    where: { created_at: { [db.Op.gte]: startDate } },
                    group: ['message_count'],
                    order: [['message_count', 'ASC']]
                }),

                // Top palavras-chave (análise simples)
                db.Message.findAll({
                    attributes: ['content'],
                    where: {
                        timestamp: { [db.Op.gte]: startDate },
                        is_bot: false,
                        content: { [db.Op.not]: null }
                    },
                    limit: 100
                })
            ]);

            // Processar palavras-chave simples
            const keywords = {};
            topKeywords.forEach(msg => {
                const words = msg.content.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(word => word.length > 3);
                
                words.forEach(word => {
                    keywords[word] = (keywords[word] || 0) + 1;
                });
            });

            const sortedKeywords = Object.entries(keywords)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 20)
                .map(([word, count]) => ({ word, count }));

            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

            res.success({
                period: `Últimos ${days} dias`,
                hourlyDistribution: hourlyDistribution.map(row => ({
                    hour: parseInt(row.dataValues.hour),
                    count: parseInt(row.dataValues.count)
                })),
                weeklyDistribution: weeklyDistribution.map(row => ({
                    dayOfWeek: parseInt(row.dataValues.day_of_week),
                    dayName: dayNames[parseInt(row.dataValues.day_of_week)],
                    count: parseInt(row.dataValues.count)
                })),
                averageResponseLength: parseFloat(averageResponseTime?.dataValues?.avg_length || 0).toFixed(0),
                conversationLengths: conversationLengths.map(row => ({
                    messageCount: row.message_count,
                    conversationCount: parseInt(row.dataValues.conversation_count)
                })),
                topKeywords: sortedKeywords
            }, 'Analytics detalhados carregados');
        } catch (error) {
            res.error('Erro ao carregar analytics detalhados', 500);
        }
    });

    // GET /api/v1/conversations/export - Exportar conversas
    router.get('/export/data', async (req, res) => {
        try {
            const { 
                days = 30, 
                format = 'json', 
                userId,
                includeMessages = 'true'
            } = req.query;

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            const where = { created_at: { [db.Op.gte]: startDate } };
            if (userId) where.user_id = parseInt(userId);

            const conversations = await db.Conversation.findAll({
                where,
                include: [
                    {
                        model: db.User,
                        as: 'user',
                        attributes: ['name', 'phone', 'stage', 'sentiment']
                    },
                    includeMessages === 'true' ? {
                        model: db.Message,
                        as: 'messages',
                        order: [['timestamp', 'ASC']]
                    } : null
                ].filter(Boolean),
                order: [['created_at', 'DESC']],
                limit: 500
            });

            const exportData = conversations.map(conv => ({
                id: conv.id,
                sessionId: conv.session_id,
                date: conv.date,
                messageCount: conv.message_count,
                user: conv.user,
                messages: includeMessages === 'true' ? conv.messages?.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    isBot: msg.is_bot,
                    timestamp: msg.timestamp,
                    length: msg.message_length
                })) : undefined,
                createdAt: conv.created_at,
                updatedAt: conv.updated_at
            }));

            res.success({
                period: `Últimos ${days} dias`,
                total: exportData.length,
                includeMessages: includeMessages === 'true',
                data: exportData
            }, 'Conversas exportadas');
        } catch (error) {
            res.error('Erro ao exportar conversas', 500);
        }
    });

    // DELETE /api/v1/conversations/:id - Deletar conversa (admin)
    router.delete('/:id', async (req, res) => {
        try {
            const conversationId = parseInt(req.params.id);
            if (!conversationId) {
                return res.error('ID de conversa inválido', 400);
            }

            // Verificar se conversa existe
            const conversation = await db.Conversation.findByPk(conversationId);
            if (!conversation) {
                return res.error('Conversa não encontrada', 404);
            }

            // Deletar mensagens relacionadas primeiro
            await db.Message.destroy({
                where: { conversation_id: conversationId }
            });

            // Deletar conversa
            await conversation.destroy();

            res.success({ 
                deletedConversationId: conversationId 
            }, 'Conversa deletada com sucesso');
        } catch (error) {
            res.error('Erro ao deletar conversa', 500);
        }
    });

    return router;
}; 