const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

module.exports = (db) => {
  // POST /api/v1/track/whatsapp-click - Registrar clique no WhatsApp
  router.post('/whatsapp-click', async (req, res) => {
    try {
      const {
        utm_data = {},
        page_url,
        referrer,
        user_agent,
        session_id
      } = req.body;

      // Pegar IP do usuário
      const ip_address = req.ip || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        (req.connection.socket ? req.connection.socket.remoteAddress : null);

      console.log('🔍 [TRACKING] Clique no WhatsApp registrado:', {
        utm_data,
        page_url,
        ip_address,
        user_agent: user_agent?.substring(0, 100) // Truncar para caber no banco
      });

      // Salvar dados de tracking
      const result = await db.sequelize.query(`
        INSERT INTO user_tracking (
          tenant_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          referrer_url, landing_page, page_url_when_clicked, ip_address, 
          user_agent, session_id, whatsapp_click_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          1, // Por enquanto tenant_id fixo, depois vamos pegar dinamicamente
          utm_data.utm_source || null,
          utm_data.utm_medium || null, 
          utm_data.utm_campaign || null,
          utm_data.utm_content || null,
          utm_data.utm_term || null,
          referrer || null,
          utm_data.landing_page || page_url,
          page_url,
          ip_address,
          user_agent?.substring(0, 250) || null,
          session_id || generateSessionId(),
          new Date().toISOString()
        ],
        type: db.sequelize.QueryTypes.INSERT
      });

      console.log('✅ [TRACKING] Tracking salvo com ID:', result[0]);

      res.json({ 
        success: true,
        tracking_id: result[0],
        message: 'Tracking registrado com sucesso'
      });

    } catch (error) {
      console.error('❌ [TRACKING] Erro ao salvar tracking:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        details: error.message 
      });
    }
  });

  // POST /api/v1/track/associate-user - Associar tracking com usuário do WhatsApp
  router.post('/associate-user', authenticateToken, async (req, res) => {
    try {
      const { phone, tracking_id, session_id } = req.body;
      const tenant_id = req.tenant.id;

      // Buscar usuário pelo telefone
      const users = await db.sequelize.query(`
        SELECT id FROM users 
        WHERE phone = ? AND tenant_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, {
        replacements: [phone, tenant_id],
        type: db.sequelize.QueryTypes.SELECT
      });

      if (users.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuário não encontrado' 
        });
      }

      const user_id = users[0].id;

      // Associar tracking ao usuário
      if (tracking_id) {
        await db.sequelize.query(`
          UPDATE user_tracking 
          SET user_id = ?, tenant_id = ?
          WHERE id = ?
        `, {
          replacements: [user_id, tenant_id, tracking_id]
        });

        await db.sequelize.query(`
          UPDATE users 
          SET tracking_id = ?
          WHERE id = ?
        `, {
          replacements: [tracking_id, user_id]
        });
      } else if (session_id) {
        // Buscar tracking por session_id
        await db.sequelize.query(`
          UPDATE user_tracking 
          SET user_id = ?, tenant_id = ?
          WHERE session_id = ? AND user_id IS NULL
        `, {
          replacements: [user_id, tenant_id, session_id]
        });
      }

      console.log(`✅ [TRACKING] Usuário ${user_id} associado ao tracking`);

      res.json({ 
        success: true,
        message: 'Usuário associado ao tracking'
      });

    } catch (error) {
      console.error('❌ [TRACKING] Erro ao associar usuário:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        details: error.message 
      });
    }
  });

  // GET /api/v1/track/stats - Estatísticas de tracking
  router.get('/stats', authenticateToken, async (req, res) => {
    try {
      const tenant_id = req.tenant.id;
      const { days = 7 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Estatísticas por fonte
      const sourceStats = await db.sequelize.query(`
        SELECT 
          utm_source,
          COUNT(*) as clicks,
          COUNT(user_id) as converted_users,
          ROUND((COUNT(user_id) * 100.0 / COUNT(*)), 1) as conversion_rate
        FROM user_tracking
        WHERE tenant_id = ? AND created_at >= ?
        GROUP BY utm_source
        ORDER BY clicks DESC
      `, {
        replacements: [tenant_id, startDate.toISOString()],
        type: db.sequelize.QueryTypes.SELECT
      });

      // Top páginas de origem
      const topPages = await db.sequelize.query(`
        SELECT 
          page_url_when_clicked,
          COUNT(*) as clicks
        FROM user_tracking
        WHERE tenant_id = ? AND created_at >= ?
        AND page_url_when_clicked IS NOT NULL
        GROUP BY page_url_when_clicked
        ORDER BY clicks DESC
        LIMIT 10
      `, {
        replacements: [tenant_id, startDate.toISOString()],
        type: db.sequelize.QueryTypes.SELECT
      });

      res.json({
        period: `${days} dias`,
        sourceStats,
        topPages
      });

    } catch (error) {
      console.error('❌ [TRACKING] Erro ao buscar stats:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        details: error.message 
      });
    }
  });

  return router;
};

// Função auxiliar para gerar session ID
function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

module.exports.generateSessionId = generateSessionId; 