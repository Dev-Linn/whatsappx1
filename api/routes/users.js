const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // GET /api/v1/users/followup-eligible - Usuários elegíveis para follow-up (sem contato há +24h)
    router.get('/followup-eligible', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            
            // Buscar usuários que não receberam mensagem há mais de 24 horas
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - 24);
            
            const users = await db.User.findAll({
                where: {
                    tenant_id: tenantId,
                    last_contact: {
                        [db.Op.lt]: cutoffTime.toISOString()
                    },
                    stage: {
                        [db.Op.in]: ['lead_frio', 'interessado', 'negociando'] // Apenas leads ativos
                    }
                },
                order: [['last_contact', 'ASC']], // Mais antigos primeiro
                limit: 50 // Máximo 50 para não sobrecarregar
            });

            const followUpUsers = users.map(user => {
                const lastContact = new Date(user.last_contact);
                const now = new Date();
                const hoursWithoutContact = Math.floor((now - lastContact) / (1000 * 60 * 60));
                
                return {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    stage: user.stage,
                    sentiment: user.sentiment,
                    lastContact: user.last_contact,
                    hoursWithoutContact
                };
            });

            console.log(`🔍 Follow-up: Encontrados ${followUpUsers.length} usuários elegíveis para tenant ${tenantId}`);

            res.success({
                users: followUpUsers,
                total: followUpUsers.length
            }, 'Usuários elegíveis para follow-up carregados');
            
        } catch (error) {
            console.error('Erro ao carregar usuários para follow-up:', error);
            res.error('Erro ao carregar usuários para follow-up', 500);
        }
    });

    // GET /api/v1/users - Lista usuários com filtros e paginação
    router.get('/', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            
            const filters = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                search: req.query.search || '',
                stage: req.query.stage || '',
                sentiment: req.query.sentiment || '',
                sortBy: req.query.sortBy || 'last_contact',
                sortOrder: req.query.sortOrder || 'DESC',
                tenant_id: tenantId
            };

            const result = await db.getUsers(filters);
            
            res.success(result, 'Usuários carregados com sucesso');
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            res.error('Erro ao carregar usuários', 500);
        }
    });

    // GET /api/v1/users/:id - Detalhes de um usuário específico
    router.get('/:id', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const userId = parseInt(req.params.id);
            if (!userId) {
                return res.error('ID de usuário inválido', 400);
            }

            const user = await db.getUserById(userId, tenantId);
            if (!user) {
                return res.error('Usuário não encontrado', 404);
            }

            res.success(user, 'Usuário carregado com sucesso');
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            res.error('Erro ao carregar usuário', 500);
        }
    });

    // PUT /api/v1/users/:id - Atualizar dados do usuário
    router.put('/:id', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const userId = parseInt(req.params.id);
            if (!userId) {
                return res.error('ID de usuário inválido', 400);
            }

            // Verificar se o usuário pertence ao tenant
            const existingUser = await db.getUserById(userId, tenantId);
            if (!existingUser) {
                return res.error('Usuário não encontrado', 404);
            }

            const allowedFields = ['stage', 'observations', 'is_active'];
            const updateData = {};
            
            // Validar campos permitidos
            Object.keys(req.body).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = req.body[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                return res.error('Nenhum campo válido para atualização', 400);
            }

            // Validar valores de stage
            if (updateData.stage) {
                const validStages = ['lead_frio', 'interessado', 'negociando', 'cliente', 'perdido'];
                if (!validStages.includes(updateData.stage)) {
                    return res.error('Stage inválido', 400);
                }
            }

            const updatedUser = await db.updateUser(userId, updateData);
            if (!updatedUser) {
                return res.error('Usuário não encontrado', 404);
            }

            res.success(updatedUser, 'Usuário atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.error('Erro ao atualizar usuário', 500);
        }
    });

    // GET /api/v1/users/:id/history - Histórico completo de um usuário
    router.get('/:id/history', async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            if (!userId) {
                return res.error('ID de usuário inválido', 400);
            }

            const user = await db.getUserById(userId);
            if (!user) {
                return res.error('Usuário não encontrado', 404);
            }

            // Obter conversas do usuário
            const conversations = await db.getConversations({
                userId: userId,
                limit: 50,
                sortBy: 'date',
                sortOrder: 'DESC'
            });

            res.success({
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    stage: user.stage,
                    sentiment: user.sentiment,
                    observations: user.observations,
                    totalMessages: user.totalMessages,
                    firstContact: user.firstContact,
                    lastContact: user.lastContact,
                    totalCost: user.totalCost
                },
                messages: user.messages,
                conversations: conversations.conversations,
                costs: user.recentCosts
            }, 'Histórico do usuário carregado');
        } catch (error) {
            res.error('Erro ao carregar histórico do usuário', 500);
        }
    });

    // GET /api/v1/users/:id/analytics - Analytics específicos de um usuário
    router.get('/:id/analytics', async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            if (!userId) {
                return res.error('ID de usuário inválido', 400);
            }

            const [
                user,
                messagesByDay,
                sentimentHistory,
                costsByDay
            ] = await Promise.all([
                db.getUserById(userId),
                
                // Mensagens por dia (últimos 30 dias)
                db.Message.findAll({
                    attributes: [
                        [db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'date'],
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                        'is_bot'
                    ],
                    where: {
                        user_id: userId,
                        timestamp: {
                            [db.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }
                    },
                    group: [
                        db.sequelize.fn('DATE', db.sequelize.col('timestamp')),
                        'is_bot'
                    ],
                    order: [[db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'ASC']]
                }),

                // Histórico de análises de sentimento
                db.User.findAll({
                    attributes: ['sentiment', 'last_analysis_at', 'observations'],
                    where: { id: userId },
                    limit: 1
                }),

                // Custos por dia
                db.ApiCost.findAll({
                    attributes: [
                        [db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'date'],
                        [db.sequelize.fn('SUM', db.sequelize.col('cost_brl')), 'total_cost'],
                        [db.sequelize.fn('SUM', db.sequelize.col('total_tokens')), 'total_tokens']
                    ],
                    where: {
                        user_id: userId,
                        timestamp: {
                            [db.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }
                    },
                    group: [db.sequelize.fn('DATE', db.sequelize.col('timestamp'))],
                    order: [[db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'ASC']]
                })
            ]);

            if (!user) {
                return res.error('Usuário não encontrado', 404);
            }

            res.success({
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    stage: user.stage,
                    sentiment: user.sentiment,
                    observations: user.observations
                },
                messagesByDay: messagesByDay.map(row => ({
                    date: row.dataValues.date,
                    count: parseInt(row.dataValues.count),
                    isBot: row.is_bot
                })),
                sentimentHistory: sentimentHistory[0] || null,
                costsByDay: costsByDay.map(row => ({
                    date: row.dataValues.date,
                    cost: parseFloat(row.dataValues.total_cost || 0).toFixed(4),
                    tokens: parseInt(row.dataValues.total_tokens || 0)
                }))
            }, 'Analytics do usuário carregados');
        } catch (error) {
            res.error('Erro ao carregar analytics do usuário', 500);
        }
    });

    // GET /api/v1/users/search - Busca avançada de usuários
    router.get('/search/advanced', async (req, res) => {
        try {
            const { q, limit = 20 } = req.query;
            
            if (!q || q.trim().length < 2) {
                return res.error('Query de busca deve ter pelo menos 2 caracteres', 400);
            }

            const results = await db.search(q.trim(), { limit });
            res.success(results, 'Busca realizada com sucesso');
        } catch (error) {
            res.error('Erro ao realizar busca', 500);
        }
    });

    // GET /api/v1/users/stats/stages - Estatísticas por stage
    router.get('/stats/stages', async (req, res) => {
        try {
            const stageStats = await db.User.findAll({
                attributes: [
                    'stage',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                    [db.sequelize.fn('AVG', db.sequelize.col('total_messages')), 'avg_messages']
                ],
                group: ['stage'],
                order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']]
            });

            res.success(stageStats.map(row => ({
                stage: row.stage,
                count: parseInt(row.dataValues.count),
                avgMessages: parseFloat(row.dataValues.avg_messages || 0).toFixed(1)
            })), 'Estatísticas por stage carregadas');
        } catch (error) {
            res.error('Erro ao carregar estatísticas por stage', 500);
        }
    });

    // GET /api/v1/users/stats/sentiment - Estatísticas por sentimento
    router.get('/stats/sentiment', async (req, res) => {
        try {
            const sentimentStats = await db.User.findAll({
                attributes: [
                    'sentiment',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
                    [db.sequelize.fn('AVG', db.sequelize.col('total_messages')), 'avg_messages']
                ],
                group: ['sentiment'],
                order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']]
            });

            res.success(sentimentStats.map(row => ({
                sentiment: row.sentiment,
                count: parseInt(row.dataValues.count),
                avgMessages: parseFloat(row.dataValues.avg_messages || 0).toFixed(1)
            })), 'Estatísticas por sentimento carregadas');
        } catch (error) {
            res.error('Erro ao carregar estatísticas por sentimento', 500);
        }
    });

    // GET /api/v1/users/export - Exportar dados de usuários
    router.get('/export', async (req, res) => {
        try {
            const { format = 'json', stage, sentiment } = req.query;
            
            const filters = {};
            if (stage) filters.stage = stage;
            if (sentiment) filters.sentiment = sentiment;

            const users = await db.getUsers({ ...filters, limit: 1000 });
            
            if (format === 'csv') {
                // TODO: Implementar export CSV
                res.error('Export CSV ainda não implementado', 501);
            } else {
                res.success(users.users, 'Dados de usuários exportados');
            }
        } catch (error) {
            res.error('Erro ao exportar dados de usuários', 500);
        }
    });

    // POST /api/v1/users/send-followup - Enviar mensagens de follow-up via WhatsApp
    router.post('/send-followup', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { userIds, message } = req.body;

            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return res.error('Lista de usuários é obrigatória', 400);
            }

            if (!message || message.trim().length === 0) {
                return res.error('Mensagem é obrigatória', 400);
            }

            // Buscar usuários válidos
            const users = await db.User.findAll({
                where: {
                    id: { [db.Op.in]: userIds },
                    tenant_id: tenantId
                }
            });

            if (users.length === 0) {
                return res.error('Nenhum usuário válido encontrado', 400);
            }

            console.log(`📤 Enviando follow-up para ${users.length} usuários do tenant ${tenantId}`);

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            // Enviar mensagens via backend WhatsApp
            for (const user of users) {
                try {
                    const whatsappResponse = await fetch('http://localhost:3002/send-followup', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            tenant_id: tenantId,
                            phone: user.phone,
                            message: message.trim(),
                            user_name: user.name
                        })
                    });

                    const responseData = await whatsappResponse.json();

                    if (whatsappResponse.ok && responseData.success) {
                        successCount++;
                        results.push({
                            userId: user.id,
                            name: user.name,
                            phone: user.phone,
                            status: 'success',
                            message: 'Mensagem enviada com sucesso'
                        });

                        // Atualizar último contato
                        await user.update({
                            last_contact: new Date(),
                            total_messages: user.total_messages + 1
                        });

                        console.log(`✅ Follow-up enviado para ${user.name} (${user.phone})`);
                    } else {
                        errorCount++;
                        results.push({
                            userId: user.id,
                            name: user.name,
                            phone: user.phone,
                            status: 'error',
                            message: responseData.error || 'Erro ao enviar mensagem'
                        });

                        console.log(`❌ Erro ao enviar follow-up para ${user.name}: ${responseData.error}`);
                    }

                    // Delay entre envios para não spam
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (error) {
                    errorCount++;
                    results.push({
                        userId: user.id,
                        name: user.name,
                        phone: user.phone,
                        status: 'error',
                        message: `Erro de conexão: ${error.message}`
                    });

                    console.log(`❌ Erro de conexão ao enviar para ${user.name}: ${error.message}`);
                }
            }

            res.success({
                totalUsers: users.length,
                successCount,
                errorCount,
                results
            }, `Follow-up enviado: ${successCount} sucesso(s), ${errorCount} erro(s)`);

        } catch (error) {
            console.error('❌ Erro ao enviar follow-up:', error);
            res.error('Erro ao enviar follow-up', 500);
        }
    });

    // POST /api/v1/users/:id/trigger-analysis - Forçar análise de sentimento
    router.post('/:id/trigger-analysis', async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            if (!userId) {
                return res.error('ID de usuário inválido', 400);
            }

            // Verificar se usuário existe
            const user = await db.User.findByPk(userId);
            if (!user) {
                return res.error('Usuário não encontrado', 404);
            }

            // Marcar para análise na próxima interação
            await user.update({
                messages_since_analysis: 5 // Força análise na próxima mensagem
            });

            res.success({ 
                message: 'Análise será executada na próxima interação do usuário' 
            }, 'Análise agendada com sucesso');
        } catch (error) {
            res.error('Erro ao agendar análise', 500);
        }
    });

    // POST /api/v1/users/:id/reprocess-analysis - Reprocessar análise imediatamente
    router.post('/:id/reprocess-analysis', async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            if (!userId) {
                return res.error('ID de usuário inválido', 400);
            }

            // Verificar se usuário existe
            const user = await db.User.findByPk(userId);
            if (!user) {
                return res.error('Usuário não encontrado', 404);
            }

            // Buscar mensagens para análise
            const messages = await db.Message.findAll({
                where: { user_id: userId },
                order: [['timestamp', 'DESC']],
                limit: 20,
                include: [{
                    model: db.User,
                    as: 'user',
                    attributes: ['name']
                }]
            });

            if (messages.length === 0) {
                return res.error('Usuário não possui mensagens para análise', 400);
            }

            // Importar e executar análise
            const SentimentAnalyzer = require('../../backend/src/sentiment-analyzer');
            const analyzer = new SentimentAnalyzer(process.env.GEMINI_API_KEY);
            
            const messagesReversed = messages.reverse(); // Ordem cronológica
            const analysis = await analyzer.analyzeConversation(messagesReversed, user.name);

            // Atualizar banco com os resultados
            await user.update({
                sentiment: analysis.sentiment,
                observations: analysis.observations,
                stage: analysis.stage,
                last_analysis_at: new Date(),
                messages_since_analysis: 0
            });

            res.success({
                analysis: {
                    sentiment: analysis.sentiment,
                    observations: analysis.observations,
                    stage: analysis.stage,
                    processedMessages: messages.length
                }
            }, 'Análise reprocessada com sucesso');

        } catch (error) {
            console.error('❌ Erro ao reprocessar análise:', error);
            res.error('Erro ao reprocessar análise: ' + error.message, 500);
        }
    });

    // POST /api/v1/users/reprocess-failed - Reprocessar todas as análises com falha
    router.post('/reprocess-failed', async (req, res) => {
        try {
            // Buscar usuários com erro na análise
            const failedUsers = await db.User.findAll({
                where: {
                    observations: {
                        [db.Op.like]: '%Erro na análise automática%'
                    }
                },
                include: [{
                    model: db.Message,
                    as: 'messages',
                    order: [['timestamp', 'DESC']],
                    limit: 20
                }]
            });

            if (failedUsers.length === 0) {
                return res.success({ processedUsers: 0 }, 'Nenhum usuário com falha na análise encontrado');
            }

            // Importar analyzer
            const SentimentAnalyzer = require('../../backend/src/sentiment-analyzer');
            const analyzer = new SentimentAnalyzer(process.env.GEMINI_API_KEY);

            let processedCount = 0;
            let successCount = 0;
            const results = [];

            for (const user of failedUsers) {
                try {
                    processedCount++;
                    
                    if (user.messages.length === 0) {
                        results.push({
                            userId: user.id,
                            name: user.name,
                            status: 'skipped',
                            reason: 'Sem mensagens'
                        });
                        continue;
                    }

                    const messagesReversed = user.messages.reverse();
                    const analysis = await analyzer.analyzeConversation(messagesReversed, user.name);

                    // Atualizar usuário
                    await user.update({
                        sentiment: analysis.sentiment,
                        observations: analysis.observations,
                        stage: analysis.stage,
                        last_analysis_at: new Date(),
                        messages_since_analysis: 0
                    });

                    successCount++;
                    results.push({
                        userId: user.id,
                        name: user.name,
                        status: 'success',
                        analysis: analysis
                    });

                    // Delay entre processamentos para não sobrecarregar a API
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    console.error(`❌ Erro ao processar usuário ${user.id}:`, error);
                    results.push({
                        userId: user.id,
                        name: user.name,
                        status: 'error',
                        reason: error.message
                    });
                }
            }

            res.success({
                processedUsers: processedCount,
                successfulUsers: successCount,
                failedUsers: processedCount - successCount,
                results: results
            }, `Reprocessamento concluído: ${successCount}/${processedCount} sucessos`);

        } catch (error) {
            console.error('❌ Erro no reprocessamento em lote:', error);
            res.error('Erro no reprocessamento em lote: ' + error.message, 500);
        }
    });

    return router;
}; 