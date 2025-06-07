#!/usr/bin/env node

const ApiDatabase = require('./database');

async function updateTrackingTables() {
    console.log('🔧 [UPDATE TABLES] Atualizando tabelas de tracking...');
    
    try {
        const db = new ApiDatabase();
        await db.initialize();
        
        console.log('✅ [UPDATE TABLES] Conectado ao banco de dados');
        
        // 1. Adicionar colunas na tabela whatsapp_tracking_links
        console.log('📝 [UPDATE TABLES] Adicionando colunas em whatsapp_tracking_links...');
        
        const newColumnsLinks = [
            'ALTER TABLE whatsapp_tracking_links ADD COLUMN link_type TEXT DEFAULT "website"',
            'ALTER TABLE whatsapp_tracking_links ADD COLUMN use_intermediate_page BOOLEAN DEFAULT false',
            'ALTER TABLE whatsapp_tracking_links ADD COLUMN default_message TEXT',
            'ALTER TABLE whatsapp_tracking_links ADD COLUMN whatsapp_number TEXT'
        ];
        
        for (const sql of newColumnsLinks) {
            try {
                await db.sequelize.query(sql);
                console.log(`✅ [UPDATE TABLES] ${sql.split(' ')[3]} adicionada`);
            } catch (error) {
                if (error.message.includes('duplicate column name')) {
                    console.log(`⚠️ [UPDATE TABLES] Coluna ${sql.split(' ')[3]} já existe`);
                } else {
                    console.error(`❌ [UPDATE TABLES] Erro ao adicionar coluna: ${error.message}`);
                }
            }
        }
        
        // 2. Adicionar colunas na tabela whatsapp_click_tracking
        console.log('📝 [UPDATE TABLES] Adicionando colunas em whatsapp_click_tracking...');
        
        const newColumnsClicks = [
            'ALTER TABLE whatsapp_click_tracking ADD COLUMN latitude REAL',
            'ALTER TABLE whatsapp_click_tracking ADD COLUMN longitude REAL',
            'ALTER TABLE whatsapp_click_tracking ADD COLUMN location_accuracy REAL'
        ];
        
        for (const sql of newColumnsClicks) {
            try {
                await db.sequelize.query(sql);
                console.log(`✅ [UPDATE TABLES] ${sql.split(' ')[3]} adicionada`);
            } catch (error) {
                if (error.message.includes('duplicate column name')) {
                    console.log(`⚠️ [UPDATE TABLES] Coluna ${sql.split(' ')[3]} já existe`);
                } else {
                    console.error(`❌ [UPDATE TABLES] Erro ao adicionar coluna: ${error.message}`);
                }
            }
        }
        
        // 3. Criar tabela whatsapp_opens
        console.log('📝 [UPDATE TABLES] Criando tabela whatsapp_opens...');
        
        try {
            await db.sequelize.query(`
                CREATE TABLE IF NOT EXISTS whatsapp_opens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id INTEGER NOT NULL,
                    tracking_id TEXT NOT NULL,
                    time_spent_before_open INTEGER,
                    whatsapp_url TEXT,
                    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
                )
            `);
            console.log('✅ [UPDATE TABLES] Tabela whatsapp_opens criada');
        } catch (error) {
            console.error('❌ [UPDATE TABLES] Erro ao criar tabela whatsapp_opens:', error.message);
        }
        
        // 4. Verificar estruturas
        console.log('🔍 [UPDATE TABLES] Verificando estruturas...');
        
        const linksColumns = await db.sequelize.query("PRAGMA table_info(whatsapp_tracking_links)");
        console.log('📋 [LINKS] Colunas:', linksColumns[0].map(col => col.name).join(', '));
        
        const clicksColumns = await db.sequelize.query("PRAGMA table_info(whatsapp_click_tracking)");
        console.log('📋 [CLICKS] Colunas:', clicksColumns[0].map(col => col.name).join(', '));
        
        const opensColumns = await db.sequelize.query("PRAGMA table_info(whatsapp_opens)");
        console.log('📋 [OPENS] Colunas:', opensColumns[0].map(col => col.name).join(', '));
        
        console.log('🎉 [UPDATE TABLES] Atualização concluída com sucesso!');
        
        await db.close();
        
    } catch (error) {
        console.error('❌ [UPDATE TABLES] Erro geral:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    updateTrackingTables();
}

module.exports = updateTrackingTables; 