const express = require('express');
const router = express.Router();
const { 
    generateToken, 
    hashPassword, 
    verifyPassword, 
    isValidEmail, 
    isValidPassword,
    authenticateToken 
} = require('../middleware/auth');

module.exports = (db) => {
    // POST /auth/register - Registro de novo tenant
    router.post('/register', async (req, res) => {
        try {
            const { company_name, email, password, invite_code } = req.body;

            // Validações
            if (!company_name || !email || !password || !invite_code) {
                return res.status(400).json({
                    success: false,
                    error: 'Todos os campos são obrigatórios',
                    details: 'company_name, email, password e invite_code são necessários'
                });
            }

            // Validar código de convite
            if (invite_code !== 'KKJJAJBKJBSA89321B') {
                return res.status(403).json({
                    success: false,
                    error: 'Código de convite inválido',
                    details: 'Entre em contato para obter um código válido'
                });
            }

            if (!isValidEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Email inválido',
                    details: 'Forneça um email válido'
                });
            }

            if (!isValidPassword(password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Senha muito fraca',
                    details: 'Senha deve ter pelo menos 8 caracteres, 1 maiúscula, 1 minúscula e 1 número'
                });
            }

            // Verificar se email já existe
            const existingTenant = await db.Tenant.findOne({ 
                where: { email: email.toLowerCase() } 
            });

            if (existingTenant) {
                return res.status(409).json({
                    success: false,
                    error: 'Email já cadastrado',
                    details: 'Este email já está sendo usado por outro tenant'
                });
            }

            // Hash da senha
            const password_hash = await hashPassword(password);

            // Criar tenant
            const tenant = await db.Tenant.create({
                company_name,
                email: email.toLowerCase(),
                password_hash,
                whatsapp_connected: false,
                status: 'active'
            });

            // Gerar token JWT
            const token = generateToken(tenant);

            res.status(201).json({
                success: true,
                message: 'Tenant criado com sucesso',
                data: {
                    token,
                    tenant: {
                        id: tenant.id,
                        company_name: tenant.company_name,
                        email: tenant.email,
                        whatsapp_connected: tenant.whatsapp_connected,
                        status: tenant.status,
                        created_at: tenant.created_at
                    }
                }
            });

        } catch (error) {
            console.error('❌ Erro no registro:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    // POST /auth/login - Login do tenant
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validações
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email e senha são obrigatórios',
                    details: 'Forneça email e password'
                });
            }

            if (!isValidEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Email inválido',
                    details: 'Forneça um email válido'
                });
            }

            // Buscar tenant pelo email
            const tenant = await db.Tenant.findOne({ 
                where: { email: email.toLowerCase() } 
            });

            if (!tenant) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciais inválidas',
                    details: 'Email ou senha incorretos'
                });
            }

            // Verificar status do tenant
            if (tenant.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    error: 'Conta inativa',
                    details: `Status da conta: ${tenant.status}`
                });
            }

            // Verificar senha
            const isValidPassword = await verifyPassword(password, tenant.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciais inválidas',
                    details: 'Email ou senha incorretos'
                });
            }

            // Gerar token JWT
            const token = generateToken(tenant);
            
            // Dados do tenant para o frontend (sem senha)
            const tenantData = {
                id: tenant.id,
                company_name: tenant.company_name,
                email: tenant.email,
                whatsapp_connected: tenant.whatsapp_connected,
                status: tenant.status,
                created_at: tenant.created_at,
                updated_at: tenant.updated_at
            };

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: {
                    token,
                    tenant: tenantData
                }
            });

        } catch (error) {
            console.error('❌ Erro no login:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    // GET /auth/me - Informações do tenant logado
    router.get('/me', authenticateToken, async (req, res) => {
        try {
            const tenant = await db.Tenant.findByPk(req.tenant.id);

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    error: 'Tenant não encontrado',
                    details: 'Token pode estar corrompido'
                });
            }

            res.json({
                success: true,
                message: 'Informações do tenant',
                data: {
                    tenant: {
                        id: tenant.id,
                        company_name: tenant.company_name,
                        email: tenant.email,
                        whatsapp_connected: tenant.whatsapp_connected,
                        whatsapp_session_id: tenant.whatsapp_session_id,
                        status: tenant.status,
                        created_at: tenant.created_at,
                        updated_at: tenant.updated_at
                    }
                }
            });

        } catch (error) {
            console.error('❌ Erro ao buscar tenant:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    // POST /auth/refresh - Renovar token
    router.post('/refresh', authenticateToken, async (req, res) => {
        try {
            const tenant = await db.Tenant.findByPk(req.tenant.id);

            if (!tenant || tenant.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    error: 'Não autorizado',
                    details: 'Tenant inativo ou não encontrado'
                });
            }

            // Gerar novo token
            const token = generateToken(tenant);

            res.json({
                success: true,
                message: 'Token renovado com sucesso',
                data: {
                    token
                }
            });

        } catch (error) {
            console.error('❌ Erro ao renovar token:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    return router;
}; 