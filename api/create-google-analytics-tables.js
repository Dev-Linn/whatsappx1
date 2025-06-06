const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../backend/data/whatsapp.db');

console.log('🔗 Criando tabelas do Google Analytics...');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar:', err.message);
        return;
    }
    console.log('✅ Conectado ao banco');
});

// Tabelas necessárias para Google Analytics
const tables = [
    {
        name: 'google_analytics_tokens',
        sql: `
            CREATE TABLE IF NOT EXISTS google_analytics_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )
        `
    },
    {
        name: 'google_analytics_selections',
        sql: `
            CREATE TABLE IF NOT EXISTS google_analytics_selections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL UNIQUE,
                account_id TEXT NOT NULL,
                property_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )
        `
    }
];

// Criar tabelas sequencialmente
let completed = 0;

function createTable(tableData) {
    return new Promise((resolve, reject) => {
        db.run(tableData.sql, (err) => {
            if (err) {
                console.error(`❌ Erro ao criar ${tableData.name}:`, err.message);
                reject(err);
            } else {
                console.log(`✅ Tabela ${tableData.name} criada com sucesso`);
                resolve();
            }
        });
    });
}

async function createAllTables() {
    try {
        for (const table of tables) {
            await createTable(table);
        }
        
        // Verificar se as tabelas foram criadas
        db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE '%analytics%' 
            ORDER BY name
        `, (err, rows) => {
            if (err) {
                console.error('❌ Erro ao verificar tabelas:', err.message);
            } else {
                console.log('\n📊 Tabelas do Google Analytics:');
                rows.forEach(row => {
                    console.log(`   ✅ ${row.name}`);
                });
                
                console.log('\n🎉 Todas as tabelas do Google Analytics foram criadas!');
                console.log('\n💡 Agora você pode testar a integração na interface web.');
            }
            
            db.close((err) => {
                if (err) {
                    console.error('❌ Erro ao fechar banco:', err.message);
                } else {
                    console.log('✅ Banco fechado');
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        db.close();
    }
}

// Executar criação
createAllTables(); 