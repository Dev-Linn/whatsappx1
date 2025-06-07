#!/usr/bin/env node

// Script para resetar TUDO (incluindo tenants)
const ApiDatabase = require('./database');

async function resetEverything() {
    console.log('🔄 Resetando TUDO no banco de dados...\n');
    
    const db = new ApiDatabase();
    await db.initialize();
    
    try {
        // Verificar TODAS as tabelas no início
        console.log('📊 DADOS ATUAIS EM TODAS AS TABELAS:');
        
        const allTablesCheck = [
            'tenants', 'users', 'conversations', 'messages', 'api_costs', 'tenant_prompts',
            'whatsapp_tracking_links', 'whatsapp_click_tracking', 'whatsapp_message_correlation',
            'google_analytics_tokens', 'google_analytics_selections', 'system_logs', 'uptime_records'
        ];
        
        const currentCounts = {};
        let totalRecords = 0;
        
        for (const table of allTablesCheck) {
            try {
                const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = result[0]?.count || 0;
                currentCounts[table] = count;
                totalRecords += count;
                console.log(`📋 ${table}: ${count}`);
            } catch (error) {
                console.log(`⚠️ ${table}: Tabela não existe`);
                currentCounts[table] = 0;
            }
        }
        
        console.log(`\n🔢 TOTAL DE REGISTROS: ${totalRecords}`);
        
        if (totalRecords === 0) {
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
        
        // Verificar resultado de TODAS as tabelas
        console.log('\n📊 DADOS APÓS LIMPEZA EM TODAS AS TABELAS:');
        
        const finalCounts = {};
        let finalTotalRecords = 0;
        
        for (const table of allTablesCheck) {
            try {
                const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = result[0]?.count || 0;
                finalCounts[table] = count;
                finalTotalRecords += count;
                console.log(`📋 ${table}: ${count}`);
            } catch (error) {
                console.log(`⚠️ ${table}: Erro - ${error.message}`);
                finalCounts[table] = 'ERRO';
            }
        }
        
        console.log(`\n🔢 TOTAL DE REGISTROS APÓS LIMPEZA: ${finalTotalRecords}`);
        
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
        
        if (finalTotalRecords === 0) {
            console.log('\n🎉 BANCO COMPLETAMENTE LIMPO E AUTO_INCREMENT RESETADO!');
            console.log('📝 Próximo tenant criado terá ID = 1');
            console.log('🔥 Todas as ' + allTablesCheck.length + ' tabelas foram limpas com sucesso!');
        } else {
            console.log('\n⚠️ Alguns dados não foram removidos (' + finalTotalRecords + ' registros restantes)');
        }
        
    } catch (error) {
        console.error('❌ Erro durante limpeza:', error);
    } finally {
        await db.close();
    }
}

resetEverything().catch(console.error); 