// Sistema de Tracking Simples e Funcional

const express = require('express');
const ApiDatabase = require('./database');

// Configurar Express
const app = express();
app.use(express.json());

// Inicializar banco
let database;

async function initDatabase() {
    database = new ApiDatabase();
    await database.initialize();
    console.log('✅ Database inicializado para tracking');
}

// ENDPOINT: Gerar link rastreado
app.post('/generate-tracking-link', async (req, res) => {
    try {
        const { 
            linkType,           // 'whatsapp', 'website', 'checkout'
            whatsappNumber,     // Para tipo whatsapp
            message,            // Mensagem WhatsApp
            destinationUrl,     // Para website/checkout
            campaignName,       // Nome da campanha
            tenantId 
        } = req.body;

        console.log('🔗 Gerando link rastreado:', { linkType, campaignName, tenantId });

        // Validações
        if (!linkType || !tenantId) {
            return res.status(400).json({
                error: 'linkType e tenantId são obrigatórios'
            });
        }

        // Determinar URL final
        let finalUrl;
        
        switch (linkType) {
            case 'whatsapp':
                if (!whatsappNumber) {
                    return res.status(400).json({ error: 'Número WhatsApp obrigatório' });
                }
                const encodedMsg = encodeURIComponent(message || 'Olá! Vim pelo link rastreado');
                finalUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodedMsg}`;
                break;
                
            case 'website':
            case 'checkout':
                if (!destinationUrl) {
                    return res.status(400).json({ error: 'URL destino obrigatória' });
                }
                finalUrl = destinationUrl;
                break;
                
            default:
                return res.status(400).json({ error: 'Tipo inválido' });
        }

        // Gerar ID único
        const trackingId = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Salvar no banco
        await database.sequelize.query(`
            INSERT INTO whatsapp_tracking_links 
            (tenant_id, tracking_id, base_url, campaign_name, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `, {
            replacements: [tenantId, trackingId, finalUrl, campaignName || 'default']
        });

        // URL rastreada
        const trackedUrl = `https://lucrogourmet.shop/track/${trackingId}?tenant=${tenantId}&url=${encodeURIComponent(finalUrl)}`;

        console.log('✅ Link gerado:', trackedUrl);

        res.json({
            success: true,
            trackingId,
            trackedUrl,
            originalUrl: finalUrl,
            linkType,
            campaignName: campaignName || 'default'
        });

    } catch (error) {
        console.error('❌ Erro ao gerar link:', error);
        res.status(500).json({ error: 'Erro interno', message: error.message });
    }
});

// ENDPOINT: Ver estatísticas
app.get('/tracking-stats/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;

        // Links criados
        const links = await database.sequelize.query(`
            SELECT * FROM whatsapp_tracking_links 
            WHERE tenant_id = ? 
            ORDER BY created_at DESC
        `, {
            replacements: [tenantId],
            type: database.sequelize.QueryTypes.SELECT
        });

        // Cliques registrados
        const clicks = await database.sequelize.query(`
            SELECT * FROM whatsapp_click_tracking 
            WHERE tenant_id = ? 
            ORDER BY clicked_at DESC
        `, {
            replacements: [tenantId],
            type: database.sequelize.QueryTypes.SELECT
        });

        const stats = {
            totalLinks: links.length,
            totalClicks: clicks.length,
            clickRate: links.length > 0 ? ((clicks.length / links.length) * 100).toFixed(1) : '0.0',
            recentLinks: links.slice(0, 5),
            recentClicks: clicks.slice(0, 10)
        };

        res.json(stats);

    } catch (error) {
        console.error('❌ Erro ao buscar stats:', error);
        res.status(500).json({ error: 'Erro interno', message: error.message });
    }
});

// TESTE
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Sistema de tracking funcionando!',
        endpoints: {
            generateLink: 'POST /generate-tracking-link',
            stats: 'GET /tracking-stats/:tenantId',
            test: 'GET /test'
        }
    });
});

// Inicializar
const PORT = 3333;

async function start() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Sistema de Tracking rodando na porta ${PORT}`);
        console.log(`📊 Estatísticas: http://localhost:${PORT}/tracking-stats/1`);
        console.log(`🧪 Teste: http://localhost:${PORT}/test`);
        console.log('');
        console.log('📝 Exemplo de uso:');
        console.log(`curl -X POST http://localhost:${PORT}/generate-tracking-link \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{
    "linkType": "whatsapp",
    "whatsappNumber": "5534999999999",
    "message": "Oi! Quero saber sobre os pudins",
    "campaignName": "campanha_pudim",
    "tenantId": 1
  }'`);
    });
}

if (require.main === module) {
    start().catch(console.error);
}

module.exports = { app, initDatabase }; 