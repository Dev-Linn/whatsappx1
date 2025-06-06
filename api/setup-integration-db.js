const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuração do banco de dados
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '../backend/data/whatsapp.db');

console.log('🚀 Configurando tabelas de integração WhatsApp + Analytics...');
console.log('📍 Banco de dados:', DB_PATH);

async function setupIntegrationTables() {
    return new Promise((resolve, reject) => {
        // Conectar ao banco
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Erro ao conectar ao banco:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Conectado ao banco SQLite');
        });

        // Ler arquivo SQL
        const sqlFile = path.join(__dirname, 'create-integration-tables.sql');
        
        if (!fs.existsSync(sqlFile)) {
            console.error('❌ Arquivo SQL não encontrado:', sqlFile);
            reject(new Error('Arquivo SQL não encontrado'));
            return;
        }
        
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        // Dividir o conteúdo em comandos individuais
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

        console.log(`📊 Executando ${commands.length} comandos SQL...`);

        let completed = 0;
        let hasErrors = false;

        // Executar cada comando
        commands.forEach((command, index) => {
            db.run(command, (err) => {
                completed++;
                
                if (err) {
                    console.error(`❌ Erro no comando ${index + 1}:`, err.message);
                    console.error(`   Comando: ${command.substring(0, 100)}...`);
                    hasErrors = true;
                } else {
                    // Identificar tipo de comando para log mais específico
                    if (command.includes('CREATE TABLE')) {
                        const tableName = command.match(/CREATE TABLE.*?(\w+)/)?.[1];
                        console.log(`📋 Tabela criada: ${tableName}`);
                    } else if (command.includes('CREATE VIEW')) {
                        const viewName = command.match(/CREATE VIEW.*?(\w+)/)?.[1];
                        console.log(`👁️  View criada: ${viewName}`);
                    } else if (command.includes('CREATE TRIGGER')) {
                        const triggerName = command.match(/CREATE TRIGGER.*?(\w+)/)?.[1];
                        console.log(`⚡ Trigger criado: ${triggerName}`);
                    } else if (command.includes('INSERT')) {
                        console.log(`📝 Dados iniciais inseridos`);
                    }
                }

                // Verificar se todos os comandos foram executados
                if (completed === commands.length) {
                    db.close((err) => {
                        if (err) {
                            console.error('❌ Erro ao fechar banco:', err.message);
                            reject(err);
                        } else {
                            console.log('✅ Banco fechado com sucesso');
                            
                            if (hasErrors) {
                                console.log('⚠️  Setup completado com alguns erros');
                                reject(new Error('Alguns comandos falharam'));
                            } else {
                                console.log('🎉 Setup de integração completado com sucesso!');
                                resolve();
                            }
                        }
                    });
                }
            });
        });
    });
}

// Função para verificar tabelas criadas
async function verifyTables() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH);
        
        const expectedTables = [
            'whatsapp_analytics_integration',
            'whatsapp_tracking_links', 
            'whatsapp_click_tracking',
            'whatsapp_conversions',
            'whatsapp_analytics_daily'
        ];

        console.log('\n🔍 Verificando tabelas criadas...');
        
        db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name LIKE 'whatsapp_%'
            ORDER BY name
        `, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            const createdTables = rows.map(row => row.name);
            
            console.log('📋 Tabelas encontradas:');
            createdTables.forEach(table => {
                console.log(`   ✅ ${table}`);
            });

            const missingTables = expectedTables.filter(table => !createdTables.includes(table));
            
            if (missingTables.length > 0) {
                console.log('\n❌ Tabelas não encontradas:');
                missingTables.forEach(table => {
                    console.log(`   ❌ ${table}`);
                });
            }

            // Verificar views
            db.all(`
                SELECT name FROM sqlite_master 
                WHERE type='view' AND name LIKE 'vw_whatsapp_%'
                ORDER BY name
            `, (err, viewRows) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (viewRows.length > 0) {
                    console.log('\n👁️  Views criadas:');
                    viewRows.forEach(view => {
                        console.log(`   ✅ ${view.name}`);
                    });
                }

                db.close();
                resolve({
                    tablesCreated: createdTables.length,
                    viewsCreated: viewRows.length,
                    missingTables: missingTables.length === 0
                });
            });
        });
    });
}

// Função principal
async function main() {
    try {
        // Verificar se arquivo SQL existe
        const sqlFile = path.join(__dirname, 'create-integration-tables.sql');
        if (!fs.existsSync(sqlFile)) {
            throw new Error(`Arquivo SQL não encontrado: ${sqlFile}`);
        }

        // Configurar tabelas
        await setupIntegrationTables();
        
        // Verificar resultado
        const verification = await verifyTables();
        
        console.log('\n📊 Resumo do Setup:');
        console.log(`   📋 Tabelas criadas: ${verification.tablesCreated}`);
        console.log(`   👁️  Views criadas: ${verification.viewsCreated}`);
        console.log(`   ✅ Status: ${verification.missingTables ? 'SUCESSO' : 'INCOMPLETO'}`);
        
        if (verification.missingTables) {
            console.log('\n🎯 Próximos passos:');
            console.log('   1. Execute a API para testar os novos endpoints');
            console.log('   2. Configure a integração via interface web');
            console.log('   3. Teste a geração de links rastreados');
            console.log('   4. Monitore as métricas no dashboard');
        }
        
        process.exit(verification.missingTables ? 0 : 1);
        
    } catch (error) {
        console.error('\n💥 Erro durante setup:', error.message);
        process.exit(1);
    }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { setupIntegrationTables, verifyTables }; 