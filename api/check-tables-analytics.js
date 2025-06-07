#!/usr/bin/env node

// Script para verificar e criar todas as tabelas necessárias para Analytics
const ApiDatabase = require('./database');

async function checkAndCreateTables() {
    console.log('🔍 Verificando e criando tabelas do Analytics...\n');
    
    const db = new ApiDatabase();
    await db.initialize();
    
    try {
        // Verificar tabelas existentes
        const tables = await db.sequelize.query("SELECT name FROM sqlite_master WHERE type='table'", {
            type: db.sequelize.QueryTypes.SELECT
        });
        const existingTables = tables.map(t => t.name);
        
        console.log('📋 Tabelas existentes:', existingTables.join(', '));
        console.log('');
        
        // Definir todas as tabelas necessárias
        const requiredTables = {
            whatsapp_tracking_links: `
                CREATE TABLE IF NOT EXISTS whatsapp_tracking_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tracking_id VARCHAR(100) UNIQUE NOT NULL,
                    tenant_id INTEGER NOT NULL,
                    campaign_name VARCHAR(255) NOT NULL,
                    base_url TEXT NOT NULL,
                    link_type VARCHAR(50) DEFAULT 'whatsapp',
                    whatsapp_number VARCHAR(20),
                    default_message TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
                )
            `,
            whatsapp_click_tracking: `
                CREATE TABLE IF NOT EXISTS whatsapp_click_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tracking_id VARCHAR(100) NOT NULL,
                    tenant_id INTEGER NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    referrer TEXT,
                    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
                )
            `,
            whatsapp_message_correlation: `
                CREATE TABLE IF NOT EXISTS whatsapp_message_correlation (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tracking_id VARCHAR(100) NOT NULL,
                    tenant_id INTEGER NOT NULL,
                    phone_number VARCHAR(20) NOT NULL,
                    message_content TEXT,
                    user_agent TEXT,
                    ip_address VARCHAR(45),
                    correlated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
                )
            `,
            google_analytics_tokens: `
                CREATE TABLE IF NOT EXISTS google_analytics_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id INTEGER UNIQUE NOT NULL,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT,
                    expires_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
                )
            `,
            google_analytics_selections: `
                CREATE TABLE IF NOT EXISTS google_analytics_selections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id INTEGER UNIQUE NOT NULL,
                    account_id VARCHAR(100) NOT NULL,
                    property_id VARCHAR(100) NOT NULL,
                    account_name VARCHAR(255),
                    property_name VARCHAR(255),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
                )
            `,
            system_logs: `
                CREATE TABLE IF NOT EXISTS system_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id INTEGER,
                    level VARCHAR(20) NOT NULL,
                    message TEXT NOT NULL,
                    service VARCHAR(50),
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
                )
            `,
            uptime_records: `
                CREATE TABLE IF NOT EXISTS uptime_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id INTEGER NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
                )
            `
        };
        
        // Criar tabelas necessárias
        console.log('🔨 Criando tabelas necessárias...\n');
        
        for (const [tableName, createSQL] of Object.entries(requiredTables)) {
            try {
                await db.sequelize.query(createSQL);
                
                // Verificar se foi criada/existe
                const exists = await db.sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?", {
                    replacements: [tableName],
                    type: db.sequelize.QueryTypes.SELECT
                });
                if (exists.length > 0) {
                    console.log(`✅ ${tableName} - OK`);
                } else {
                    console.log(`❌ ${tableName} - FALHA`);
                }
            } catch (error) {
                console.log(`❌ ${tableName} - ERRO: ${error.message}`);
            }
        }
        
        // Criar índices importantes
        console.log('\n🔧 Criando índices...\n');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_tracking_links_tenant ON whatsapp_tracking_links(tenant_id)',
            'CREATE INDEX IF NOT EXISTS idx_tracking_links_tracking_id ON whatsapp_tracking_links(tracking_id)',
            'CREATE INDEX IF NOT EXISTS idx_click_tracking_tenant ON whatsapp_click_tracking(tenant_id)',
            'CREATE INDEX IF NOT EXISTS idx_click_tracking_tracking_id ON whatsapp_click_tracking(tracking_id)',
            'CREATE INDEX IF NOT EXISTS idx_correlation_tenant ON whatsapp_message_correlation(tenant_id)',
            'CREATE INDEX IF NOT EXISTS idx_correlation_tracking_id ON whatsapp_message_correlation(tracking_id)',
            'CREATE INDEX IF NOT EXISTS idx_correlation_phone ON whatsapp_message_correlation(phone_number)',
            'CREATE INDEX IF NOT EXISTS idx_system_logs_tenant ON system_logs(tenant_id)',
            'CREATE INDEX IF NOT EXISTS idx_uptime_tenant ON uptime_records(tenant_id)'
        ];
        
        for (const indexSQL of indexes) {
            try {
                await db.sequelize.query(indexSQL);
                console.log(`✅ Índice criado`);
            } catch (error) {
                console.log(`⚠️ Índice: ${error.message}`);
            }
        }
        
        // Verificar contagem final
        console.log('\n📊 Verificação final...\n');
        
        for (const tableName of Object.keys(requiredTables)) {
            try {
                const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM ${tableName}`, {
                    type: db.sequelize.QueryTypes.SELECT
                });
                console.log(`📋 ${tableName}: ${result[0].count} registros`);
            } catch (error) {
                console.log(`❌ ${tableName}: Erro - ${error.message}`);
            }
        }
        
        console.log('\n🎉 Verificação de tabelas concluída!');
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await db.close();
    }
}

checkAndCreateTables().catch(console.error); 