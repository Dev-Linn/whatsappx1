const ApiDatabase = require('./database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function createCorrelationTable() {
    console.log('🔍 [CORRELATION] Criando tabela de correlação WhatsApp...');
    
    try {
        const db = new ApiDatabase();
        await db.initialize();
        
        // Criar tabela de correlação de mensagens
        await db.sequelize.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_message_correlation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                tracking_id TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                message_id TEXT,
                conversation_id TEXT,
                message_content TEXT NOT NULL,
                lead_score INTEGER DEFAULT 0,
                conversion_stage TEXT DEFAULT 'initial_contact',
                follow_up_count INTEGER DEFAULT 0,
                correlated_at DATETIME NOT NULL,
                last_interaction DATETIME,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )
        `);
        
        console.log('✅ [CORRELATION] Tabela whatsapp_message_correlation criada!');
        
        // Verificar estrutura da tabela
        const columns = await db.sequelize.query(`PRAGMA table_info(whatsapp_message_correlation)`);
        console.log('📋 [CORRELATION] Colunas da tabela:');
        columns[0].forEach(col => {
            console.log(`  📋 ${col.name} (${col.type})`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ [CORRELATION] Erro ao criar tabela:', error);
        process.exit(1);
    }
}

createCorrelationTable(); 