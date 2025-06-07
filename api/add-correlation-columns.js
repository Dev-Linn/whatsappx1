const ApiDatabase = require('./database');

async function addCorrelationColumns() {
    console.log('🔧 [UPDATE] Adicionando colunas na tabela whatsapp_message_correlation...');
    
    try {
        const db = new ApiDatabase();
        await db.initialize();
        
        // Verificar colunas existentes
        const columns = await db.sequelize.query(`PRAGMA table_info(whatsapp_message_correlation)`);
        const existingColumns = columns[0].map(col => col.name);
        
        console.log('📋 [UPDATE] Colunas existentes:', existingColumns);
        
        // Adicionar coluna correlation_method se não existir
        if (!existingColumns.includes('correlation_method')) {
            await db.sequelize.query(`
                ALTER TABLE whatsapp_message_correlation 
                ADD COLUMN correlation_method TEXT DEFAULT 'manual'
            `);
            console.log('✅ [UPDATE] Coluna correlation_method adicionada');
        } else {
            console.log('✅ [UPDATE] Coluna correlation_method já existe');
        }
        
        // Adicionar coluna time_elapsed_seconds se não existir
        if (!existingColumns.includes('time_elapsed_seconds')) {
            await db.sequelize.query(`
                ALTER TABLE whatsapp_message_correlation 
                ADD COLUMN time_elapsed_seconds INTEGER
            `);
            console.log('✅ [UPDATE] Coluna time_elapsed_seconds adicionada');
        } else {
            console.log('✅ [UPDATE] Coluna time_elapsed_seconds já existe');
        }
        
        // Verificar resultado final
        const finalColumns = await db.sequelize.query(`PRAGMA table_info(whatsapp_message_correlation)`);
        console.log('📋 [UPDATE] Colunas finais:');
        finalColumns[0].forEach(col => {
            console.log(`  📋 ${col.name} (${col.type})`);
        });
        
        console.log('✅ [UPDATE] Tabela atualizada com sucesso!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ [UPDATE] Erro ao atualizar tabela:', error);
        process.exit(1);
    }
}

addCorrelationColumns(); 