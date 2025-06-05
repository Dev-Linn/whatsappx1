const express = require('express');
const router = express.Router();

// Opções padrão de follow-up
const FOLLOWUP_OPTIONS = [
    { label: '24 horas', hours: 24, days: 1 },
    { label: '3 dias', hours: 72, days: 3 },
    { label: '7 dias', hours: 168, days: 7 },
    { label: '1 mês', hours: 720, days: 30 } // 30 dias = 720 horas
];

// Mensagens padrão de follow-up
const DEFAULT_MESSAGES = [
    'Oi! Ainda tem interesse nas receitas de pudim? 😊',
    'E aí! Lembrou das receitas? Ainda dá tempo de garantir por 10 reais! 🍮',
    'Última chance! As receitas de pudim que você viu ainda estão disponíveis 💫',
    'Oi! Vi que você tinha interesse. Quer saber mais sobre as receitas? 📚'
];

module.exports = (database) => {
    // GET /api/v1/followup/options - Buscar opções de follow-up
    router.get('/options', async (req, res) => {
        try {
            res.success({
                intervals: FOLLOWUP_OPTIONS,
                defaultMessages: DEFAULT_MESSAGES
            }, 'Opções de follow-up carregadas');
        } catch (error) {
            console.error('❌ Erro ao buscar opções:', error);
            res.error('Erro ao carregar opções de follow-up', 500);
        }
    });

    // GET /api/v1/followup/pending - Buscar follow-ups pendentes
    router.get('/pending', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const now = new Date();

            const pendingFollowups = await database.User.findAll({
                where: {
                    tenant_id: tenantId,
                    followup_enabled: true,
                    next_followup_due: {
                        [database.Op.lte]: now
                    }
                },
                order: [['next_followup_due', 'ASC']],
                limit: 50
            });

            const result = pendingFollowups.map(user => ({
                id: user.id,
                name: user.name,
                phone: user.phone,
                stage: user.stage,
                sentiment: user.sentiment,
                followupIntervalHours: user.followup_interval_hours,
                followupCount: user.followup_count,
                lastFollowupSent: user.last_followup_sent,
                nextFollowupDue: user.next_followup_due,
                followupMessage: user.followup_message,
                lastContact: user.last_contact
            }));

            res.success({
                pending: result,
                total: result.length
            }, 'Follow-ups pendentes carregados');

        } catch (error) {
            console.error('❌ Erro ao buscar follow-ups pendentes:', error);
            res.error('Erro ao carregar follow-ups pendentes', 500);
        }
    });

    // POST /api/v1/followup/configure - Configurar follow-up para usuários
    router.post('/configure', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { 
                userIds, 
                intervalHours, 
                message, 
                enableAll = false 
            } = req.body;

            // Validações
            if (!enableAll && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
                return res.error('IDs de usuários são obrigatórios', 400);
            }

            if (!intervalHours || !FOLLOWUP_OPTIONS.find(opt => opt.hours === intervalHours)) {
                return res.error('Intervalo de follow-up inválido', 400);
            }

            const followupMessage = message || DEFAULT_MESSAGES[0];
            const now = new Date();
            const nextFollowupDue = new Date(now.getTime() + (intervalHours * 60 * 60 * 1000));

            let whereClause = { tenant_id: tenantId };
            
            if (!enableAll) {
                whereClause.id = { [database.Op.in]: userIds };
            }

            const [updatedCount] = await database.User.update({
                followup_enabled: true,
                followup_interval_hours: intervalHours,
                followup_message: followupMessage,
                next_followup_due: nextFollowupDue
            }, {
                where: whereClause
            });

            const action = enableAll ? 'todos os usuários' : `${userIds.length} usuário(s)`;
            const intervalLabel = FOLLOWUP_OPTIONS.find(opt => opt.hours === intervalHours)?.label;

            res.success({
                updatedCount,
                intervalHours,
                intervalLabel,
                message: followupMessage,
                nextFollowupDue
            }, `Follow-up configurado para ${action} - Intervalo: ${intervalLabel}`);

        } catch (error) {
            console.error('❌ Erro ao configurar follow-up:', error);
            res.error('Erro ao configurar follow-up', 500);
        }
    });

    // POST /api/v1/followup/disable - Desabilitar follow-up para usuários
    router.post('/disable', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { userIds, disableAll = false } = req.body;

            let whereClause = { tenant_id: tenantId };
            
            if (!disableAll) {
                if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                    return res.error('IDs de usuários são obrigatórios', 400);
                }
                whereClause.id = { [database.Op.in]: userIds };
            }

            const [updatedCount] = await database.User.update({
                followup_enabled: false,
                next_followup_due: null
            }, {
                where: whereClause
            });

            const action = disableAll ? 'todos os usuários' : `${userIds.length} usuário(s)`;

            res.success({
                updatedCount
            }, `Follow-up desabilitado para ${action}`);

        } catch (error) {
            console.error('❌ Erro ao desabilitar follow-up:', error);
            res.error('Erro ao desabilitar follow-up', 500);
        }
    });

    // POST /api/v1/followup/send/:userId - Enviar follow-up manual
    router.post('/send/:userId', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;
            const { userId } = req.params;
            const { message } = req.body;

            const user = await database.User.findOne({
                where: { 
                    id: userId, 
                    tenant_id: tenantId 
                }
            });

            if (!user) {
                return res.error('Usuário não encontrado', 404);
            }

            // Enviar mensagem via backend
            try {
                const fetch = require('node-fetch');
                const response = await fetch('http://localhost:3002/send-followup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        tenant_id: tenantId,
                        phone: user.phone,
                        message: message || user.followup_message
                    })
                });

                if (response.ok) {
                    // Atualizar dados do follow-up
                    const now = new Date();
                    const nextDue = user.followup_enabled && user.followup_interval_hours ? 
                        new Date(now.getTime() + (user.followup_interval_hours * 60 * 60 * 1000)) : null;

                    await user.update({
                        last_followup_sent: now,
                        next_followup_due: nextDue,
                        followup_count: user.followup_count + 1
                    });

                    res.success({
                        sent: true,
                        nextFollowupDue: nextDue
                    }, 'Follow-up enviado com sucesso');
                } else {
                    res.error('Erro ao enviar follow-up via WhatsApp', 500);
                }
            } catch (whatsappError) {
                console.error('❌ Erro ao enviar via WhatsApp:', whatsappError);
                res.error('Erro ao comunicar com WhatsApp', 500);
            }

        } catch (error) {
            console.error('❌ Erro ao enviar follow-up:', error);
            res.error('Erro ao enviar follow-up', 500);
        }
    });

    // GET /api/v1/followup/stats - Estatísticas de follow-up
    router.get('/stats', async (req, res) => {
        try {
            const tenantId = req.tenant?.id;

            const [
                totalEnabled,
                totalPending,
                totalSentToday,
                totalSentThisWeek
            ] = await Promise.all([
                // Total com follow-up habilitado
                database.User.count({
                    where: { 
                        tenant_id: tenantId, 
                        followup_enabled: true 
                    }
                }),
                
                // Total pendente (vencido)
                database.User.count({
                    where: {
                        tenant_id: tenantId,
                        followup_enabled: true,
                        next_followup_due: {
                            [database.Op.lte]: new Date()
                        }
                    }
                }),
                
                // Enviados hoje
                database.User.count({
                    where: {
                        tenant_id: tenantId,
                        last_followup_sent: {
                            [database.Op.gte]: new Date(new Date().setHours(0,0,0,0))
                        }
                    }
                }),
                
                // Enviados esta semana
                database.User.count({
                    where: {
                        tenant_id: tenantId,
                        last_followup_sent: {
                            [database.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                })
            ]);

            res.success({
                totalEnabled,
                totalPending,
                totalSentToday,
                totalSentThisWeek,
                averagePerDay: Math.round(totalSentThisWeek / 7)
            }, 'Estatísticas de follow-up carregadas');

        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            res.error('Erro ao carregar estatísticas', 500);
        }
    });

    return router;
}; 