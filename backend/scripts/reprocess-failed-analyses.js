#!/usr/bin/env node

// Script para reprocessar análises com falha
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DatabaseManager = require('../src/database');
const SentimentAnalyzer = require('../src/sentiment-analyzer');

class FailedAnalysisReprocessor {
    constructor() {
        this.db = new DatabaseManager();
        this.analyzer = new SentimentAnalyzer(process.env.GEMINI_API_KEY);
    }

    async initialize() {
        console.log('🔄 Inicializando sistema...');
        await this.db.initialize();
        console.log('✅ Conectado ao banco de dados');
    }

    async findFailedAnalyses() {
        console.log('🔍 Buscando usuários com falha na análise...');
        
        const { Sequelize } = require('sequelize');
        const failedUsers = await this.db.User.findAll({
            where: {
                observations: {
                    [Sequelize.Op.like]: '%Erro na análise automática%'
                }
            },
            include: [{
                model: this.db.Message,
                as: 'messages',
                order: [['timestamp', 'DESC']],
                limit: 20
            }]
        });

        console.log(`📊 Encontrados ${failedUsers.length} usuário(s) com análise falhada`);
        return failedUsers;
    }

    async reprocessUser(user) {
        console.log(`\n🧠 Reprocessando análise de: ${user.name} (ID: ${user.id})`);
        
        if (user.messages.length === 0) {
            console.log('⚠️ Usuário sem mensagens, pulando...');
            return { status: 'skipped', reason: 'Sem mensagens' };
        }

        try {
            // Reverter ordem das mensagens para cronológica
            const messagesReversed = user.messages.reverse();
            
            // Executar análise
            const analysis = await this.analyzer.analyzeConversation(messagesReversed, user.name);
            
            // Verificar se a análise foi bem-sucedida (não contém erro)
            if (analysis.observations && analysis.observations.includes('Erro na análise automática')) {
                console.log('❌ Análise retornou erro, não atualizando banco');
                return { status: 'error', reason: 'API retornou erro de quota' };
            }
            
            // Atualizar banco
            await user.update({
                sentiment: analysis.sentiment,
                observations: analysis.observations,
                stage: analysis.stage,
                last_analysis_at: new Date(),
                messages_since_analysis: 0
            });

            console.log(`✅ Análise concluída:`);
            console.log(`   📊 Sentimento: ${analysis.sentiment}`);
            console.log(`   🎯 Stage: ${analysis.stage}`);
            console.log(`   📝 Observações: ${analysis.observations}`);
            
            return { status: 'success', analysis };
            
        } catch (error) {
            console.error(`❌ Erro ao processar ${user.name}:`, error.message);
            
            // Detectar erro de quota especificamente
            if (error.message.includes('429') || error.message.includes('quota')) {
                return { status: 'quota_exceeded', reason: 'Quota da API excedida' };
            }
            
            return { status: 'error', reason: error.message };
        }
    }

    async reprocessAll() {
        const failedUsers = await this.findFailedAnalyses();
        
        if (failedUsers.length === 0) {
            console.log('🎉 Nenhum usuário com falha na análise encontrado!');
            return;
        }

        console.log(`\n🚀 Iniciando reprocessamento de ${failedUsers.length} usuário(s)...\n`);
        
        let processedCount = 0;
        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        let quotaExceededCount = 0;

        for (const user of failedUsers) {
            processedCount++;
            
            console.log(`\n[${processedCount}/${failedUsers.length}] Processando: ${user.name}`);
            
            const result = await this.reprocessUser(user);
            
            switch (result.status) {
                case 'success':
                    successCount++;
                    break;
                case 'skipped':
                    skippedCount++;
                    break;
                case 'quota_exceeded':
                    quotaExceededCount++;
                    console.log('⚠️ Quota da API excedida, parando processamento...');
                    // Para o processamento se quota excedida
                    processedCount = failedUsers.length; // Para sair do loop
                    break;
                case 'error':
                    errorCount++;
                    break;
            }

            // Se quota foi excedida, para o processamento
            if (result.status === 'quota_exceeded') {
                break;
            }

            // Delay entre processamentos para não sobrecarregar a API
            if (processedCount < failedUsers.length) {
                console.log('⏳ Aguardando 3 segundos...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.log(`\n📊 ===== RELATÓRIO FINAL =====`);
        console.log(`📈 Total processado: ${processedCount}`);
        console.log(`✅ Sucessos: ${successCount}`);
        console.log(`⚠️ Pulados: ${skippedCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        if (quotaExceededCount > 0) {
            console.log(`🚫 Quota excedida: ${quotaExceededCount}`);
            console.log(`⏰ Tente novamente em algumas horas quando a quota resetar`);
        }
        
        const totalAttempted = successCount + errorCount + quotaExceededCount;
        if (totalAttempted > 0) {
            console.log(`🎯 Taxa de sucesso: ${((successCount / totalAttempted) * 100).toFixed(1)}%`);
        }
    }

    async close() {
        await this.db.close();
        console.log('🔌 Conexão fechada');
    }
}

// Função principal
async function main() {
    const reprocessor = new FailedAnalysisReprocessor();
    
    try {
        await reprocessor.initialize();
        await reprocessor.reprocessAll();
    } catch (error) {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    } finally {
        await reprocessor.close();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    console.log('🤖 ===== REPROCESSADOR DE ANÁLISES =====');
    console.log('🎯 Reprocessando análises com falha...\n');
    
    main().then(() => {
        console.log('\n🎉 Processamento concluído!');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = FailedAnalysisReprocessor; 