const path = require('path');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'backend/data/chatbot.db'),
    logging: false
});

async function checkAllTables() {
    try {
        await sequelize.authenticate();
        console.log('📋 ANÁLISE COMPLETA DO BANCO DE DADOS\n');
        
        // Listar todas as tabelas
        const [tables] = await sequelize.query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name;
        `);
        
        console.log(`🗂️ TOTAL DE TABELAS ENCONTRADAS: ${tables.length}\n`);
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const tableName = table.name;
            
            try {
                // Contar registros em cada tabela
                const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                const count = countResult[0].count;
                
                // Verificar AUTO_INCREMENT atual
                const [seqResult] = await sequelize.query(`
                    SELECT seq FROM sqlite_sequence WHERE name = '${tableName}'
                `);
                const currentSeq = seqResult.length > 0 ? seqResult[0].seq : 'N/A';
                
                console.log(`📊 ${i + 1}. Tabela: ${tableName}`);
                console.log(`   📝 Registros: ${count}`);
                console.log(`   🔢 AUTO_INCREMENT: ${currentSeq}`);
                console.log('');
                
            } catch (error) {
                console.log(`❌ Erro ao verificar tabela ${tableName}:`, error.message);
            }
        }
        
        console.log('🔍 TABELAS QUE DEVERIAM SER RESETADAS:');
        const expectedTables = [
            'tenants',
            'users', 
            'conversations',
            'messages',
            'api_costs',
            'tenant_prompts'
        ];
        
        expectedTables.forEach((expected, index) => {
            const found = tables.find(t => t.name === expected);
            console.log(`${index + 1}. ${expected}: ${found ? '✅ Encontrada' : '❌ NÃO ENCONTRADA'}`);
        });
        
        // Verificar se há tabelas extras que não estamos resetando
        const extraTables = tables.filter(t => !expectedTables.includes(t.name));
        if (extraTables.length > 0) {
            console.log('\n⚠️ TABELAS EXTRAS NÃO SENDO RESETADAS:');
            extraTables.forEach((table, index) => {
                console.log(`${index + 1}. ${table.name}`);
            });
        } else {
            console.log('\n✅ Todas as tabelas estão sendo resetadas');
        }
        
        await sequelize.close();
        
    } catch (error) {
        console.error('❌ Erro:', error);
        await sequelize.close();
    }
}

checkAllTables(); 