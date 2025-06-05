class UptimeService {
    constructor(db) {
        this.db = db;
        this.uptimeHistory = new Map(); // tenantId -> uptime data
        this.isRunning = false;
    }

    // Iniciar tracking de uptime
    start() {
        if (this.isRunning) return;
        
        console.log('📊 Iniciando tracking de uptime...');
        this.isRunning = true;
        
        // Verificar uptime a cada 5 minutos
        this.uptimeCheckInterval = setInterval(() => {
            this.recordSystemUptime();
        }, 5 * 60 * 1000);
    }

    // Parar tracking
    stop() {
        console.log('⏹️ Parando tracking de uptime...');
        this.isRunning = false;
        
        if (this.uptimeCheckInterval) {
            clearInterval(this.uptimeCheckInterval);
        }
    }

    // Registrar evento de uptime
    async recordUptimeEvent(tenantId, serviceType, status, timestamp = null) {
        timestamp = timestamp || new Date().toISOString();
        
        try {
            await this.db.sequelize.query(`
                INSERT INTO uptime_records (
                    tenant_id, service_type, status, timestamp, created_at, updated_at
                ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `, {
                replacements: [tenantId, serviceType, status, timestamp]
            });
        } catch (error) {
            console.error('❌ Erro ao registrar evento de uptime:', error.message);
        }
    }

    // Registrar uptime do sistema automaticamente
    async recordSystemUptime() {
        try {
            // Verificar todos os tenants ativos
            const tenants = await this.db.Tenant.findAll({
                where: { status: 'active' }
            });

            for (const tenant of tenants) {
                // Verificar se WhatsApp está conectado
                const isUp = tenant.whatsapp_connected;
                const status = isUp ? 'up' : 'down';
                
                await this.recordUptimeEvent(tenant.id, 'whatsapp', status);
            }
        } catch (error) {
            console.error('❌ Erro ao registrar uptime do sistema:', error.message);
        }
    }

    // Calcular uptime para um tenant
    async calculateUptime(tenantId, period = '24h') {
        let whereClause = '';
        
        if (period === '24h') {
            whereClause = "AND timestamp >= datetime('now', '-1 day')";
        } else if (period === '7d') {
            whereClause = "AND timestamp >= datetime('now', '-7 days')";
        } else if (period === '30d') {
            whereClause = "AND timestamp >= datetime('now', '-30 days')";
        }

        try {
            const [records] = await this.db.sequelize.query(`
                SELECT status, COUNT(*) as count
                FROM uptime_records 
                WHERE tenant_id = ? ${whereClause}
                GROUP BY status
            `, {
                replacements: [tenantId]
            });

            const totalRecords = records.reduce((sum, r) => sum + r.count, 0);
            const upRecords = records.find(r => r.status === 'up')?.count || 0;
            
            const uptimePercentage = totalRecords > 0 ? (upRecords / totalRecords) * 100 : 100;
            
            return {
                percentage: Math.round(uptimePercentage * 100) / 100,
                totalChecks: totalRecords,
                upChecks: upRecords,
                downChecks: totalRecords - upRecords
            };
        } catch (error) {
            console.error('❌ Erro ao calcular uptime:', error.message);
            return { percentage: 0, totalChecks: 0, upChecks: 0, downChecks: 0 };
        }
    }

    // Obter histórico de uptime
    async getUptimeHistory(tenantId, days = 30) {
        try {
            const [records] = await this.db.sequelize.query(`
                SELECT 
                    DATE(timestamp) as date,
                    AVG(CASE WHEN status = 'up' THEN 100.0 ELSE 0.0 END) as uptime_percentage,
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_checks
                FROM uptime_records 
                WHERE tenant_id = ? 
                AND timestamp >= datetime('now', '-${days} days')
                GROUP BY DATE(timestamp)
                ORDER BY date ASC
            `, {
                replacements: [tenantId]
            });

            return records.map(record => ({
                date: record.date,
                uptime: Math.round(record.uptime_percentage * 100) / 100,
                totalChecks: record.total_checks,
                upChecks: record.up_checks,
                downChecks: record.total_checks - record.up_checks
            }));
        } catch (error) {
            console.error('❌ Erro ao obter histórico de uptime:', error.message);
            return [];
        }
    }

    // Obter status de uptime de todos os tenants
    async getAllTenantsUptime(period = '24h') {
        try {
            const tenants = await this.db.Tenant.findAll({
                where: { status: 'active' }
            });

            const results = [];
            
            for (const tenant of tenants) {
                const uptime = await this.calculateUptime(tenant.id, period);
                
                results.push({
                    tenantId: tenant.id,
                    companyName: tenant.company_name,
                    uptime: uptime.percentage,
                    totalChecks: uptime.totalChecks,
                    status: uptime.percentage >= 95 ? 'healthy' : 'degraded'
                });
            }

            return results.sort((a, b) => a.uptime - b.uptime);
        } catch (error) {
            console.error('❌ Erro ao obter status de todos os tenants:', error.message);
            return [];
        }
    }

    // Gerar relatório de uptime
    async generateUptimeReport(tenantId, period = '30d') {
        try {
            const tenant = await this.db.Tenant.findByPk(tenantId);
            if (!tenant) {
                throw new Error('Tenant não encontrado');
            }

            // Calcular uptime
            const uptime = await this.calculateUptime(tenantId, period);
            
            // Histórico detalhado
            const history = await this.getUptimeHistory(tenantId, period === '30d' ? 30 : 7);
            
            // Incidentes recentes
            const [incidents] = await this.db.sequelize.query(`
                SELECT timestamp, status
                FROM uptime_records 
                WHERE tenant_id = ? 
                AND status = 'down'
                AND timestamp >= datetime('now', '-${period === '30d' ? 30 : 7} days')
                ORDER BY timestamp DESC
                LIMIT 10
            `, {
                replacements: [tenantId]
            });

            return {
                tenant: {
                    id: tenant.id,
                    company_name: tenant.company_name
                },
                period,
                uptime,
                history,
                recentIncidents: incidents
            };
        } catch (error) {
            console.error('❌ Erro ao gerar relatório de uptime:', error.message);
            return null;
        }
    }

    // Obter métricas consolidadas do sistema
    async getSystemMetrics() {
        try {
            // Uptime geral do sistema (últimas 24h)
            const [systemUptime] = await this.db.sequelize.query(`
                SELECT 
                    AVG(CASE WHEN status = 'up' THEN 100.0 ELSE 0.0 END) as system_uptime,
                    COUNT(*) as total_checks
                FROM uptime_records 
                WHERE timestamp >= datetime('now', '-1 day')
            `);

            // Número de tenants ativos
            const [tenantCount] = await this.db.sequelize.query(`
                SELECT COUNT(*) as active_tenants
                FROM tenants 
                WHERE status = 'active'
            `);

            // Incidentes por dia (última semana)
            const [incidents] = await this.db.sequelize.query(`
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as incident_count
                FROM uptime_records 
                WHERE status = 'down'
                AND timestamp >= datetime('now', '-7 days')
                GROUP BY DATE(timestamp)
                ORDER BY date
            `);

            // Tenants com problemas
            const [problematicTenants] = await this.db.sequelize.query(`
                SELECT 
                    ur.tenant_id,
                    t.company_name,
                    COUNT(*) as down_count
                FROM uptime_records ur
                JOIN tenants t ON ur.tenant_id = t.id
                WHERE ur.status = 'down'
                AND ur.timestamp >= datetime('now', '-1 day')
                GROUP BY ur.tenant_id, t.company_name
                ORDER BY down_count DESC
                LIMIT 5
            `);

            return {
                systemUptime: systemUptime[0]?.system_uptime || 100,
                totalChecks: systemUptime[0]?.total_checks || 0,
                activeTenants: tenantCount[0]?.active_tenants || 0,
                weeklyIncidents: incidents,
                problematicTenants
            };
        } catch (error) {
            console.error('❌ Erro ao obter métricas do sistema:', error.message);
            return null;
        }
    }

    // Limpar registros antigos de uptime
    async cleanOldRecords(daysToKeep = 90) {
        try {
            const [result] = await this.db.sequelize.query(`
                DELETE FROM uptime_records 
                WHERE timestamp < datetime('now', '-${daysToKeep} days')
            `);

            console.log(`🧹 Limpeza de uptime: ${result.changes || 0} registros removidos`);
            return result.changes || 0;
        } catch (error) {
            console.error('❌ Erro ao limpar registros antigos:', error.message);
            return 0;
        }
    }
}

module.exports = UptimeService; 