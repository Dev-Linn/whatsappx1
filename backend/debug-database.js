#!/usr/bin/env node

// Script de debug para verificar dados do banco
const DatabaseManager = require('./src/database');

async function debugDatabase() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔍 Iniciando debug do banco de dados...\n');
        
        await db.initialize();
        
        // Buscar todos os usuários diretamente
        console.log('📋 Buscando todos os usuários...');
        const users = await db.User.findAll({
            attributes: ['id', 'name', 'phone', 'total_messages', 'stage', 'sentiment', 'observations'],
            order: [['total_messages', 'DESC']]
        });
        
        console.log(`✅ Encontrados ${users.length} usuários:\n`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ID: ${user.id}`);
            console.log(`   Nome: ${user.name}`);
            console.log(`   Telefone: ${user.phone}`);
            console.log(`   Mensagens: ${user.total_messages}`);
            console.log(`   Stage: ${user.stage}`);
            console.log(`   Sentiment: ${user.sentiment}`);
            console.log(`   Observações: ${user.observations || 'Nenhuma'}`);
            console.log('');
        });
        
        // Testar busca específica
        if (users.length > 0) {
            const firstUser = users[0];
            console.log(`🔍 Testando busca pelo usuário: ${firstUser.name}`);
            
            const searchResult = await db.User.findOne({
                where: { phone: firstUser.phone },
                include: [{
                    model: db.Message,
                    as: 'messages',
                    limit: 5,
                    order: [['timestamp', 'DESC']]
                }]
            });
            
            if (searchResult) {
                console.log(`✅ Usuário encontrado: ${searchResult.name}`);
                console.log(`📱 Telefone: ${searchResult.phone}`);
                console.log(`💬 Mensagens: ${searchResult.messages?.length || 0}`);
                
                if (searchResult.messages && searchResult.messages.length > 0) {
                    console.log('\n📝 Últimas mensagens:');
                    searchResult.messages.forEach((msg, index) => {
                        const sender = msg.is_bot ? 'Bot' : 'Usuário';
                        console.log(`${index + 1}. [${sender}] ${msg.content.substring(0, 50)}...`);
                    });
                }
            } else {
                console.log('❌ Erro: usuário não encontrado na busca específica');
            }
        }
        
        // Verificar estrutura da tabela
        console.log('\n🏗️ Verificando estrutura da tabela users...');
        const [tableInfo] = await db.sequelize.query("PRAGMA table_info(users);");
        
        console.log('📊 Colunas da tabela:');
        tableInfo.forEach(col => {
            console.log(`• ${col.name} (${col.type})`);
        });
        
    } catch (error) {
        console.error('❌ Erro no debug:', error);
    } finally {
        await db.close();
        console.log('\n🔌 Debug concluído');
    }
}

// Executar debug
debugDatabase(); 