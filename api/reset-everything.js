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
        
        // Usar SQL direto para garantir que limpe TODAS as tabelas
        const allTables = [
            // Core do sistema
            'api_costs',
            'messages', 
            'conversations',
            'tenant_prompts',
            'users',
            'tenants',
            
            // Analytics e tracking
            'whatsapp_tracking_links',
            'whatsapp_click_tracking', 
            'whatsapp_message_correlation',
            'google_analytics_tokens',
            'google_analytics_selections',
            
            // Sistema de logs
            'system_logs',
            'uptime_records',
            
            // Outros possíveis
            'tenant_settings',
            'webhook_logs',
            'api_usage',
            'session_data'
        ];
        
        console.log(`📋 Tentando limpar ${allTables.length} tabelas possíveis...`);
        
        for (const table of allTables) {
            try {
                await db.sequelize.query(`DELETE FROM ${table}`);
                console.log(`  ✅ ${table} - SQL direto`);
            } catch (error) {
                console.log(`  ⚠️ ${table} - Tabela não existe ou erro: ${error.message}`);
            }
        }
        
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
        
        // Verificar resultado de todas as tabelas principais
        console.log('\n📊 DADOS APÓS LIMPEZA:');
        
        const finalCounts = {};
        for (const table of ['tenants', 'users', 'conversations', 'messages', 'api_costs', 'tenant_prompts', 'whatsapp_tracking_links', 'whatsapp_click_tracking', 'whatsapp_message_correlation']) {
            try {
                const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
                finalCounts[table] = result[0]?.count || 0;
            } catch (error) {
                finalCounts[table] = 'N/A';
            }
        }
        
        console.log(`🏢 Tenants: ${finalCounts.tenants}`);
        console.log(`👥 Usuários: ${finalCounts.users}`);
        console.log(`💬 Conversas: ${finalCounts.conversations}`);
        console.log(`📝 Mensagens: ${finalCounts.messages}`);
        console.log(`💰 Custos: ${finalCounts.api_costs}`);
        console.log(`🤖 Prompts: ${finalCounts.tenant_prompts}`);
        console.log(`🔗 Links Tracking: ${finalCounts.whatsapp_tracking_links}`);
        console.log(`👆 Cliques: ${finalCounts.whatsapp_click_tracking}`);
        console.log(`🔄 Correlações: ${finalCounts.whatsapp_message_correlation}`);
        
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