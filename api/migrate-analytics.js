#!/usr/bin/env node

const Database = require('./database');

async function createAnalyticsTables() {
    console.log('🔧 Criando tabelas do Google Analytics...');
    
    try {
        // Inicializar conexão com banco
        const apiDatabase = new Database();
        await apiDatabase.initialize();
        const db = apiDatabase.sequelize;
        
        // Tabela para armazenar tokens do Google Analytics por tenant
        await db.query(`
            CREATE TABLE IF NOT EXISTS google_analytics_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
                UNIQUE(tenant_id)
            )
        `);
        
        // Tabela para armazenar seleções de conta/propriedade por tenant
        await db.query(`
            CREATE TABLE IF NOT EXISTS google_analytics_selections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL,
                account_id TEXT NOT NULL,
                property_id TEXT NOT NULL,
                account_name TEXT,
                property_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
                UNIQUE(tenant_id)
            )
        `);
        
        console.log('✅ Tabelas do Google Analytics criadas com sucesso!');
        
        // Verificar se as tabelas foram criadas
        const [tables] = await db.query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND (name='google_analytics_tokens' OR name='google_analytics_selections')
            ORDER BY name
        `);
        
        console.log('📋 Tabelas criadas:');
        tables.forEach(table => {
            console.log(`  - ${table.name}`);
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar tabelas do Google Analytics:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createAnalyticsTables()
        .then(() => {
            console.log('🎉 Migração do Google Analytics concluída!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erro na migração:', error);
            process.exit(1);
        });
}

module.exports = createAnalyticsTables; 