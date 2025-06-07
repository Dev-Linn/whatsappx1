#!/usr/bin/env node

// Script para resetar TUDO (incluindo tenants)
const ApiDatabase = require('./database');

async function resetEverything() {
    console.log('🔄 Resetando TUDO nos DOIS bancos de dados...\n');
    
    const db = new ApiDatabase();
    await db.initialize();
    
    try {
        // DESCOBRIR TODAS AS TABELAS QUE REALMENTE EXISTEM
        console.log('🔍 DESCOBRINDO TODAS AS TABELAS NO BANCO...');
        
        const existingTables = await db.sequelize.query(`
            SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `, {
            type: db.sequelize.QueryTypes.SELECT
        });
        
        const allRealTables = existingTables.map(t => t.name);
        console.log(`📋 TABELAS ENCONTRADAS: ${allRealTables.join(', ')}`);
        
        console.log('\n📊 CONTANDO REGISTROS EM CADA TABELA:');
        const currentCounts = {};
        let totalRecords = 0;
        
        for (const table of allRealTables) {
            try {
                const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = result[0]?.count || 0;
                currentCounts[table] = count;
                totalRecords += count;
                console.log(`📋 ${table}: ${count}`);
            } catch (error) {
                console.log(`❌ ${table}: Erro - ${error.message}`);
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
        
        // APAGAR TODAS AS TABELAS QUE REALMENTE EXISTEM
        console.log(`\n🔥 LIMPANDO TODAS AS ${allRealTables.length} TABELAS ENCONTRADAS...`);
        
        for (const table of allRealTables) {
            try {
                await db.sequelize.query(`DELETE FROM ${table}`);
                console.log(`  ✅ ${table} - APAGADO`);
            } catch (error) {
                console.log(`  ❌ ${table} - ERRO: ${error.message}`);
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
        
        // Verificar resultado de TODAS as tabelas reais
        console.log('\n📊 CONTANDO REGISTROS APÓS LIMPEZA:');
        
        const finalCounts = {};
        let finalTotalRecords = 0;
        
        for (const table of allRealTables) {
            try {
                const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = result[0]?.count || 0;
                finalCounts[table] = count;
                finalTotalRecords += count;
                console.log(`📋 ${table}: ${count}`);
            } catch (error) {
                console.log(`❌ ${table}: Erro - ${error.message}`);
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
            console.log('🔥 Todas as ' + allRealTables.length + ' tabelas foram limpas com sucesso!');
        } else {
            console.log('\n⚠️ MERDA! Ainda tem dados: ' + finalTotalRecords + ' registros restantes');
            console.log('💀 Tabelas que não foram limpas:');
            for (const table of allRealTables) {
                if (finalCounts[table] > 0) {
                    console.log(`   💥 ${table}: ${finalCounts[table]} registros`);
                }
            }
        }
        // ==================== LIMPAR CHATBOT.DB TAMBÉM ====================
        console.log('\n\n🔥 AGORA VAMOS LIMPAR O CHATBOT.DB TAMBÉM!\n');
        
        // Conectar diretamente ao chatbot.db
        const chatbotDbPath = '../backend/data/chatbot.db';
        
        try {
            // Usar raw query para conectar ao chatbot.db
            const chatbotTables = await db.sequelize.query(`
                ATTACH DATABASE '${chatbotDbPath}' AS chatbot;
                SELECT name FROM chatbot.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
            `, {
                type: db.sequelize.QueryTypes.SELECT
            });
            
            console.log(`📋 TABELAS NO CHATBOT.DB: ${chatbotTables.map(t => t.name).join(', ')}`);
            
            // Contar registros no chatbot.db
            console.log('\n📊 CONTANDO REGISTROS NO CHATBOT.DB:');
            let chatbotTotalRecords = 0;
            
            for (const table of chatbotTables) {
                try {
                    const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM chatbot.${table.name}`);
                    const count = result[0]?.count || 0;
                    chatbotTotalRecords += count;
                    console.log(`📋 chatbot.${table.name}: ${count}`);
                } catch (error) {
                    console.log(`❌ chatbot.${table.name}: Erro - ${error.message}`);
                }
            }
            
            console.log(`\n🔢 TOTAL NO CHATBOT.DB: ${chatbotTotalRecords}`);
            
            // Apagar todas as tabelas do chatbot.db
            if (chatbotTotalRecords > 0) {
                console.log(`\n🔥 LIMPANDO CHATBOT.DB...`);
                
                for (const table of chatbotTables) {
                    try {
                        await db.sequelize.query(`DELETE FROM chatbot.${table.name}`);
                        console.log(`  ✅ chatbot.${table.name} - APAGADO`);
                    } catch (error) {
                        console.log(`  ❌ chatbot.${table.name} - ERRO: ${error.message}`);
                    }
                }
                
                // Verificar se limpou o chatbot.db
                console.log('\n📊 VERIFICANDO CHATBOT.DB APÓS LIMPEZA:');
                let finalChatbotRecords = 0;
                
                for (const table of chatbotTables) {
                    try {
                        const result = await db.sequelize.query(`SELECT COUNT(*) as count FROM chatbot.${table.name}`);
                        const count = result[0]?.count || 0;
                        finalChatbotRecords += count;
                        console.log(`📋 chatbot.${table.name}: ${count}`);
                    } catch (error) {
                        console.log(`❌ chatbot.${table.name}: Erro`);
                    }
                }
                
                console.log(`\n🔢 TOTAL NO CHATBOT.DB APÓS LIMPEZA: ${finalChatbotRecords}`);
                
                if (finalChatbotRecords === 0) {
                    console.log('🎉 CHATBOT.DB TAMBÉM FOI LIMPO!');
                } else {
                    console.log('💀 CHATBOT.DB AINDA TEM DADOS!');
                }
            } else {
                console.log('✅ CHATBOT.DB já estava vazio');
            }
            
            // Desconectar do chatbot.db
            await db.sequelize.query('DETACH DATABASE chatbot');
            
        } catch (error) {
            console.error('❌ Erro ao limpar chatbot.db:', error);
        }
        
    } catch (error) {
        console.error('❌ Erro durante limpeza:', error);
    } finally {
        await db.close();
    }
}

resetEverything().catch(console.error); 