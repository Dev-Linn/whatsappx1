const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // GET /api/v1/costs - Análise completa de custos
    router.get('/', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { days = 30 } = req.query;
            const analysis = await db.getCostsAnalysis({ 
                days: parseInt(days),
                tenant_id: tenantId 
            });
            res.success(analysis, 'Análise de custos carregada');
        } catch (error) {
            res.error('Erro ao carregar análise de custos', 500);
        }
    });

    // GET /api/v1/costs/summary - Resumo financeiro
    router.get('/summary', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const analysis = await db.getCostsAnalysis({ 
                days: 30,
                tenant_id: tenantId 
            });
            res.success(analysis.summary, 'Resumo de custos carregado');
        } catch (error) {
            res.error('Erro ao carregar resumo de custos', 500);
        }
    });

    // GET /api/v1/costs/daily - Custos por dia
    router.get('/daily', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { days = 30 } = req.query;
            const analysis = await db.getCostsAnalysis({ 
                days: parseInt(days),
                tenant_id: tenantId 
            });
            res.success({
                period: `Últimos ${days} dias`,
                dailyBreakdown: analysis.dailyBreakdown
            }, 'Custos diários carregados');
        } catch (error) {
            res.error('Erro ao carregar custos diários', 500);
        }
    });

    // GET /api/v1/costs/monthly - Custos mensais
    router.get('/monthly', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const tenantFilter = tenantId ? { tenant_id: tenantId } : {};
            
            const monthlyCosts = await db.ApiCost.findAll({
                attributes: [
                    [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('timestamp')), 'month'],
                    [db.sequelize.fn('SUM', db.sequelize.col('cost_brl')), 'total_cost'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('api_costs.id')), 'requests'],
                    [db.sequelize.fn('SUM', db.sequelize.col('total_tokens')), 'total_tokens']
                ],
                where: tenantFilter,
                group: [db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('timestamp'))],
                order: [[db.sequelize.fn('strftime', '%Y-%m', db.sequelize.col('timestamp')), 'DESC']],
                limit: 12
            });

            res.success(monthlyCosts.map(row => ({
                month: row.dataValues.month,
                cost: parseFloat(row.dataValues.total_cost || 0).toFixed(2),
                requests: parseInt(row.dataValues.requests || 0),
                tokens: parseInt(row.dataValues.total_tokens || 0)
            })), 'Custos mensais carregados');
        } catch (error) {
            res.error('Erro ao carregar custos mensais', 500);
        }
    });

    // GET /api/v1/costs/top-users - Usuários que mais custam
    router.get('/top-users', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { days = 30, limit = 10 } = req.query;
            const analysis = await db.getCostsAnalysis({ 
                days: parseInt(days),
                tenant_id: tenantId 
            });
            
            res.success({
                period: `Últimos ${days} dias`,
                topUsers: analysis.topUsers.slice(0, parseInt(limit))
            }, 'Top usuários por custo carregados');
        } catch (error) {
            res.error('Erro ao carregar top usuários por custo', 500);
        }
    });

    // GET /api/v1/costs/projections - Projeções de gastos
    router.get('/projections', async (req, res) => {
        try {
            const [
                dailyAvg,
                monthlyTotal,
                yearlyProjection
            ] = await Promise.all([
                // Média diária dos últimos 7 dias
                db.ApiCost.findOne({
                    attributes: [[db.sequelize.fn('AVG', db.sequelize.col('cost_brl')), 'avg_daily']],
                    where: {
                        timestamp: {
                            [db.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                }),

                // Total do mês atual
                db.ApiCost.sum('cost_brl', {
                    where: {
                        timestamp: {
                            [db.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    }
                }),

                // Total do ano atual
                db.ApiCost.sum('cost_brl', {
                    where: {
                        timestamp: {
                            [db.Op.gte]: new Date(new Date().getFullYear(), 0, 1)
                        }
                    }
                })
            ]);

            const avgDaily = parseFloat(dailyAvg?.dataValues?.avg_daily || 0);
            const currentMonth = parseFloat(monthlyTotal || 0);
            const currentYear = parseFloat(yearlyProjection || 0);

            // Projeções baseadas na média dos últimos 7 dias
            const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            const daysInYear = 365;
            
            const projectedMonthly = avgDaily * daysInMonth;
            const projectedYearly = avgDaily * daysInYear;

            res.success({
                current: {
                    dailyAverage: avgDaily.toFixed(4),
                    monthlyTotal: currentMonth.toFixed(2),
                    yearlyTotal: currentYear.toFixed(2)
                },
                projections: {
                    monthlyProjection: projectedMonthly.toFixed(2),
                    yearlyProjection: projectedYearly.toFixed(2),
                    remainingMonthProjection: (projectedMonthly - currentMonth).toFixed(2)
                },
                alerts: {
                    highDailyCost: avgDaily > 5.0,
                    monthlyBudgetAlert: projectedMonthly > 100.0,
                    yearlyBudgetAlert: projectedYearly > 1000.0
                }
            }, 'Projeções de custos carregadas');
        } catch (error) {
            res.error('Erro ao carregar projeções de custos', 500);
        }
    });

    // GET /api/v1/costs/tokens - Análise de tokens
    router.get('/tokens', async (req, res) => {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            const [
                tokenStats,
                tokensByDay,
                avgTokensPerRequest
            ] = await Promise.all([
                // Estatísticas gerais de tokens
                db.ApiCost.findOne({
                    attributes: [
                        [db.sequelize.fn('SUM', db.sequelize.col('input_tokens')), 'total_input'],
                        [db.sequelize.fn('SUM', db.sequelize.col('output_tokens')), 'total_output'],
                        [db.sequelize.fn('SUM', db.sequelize.col('total_tokens')), 'total_tokens'],
                        [db.sequelize.fn('COUNT', db.sequelize.col('api_costs.id')), 'total_requests']
                    ],
                    where: { timestamp: { [db.Op.gte]: startDate } }
                }),

                // Tokens por dia
                db.ApiCost.findAll({
                    attributes: [
                        [db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'date'],
                        [db.sequelize.fn('SUM', db.sequelize.col('input_tokens')), 'input_tokens'],
                        [db.sequelize.fn('SUM', db.sequelize.col('output_tokens')), 'output_tokens'],
                        [db.sequelize.fn('SUM', db.sequelize.col('total_tokens')), 'total_tokens']
                    ],
                    where: { timestamp: { [db.Op.gte]: startDate } },
                    group: [db.sequelize.fn('DATE', db.sequelize.col('timestamp'))],
                    order: [[db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'ASC']]
                }),

                // Média de tokens por request
                db.ApiCost.findOne({
                    attributes: [
                        [db.sequelize.fn('AVG', db.sequelize.col('input_tokens')), 'avg_input'],
                        [db.sequelize.fn('AVG', db.sequelize.col('output_tokens')), 'avg_output'],
                        [db.sequelize.fn('AVG', db.sequelize.col('total_tokens')), 'avg_total']
                    ],
                    where: { timestamp: { [db.Op.gte]: startDate } }
                })
            ]);

            const stats = tokenStats?.dataValues || {};
            const avgTokens = avgTokensPerRequest?.dataValues || {};

            res.success({
                period: `Últimos ${days} dias`,
                summary: {
                    totalInputTokens: parseInt(stats.total_input || 0),
                    totalOutputTokens: parseInt(stats.total_output || 0),
                    totalTokens: parseInt(stats.total_tokens || 0),
                    totalRequests: parseInt(stats.total_requests || 0),
                    avgInputTokens: parseFloat(avgTokens.avg_input || 0).toFixed(1),
                    avgOutputTokens: parseFloat(avgTokens.avg_output || 0).toFixed(1),
                    avgTotalTokens: parseFloat(avgTokens.avg_total || 0).toFixed(1)
                },
                dailyBreakdown: tokensByDay.map(row => ({
                    date: row.dataValues.date,
                    inputTokens: parseInt(row.dataValues.input_tokens || 0),
                    outputTokens: parseInt(row.dataValues.output_tokens || 0),
                    totalTokens: parseInt(row.dataValues.total_tokens || 0)
                }))
            }, 'Análise de tokens carregada');
        } catch (error) {
            res.error('Erro ao carregar análise de tokens', 500);
        }
    });

    // GET /api/v1/costs/alerts - Alertas de custos
    router.get('/alerts', async (req, res) => {
        try {
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const [
                costToday,
                costYesterday,
                costThisMonth,
                avgDailyCost
            ] = await Promise.all([
                db.ApiCost.sum('cost_brl', {
                    where: {
                        timestamp: {
                            [db.Op.gte]: new Date(today.getFullYear(), today.getMonth(), today.getDate())
                        }
                    }
                }),
                db.ApiCost.sum('cost_brl', {
                    where: {
                        timestamp: {
                            [db.Op.between]: [yesterday, today]
                        }
                    }
                }),
                db.ApiCost.sum('cost_brl', {
                    where: { timestamp: { [db.Op.gte]: thisMonth } }
                }),
                db.ApiCost.findOne({
                    attributes: [[db.sequelize.fn('AVG', db.sequelize.col('cost_brl')), 'avg']],
                    where: {
                        timestamp: {
                            [db.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                })
            ]);

            const todayCost = parseFloat(costToday || 0);
            const yesterdayCost = parseFloat(costYesterday || 0);
            const monthCost = parseFloat(costThisMonth || 0);
            const avgDaily = parseFloat(avgDailyCost?.dataValues?.avg || 0);

            const alerts = [];

            // Alertas baseados em thresholds
            if (todayCost > 5.0) {
                alerts.push({
                    type: 'high_daily_cost',
                    level: 'warning',
                    message: `Custo de hoje (R$ ${todayCost.toFixed(4)}) está acima do normal`,
                    value: todayCost.toFixed(4)
                });
            }

            if (monthCost > 100.0) {
                alerts.push({
                    type: 'high_monthly_cost',
                    level: 'error',
                    message: `Custo mensal (R$ ${monthCost.toFixed(2)}) excedeu R$ 100`,
                    value: monthCost.toFixed(2)
                });
            }

            if (todayCost > yesterdayCost * 2) {
                alerts.push({
                    type: 'cost_spike',
                    level: 'warning',
                    message: `Custo de hoje está 2x maior que ontem`,
                    value: ((todayCost / yesterdayCost - 1) * 100).toFixed(0) + '%'
                });
            }

            if (avgDaily > 3.0) {
                alerts.push({
                    type: 'high_average_cost',
                    level: 'info',
                    message: `Média diária alta: R$ ${avgDaily.toFixed(4)}`,
                    value: avgDaily.toFixed(4)
                });
            }

            res.success({
                alerts,
                summary: {
                    todayCost: todayCost.toFixed(4),
                    yesterdayCost: yesterdayCost.toFixed(4),
                    monthCost: monthCost.toFixed(2),
                    avgDailyCost: avgDaily.toFixed(4)
                }
            }, 'Alertas de custos carregados');
        } catch (error) {
            res.error('Erro ao carregar alertas de custos', 500);
        }
    });

    // GET /api/v1/costs/export - Exportar dados de custos
    router.get('/export', async (req, res) => {
        try {
            const { days = 30, format = 'json' } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            const costs = await db.ApiCost.findAll({
                where: { timestamp: { [db.Op.gte]: startDate } },
                include: [{
                    model: db.User,
                    as: 'user',
                    attributes: ['name', 'phone']
                }],
                order: [['timestamp', 'DESC']],
                limit: 1000
            });

            const exportData = costs.map(cost => ({
                id: cost.id,
                userId: cost.user_id,
                userName: cost.user?.name || 'N/A',
                userPhone: cost.user?.phone || 'N/A',
                inputTokens: cost.input_tokens,
                outputTokens: cost.output_tokens,
                totalTokens: cost.total_tokens,
                costUSD: parseFloat(cost.cost_usd).toFixed(6),
                costBRL: parseFloat(cost.cost_brl).toFixed(6),
                timestamp: cost.timestamp
            }));

            res.success({
                period: `Últimos ${days} dias`,
                total: exportData.length,
                data: exportData
            }, 'Dados de custos exportados');
        } catch (error) {
            res.error('Erro ao exportar dados de custos', 500);
        }
    });

    return router;
}; 