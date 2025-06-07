#!/usr/bin/env node

// Script para investigar os dois bancos de dados
const ApiDatabase = require('./database');

async function investigateDatabases() {
    console.log('🔍 INVESTIGANDO OS DOIS BANCOS DE DADOS...\n');
    
    const db = new ApiDatabase();
    await db.initialize();
    
    try {
        // ==================== INVESTIGAR WHATSAPP.DB ====================
        console.log('📊 ==================== WHATSAPP.DB ====================');
        
        const whatsappTables = await db.sequelize.query(`
            SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `, {
            type: db.sequelize.QueryTypes.SELECT
        });
        
        console.log(`📋 TABELAS NO WHATSAPP.DB: ${whatsappTables.map(t => t.name).join(', ')}\n`);
        
        let whatsappTotalRecords = 0;
        
        for (const table of whatsappTables) {
            try {
                // Contar registros
                const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM ${table.name}`);
                const count = countResult[0]?.count || 0;
                whatsappTotalRecords += count;
                
                console.log(`📋 ${table.name}: ${count} registros`);
                
                // Se tem registros, mostrar alguns dados
                if (count > 0 && count <= 10) {
                    try {
                        const data = await db.sequelize.query(`SELECT * FROM ${table.name} LIMIT 3`, {
                            type: db.sequelize.QueryTypes.SELECT
                        });
                        console.log(`   📄 Dados:`, JSON.stringify(data, null, 2));
                    } catch (error) {
                        console.log(`   ❌ Erro ao ler dados: ${error.message}`);
                    }
                } else if (count > 10) {
                    try {
                        const data = await db.sequelize.query(`SELECT * FROM ${table.name} LIMIT 2`, {
                            type: db.sequelize.QueryTypes.SELECT
                        });
                        console.log(`   📄 Amostra (${count} registros):`, JSON.stringify(data, null, 2));
                    } catch (error) {
                        console.log(`   ❌ Erro ao ler dados: ${error.message}`);
                    }
                }
                console.log('');
                
            } catch (error) {
                console.log(`❌ ${table.name}: Erro - ${error.message}\n`);
            }
        }
        
        console.log(`🔢 TOTAL NO WHATSAPP.DB: ${whatsappTotalRecords} registros\n`);
        
        // ==================== INVESTIGAR CHATBOT.DB ====================
        console.log('🤖 ==================== CHATBOT.DB ====================');
        
        const chatbotDbPath = '../backend/data/chatbot.db';
        
        try {
            // Conectar ao chatbot.db
            await db.sequelize.query(`ATTACH DATABASE '${chatbotDbPath}' AS chatbot`);
            
            const chatbotTables = await db.sequelize.query(`
                SELECT name FROM chatbot.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
            `, {
                type: db.sequelize.QueryTypes.SELECT
            });
            
            console.log(`📋 TABELAS NO CHATBOT.DB: ${chatbotTables.map(t => t.name).join(', ')}\n`);
            
            let chatbotTotalRecords = 0;
            
            for (const table of chatbotTables) {
                try {
                    // Contar registros
                    const countResult = await db.sequelize.query(`SELECT COUNT(*) as count FROM chatbot.${table.name}`);
                    const count = countResult[0]?.count || 0;
                    chatbotTotalRecords += count;
                    
                    console.log(`📋 chatbot.${table.name}: ${count} registros`);
                    
                    // Se tem registros, mostrar alguns dados
                    if (count > 0 && count <= 10) {
                        try {
                            const data = await db.sequelize.query(`SELECT * FROM chatbot.${table.name} LIMIT 3`, {
                                type: db.sequelize.QueryTypes.SELECT
                            });
                            console.log(`   📄 Dados:`, JSON.stringify(data, null, 2));
                        } catch (error) {
                            console.log(`   ❌ Erro ao ler dados: ${error.message}`);
                        }
                    } else if (count > 10) {
                        try {
                            const data = await db.sequelize.query(`SELECT * FROM chatbot.${table.name} LIMIT 2`, {
                                type: db.sequelize.QueryTypes.SELECT
                            });
                            console.log(`   📄 Amostra (${count} registros):`, JSON.stringify(data, null, 2));
                        } catch (error) {
                            console.log(`   ❌ Erro ao ler dados: ${error.message}`);
                        }
                    }
                    console.log('');
                    
                } catch (error) {
                    console.log(`❌ chatbot.${table.name}: Erro - ${error.message}\n`);
                }
            }
            
            console.log(`🔢 TOTAL NO CHATBOT.DB: ${chatbotTotalRecords} registros\n`);
            
            // Desconectar do chatbot.db
            await db.sequelize.query('DETACH DATABASE chatbot');
            
        } catch (error) {
            console.error('❌ Erro ao investigar chatbot.db:', error);
        }
        
        // ==================== RESUMO ====================
        console.log('📊 ==================== RESUMO ====================');
        console.log(`📁 WHATSAPP.DB: ${whatsappTotalRecords} registros em ${whatsappTables.length} tabelas`);
        console.log(`🤖 CHATBOT.DB: ${chatbotTotalRecords} registros em ${chatbotTables.length} tabelas`);
        console.log(`🔢 TOTAL GERAL: ${whatsappTotalRecords + chatbotTotalRecords} registros`);
        
        console.log('\n🤔 ==================== ANÁLISE ====================');
        console.log('💡 POSSÍVEIS MOTIVOS PARA 2 BANCOS:');
        console.log('   1. 📊 whatsapp.db = API/Analytics (novo sistema)');
        console.log('   2. 🤖 chatbot.db = Sistema antigo de chatbot');
        console.log('   3. 🔄 Migração incompleta entre versões');
        console.log('   4. 🏗️ Separação de responsabilidades');
        
        if (whatsappTotalRecords === 0 && chatbotTotalRecords > 0) {
            console.log('\n🎯 CONCLUSÃO: Seus dados estão no CHATBOT.DB!');
            console.log('   ⚠️ Por isso você ainda consegue entrar mesmo com whatsapp.db vazio');
        } else if (whatsappTotalRecords > 0 && chatbotTotalRecords === 0) {
            console.log('\n🎯 CONCLUSÃO: Seus dados estão no WHATSAPP.DB!');
        } else if (whatsappTotalRecords > 0 && chatbotTotalRecords > 0) {
            console.log('\n🎯 CONCLUSÃO: Dados divididos entre os dois bancos!');
            console.log('   ⚠️ Sistema híbrido - talvez migração incompleta');
        } else {
            console.log('\n🎯 CONCLUSÃO: Ambos os bancos estão vazios!');
            console.log('   🤔 Dados podem estar em cache ou em outro local');
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await db.close();
    }
}

investigateDatabases().catch(console.error); 