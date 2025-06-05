const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Conectar ao banco
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../backend/data/chatbot.db'),
    logging: false
});

async function migrateFollowUpFields() {
    try {
        console.log('🔄 Iniciando migração dos campos de Follow-up...');

        // Verificar se a tabela users existe
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        
        if (results.length === 0) {
            console.log('❌ Tabela users não encontrada!');
            return false;
        }

        // Verificar se os campos já existem
        const [columns] = await sequelize.query("PRAGMA table_info(users)");
        const columnNames = columns.map(col => col.name);

        const fieldsToAdd = [
            { name: 'followup_enabled', type: 'BOOLEAN', default: 'false' },
            { name: 'followup_interval_hours', type: 'INTEGER', default: '24' },
            { name: 'last_followup_sent', type: 'DATETIME', default: 'NULL' },
            { name: 'next_followup_due', type: 'DATETIME', default: 'NULL' },
            { name: 'followup_count', type: 'INTEGER', default: '0' },
            { name: 'followup_message', type: 'TEXT', default: "'Oi! Ainda tem interesse nas receitas de pudim? 😊'" }
        ];

        let addedFields = 0;

        for (const field of fieldsToAdd) {
            if (!columnNames.includes(field.name)) {
                try {
                    const sql = `ALTER TABLE users ADD COLUMN ${field.name} ${field.type} DEFAULT ${field.default}`;
                    await sequelize.query(sql);
                    console.log(`✅ Campo ${field.name} adicionado com sucesso`);
                    addedFields++;
                } catch (error) {
                    console.error(`❌ Erro ao adicionar campo ${field.name}:`, error.message);
                }
            } else {
                console.log(`⏭️ Campo ${field.name} já existe`);
            }
        }

        console.log(`\n🎉 Migração concluída! ${addedFields} novos campos adicionados.`);
        console.log('\n📋 Campos de Follow-up disponíveis:');
        console.log('• followup_enabled - Ativar/desativar follow-up para o usuário');
        console.log('• followup_interval_hours - Intervalo em horas (24, 72, 168, 720)');
        console.log('• last_followup_sent - Data do último follow-up enviado');
        console.log('• next_followup_due - Data do próximo follow-up');
        console.log('• followup_count - Contador de follow-ups enviados');
        console.log('• followup_message - Mensagem personalizada do follow-up');
        
        return true;

    } catch (error) {
        console.error('❌ Erro na migração:', error);
        return false;
    } finally {
        await sequelize.close();
    }
}

// Executar migração
if (require.main === module) {
    migrateFollowUpFields().then((success) => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { migrateFollowUpFields }; 