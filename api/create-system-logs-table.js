    const ApiDatabase = require('./database');

async function createSystemLogsTable() {
    try {
        const db = new ApiDatabase();
        
        await db.sequelize.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER,
                level VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                meta TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Tabela system_logs criada com sucesso');
        
        // Verificar se foi criada
        const result = await db.sequelize.query(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='system_logs'
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        if (result.length > 0) {
            console.log('✅ Tabela system_logs confirmada no banco');
        } else {
            console.log('❌ Tabela system_logs não encontrada após criação');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao criar tabela system_logs:', error);
        process.exit(1);
    }
}

createSystemLogsTable(); 