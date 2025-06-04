#!/usr/bin/env node

// Script para resetar TUDO (incluindo tenants)
const ApiDatabase = require('./database');

async function resetEverything() {
    console.log('🔄 Resetando TUDO no banco de dados...\n');
    
    const db = new ApiDatabase();
    await db.initialize();
    
    try {
        // Mostrar dados atuais
        console.log('📊 DADOS ATUAIS:');
        const tenantCount = await db.Tenant.count();
        const userCount = await db.User.count();
        const conversationCount = await db.Conversation.count();
        const messageCount = await db.Message.count();
        const costCount = await db.ApiCost.count();
        
        console.log(`🏢 Tenants: ${tenantCount}`);
        console.log(`👥 Usuários: ${userCount}`);
        console.log(`💬 Conversas: ${conversationCount}`);
        console.log(`📝 Mensagens: ${messageCount}`);
        console.log(`💰 Custos: ${costCount}`);
        
        if (tenantCount === 0 && userCount === 0 && messageCount === 0) {
            console.log('\n✅ Banco já está completamente vazio!');
            return;
        }

        console.log('\n🧹 LIMPANDO TUDO...');
        
        // Limpar em ordem (foreign keys)
        await db.ApiCost.destroy({ where: {}, truncate: true });
        console.log('  ✅ ApiCost limpo');
        
        await db.Message.destroy({ where: {}, truncate: true });
        console.log('  ✅ Messages limpo');
        
        await db.Conversation.destroy({ where: {}, truncate: true });
        console.log('  ✅ Conversations limpo');
        
        await db.User.destroy({ where: {}, truncate: true });
        console.log('  ✅ Users limpo');
        
        await db.Tenant.destroy({ where: {}, truncate: true });
        console.log('  ✅ Tenants limpo');
        
        // Verificar resultado
        console.log('\n📊 DADOS APÓS LIMPEZA:');
        const finalTenantCount = await db.Tenant.count();
        const finalUserCount = await db.User.count();
        const finalConversationCount = await db.Conversation.count();
        const finalMessageCount = await db.Message.count();
        const finalCostCount = await db.ApiCost.count();
        
        console.log(`🏢 Tenants: ${finalTenantCount}`);
        console.log(`👥 Usuários: ${finalUserCount}`);
        console.log(`💬 Conversas: ${finalConversationCount}`);
        console.log(`📝 Mensagens: ${finalMessageCount}`);
        console.log(`💰 Custos: ${finalCostCount}`);
        
        if (finalTenantCount === 0 && finalUserCount === 0 && finalMessageCount === 0) {
            console.log('\n🎉 BANCO COMPLETAMENTE LIMPO!');
        } else {
            console.log('\n⚠️ Alguns dados não foram removidos');
        }
        
    } catch (error) {
        console.error('❌ Erro durante limpeza:', error);
    } finally {
        await db.close();
    }
}

resetEverything().catch(console.error); 