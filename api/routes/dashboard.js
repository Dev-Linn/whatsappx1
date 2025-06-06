const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // GET /api/v1/dashboard - Overview completo
    router.get('/', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const stats = await db.getDashboardStats(tenantId);
            res.success(stats, 'Dashboard carregado com sucesso');
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            res.error('Erro ao carregar dashboard', 500);
        }
    });

    // GET /api/v1/dashboard/overview - Estatísticas básicas
    router.get('/overview', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const stats = await db.getDashboardStats(tenantId);
            res.success(stats.overview, 'Overview carregado');
        } catch (error) { 
            console.error('Erro ao carregar overview:', error);
            res.error('Erro ao carregar overview', 500);
        }
    });

    // GET /api/v1/dashboard/activity - Atividade recente
    router.get('/activity', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const stats = await db.getDashboardStats(tenantId);
            res.success(stats.activity, 'Atividade carregada');
        } catch (error) {
            console.error('Erro ao carregar atividade:', error);
            res.error('Erro ao carregar atividade', 500);
        }
    });

    // GET /api/v1/dashboard/leads - Informações sobre leads
    router.get('/leads', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const stats = await db.getDashboardStats(tenantId);
            res.success(stats.leads, 'Dados de leads carregados');
        } catch (error) {
            console.error('Erro ao carregar dados de leads:', error);
            res.error('Erro ao carregar dados de leads', 500);
        }
    });

    // GET /api/v1/dashboard/hot-leads - Leads quentes
    router.get('/hot-leads', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const hotLeads = await db.getUsers({
                tenant_id: tenantId,
                stage: 'interessado',
                sentiment: 'positivo',
                limit: 10,
                sortBy: 'last_contact',
                sortOrder: 'DESC'
            });
            
            res.success(hotLeads.users, 'Leads quentes carregados');
        } catch (error) {
            console.error('Erro ao carregar leads quentes:', error);
            res.error('Erro ao carregar leads quentes', 500);
        }
    });

    // GET /api/v1/dashboard/recent-activity - Atividade das últimas 24h
    router.get('/recent-activity', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const tenantFilter = tenantId ? { tenant_id: tenantId } : {};

            const [recentUsers, recentMessages] = await Promise.all([
                db.getUsers({
                    ...tenantFilter,
                    limit: 5,
                    sortBy: 'last_contact',
                    sortOrder: 'DESC'
                }),
                db.Message.findAll({
                    where: {
                        ...tenantFilter,
                        timestamp: { [db.Op.gte]: yesterday }
                    },
                    include: [{
                        model: db.User,
                        as: 'user',
                        attributes: ['name', 'phone']
                    }],
                    order: [['timestamp', 'DESC']],
                    limit: 10
                })
            ]);

            res.success({
                recentUsers: recentUsers.users,
                recentMessages: recentMessages.map(msg => ({
                    id: msg.id,
                    content: msg.content.substring(0, 100) + '...',
                    isBot: msg.is_bot,
                    timestamp: msg.timestamp,
                    user: msg.user
                }))
            }, 'Atividade recente carregada');
        } catch (error) {
            console.error('Erro ao carregar atividade recente:', error);
            res.error('Erro ao carregar atividade recente', 500);
        }
    });

    // GET /api/v1/dashboard/analytics - Analytics avançados
    router.get('/analytics', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { days = 7 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            const tenantFilter = tenantId ? { tenant_id: tenantId } : {};

            const [
                userGrowth,
                messageVolume,
                sentimentTrends,
                stageTrends
            ] = await Promise.all([
                // Crescimento de usuários por dia
                db.User.findAll({
                    attributes: [
                        [db.sequelize.fn('DATE', db.sequelize.col('first_contact')), 'date'],
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'new_users']
                    ],
                    where: {
                        ...tenantFilter,
                        first_contact: { [db.Op.gte]: startDate }
                    },
                    group: [db.sequelize.fn('DATE', db.sequelize.col('first_contact'))],
                    order: [[db.sequelize.fn('DATE', db.sequelize.col('first_contact')), 'ASC']]
                }),
                
                // Volume de mensagens por dia
                db.Message.findAll({
                    attributes: [
                        [db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'date'],
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'message_count'],
                        'is_bot'
                    ],
                    where: {
                        ...tenantFilter,
                        timestamp: { [db.Op.gte]: startDate }
                    },
                    group: [
                        db.sequelize.fn('DATE', db.sequelize.col('timestamp')),
                        'is_bot'
                    ],
                    order: [[db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'ASC']]
                }),

                // Tendências de sentimento
                db.User.findAll({
                    attributes: [
                        'sentiment',
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                    ],
                    where: {
                        ...tenantFilter,
                        last_analysis_at: { [db.Op.gte]: startDate }
                    },
                    group: ['sentiment']
                }),

                // Tendências de stage
                db.User.findAll({
                    attributes: [
                        'stage',
                        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                    ],
                    where: {
                        ...tenantFilter,
                        last_contact: { [db.Op.gte]: startDate }
                    },
                    group: ['stage']
                })
            ]);

            res.success({
                period: `Últimos ${days} dias`,
                userGrowth: userGrowth.map(row => ({
                    date: row.dataValues.date,
                    newUsers: parseInt(row.dataValues.new_users)
                })),
                messageVolume: messageVolume.map(row => ({
                    date: row.dataValues.date,
                    count: parseInt(row.dataValues.message_count),
                    isBot: row.is_bot
                })),
                sentimentTrends: sentimentTrends.map(row => ({
                    sentiment: row.sentiment,
                    count: parseInt(row.dataValues.count)
                })),
                stageTrends: stageTrends.map(row => ({
                    stage: row.stage,
                    count: parseInt(row.dataValues.count)
                }))
            }, 'Analytics carregados');
        } catch (error) {
            console.error('Erro ao carregar analytics:', error);
            res.error('Erro ao carregar analytics', 500);
        }
    });

    return router;
}; 