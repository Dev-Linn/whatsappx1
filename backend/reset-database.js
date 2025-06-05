#!/usr/bin/env node

// Script para resetar banco de dados (desenvolvimento)
const DatabaseManager = require('./src/database');

async function resetDatabase() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔄 Conectando ao banco de dados...');
        const success = await db.initialize();
        
        if (!success) {
            console.error('❌ Erro ao conectar com banco');
            process.exit(1);
        }

        console.log('\n📊 Dados atuais no banco:');
        const userCount = await db.User.count();
        const conversationCount = await db.Conversation.count();
        const messageCount = await db.Message.count();
        const costCount = await db.ApiCost.count();
        
        console.log(`👥 Usuários: ${userCount}`);
        console.log(`💬 Conversas: ${conversationCount}`);
        console.log(`📝 Mensagens: ${messageCount}`);
        console.log(`💰 Registros de Custo: ${costCount}`);
        
        if (userCount === 0 && messageCount === 0 && costCount === 0) {
            console.log('\n✅ Banco já está vazio!');
            await db.close();
            return;
        }

        console.log('\n⚠️ AVISO: Esta operação removerá TODOS os dados!');
        console.log('Digite "CONFIRMAR" para continuar:');
        
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('> ', async (answer) => {
            if (answer === 'CONFIRMAR') {
                console.log('\n🧹 Limpando banco de dados...');
                
                // Remover dados em ordem (devido às foreign keys)
                await db.ApiCost.destroy({ where: {}, truncate: true });
                await db.Message.destroy({ where: {}, truncate: true });
                await db.Conversation.destroy({ where: {}, truncate: true });
                await db.User.destroy({ where: {}, truncate: true });
                
                console.log('\n✅ Banco de dados resetado com sucesso!');
                
                // Verificar se limpeza foi efetiva
                console.log('\n📊 Dados após reset:');
                const finalUserCount = await db.User.count();
                const finalConversationCount = await db.Conversation.count();
                const finalMessageCount = await db.Message.count();
                const finalCostCount = await db.ApiCost.count();
                
                console.log(`👥 Usuários: ${finalUserCount}`);
                console.log(`💬 Conversas: ${finalConversationCount}`);
                console.log(`📝 Mensagens: ${finalMessageCount}`);
                console.log(`💰 Registros de Custo: ${finalCostCount}`);
                
                if (finalUserCount === 0 && finalMessageCount === 0 && finalCostCount === 0) {
                    console.log('\n🎉 Reset concluído com sucesso!');
                } else {
                    console.log('\n⚠️ Alguns dados podem não ter sido removidos');
                }
            } else {
                console.log('\n❌ Operação cancelada');
            }
            
            rl.close();
            await db.close();
        });
        
    } catch (error) {
        console.error('❌ Erro durante reset:', error);
    }
}

resetDatabase(); 