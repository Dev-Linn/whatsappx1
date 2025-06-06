const express = require('express');
const fetch = require('node-fetch');
const { OAuth2Client } = require('google-auth-library');

// Função que retorna o router com acesso ao banco
module.exports = (db) => {
    console.log('🔍 [ANALYTICS DEBUG] Inicializando rotas analytics...');
    console.log('🔍 [ANALYTICS DEBUG] OAUTH_CLIENT_ID:', process.env.OAUTH_CLIENT_ID ? 'EXISTE' : 'NÃO EXISTE');
    console.log('🔍 [ANALYTICS DEBUG] OAUTH_CLIENT_SECRET:', process.env.OAUTH_CLIENT_SECRET ? 'EXISTE' : 'NÃO EXISTE'); 
    console.log('🔍 [ANALYTICS DEBUG] OAUTH_REDIRECT_URI:', process.env.OAUTH_REDIRECT_URI);
    
    const router = express.Router();
    
    // Middleware para adicionar db ao req
    router.use((req, res, next) => {
        console.log('🔍 [ANALYTICS DEBUG] Middleware executado para:', req.originalUrl);
        console.log('🔍 [ANALYTICS DEBUG] req.tenant:', req.tenant);
        // Usar a mesma interface que as outras rotas
        req.db = req.app.locals.db;
        next();
    });

    // Inicializar cliente OAuth2
    const oauth2Client = new OAuth2Client(
        process.env.OAUTH_CLIENT_ID,
        process.env.OAUTH_CLIENT_SECRET,
        process.env.OAUTH_REDIRECT_URI
    );

    // ==================== ROTAS DE AUTENTICAÇÃO GOOGLE ====================

    // Rota para iniciar OAuth do Google Analytics
    router.get('/auth/google', (req, res) => {
        console.log('🔍 [ANALYTICS DEBUG] Rota /auth/google chamada');
        console.log('🔍 [ANALYTICS DEBUG] req.tenant:', req.tenant);
        
        try {
            const clientId = process.env.OAUTH_CLIENT_ID;
            const redirectUri = process.env.OAUTH_REDIRECT_URI;
            
            console.log('🔍 [ANALYTICS DEBUG] clientId:', clientId ? 'EXISTE' : 'VAZIO');
            console.log('🔍 [ANALYTICS DEBUG] redirectUri:', redirectUri);
            
            if (!clientId || !redirectUri) {
                console.log('❌ [ANALYTICS DEBUG] Credenciais OAuth não configuradas');
                return res.status(500).json({
                    error: 'Credenciais OAuth não configuradas',
                    message: 'Verifique as variáveis de ambiente OAUTH_CLIENT_ID e OAUTH_REDIRECT_URI'
                });
            }
            
            // Incluir tenant_id no state para recuperar depois
            const state = Buffer.from(JSON.stringify({
                tenantId: req.tenant.id,
                email: req.tenant.email
            })).toString('base64');
            
            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/analytics.readonly'
                ],
                prompt: 'consent',
                state: state
            });
            
            res.json({ authUrl });
        } catch (error) {
            console.error('Erro ao gerar URL de autenticação:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: 'Erro ao gerar URL de autenticação'
            });
        }
    });

    // Callback do Google OAuth (POST - usado pelo frontend)
    router.post('/auth/google/callback', async (req, res) => {
        try {
            const { code, state } = req.body;
            
            if (!code) {
                return res.status(400).json({
                    error: 'Código de autorização não fornecido'
                });
            }
            
            // Verificar state se fornecido
            if (state) {
                try {
                    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
                    if (stateData.tenantId !== req.tenant.id) {
                        return res.status(403).json({
                            error: 'Estado inválido',
                            message: 'Token não pertence ao tenant atual'
                        });
                    }
                } catch (err) {
                    console.warn('Erro ao verificar state:', err);
                }
            }

            // Obter tokens do Google
            const { tokens } = await oauth2Client.getToken({
                code: code,
                client_id: process.env.OAUTH_CLIENT_ID,
                client_secret: process.env.OAUTH_CLIENT_SECRET,
                redirect_uri: process.env.OAUTH_REDIRECT_URI
            });

            // Armazenar tokens no banco de dados por tenant
            const database = req.db;
            await database.sequelize.query(`
                INSERT OR REPLACE INTO google_analytics_tokens 
                (tenant_id, access_token, refresh_token, expires_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `, {
                replacements: [
                    req.tenant.id,
                    tokens.access_token,
                    tokens.refresh_token || null,
                    tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
                ]
            });

            res.json({
                success: true,
                message: 'Autenticação realizada com sucesso'
            });

        } catch (error) {
            console.error('Erro no callback OAuth:', error);
            res.status(500).json({
                error: 'Erro durante autenticação',
                message: error.message
            });
        }
    });

    // ==================== ROTAS DE GERENCIAMENTO DE CONTAS ====================

    // Buscar contas do Google Analytics do usuário
    router.get('/accounts', async (req, res) => {
        try {
            const tokens = await getValidTokens(req.tenant.id, req.db);
            if (!tokens) {
                return res.status(401).json({
                    error: 'Não autenticado',
                    message: 'Faça login no Google Analytics primeiro'
                });
            }

            const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', {
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    return res.status(401).json({
                        error: 'Token expirado',
                        message: 'Refaça a autenticação'
                    });
                }
                throw new Error(`Erro da API: ${response.status}`);
            }

            const data = await response.json();
            const accounts = data.accounts || [];

            res.json({ accounts });

        } catch (error) {
            console.error('Erro ao buscar contas:', error);
            res.status(500).json({
                error: 'Erro ao carregar contas',
                message: error.message
            });
        }
    });

    // Buscar propriedades de uma conta específica
    router.get('/accounts/:accountId/properties', async (req, res) => {
        try {
            const { accountId } = req.params;
            
            const tokens = await getValidTokens(req.tenant.id, req.db);
            if (!tokens) {
                return res.status(401).json({
                    error: 'Não autenticado'
                });
            }

            const response = await fetch(
                `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/${accountId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Erro da API: ${response.status}`);
            }

            const data = await response.json();
            const properties = data.properties || [];

            res.json({ properties });

        } catch (error) {
            console.error('Erro ao buscar propriedades:', error);
            res.status(500).json({
                error: 'Erro ao carregar propriedades',
                message: error.message
            });
        }
    });

    // Salvar seleção de conta e propriedade do usuário
    router.post('/selection', async (req, res) => {
        try {
            const { accountId, propertyId } = req.body;
            
            if (!accountId || !propertyId) {
                return res.status(400).json({
                    error: 'Dados obrigatórios não fornecidos',
                    message: 'accountId e propertyId são obrigatórios'
                });
            }

            const database = req.db;
            await database.sequelize.query(`
                INSERT OR REPLACE INTO google_analytics_selections 
                (tenant_id, account_id, property_id, created_at, updated_at)
                VALUES (?, ?, ?, datetime('now'), datetime('now'))
            `, {
                replacements: [req.tenant.id, accountId, propertyId]
            });

            res.json({
                success: true,
                message: 'Seleção salva com sucesso'
            });

        } catch (error) {
            console.error('Erro ao salvar seleção:', error);
            res.status(500).json({
                error: 'Erro ao salvar seleção',
                message: error.message
            });
        }
    });

    // ==================== ROTAS DE DADOS ANALYTICS ====================

    // Obter dados do dashboard
    router.get('/dashboard-data', async (req, res) => {
        try {
            const selection = await getUserSelection(req.tenant.id, req.db);
            if (!selection) {
                return res.status(400).json({
                    error: 'Propriedade não selecionada',
                    message: 'Selecione uma propriedade primeiro'
                });
            }

            const tokens = await getValidTokens(req.tenant.id, req.db);
            if (!tokens) {
                return res.status(401).json({
                    error: 'Não autenticado'
                });
            }

            const propertyId = selection.property_id;

            // Corpo da requisição para o Google Analytics Data API
            const requestBody = {
                dateRanges: [{
                    startDate: '30daysAgo',
                    endDate: 'today',
                }],
                dimensions: [
                    { name: 'date' },
                    { name: 'deviceCategory' },
                    { name: 'country' },
                    { name: 'city' },
                    { name: 'pagePath' },
                    { name: 'sessionSource' },
                    { name: 'sessionMedium' }
                ],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'newUsers' },
                    { name: 'sessions' },
                    { name: 'screenPageViews' },
                    { name: 'averageSessionDuration' },
                    { name: 'bounceRate' },
                    { name: 'conversions' },
                    { name: 'totalRevenue' },
                    { name: 'engagedSessions' },
                    { name: 'engagementRate' }
                ],
                orderBys: [{
                    dimension: { dimensionName: 'date' },
                    desc: true
                }],
                limit: 1000
            };

            const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    return res.status(401).json({
                        error: 'Token expirado'
                    });
                }
                throw new Error(`Erro na API: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.rows || data.rows.length === 0) {
                return res.json({
                    message: 'Nenhum dado encontrado para o período selecionado',
                    data: []
                });
            }

            // Formatar os dados para o frontend
            const formattedData = data.rows.map(row => ({
                date: row.dimensionValues[0].value,
                deviceCategory: row.dimensionValues[1].value,
                country: row.dimensionValues[2].value,
                city: row.dimensionValues[3].value || '',
                pagePath: row.dimensionValues[4].value,
                sessionSource: row.dimensionValues[5].value,
                sessionMedium: row.dimensionValues[6].value,
                metrics: {
                    activeUsers: Number(row.metricValues[0].value) || 0,
                    newUsers: Number(row.metricValues[1].value) || 0,
                    sessions: Number(row.metricValues[2].value) || 0,
                    screenPageViews: Number(row.metricValues[3].value) || 0,
                    averageSessionDuration: Number(row.metricValues[4].value) || 0,
                    bounceRate: Number(row.metricValues[5].value) || 0,
                    conversions: Number(row.metricValues[6].value) || 0,
                    totalRevenue: Number(row.metricValues[7].value) || 0,
                    engagedSessions: Number(row.metricValues[8].value) || 0,
                    engagementRate: Number(row.metricValues[9].value) || 0
                }
            }));

            res.json({ data: formattedData });

        } catch (error) {
            console.error('Erro ao buscar dados dashboard:', error);
            res.status(500).json({
                error: 'Erro ao carregar dados do dashboard',
                message: error.message
            });
        }
    });

    // Verificar status da autenticação
    router.get('/auth/status', async (req, res) => {
        try {
            const tokens = await getValidTokens(req.tenant.id, req.db);
            const selection = await getUserSelection(req.tenant.id, req.db);
            
            res.json({
                authenticated: !!tokens,
                hasSelection: !!selection,
                selection: selection || null
            });
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            res.status(500).json({
                error: 'Erro ao verificar status',
                message: error.message
            });
        }
    });

    // Logout - remover tokens
    router.delete('/auth/logout', async (req, res) => {
        try {
            const database = req.db;
            await database.sequelize.query('DELETE FROM google_analytics_tokens WHERE tenant_id = ?', {
                replacements: [req.tenant.id]
            });
            await database.sequelize.query('DELETE FROM google_analytics_selections WHERE tenant_id = ?', {
                replacements: [req.tenant.id]
            });
            
            res.json({
                success: true,
                message: 'Logout realizado com sucesso'
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            res.status(500).json({
                error: 'Erro ao fazer logout',
                message: error.message
            });
        }
    });

    // ==================== FUNÇÕES AUXILIARES ====================

    // Função para obter tokens válidos (com refresh se necessário)
    async function getValidTokens(tenantId, database) {
        try {
            const [results] = await database.sequelize.query(
                'SELECT * FROM google_analytics_tokens WHERE tenant_id = ?',
                {
                    replacements: [tenantId]
                }
            );
            const result = results[0];
            
            if (!result) {
                return null;
            }
            
            const tokens = {
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                expiry_date: result.expires_at ? new Date(result.expires_at).getTime() : null
            };
            
            // Verificar se o token está próximo do vencimento
            if (tokens.expiry_date && tokens.expiry_date <= Date.now() + 5 * 60 * 1000) { // 5 minutos antes
                if (tokens.refresh_token) {
                    try {
                        oauth2Client.setCredentials(tokens);
                        const { credentials } = await oauth2Client.refreshAccessToken();
                        
                        // Atualizar tokens no banco
                        await database.sequelize.query(`
                            UPDATE google_analytics_tokens 
                            SET access_token = ?, expires_at = ?, updated_at = datetime('now')
                            WHERE tenant_id = ?
                        `, {
                            replacements: [
                                credentials.access_token,
                                credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
                                tenantId
                            ]
                        });
                        
                        return {
                            access_token: credentials.access_token,
                            refresh_token: credentials.refresh_token || tokens.refresh_token,
                            expiry_date: credentials.expiry_date
                        };
                    } catch (refreshError) {
                        console.error('Erro ao renovar token:', refreshError);
                        return null;
                    }
                } else {
                    return null; // Token expirado sem refresh token
                }
            }
            
            return tokens;
        } catch (error) {
            console.error('Erro ao obter tokens:', error);
            return null;
        }
    }

    // Função para obter seleção do usuário
    async function getUserSelection(tenantId, database) {
        try {
            const [results] = await database.sequelize.query(
                'SELECT * FROM google_analytics_selections WHERE tenant_id = ?',
                {
                    replacements: [tenantId]
                }
            );
            return results[0];
        } catch (error) {
            console.error('Erro ao obter seleção:', error);
            return null;
        }
    }

    return router;
}; 