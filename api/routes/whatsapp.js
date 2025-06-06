const express = require('express');
const router = express.Router();
const database = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/whatsapp/funnel - Dados do funil de conversão
router.get('/funnel', authenticateToken, async (req, res) => {
  try {
    const tenant_id = req.tenant.id;

    // Buscar dados reais dos estágios
    const [stageData] = await database.sequelize.query(`
      SELECT 
        stage,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users WHERE tenant_id = ?), 1) as percentage
      FROM users 
      WHERE tenant_id = ? 
      AND is_active = true
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'lead_frio' THEN 1
          WHEN 'interessado' THEN 2
          WHEN 'negociando' THEN 3
          WHEN 'cliente' THEN 4
          WHEN 'perdido' THEN 5
          ELSE 6
        END
    `, {
      replacements: [tenant_id, tenant_id],
      type: database.sequelize.QueryTypes.SELECT
    });

    // Mapear estágios para o formato esperado pelo componente
    const stageMapping = {
      'lead_frio': {
        name: 'Leads Frios',
        color: 'bg-gray-500',
        icon: 'Users',
        description: 'Primeiro contato via WhatsApp'
      },
      'interessado': {
        name: 'Interessados',
        color: 'bg-yellow-500',
        icon: 'UserCheck',
        description: 'Demonstraram interesse no produto/serviço'
      },
      'negociando': {
        name: 'Negociando',
        color: 'bg-orange-500',
        icon: 'ShoppingCart',
        description: 'Em processo de negociação ativa'
      },
      'cliente': {
        name: 'Clientes',
        color: 'bg-green-500',
        icon: 'Crown',
        description: 'Conversão realizada com sucesso'
      },
      'perdido': {
        name: 'Perdidos',
        color: 'bg-red-500',
        icon: 'UserX',
        description: 'Leads que não converteram'
      }
    };

    // Montar dados do funil
    const stages = stageData
      .filter(stage => stage.stage !== 'perdido') // Não mostrar perdidos no funil
      .map(stage => ({
        name: stageMapping[stage.stage]?.name || stage.stage,
        key: stage.stage,
        count: stage.count,
        percentage: stage.percentage,
        color: stageMapping[stage.stage]?.color || 'bg-gray-500',
        icon: stageMapping[stage.stage]?.icon || 'Users',
        description: stageMapping[stage.stage]?.description || 'Estágio do cliente'
      }));

    res.json({ stages });

  } catch (error) {
    console.error('❌ Erro ao buscar funil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

module.exports = router;