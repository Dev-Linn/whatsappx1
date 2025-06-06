const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '../backend/data/whatsapp.db');

console.log('🚀 Criando tabelas de integração...');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar:', err.message);
        return;
    }
    console.log('✅ Conectado ao banco');
});

// Criar tabelas uma por vez
const createTables = [
    `CREATE TABLE IF NOT EXISTS whatsapp_analytics_integration (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        site_url TEXT NOT NULL,
        tracking_option TEXT DEFAULT 'automatic',
        conversion_types TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS whatsapp_tracking_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        tracking_id TEXT NOT NULL UNIQUE,
        base_url TEXT NOT NULL,
        campaign_name TEXT,
        user_id TEXT,
        clicks_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS whatsapp_click_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        tracking_id TEXT NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        referrer TEXT,
        session_duration INTEGER,
        pages_viewed INTEGER DEFAULT 1,
        converted BOOLEAN DEFAULT FALSE,
        conversion_value DECIMAL(10,2),
        clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS whatsapp_conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        tracking_id TEXT NOT NULL,
        conversion_type TEXT NOT NULL,
        conversion_value DECIMAL(10,2),
        order_id TEXT,
        product_ids TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        converted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
];

// Executar criação das tabelas
let completed = 0;
createTables.forEach((sql, index) => {
    db.run(sql, (err) => {
        completed++;
        if (err) {
            console.error(`❌ Erro na tabela ${index + 1}:`, err.message);
        } else {
            console.log(`✅ Tabela ${index + 1} criada com sucesso`);
        }
        
        if (completed === createTables.length) {
            // Inserir dados de exemplo
            db.run(`INSERT OR IGNORE INTO whatsapp_analytics_integration 
                     (tenant_id, site_url, tracking_option, conversion_types) 
                     VALUES (1, 'https://exemplo.com.br', 'automatic', '["visits","time","products","purchases"]')`, 
                   (err) => {
                if (err) {
                    console.log('⚠️  Dados de exemplo não inseridos:', err.message);
                } else {
                    console.log('📝 Dados de exemplo inseridos');
                }
                
                // Verificar tabelas criadas
                db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'whatsapp_%'", (err, rows) => {
                    if (!err) {
                        console.log('\n📋 Tabelas criadas:');
                        rows.forEach(row => console.log(`   ✅ ${row.name}`));
                    }
                    
                    db.close((err) => {
                        if (err) {
                            console.error('❌ Erro ao fechar:', err.message);
                        } else {
                            console.log('✅ Banco fechado');
                            console.log('🎉 Setup concluído!');
                        }
                    });
                });
            });
        }
    });
}); 