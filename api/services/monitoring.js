const fetch = require('node-fetch');

class MonitoringService {
    constructor(db) {
        this.db = db;
        this.services = {
            api: { url: 'http://localhost:3001/api/v1/monitoring/health', name: 'API REST' },
            backend: { url: 'http://localhost:3002/status', name: 'Backend WhatsApp' },
            frontend: { url: 'http://localhost:8080', name: 'Frontend' }
        };
        this.healthHistory = new Map(); // service -> [{ timestamp, status, responseTime }]
        this.alertThreshold = 3; // 3 falhas consecutivas para alertar
        this.checkInterval = 30000; // 30 segundos
        this.isRunning = false;
    }

    // Iniciar monitoramento
    start() {
        if (this.isRunning) return;
        
        console.log('🔍 Iniciando sistema de monitoramento...');
        this.isRunning = true;
        
        // Health check inicial
        this.performHealthCheck();
        
        // Agendar verificações periódicas
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.checkInterval);
        
        // Health check das instâncias WhatsApp (mais frequente)
        this.whatsappCheckInterval = setInterval(() => {
            this.checkWhatsAppInstances();
        }, 15000); // 15 segundos
    }

    // Parar monitoramento
    stop() {
        console.log('⏹️ Parando sistema de monitoramento...');
        this.isRunning = false;
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        if (this.whatsappCheckInterval) {
            clearInterval(this.whatsappCheckInterval);
        }
    }

    // Realizar health check completo
    async performHealthCheck() {
        const timestamp = new Date().toISOString();
        const results = {};

        for (const [serviceId, config] of Object.entries(this.services)) {
            const result = await this.checkService(serviceId, config);
            results[serviceId] = result;
            
            // Armazenar histórico
            if (!this.healthHistory.has(serviceId)) {
                this.healthHistory.set(serviceId, []);
            }
            
            const history = this.healthHistory.get(serviceId);
            history.push({
                timestamp,
                status: result.status,
                responseTime: result.responseTime,
                error: result.error
            });
            
            // Manter apenas últimas 100 verificações
            if (history.length > 100) {
                history.shift();
            }
            
            // Verificar se precisa alertar
            await this.checkForAlerts(serviceId, history);
        }

        // Verificar banco de dados
        const dbResult = await this.checkDatabase();
        results.database = dbResult;

        return results;
    }

    // Verificar um serviço específico
    async checkService(serviceId, config) {
        const startTime = Date.now();
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(config.url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'WhatsApp-Monitor/1.0'
                }
            });
            
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            return {
                status: response.ok ? 'healthy' : 'unhealthy',
                responseTime,
                statusCode: response.status,
                error: response.ok ? null : `HTTP ${response.status}`
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'offline',
                responseTime,
                statusCode: 0,
                error: error.message.includes('abort') ? 'Timeout' : error.message
            };
        }
    }

    // Verificar banco de dados
    async checkDatabase() {
        const startTime = Date.now();
        
        try {
            await this.db.sequelize.authenticate();
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime,
                error: null
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'offline',
                responseTime,
                error: error.message
            };
        }
    }

    // Verificar instâncias WhatsApp
    async checkWhatsAppInstances() {
        try {
            const response = await fetch('http://localhost:3002/status');
            if (!response.ok) return;
            
            const data = await response.json();
            const timestamp = new Date().toISOString();
            
            // Verificar cada instância
            for (const [tenantId, instance] of Object.entries(data.instances || {})) {
                const isHealthy = instance.connected && instance.authenticated;
                
                // Buscar tenant info
                const tenant = await this.db.Tenant.findByPk(tenantId);
                if (!tenant) continue;
                
                // Se instância estava conectada e agora não está, alertar
                if (tenant.whatsapp_connected && !isHealthy) {
                    await this.logAlert({
                        type: 'whatsapp_disconnected',
                        tenantId,
                        companyName: tenant.company_name,
                        message: `Instância WhatsApp do tenant ${tenantId} (${tenant.company_name}) desconectou`,
                        timestamp,
                        severity: 'warning'
                    });
                }
                
                // Atualizar status no banco se necessário
                if (tenant.whatsapp_connected !== isHealthy) {
                    await tenant.update({ whatsapp_connected: isHealthy });
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar instâncias WhatsApp:', error.message);
        }
    }

    // Verificar se precisa enviar alertas
    async checkForAlerts(serviceId, history) {
        if (history.length < this.alertThreshold) return;
        
        // Verificar últimas N verificações
        const recentChecks = history.slice(-this.alertThreshold);
        const allFailed = recentChecks.every(check => check.status !== 'healthy');
        
        if (allFailed) {
            const config = this.services[serviceId];
            await this.logAlert({
                type: 'service_down',
                serviceId,
                serviceName: config.name,
                message: `Serviço ${config.name} está fora do ar há ${this.alertThreshold} verificações consecutivas`,
                timestamp: new Date().toISOString(),
                severity: 'critical'
            });
        }
    }

    // Registrar alerta
    async logAlert(alertData) {
        console.log(`🚨 ALERTA: ${alertData.message}`);
        
        try {
            // Salvar no banco de dados
            await this.db.sequelize.query(`
                INSERT INTO monitoring_alerts (
                    type, service_id, tenant_id, message, severity, timestamp, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, {
                replacements: [
                    alertData.type,
                    alertData.serviceId || null,
                    alertData.tenantId || null,
                    alertData.message,
                    alertData.severity,
                    alertData.timestamp
                ]
            });
        } catch (error) {
            console.error('❌ Erro ao salvar alerta:', error.message);
        }
    }

    // Obter status atual de todos os serviços
    getCurrentStatus() {
        const status = {};
        
        for (const [serviceId, config] of Object.entries(this.services)) {
            const history = this.healthHistory.get(serviceId) || [];
            const lastCheck = history[history.length - 1];
            
            status[serviceId] = {
                name: config.name,
                url: config.url,
                status: lastCheck?.status || 'unknown',
                lastCheck: lastCheck?.timestamp || null,
                responseTime: lastCheck?.responseTime || null,
                error: lastCheck?.error || null,
                uptime: this.calculateUptime(history)
            };
        }
        
        return status;
    }

    // Calcular uptime
    calculateUptime(history) {
        if (history.length === 0) return 0;
        
        const healthyChecks = history.filter(check => check.status === 'healthy').length;
        return ((healthyChecks / history.length) * 100).toFixed(2);
    }

    // Obter histórico de um serviço
    getServiceHistory(serviceId, limit = 50) {
        const history = this.healthHistory.get(serviceId) || [];
        return history.slice(-limit);
    }

    // Obter alertas recentes
    async getRecentAlerts(limit = 20) {
        try {
            const [alerts] = await this.db.sequelize.query(`
                SELECT * FROM monitoring_alerts 
                ORDER BY created_at DESC 
                LIMIT ?
            `, {
                replacements: [limit]
            });
            
            return alerts;
        } catch (error) {
            console.error('❌ Erro ao buscar alertas:', error.message);
            return [];
        }
    }
}

module.exports = MonitoringService; 