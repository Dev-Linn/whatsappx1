const express = require('express');
const router = express.Router();

// Middleware para verificar se os serviços estão disponíveis
const checkServices = (req, res, next) => {
    if (!req.app.locals.monitoring || !req.app.locals.logger || !req.app.locals.uptime) {
        return res.status(503).json({
            success: false,
            message: 'Serviços de monitoramento não disponíveis'
        });
    }
    next();
};

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            monitoring: !!req.app.locals.monitoring,
            logger: !!req.app.locals.logger,
            uptime: !!req.app.locals.uptime
        }
    });
});

// ==== STATUS DOS SERVIÇOS ====

// Obter status atual de todos os serviços
router.get('/status', checkServices, async (req, res) => {
    try {
        const monitoring = req.app.locals.monitoring;
        const status = monitoring.getCurrentStatus();
        
        res.json({
            success: true,
            status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter status dos serviços',
            error: error.message
        });
    }
});

// Forçar health check manual
router.post('/check', checkServices, async (req, res) => {
    try {
        const monitoring = req.app.locals.monitoring;
        const results = await monitoring.performHealthCheck();
        
        res.json({
            success: true,
            message: 'Health check executado',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao executar health check',
            error: error.message
        });
    }
});

// Histórico de um serviço específico
router.get('/status/:serviceId/history', checkServices, async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { limit = 50 } = req.query;
        
        const monitoring = req.app.locals.monitoring;
        const history = monitoring.getServiceHistory(serviceId, parseInt(limit));
        
        res.json({
            success: true,
            serviceId,
            history,
            count: history.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter histórico do serviço',
            error: error.message
        });
    }
});

// ==== ALERTAS ====

// Listar alertas recentes
router.get('/alerts', checkServices, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const monitoring = req.app.locals.monitoring;
        const alerts = await monitoring.getRecentAlerts(parseInt(limit));
        
        res.json({
            success: true,
            alerts,
            count: alerts.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter alertas',
            error: error.message
        });
    }
});

// Marcar alerta como reconhecido
router.put('/alerts/:alertId/acknowledge', checkServices, async (req, res) => {
    try {
        const { alertId } = req.params;
        const { userId } = req.body; // ID do admin que reconheceu
        
        const db = req.app.locals.db;
        await db.sequelize.query(`
            UPDATE monitoring_alerts 
            SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now')
            WHERE id = ?
        `, {
            replacements: [userId || null, alertId]
        });
        
        res.json({
            success: true,
            message: 'Alerta marcado como reconhecido'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao reconhecer alerta',
            error: error.message
        });
    }
});

// ==== LOGS ====

// Buscar logs com filtros
router.get('/logs', checkServices, async (req, res) => {
    try {
        const {
            level,
            service,
            tenant_id,
            from,
            to,
            search,
            limit = 100
        } = req.query;
        
        const filters = {
            level,
            service,
            tenantId: tenant_id,
            startDate: from,
            endDate: to,
            search,
            limit: parseInt(limit)
        };
        
        const logger = req.app.locals.logger;
        const logs = await logger.searchLogs(filters);
        
        res.json({
            success: true,
            logs,
            total: logs.length,
            count: logs.length,
            filters
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar logs',
            error: error.message
        });
    }
});

// Estatísticas de logs
router.get('/logs/stats', checkServices, async (req, res) => {
    try {
        const { timeframe = '24h' } = req.query;
        
        const logger = req.app.locals.logger;
        const stats = await logger.getLogStats(timeframe);
        
        res.json({
            success: true,
            stats,
            timeframe
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas de logs',
            error: error.message
        });
    }
});

// Limpar logs antigos
router.delete('/logs/cleanup', checkServices, async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;
        
        const logger = req.app.locals.logger;
        const deletedCount = await logger.cleanOldLogs(parseInt(daysToKeep));
        
        res.json({
            success: true,
            message: `${deletedCount} logs antigos removidos`,
            deletedCount,
            daysToKeep
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao limpar logs antigos',
            error: error.message
        });
    }
});

// ==== UPTIME ====

// Métricas gerais do sistema
router.get('/uptime/metrics', checkServices, async (req, res) => {
    try {
        const uptime = req.app.locals.uptime;
        const metrics = await uptime.getSystemMetrics();
        
        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter métricas de uptime',
            error: error.message
        });
    }
});

// Uptime de todos os tenants
router.get('/uptime/tenants', checkServices, async (req, res) => {
    try {
        const { period = '24h' } = req.query;
        
        const uptime = req.app.locals.uptime;
        const tenantsUptime = await uptime.getAllTenantsUptime(period);
        
        res.json({
            success: true,
            tenants: tenantsUptime,
            period
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter uptime dos tenants',
            error: error.message
        });
    }
});

// Uptime de um tenant específico
router.get('/uptime/tenants/:tenantId', checkServices, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { period = '30d' } = req.query;
        
        const uptime = req.app.locals.uptime;
        const report = await uptime.generateUptimeReport(parseInt(tenantId), period);
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Tenant não encontrado'
            });
        }
        
        res.json({
            success: true,
            report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter uptime do tenant',
            error: error.message
        });
    }
});

// Histórico de uptime de um tenant
router.get('/uptime/tenants/:tenantId/history', checkServices, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { days = 30 } = req.query;
        
        const uptime = req.app.locals.uptime;
        const history = await uptime.getUptimeHistory(parseInt(tenantId), parseInt(days));
        
        res.json({
            success: true,
            tenantId,
            history,
            days: parseInt(days)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter histórico de uptime',
            error: error.message
        });
    }
});

// Registrar evento de uptime manualmente
router.post('/uptime/record', checkServices, async (req, res) => {
    try {
        const { tenantId, serviceType, status } = req.body;
        
        if (!tenantId || !status) {
            return res.status(400).json({
                success: false,
                message: 'tenantId e status são obrigatórios'
            });
        }
        
        const uptime = req.app.locals.uptime;
        await uptime.recordUptimeEvent(tenantId, serviceType || 'whatsapp', status);
        
        res.json({
            success: true,
            message: 'Evento de uptime registrado'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar evento de uptime',
            error: error.message
        });
    }
});

// Limpar registros antigos de uptime
router.delete('/uptime/cleanup', checkServices, async (req, res) => {
    try {
        const { daysToKeep = 90 } = req.body;
        
        const uptime = req.app.locals.uptime;
        const deletedCount = await uptime.cleanOldRecords(parseInt(daysToKeep));
        
        res.json({
            success: true,
            message: `${deletedCount} registros de uptime removidos`,
            deletedCount,
            daysToKeep
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao limpar registros de uptime',
            error: error.message
        });
    }
});

// ==== DASHBOARD CONSOLIDADO ====

// Dashboard completo para admin
router.get('/dashboard', checkServices, async (req, res) => {
    try {
        const monitoring = req.app.locals.monitoring;
        const logger = req.app.locals.logger;
        const uptime = req.app.locals.uptime;
        
        // Executar todas as consultas em paralelo
        const [
            servicesStatus,
            recentAlerts,
            logStats,
            uptimeMetrics,
            tenantsUptime
        ] = await Promise.all([
            monitoring.getCurrentStatus(),
            monitoring.getRecentAlerts(10),
            logger.getLogStats('24h'),
            uptime.getSystemMetrics(),
            uptime.getAllTenantsUptime('24h')
        ]);
        
        res.json({
            success: true,
            dashboard: {
                services: servicesStatus,
                alerts: {
                    recent: recentAlerts,
                    unacknowledged: recentAlerts.filter(a => !a.acknowledged).length
                },
                logs: logStats,
                uptime: uptimeMetrics,
                tenants: {
                    list: tenantsUptime,
                    healthy: tenantsUptime.filter(t => t.status === 'healthy').length,
                    total: tenantsUptime.length
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter dashboard',
            error: error.message
        });
    }
});

module.exports = router; 