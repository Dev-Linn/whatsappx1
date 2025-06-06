const fs = require('fs').promises;
const path = require('path');

class LoggerService {
    constructor(db) {
        this.db = db;
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        // Configurar diretório de logs
        this.logDir = path.join(process.cwd(), 'logs');
        this.ensureLogDirectory();
    }

    // Garantir que diretório de logs existe
    async ensureLogDirectory() {
        try {
            await fs.access(this.logDir);
        } catch {
            await fs.mkdir(this.logDir, { recursive: true });
        }
    }

    // Log principal
    async log(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            service: metadata.service || 'unknown',
            tenant_id: metadata.tenantId || null,
            user_id: metadata.userId || null,
            ip_address: metadata.ip || null,
            endpoint: metadata.endpoint || null,
            response_time: metadata.responseTime || null,
            status_code: metadata.statusCode || null,
            error_stack: metadata.stack || null,
            metadata: JSON.stringify(metadata)
        };

        // Log no console com cores
        this.logToConsole(logEntry);

        // Salvar no banco de dados
        await this.saveToDatabase(logEntry);

        // Salvar em arquivo
        await this.saveToFile(logEntry);
    }

    // Logs específicos por nível
    async error(message, metadata = {}) {
        await this.log('ERROR', message, metadata);
    }

    async warn(message, metadata = {}) {
        await this.log('WARN', message, metadata);
    }

    async info(message, metadata = {}) {
        await this.log('INFO', message, metadata);
    }

    async debug(message, metadata = {}) {
        await this.log('DEBUG', message, metadata);
    }

    // Log específico para API requests
    async logApiRequest(req, res, responseTime) {
        const metadata = {
            service: 'api',
            endpoint: `${req.method} ${req.originalUrl}`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            responseTime,
            statusCode: res.statusCode,
            tenantId: req.headers['x-tenant-id'] || null,
            userId: req.user?.id || null
        };

        const level = res.statusCode >= 500 ? 'ERROR' : 
                     res.statusCode >= 400 ? 'WARN' : 'INFO';

        await this.log(level, `API Request: ${req.method} ${req.originalUrl}`, metadata);
    }

    // Log específico para WhatsApp
    async logWhatsApp(tenantId, event, message, metadata = {}) {
        await this.log('INFO', message, {
            service: 'whatsapp',
            tenantId,
            event,
            ...metadata
        });
    }

    // Log no console com cores
    logToConsole(logEntry) {
        const colors = {
            ERROR: '\x1b[31m', // Vermelho
            WARN: '\x1b[33m',  // Amarelo
            INFO: '\x1b[36m',  // Ciano
            DEBUG: '\x1b[37m'  // Branco
        };

        const resetColor = '\x1b[0m';
        const color = colors[logEntry.level] || colors.INFO;
        
        const consoleMessage = `${color}[${logEntry.timestamp}] ${logEntry.level} [${logEntry.service}] ${logEntry.message}${resetColor}`;
        
        if (logEntry.level === 'ERROR') {
            console.error(consoleMessage);
            if (logEntry.error_stack) {
                console.error(logEntry.error_stack);
            }
        } else {
            console.log(consoleMessage);
        }
    }

    // Salvar no banco de dados
    async saveToDatabase(logEntry) {
        try {
            await this.db.sequelize.query(`
                INSERT INTO system_logs (
                    timestamp, level, message, service, tenant_id, user_id, 
                    ip_address, endpoint, response_time, status_code, 
                    error_stack, metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, {
                replacements: [
                    logEntry.timestamp,
                    logEntry.level,
                    logEntry.message,
                    logEntry.service,
                    logEntry.tenant_id,
                    logEntry.user_id,
                    logEntry.ip_address,
                    logEntry.endpoint,
                    logEntry.response_time,
                    logEntry.status_code,
                    logEntry.error_stack,
                    logEntry.metadata
                ]
            });
        } catch (error) {
            // console.error('❌ Erro ao salvar log no banco:', error.message); // Temporariamente desabilitado
        }
    }

    // Salvar em arquivo
    async saveToFile(logEntry) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const filename = `${today}.log`;
            const filepath = path.join(this.logDir, filename);
            
            const logLine = `${logEntry.timestamp} [${logEntry.level}] [${logEntry.service}] ${logEntry.message}\n`;
            
            await fs.appendFile(filepath, logLine);
        } catch (error) {
            console.error('❌ Erro ao salvar log em arquivo:', error.message);
        }
    }

    // Buscar logs com filtros
    async searchLogs(filters = {}) {
        let query = 'SELECT * FROM system_logs WHERE 1=1';
        const replacements = [];

        // Filtro por nível
        if (filters.level) {
            query += ' AND level = ?';
            replacements.push(filters.level.toUpperCase());
        }

        // Filtro por serviço
        if (filters.service) {
            query += ' AND service = ?';
            replacements.push(filters.service);
        }

        // Filtro por tenant
        if (filters.tenantId) {
            query += ' AND tenant_id = ?';
            replacements.push(filters.tenantId);
        }

        // Filtro por data
        if (filters.startDate) {
            query += ' AND timestamp >= ?';
            replacements.push(filters.startDate);
        }

        if (filters.endDate) {
            query += ' AND timestamp <= ?';
            replacements.push(filters.endDate);
        }

        // Filtro por mensagem (busca)
        if (filters.search) {
            query += ' AND (message LIKE ? OR endpoint LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            replacements.push(searchTerm, searchTerm);
        }

        // Ordenação e limite
        query += ' ORDER BY timestamp DESC';
        
        if (filters.limit) {
            query += ' LIMIT ?';
            replacements.push(parseInt(filters.limit));
        }

        try {
            const [logs] = await this.db.sequelize.query(query, {
                replacements
            });

            return logs.map(log => ({
                ...log,
                metadata: log.metadata ? JSON.parse(log.metadata) : {}
            }));
        } catch (error) {
            console.error('❌ Erro ao buscar logs:', error.message);
            return [];
        }
    }

    // Obter estatísticas de logs
    async getLogStats(timeframe = '24h') {
        let whereClause = '';
        const replacements = [];

        if (timeframe === '24h') {
            whereClause = "WHERE timestamp >= datetime('now', '-1 day')";
        } else if (timeframe === '7d') {
            whereClause = "WHERE timestamp >= datetime('now', '-7 days')";
        } else if (timeframe === '30d') {
            whereClause = "WHERE timestamp >= datetime('now', '-30 days')";
        }

        try {
            // Contadores por nível
            const [levelStats] = await this.db.sequelize.query(`
                SELECT level, COUNT(*) as count 
                FROM system_logs 
                ${whereClause}
                GROUP BY level
            `, { replacements });

            // Contadores por serviço
            const [serviceStats] = await this.db.sequelize.query(`
                SELECT service, COUNT(*) as count 
                FROM system_logs 
                ${whereClause}
                GROUP BY service
            `, { replacements });

            // Logs por hora (últimas 24h)
            const [hourlyStats] = await this.db.sequelize.query(`
                SELECT 
                    strftime('%H', timestamp) as hour,
                    COUNT(*) as count
                FROM system_logs 
                WHERE timestamp >= datetime('now', '-1 day')
                GROUP BY strftime('%H', timestamp)
                ORDER BY hour
            `);

            return {
                levels: levelStats,
                services: serviceStats,
                hourly: hourlyStats
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas de logs:', error.message);
            return { levels: [], services: [], hourly: [] };
        }
    }

    // Limpar logs antigos
    async cleanOldLogs(daysToKeep = 30) {
        try {
            const [result] = await this.db.sequelize.query(`
                DELETE FROM system_logs 
                WHERE timestamp < datetime('now', '-${daysToKeep} days')
            `);

            console.log(`🧹 Limpeza de logs: ${result.changes || 0} registros removidos`);
            return result.changes || 0;
        } catch (error) {
            console.error('❌ Erro ao limpar logs antigos:', error.message);
            return 0;
        }
    }

    // Middleware para Express
    requestLoggerMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Override do res.end para capturar quando resposta termina
            const originalEnd = res.end;
            res.end = (...args) => {
                const responseTime = Date.now() - startTime;
                
                // Log da requisição
                this.logApiRequest(req, res, responseTime).catch(err => {
                    console.error('❌ Erro ao fazer log da requisição:', err.message);
                });
                
                // Chamar método original
                originalEnd.apply(res, args);
            };
            
            next();
        };
    }
}

module.exports = LoggerService; 