const express = require('express');
const jwt = require('jsonwebtoken');

// Credenciais hardcoded do admin (mais seguro que banco para admin único)
const ADMIN_CREDENTIALS = {
    email: 'macaco@macaco.com',
    password: 'macaco',
    name: 'Administrador'
};

// Middleware de autenticação admin
const authenticateAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'Token não fornecido'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar se é token admin
        if (!decoded.isAdmin || decoded.email !== ADMIN_CREDENTIALS.email) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado - Admin requerido'
            });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Token inválido'
        });
    }
};

function adminRoutes(db) {
    const router = express.Router();

    // Login do admin
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email e senha são obrigatórios'
                });
            }

            // Verificar credenciais
            if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciais inválidas'
                });
            }

            // Gerar JWT específico para admin
            const token = jwt.sign({
                email: ADMIN_CREDENTIALS.email,
                name: ADMIN_CREDENTIALS.name,
                isAdmin: true,
                loginTime: new Date().toISOString()
            }, process.env.JWT_SECRET, {
                expiresIn: '4h' // Sessão mais curta para admin
            });

            res.json({
                success: true,
                message: 'Login admin realizado com sucesso',
                data: {
                    token,
                    admin: {
                        email: ADMIN_CREDENTIALS.email,
                        name: ADMIN_CREDENTIALS.name
                    }
                }
            });

        } catch (error) {
            console.error('❌ Erro no login admin:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor'
            });
        }
    });

    // Dashboard - Estatísticas gerais
    router.get('/dashboard', authenticateAdmin, async (req, res) => {
        try {
            const [
                totalTenants,
                activeTenants,
                totalUsers,
                totalMessages,
                totalCosts,
                todayMessages,
                connectedTenants
            ] = await Promise.all([
                db.Tenant.count(),
                db.Tenant.count({ where: { status: 'active' } }),
                db.User.count(),
                db.Message.count(),
                db.ApiCost.sum('cost_brl'),
                db.Message.count({
                    where: {
                        timestamp: {
                            [db.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    }
                }),
                db.Tenant.count({ where: { whatsapp_connected: true } })
            ]);

            res.json({
                success: true,
                data: {
                    tenants: {
                        total: totalTenants,
                        active: activeTenants,
                        inactive: totalTenants - activeTenants,
                        connected: connectedTenants
                    },
                    users: {
                        total: totalUsers
                    },
                    messages: {
                        total: totalMessages,
                        today: todayMessages
                    },
                    costs: {
                        total: parseFloat(totalCosts || 0).toFixed(2)
                    },
                    lastUpdate: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar dashboard admin:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao carregar dashboard'
            });
        }
    });

    // Lista todos os usuários com detalhes
    router.get('/users', authenticateAdmin, async (req, res) => {
        try {
            const { tenantId, limit = 100 } = req.query;
            
            const whereClause = tenantId ? { tenant_id: tenantId } : {};
            
            const users = await db.User.findAll({
                where: whereClause,
                include: [
                    {
                        model: db.Tenant,
                        as: 'tenant',
                        attributes: ['id', 'company_name']
                    },
                    {
                        model: db.Message,
                        as: 'messages',
                        attributes: ['id'],
                        required: false
                    }
                ],
                attributes: [
                    'id', 'phone', 'name', 'first_contact', 
                    'last_contact', 'tenant_id'
                ],
                order: [['first_contact', 'DESC']],
                limit: parseInt(limit)
            });

            // Calcular estatísticas para cada usuário
            const usersWithStats = users.map(user => ({
                id: user.id,
                phone_number: user.phone,
                name: user.name,
                email: null, // Campo não existe na tabela
                created_at: user.first_contact,
                last_interaction: user.last_contact,
                tenant: {
                    id: user.tenant?.id,
                    company_name: user.tenant?.company_name
                },
                stats: {
                    messages: user.messages.length
                }
            }));

            res.json({
                success: true,
                data: usersWithStats,
                total: users.length
            });

        } catch (error) {
            console.error('❌ Erro ao buscar usuários:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao carregar usuários'
            });
        }
    });

    // Lista todos os tenants com detalhes
    router.get('/tenants', authenticateAdmin, async (req, res) => {
        try {
            const tenants = await db.Tenant.findAll({
                attributes: [
                    'id', 'company_name', 'email', 'whatsapp_connected', 
                    'status', 'created_at', 'updated_at'
                ],
                include: [
                    {
                        model: db.User,
                        as: 'users',
                        attributes: ['id'],
                        required: false
                    },
                    {
                        model: db.Message,
                        as: 'messages',
                        attributes: ['id'],
                        required: false
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            // Calcular estatísticas para cada tenant
            const tenantsWithStats = tenants.map(tenant => ({
                id: tenant.id,
                company_name: tenant.company_name,
                email: tenant.email,
                whatsapp_connected: tenant.whatsapp_connected,
                status: tenant.status,
                created_at: tenant.created_at,
                updated_at: tenant.updated_at,
                stats: {
                    users: tenant.users.length,
                    messages: tenant.messages.length
                }
            }));

            res.json({
                success: true,
                data: tenantsWithStats
            });

        } catch (error) {
            console.error('❌ Erro ao buscar tenants:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao carregar tenants'
            });
        }
    });

    // Controlar status de um tenant
    router.put('/tenants/:id/status', authenticateAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['active', 'inactive', 'suspended'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Status inválido'
                });
            }

            const tenant = await db.Tenant.findByPk(id);
            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    error: 'Tenant não encontrado'
                });
            }

            await tenant.update({ status });

            res.json({
                success: true,
                message: `Status do tenant ${id} alterado para ${status}`
            });

        } catch (error) {
            console.error('❌ Erro ao alterar status do tenant:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao alterar status'
            });
        }
    });

    // Status das instâncias WhatsApp
    router.get('/whatsapp/instances', authenticateAdmin, async (req, res) => {
        try {
            // Buscar status do backend
            const backendResponse = await fetch('http://localhost:3002/status');
            const backendData = await backendResponse.json();

            res.json({
                success: true,
                data: backendData
            });

        } catch (error) {
            console.error('❌ Erro ao buscar instâncias WhatsApp:', error);
            res.json({
                success: true,
                data: {
                    totalInstances: 0,
                    instances: {},
                    error: 'Backend não disponível'
                }
            });
        }
    });

    // Restart de instância específica
    router.post('/whatsapp/:tenantId/restart', authenticateAdmin, async (req, res) => {
        try {
            const { tenantId } = req.params;

            const backendResponse = await fetch('http://localhost:3002/restart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId })
            });

            if (backendResponse.ok) {
                res.json({
                    success: true,
                    message: `Restart da instância ${tenantId} iniciado`
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Erro ao comunicar com backend'
                });
            }

        } catch (error) {
            console.error('❌ Erro no restart da instância:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao reiniciar instância'
            });
        }
    });

    // Reset completo do banco
    router.post('/database/reset', authenticateAdmin, async (req, res) => {
        try {
            console.log(`🚨 [ADMIN] Reset do banco solicitado por ${req.admin.email}`);

            // Desabilitar foreign keys
            await db.sequelize.query('PRAGMA foreign_keys = OFF');
            
            // Limpar todas as tabelas
            await db.sequelize.query('DELETE FROM api_costs');
            await db.sequelize.query('DELETE FROM messages');
            await db.sequelize.query('DELETE FROM conversations');
            await db.sequelize.query('DELETE FROM tenant_prompts');
            await db.sequelize.query('DELETE FROM users');
            await db.sequelize.query('DELETE FROM tenants');
            
            // Resetar AUTO_INCREMENT
            await db.sequelize.query('DELETE FROM sqlite_sequence');
            await db.sequelize.query('VACUUM');
            
            // Reabilitar foreign keys
            await db.sequelize.query('PRAGMA foreign_keys = ON');

            console.log(`✅ [ADMIN] Reset do banco concluído`);

            res.json({
                success: true,
                message: 'Banco de dados resetado com sucesso'
            });

        } catch (error) {
            console.error('❌ Erro no reset do banco:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao resetar banco de dados'
            });
        }
    });

    // Estatísticas das tabelas
    router.get('/database/stats', authenticateAdmin, async (req, res) => {
        try {
            const [tables] = await db.sequelize.query(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `);

            const tableStats = [];
            
            for (const table of tables) {
                const tableName = table.name;
                try {
                    const [countResult] = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                    const count = countResult[0].count;
                    
                    const [seqResult] = await db.sequelize.query(`
                        SELECT seq FROM sqlite_sequence WHERE name = '${tableName}'
                    `);
                    const currentSeq = seqResult.length > 0 ? seqResult[0].seq : null;
                    
                    tableStats.push({
                        name: tableName,
                        records: count,
                        autoIncrement: currentSeq
                    });
                } catch (error) {
                    tableStats.push({
                        name: tableName,
                        records: 'ERROR',
                        autoIncrement: 'ERROR'
                    });
                }
            }

            res.json({
                success: true,
                data: {
                    totalTables: tables.length,
                    tables: tableStats
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar stats do banco:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao carregar estatísticas'
            });
        }
    });

    return router;
}

module.exports = adminRoutes; 