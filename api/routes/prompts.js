const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Middleware para autenticar requests do backend
const authenticateBackendOrToken = async (req, res, next) => {
    // Se tem X-Tenant-ID header, é request do backend
    const tenantIdHeader = req.headers['x-tenant-id'];
    if (tenantIdHeader) {
        const tenantId = parseInt(tenantIdHeader);
        if (tenantId && !isNaN(tenantId)) {
            // Buscar tenant no banco
            const db = req.app.locals.db;
            try {
                const tenant = await db.Tenant.findByPk(tenantId);
                if (tenant) {
                    req.tenant = tenant;
                    return next();
                }
            } catch (error) {
                console.error('Erro ao validar tenant do backend:', error);
            }
        }
        return res.status(403).json({
            success: false,
            error: 'Tenant ID inválido no header'
        });
    }
    
    // Senão, usar autenticação JWT normal
    return authenticateToken(req, res, next);
};

module.exports = (db) => {
    // Adicionar db ao locals para usar no middleware
    router.use((req, res, next) => {
        req.app.locals.db = db;
        next();
    });

    // GET /prompts - Buscar prompt do tenant logado
    router.get('/', authenticateBackendOrToken, async (req, res) => {
        try {
            const tenantId = req.tenant.id;
            const prompt = await db.getTenantPrompt(tenantId);

            res.json({
                success: true,
                message: 'Prompt do tenant recuperado com sucesso',
                data: prompt
            });

        } catch (error) {
            console.error('❌ Erro ao buscar prompt:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    // PUT /prompts - Atualizar prompt do tenant logado
    router.put('/', authenticateBackendOrToken, async (req, res) => {
        try {
            const tenantId = req.tenant.id;
            const { base_prompt, clarification_prompt, qualification_prompt, ai_model } = req.body;

            // Validações
            if (!base_prompt || base_prompt.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Prompt base é obrigatório',
                    details: 'O campo base_prompt não pode estar vazio'
                });
            }

            if (base_prompt.length > 10000) {
                return res.status(400).json({
                    success: false,
                    error: 'Prompt base muito longo',
                    details: 'O prompt base deve ter no máximo 10.000 caracteres'
                });
            }

            // Validar modelo AI se fornecido
            const validModels = [
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gemini-2.0-flash',
                'gemini-2.5-pro-preview-05-06',
                'gemini-2.5-flash-preview-04-17'
            ];

            if (ai_model && !validModels.includes(ai_model)) {
                return res.status(400).json({
                    success: false,
                    error: 'Modelo AI inválido',
                    details: `Modelos válidos: ${validModels.join(', ')}`
                });
            }

            const updatedPrompt = await db.updateTenantPrompt(tenantId, {
                base_prompt,
                clarification_prompt,
                qualification_prompt,
                ai_model
            });

            res.json({
                success: true,
                message: 'Prompt atualizado com sucesso',
                data: updatedPrompt
            });

        } catch (error) {
            console.error('❌ Erro ao atualizar prompt:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    // POST /prompts/reset - Resetar prompt para o padrão
    router.post('/reset', authenticateBackendOrToken, async (req, res) => {
        try {
            const tenantId = req.tenant.id;
            const defaultPrompt = await db.resetTenantPrompt(tenantId);

            res.json({
                success: true,
                message: 'Prompt resetado para o padrão com sucesso',
                data: defaultPrompt
            });

        } catch (error) {
            console.error('❌ Erro ao resetar prompt:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    // POST /prompts/test - Testar prompt (preview)
    router.post('/test', authenticateBackendOrToken, async (req, res) => {
        try {
            const { test_message = "Oi, tudo bem?" } = req.body;

            // Buscar dados do tenant para obter o prompt e modelo AI configurados
            const tenantId = req.tenant.id;
            const tenantPrompt = await db.getTenantPrompt(tenantId);
            
            if (!tenantPrompt || !tenantPrompt.base_prompt) {
                return res.status(400).json({
                    success: false,
                    error: 'Prompt não encontrado',
                    details: 'Configure um prompt antes de testar'
                });
            }

            const modelToUse = req.body.ai_model || tenantPrompt.ai_model || 'gemini-1.5-flash';
            
            console.log(`🧠 [DEBUG] Usando modelo AI: ${modelToUse} para tenant ${tenantId}`);
            console.log(`🧠 [DEBUG] Prompt do tenant: ${tenantPrompt.base_prompt.substring(0, 100)}...`);
            
            // Montar prompt final como seria usado na conversa (usando sempre o prompt salvo)
            const fullPrompt = `${tenantPrompt.base_prompt}\n\nCliente: ${test_message}\n\nVocê:`;

            // Testar com Gemini (se a chave API estiver disponível)
            let aiResponse = null;
            let testSuccess = false;

            try {
                // Importar e configurar Gemini para teste
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                
                if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY) {
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ model: modelToUse });
                    
                    console.log(`🧠 [DEBUG] Executando teste com modelo: ${modelToUse}`);
                    
                    const result = await model.generateContent(fullPrompt);
                    const response = await result.response;
                    aiResponse = response.text();
                    testSuccess = true;
                    
                    console.log(`✅ Teste de prompt realizado com sucesso para tenant ${req.tenant.id} usando modelo ${modelToUse}`);
                } else {
                    aiResponse = "⚠️ Chave API do Gemini não configurada - não é possível testar a resposta real";
                }
            } catch (geminiError) {
                console.error(`❌ Erro ao testar com Gemini (${modelToUse}):`, geminiError.message);
                aiResponse = `❌ Erro ao testar com IA: ${geminiError.message}`;
            }

            res.json({
                success: true,
                message: 'Preview do prompt gerado com sucesso',
                data: {
                    preview: fullPrompt,
                    aiResponse: aiResponse,
                    testSuccess: testSuccess,
                    modelUsed: modelToUse,
                    stats: {
                        characters: fullPrompt.length,
                        estimated_tokens: Math.ceil(fullPrompt.length / 4),
                        estimated_cost_brl: (Math.ceil(fullPrompt.length / 4) * 0.00000015 * 5.5).toFixed(6)
                    }
                }
            });

        } catch (error) {
            console.error('❌ Erro ao testar prompt:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    // GET /prompts/models - Listar modelos AI disponíveis
    router.get('/models', authenticateBackendOrToken, async (req, res) => {
        try {
            const models = [
                {
                    id: 'gemini-1.5-flash',
                    name: 'Gemini 1.5 Flash',
                    description: 'Modelo rápido e eficiente para conversas cotidianas',
                    available: true,
                    recommended: true,
                    features: ['Resposta rápida', 'Custo baixo', 'Boa qualidade']
                },
                {
                    id: 'gemini-1.5-pro',
                    name: 'Gemini 1.5 Pro',
                    description: 'Modelo avançado com melhor compreensão e raciocínio',
                    available: true,
                    recommended: false,
                    features: ['Alta qualidade', 'Raciocínio complexo', 'Melhor contexto']
                },
                {
                    id: 'gemini-2.0-flash',
                    name: 'Gemini 2.0 Flash',
                    description: 'Nova geração ultra-rápida com melhor precisão',
                    available: false,
                    recommended: false,
                    features: ['Velocidade extrema', 'Precisão melhorada', 'Em breve']
                },
                {
                    id: 'gemini-2.5-pro-preview-05-06',
                    name: 'Gemini 2.5 Pro Preview',
                    description: 'Versão prévia do modelo mais avançado da Google',
                    available: false,
                    recommended: false,
                    features: ['Máxima qualidade', 'Funcionalidades avançadas', 'Em breve']
                },
                {
                    id: 'gemini-2.5-flash-preview-04-17',
                    name: 'Gemini 2.5 Flash Preview',
                    description: 'Preview da nova versão Flash com melhorias significativas',
                    available: false,
                    recommended: false,
                    features: ['Velocidade melhorada', 'Precisão aprimorada', 'Em breve']
                }
            ];

            res.json({
                success: true,
                message: 'Modelos AI disponíveis',
                data: models
            });

        } catch (error) {
            console.error('❌ Erro ao listar modelos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro interno do servidor',
                details: error.message
            });
        }
    });

    return router;
}; 