#!/usr/bin/env node

// Script de Migração: JSON → SQLite
const fs = require('fs');
const path = require('path');
const DatabaseManager = require('../src/database');

class DataMigrator {
    constructor() {
        this.db = new DatabaseManager();
        this.conversationMemoryFile = path.join(__dirname, '../data/conversation-memory.json');
        this.geminiCostsFile = path.join(__dirname, '../data/gemini-costs.json');
    }

    async migrate() {
        console.log('🚀 Iniciando migração de dados...\n');

        try {
            // Inicializar banco de dados
            console.log('📊 Inicializando banco de dados...');
            const dbInitialized = await this.db.initialize();
            if (!dbInitialized) {
                throw new Error('Falha ao inicializar banco de dados');
            }

            // Migrar dados de conversas
            await this.migrateConversations();

            // Migrar dados de custos
            await this.migrateCosts();

            console.log('\n✅ Migração concluída com sucesso!');
            console.log('📊 Executando relatório pós-migração...\n');

            // Gerar relatório
            await this.generateReport();

        } catch (error) {
            console.error('❌ Erro durante migração:', error);
        } finally {
            await this.db.close();
        }
    }

    async migrateConversations() {
        console.log('💬 Migrando conversas...');

        if (!fs.existsSync(this.conversationMemoryFile)) {
            console.log('⚠️ Arquivo conversation-memory.json não encontrado, pulando...');
            return;
        }

        try {
            const data = JSON.parse(fs.readFileSync(this.conversationMemoryFile, 'utf8'));
            
            if (!data.conversations) {
                console.log('⚠️ Nenhuma conversa encontrada no arquivo JSON');
                return;
            }

            let userCount = 0;
            let messageCount = 0;

            for (const [phone, userData] of Object.entries(data.conversations)) {
                try {
                    // Criar usuário
                    const user = await this.db.findOrCreateUser(phone, userData.userName);
                    if (!user) continue;

                    userCount++;

                    // Atualizar dados do usuário
                    await user.update({
                        first_contact: new Date(userData.firstContact),
                        last_contact: new Date(userData.lastContact),
                        total_messages: userData.messageCount || 0
                    });

                    // Criar conversa para as mensagens
                    const conversation = await this.db.createConversation(user.id);
                    if (!conversation) continue;

                    // Migrar mensagens
                    if (userData.messages && Array.isArray(userData.messages)) {
                        for (const msg of userData.messages) {
                            try {
                                await this.db.saveMessage(
                                    user.id,
                                    conversation.id,
                                    msg.message,
                                    msg.isFromBot
                                );
                                messageCount++;
                            } catch (msgError) {
                                console.error(`❌ Erro ao migrar mensagem: ${msgError.message}`);
                            }
                        }
                    }

                    console.log(`✅ Usuário migrado: ${userData.userName} (${userData.messageCount || 0} mensagens)`);

                } catch (userError) {
                    console.error(`❌ Erro ao migrar usuário ${phone}:`, userError.message);
                }
            }

            console.log(`📊 Conversas migradas: ${userCount} usuários, ${messageCount} mensagens`);

        } catch (error) {
            console.error('❌ Erro ao ler arquivo de conversas:', error);
        }
    }

    async migrateCosts() {
        console.log('💰 Migrando custos da API...');

        if (!fs.existsSync(this.geminiCostsFile)) {
            console.log('⚠️ Arquivo gemini-costs.json não encontrado, pulando...');
            return;
        }

        try {
            const data = JSON.parse(fs.readFileSync(this.geminiCostsFile, 'utf8'));
            
            if (!data.requests || !Array.isArray(data.requests)) {
                console.log('⚠️ Nenhum custo encontrado no arquivo JSON');
                return;
            }

            let costCount = 0;

            for (const request of data.requests) {
                try {
                    await this.db.logApiCost(
                        null, // user_id (não temos essa relação no sistema antigo)
                        null, // message_id
                        request.inputTokens || 0,
                        request.outputTokens || 0,
                        request.costUSD || 0,
                        request.costBRL || 0
                    );
                    costCount++;
                } catch (costError) {
                    console.error(`❌ Erro ao migrar custo: ${costError.message}`);
                }
            }

            console.log(`📊 Custos migrados: ${costCount} registros`);

        } catch (error) {
            console.error('❌ Erro ao ler arquivo de custos:', error);
        }
    }

    async generateReport() {
        try {
            const report = await this.db.getUserReport();
            
            if (report) {
                console.log('👥 ===== RELATÓRIO PÓS-MIGRAÇÃO =====');
                console.log(`📊 Total de Usuários: ${report.totalUsers}`);
                console.log(`💬 Total de Mensagens: ${report.totalMessages}`);
                console.log(`📈 Média de Mensagens por Usuário: ${report.avgMessagesPerUser}`);
                console.log(`🔥 Usuários Ativos (24h): ${report.activeUsers}`);
                
                if (report.topUsers.length > 0) {
                    console.log('\n🏆 TOP 5 USUÁRIOS MAIS ATIVOS:');
                    report.topUsers.slice(0, 5).forEach((user, index) => {
                        const lastContact = new Date(user.last_contact).toLocaleDateString('pt-BR');
                        console.log(`${index + 1}. ${user.name} (${user.phone.slice(-4)}): ${user.total_messages} msgs - Último: ${lastContact}`);
                    });
                }
                
                console.log('\n=====================================');
            }

            // Verificar custos
            const totalCosts = await this.db.ApiCost.count();
            if (totalCosts > 0) {
                const costSum = await this.db.ApiCost.sum('cost_brl');
                console.log(`💰 Total de Custos Migrados: ${totalCosts} registros`);
                console.log(`💵 Custo Total: R$ ${(costSum || 0).toFixed(4)}`);
            }

        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
        }
    }

    async createBackup() {
        console.log('📁 Criando backup dos arquivos JSON...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        if (fs.existsSync(this.conversationMemoryFile)) {
            const backupConversations = `conversation-memory-backup-${timestamp}.json`;
            fs.copyFileSync(this.conversationMemoryFile, backupConversations);
            console.log(`✅ Backup criado: ${backupConversations}`);
        }
        
        if (fs.existsSync(this.geminiCostsFile)) {
            const backupCosts = `gemini-costs-backup-${timestamp}.json`;
            fs.copyFileSync(this.geminiCostsFile, backupCosts);
            console.log(`✅ Backup criado: ${backupCosts}`);
        }
    }
}

// Executar migração se chamado diretamente
if (require.main === module) {
    const migrator = new DataMigrator();
    
    console.log('🔄 WhatsApp Chatbot - Migração para Banco de Dados');
    console.log('==================================================\n');
    
    // Perguntar se quer fazer backup
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Deseja criar backup dos arquivos JSON antes da migração? (s/N): ', async (answer) => {
        if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') {
            await migrator.createBackup();
            console.log('');
        }
        
        rl.close();
        await migrator.migrate();
    });
}

module.exports = DataMigrator; 