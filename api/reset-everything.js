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
        const promptCount = await db.TenantPrompt.count();
        
        console.log(`🏢 Tenants: ${tenantCount}`);
        console.log(`👥 Usuários: ${userCount}`);
        console.log(`💬 Conversas: ${conversationCount}`);
        console.log(`📝 Mensagens: ${messageCount}`);
        console.log(`💰 Custos: ${costCount}`);
        console.log(`🤖 Prompts: ${promptCount}`);
        
        if (tenantCount === 0 && userCount === 0 && messageCount === 0 && promptCount === 0) {
            console.log('\n✅ Banco já está completamente vazio!');
            return;
        }

        console.log('\n🧹 LIMPANDO TUDO COM FORÇA...');
        
        // Desabilitar foreign key constraints temporariamente
        await db.sequelize.query('PRAGMA foreign_keys = OFF');
        console.log('  🔓 Foreign keys desabilitadas');
        
        // Usar SQL direto para garantir que limpe tudo
        await db.sequelize.query('DELETE FROM api_costs');
        console.log('  ✅ api_costs - SQL direto');
        
        await db.sequelize.query('DELETE FROM messages');
        console.log('  ✅ messages - SQL direto');
        
        await db.sequelize.query('DELETE FROM conversations');
        console.log('  ✅ conversations - SQL direto');
        
        await db.sequelize.query('DELETE FROM tenant_prompts');
        console.log('  ✅ tenant_prompts - SQL direto');
        
        await db.sequelize.query('DELETE FROM users');
        console.log('  ✅ users - SQL direto');
        
        await db.sequelize.query('DELETE FROM tenants');
        console.log('  ✅ tenants - SQL direto');
        
        console.log('\n🔄 RESETANDO AUTO_INCREMENT AGGRESSIVAMENTE...');
        
        // Limpar completamente sqlite_sequence
        await db.sequelize.query('DELETE FROM sqlite_sequence');
        console.log('  ✅ sqlite_sequence completamente limpo');
        
        // Usar VACUUM para compactar e limpar o banco
        await db.sequelize.query('VACUUM');
        console.log('  ✅ VACUUM executado - banco compactado');
        
        // Reabilitar foreign keys
        await db.sequelize.query('PRAGMA foreign_keys = ON');
        console.log('  🔒 Foreign keys reabilitadas');
        
        // Verificar resultado
        console.log('\n📊 DADOS APÓS LIMPEZA:');
        const finalTenantCount = await db.Tenant.count();
        const finalUserCount = await db.User.count();
        const finalConversationCount = await db.Conversation.count();
        const finalMessageCount = await db.Message.count();
        const finalCostCount = await db.ApiCost.count();
        const finalPromptCount = await db.TenantPrompt.count();
        
        console.log(`🏢 Tenants: ${finalTenantCount}`);
        console.log(`👥 Usuários: ${finalUserCount}`);
        console.log(`💬 Conversas: ${finalConversationCount}`);
        console.log(`📝 Mensagens: ${finalMessageCount}`);
        console.log(`💰 Custos: ${finalCostCount}`);
        console.log(`🤖 Prompts: ${finalPromptCount}`);
        
        // Testar criação de novo tenant para verificar se AUTO_INCREMENT foi resetado
        console.log('\n🧪 TESTANDO AUTO_INCREMENT...');
        const testTenant = await db.Tenant.create({
            company_name: 'Teste',
            email: 'teste@test.com',
            password_hash: 'test123',
            status: 'active'
        });
        
        console.log(`✅ Novo tenant criado com ID: ${testTenant.id}`);
        
        // Remover tenant de teste
        await testTenant.destroy();
        await db.sequelize.query("DELETE FROM sqlite_sequence WHERE name = 'tenants'");
        console.log(`🧹 Tenant de teste removido`);
        
        if (finalTenantCount === 0 && finalUserCount === 0 && finalMessageCount === 0 && finalPromptCount === 0) {
            console.log('\n🎉 BANCO COMPLETAMENTE LIMPO E AUTO_INCREMENT RESETADO!');
            console.log('📝 Próximo tenant criado terá ID = 1');
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