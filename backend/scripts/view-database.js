#!/usr/bin/env node

// Script para visualizar dados do banco SQLite
const DatabaseManager = require('../src/database');
const { Op } = require('sequelize');

class DatabaseViewer {
    constructor() {
        this.db = new DatabaseManager();
    }

    async initialize() {
        const success = await this.db.initialize();
        if (!success) {
            console.error('❌ Erro ao conectar com banco de dados');
            process.exit(1);
        }
    }

    async showReport() {
        console.log('👥 ===== RELATÓRIO DE USUÁRIOS =====');
        
        const report = await this.db.getUserReport();
        if (report) {
            console.log(`📊 Total de Usuários: ${report.totalUsers}`);
            console.log(`💬 Total de Mensagens: ${report.totalMessages}`);
            console.log(`📈 Média de Mensagens por Usuário: ${report.avgMessagesPerUser}`);
            console.log(`🔥 Usuários Ativos (24h): ${report.activeUsers}`);
            
            if (report.topUsers.length > 0) {
                console.log('\n🏆 TOP 10 USUÁRIOS MAIS ATIVOS:');
                report.topUsers.forEach((user, index) => {
                    const lastContact = new Date(user.last_contact).toLocaleDateString('pt-BR');
                    console.log(`${index + 1}. ${user.name} (${user.phone.slice(-4)}): ${user.total_messages} msgs - Último: ${lastContact}`);
                });
            }
        }
        
        // Relatório de custos
        const totalCosts = await this.db.ApiCost.count();
        if (totalCosts > 0) {
            const costSum = await this.db.ApiCost.sum('cost_brl');
            const avgCost = await this.db.ApiCost.findOne({
                attributes: [
                    [this.db.sequelize.fn('AVG', this.db.sequelize.col('cost_brl')), 'avg_cost']
                ]
            });
            
            console.log('\n💰 ===== RELATÓRIO DE CUSTOS =====');
            console.log(`📊 Total de Requisições: ${totalCosts}`);
            console.log(`💵 Custo Total: R$ ${(costSum || 0).toFixed(4)}`);
            console.log(`📈 Custo Médio por Requisição: R$ ${(avgCost?.dataValues?.avg_cost || 0).toFixed(4)}`);
        }
        
        console.log('\n=====================================\n');
    }

    async searchUsers(query) {
        console.log(`🔍 Buscando por: "${query}"\n`);
        
        const users = await this.db.User.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${query}%` } },
                    { phone: { [Op.like]: `%${query}%` } }
                ]
            },
            order: [['total_messages', 'DESC']]
        });

        if (users.length === 0) {
            console.log('❌ Nenhum usuário encontrado');
        } else {
            console.log(`✅ ${users.length} usuário(s) encontrado(s):\n`);
            users.forEach((user, index) => {
                const lastContact = new Date(user.last_contact).toLocaleDateString('pt-BR');
                console.log(`${index + 1}. ${user.name} (${user.phone})`);
                console.log(`   📊 ${user.total_messages} mensagens - Último contato: ${lastContact}`);
                console.log(`   🎯 Stage: ${user.stage} - Sentimento: ${user.sentiment}`);
                if (user.observations) {
                    console.log(`   📝 Observações: ${user.observations}`);
                }
                console.log('');
            });
        }
    }

    async showUserHistory(phone) {
        console.log(`💬 HISTÓRICO DE CONVERSAS: ${phone}\n`);
        
        const user = await this.db.User.findOne({
            where: { phone },
            include: [{
                model: this.db.Message,
                as: 'messages',
                order: [['timestamp', 'ASC']],
                limit: 50
            }]
        });

        if (!user) {
            console.log(`❌ Usuário não encontrado: ${phone}`);
            return;
        }

        console.log(`👤 Nome: ${user.name}`);
        console.log(`📞 Telefone: ${user.phone}`);
        console.log(`📅 Primeiro contato: ${new Date(user.first_contact).toLocaleDateString('pt-BR')}`);
        console.log(`📅 Último contato: ${new Date(user.last_contact).toLocaleDateString('pt-BR')}`);
        console.log(`📊 Total de mensagens: ${user.total_messages}`);
        console.log(`🎯 Stage: ${user.stage} - Sentimento: ${user.sentiment}\n`);
        
        if (user.messages && user.messages.length > 0) {
            console.log('📝 ÚLTIMAS 50 MENSAGENS:');
            user.messages.forEach((msg, index) => {
                const sender = msg.is_bot ? '🤖 Maria Clara' : `👤 ${user.name}`;
                const msgDate = new Date(msg.timestamp).toLocaleDateString('pt-BR');
                const msgTime = new Date(msg.timestamp).toLocaleTimeString('pt-BR');
                console.log(`${index + 1}. [${msgDate} ${msgTime}] ${sender}:`);
                console.log(`   ${msg.content}\n`);
            });
        } else {
            console.log('📝 Nenhuma mensagem encontrada');
        }
    }

    async showCostAnalytics() {
        console.log('💰 ===== ANÁLISE DETALHADA DE CUSTOS =====\n');
        
        // Custos por dia (últimos 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const dailyCosts = await this.db.ApiCost.findAll({
            attributes: [
                [this.db.sequelize.fn('DATE', this.db.sequelize.col('timestamp')), 'date'],
                [this.db.sequelize.fn('COUNT', this.db.sequelize.col('id')), 'requests'],
                [this.db.sequelize.fn('SUM', this.db.sequelize.col('cost_brl')), 'total_cost'],
                [this.db.sequelize.fn('SUM', this.db.sequelize.col('total_tokens')), 'total_tokens']
            ],
            where: {
                timestamp: {
                    [Op.gte]: sevenDaysAgo
                }
            },
            group: [this.db.sequelize.fn('DATE', this.db.sequelize.col('timestamp'))],
            order: [[this.db.sequelize.fn('DATE', this.db.sequelize.col('timestamp')), 'DESC']]
        });

        if (dailyCosts.length > 0) {
            console.log('📅 CUSTOS DOS ÚLTIMOS 7 DIAS:');
            dailyCosts.forEach(day => {
                const date = new Date(day.dataValues.date).toLocaleDateString('pt-BR');
                const cost = parseFloat(day.dataValues.total_cost || 0);
                const requests = day.dataValues.requests;
                const tokens = day.dataValues.total_tokens;
                console.log(`${date}: R$ ${cost.toFixed(4)} (${requests} req, ${tokens} tokens)`);
            });
        }

        // Top usuários por custo
        const topCostUsers = await this.db.ApiCost.findAll({
            attributes: [
                'user_id',
                [this.db.sequelize.fn('COUNT', this.db.sequelize.col('api_costs.id')), 'requests'],
                [this.db.sequelize.fn('SUM', this.db.sequelize.col('cost_brl')), 'total_cost']
            ],
            include: [{
                model: this.db.User,
                as: 'user',
                attributes: ['name', 'phone']
            }],
            where: {
                user_id: { [Op.not]: null }
            },
            group: ['user_id'],
            order: [[this.db.sequelize.fn('SUM', this.db.sequelize.col('cost_brl')), 'DESC']],
            limit: 10
        });

        if (topCostUsers.length > 0) {
            console.log('\n💸 TOP 10 USUÁRIOS POR CUSTO:');
            topCostUsers.forEach((record, index) => {
                const cost = parseFloat(record.dataValues.total_cost || 0);
                const requests = record.dataValues.requests;
                const userName = record.user?.name || 'Usuário';
                console.log(`${index + 1}. ${userName}: R$ ${cost.toFixed(4)} (${requests} req)`);
            });
        }

        console.log('\n=====================================\n');
    }

    async exportData() {
        console.log('📁 Exportando dados do banco...\n');
        
        const timestamp = new Date().toISOString().split('T')[0];
        const fs = require('fs');
        
        // Exportar usuários
        const users = await this.db.User.findAll({
            include: [{
                model: this.db.Message,
                as: 'messages',
                order: [['timestamp', 'ASC']]
            }]
        });
        
        const exportData = {
            export_date: new Date().toISOString(),
            total_users: users.length,
            users: users.map(user => ({
                name: user.name,
                phone: user.phone,
                first_contact: user.first_contact,
                last_contact: user.last_contact,
                total_messages: user.total_messages,
                stage: user.stage,
                sentiment: user.sentiment,
                messages: user.messages.map(msg => ({
                    content: msg.content,
                    is_bot: msg.is_bot,
                    timestamp: msg.timestamp
                }))
            }))
        };
        
        const exportFile = `database-export-${timestamp}.json`;
        fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
        console.log(`✅ Dados exportados para: ${exportFile}`);
        
        // Exportar custos
        const costs = await this.db.ApiCost.findAll({
            order: [['timestamp', 'DESC']]
        });
        
        const costsFile = `costs-export-${timestamp}.json`;
        fs.writeFileSync(costsFile, JSON.stringify(costs, null, 2));
        console.log(`✅ Custos exportados para: ${costsFile}`);
    }

    async cleanOldData(days = 30) {
        console.log(`🧹 Limpando dados com mais de ${days} dias...\n`);
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        // Limpar mensagens antigas
        const deletedMessages = await this.db.Message.destroy({
            where: {
                timestamp: {
                    [Op.lt]: cutoffDate
                }
            }
        });
        
        // Limpar custos antigos
        const deletedCosts = await this.db.ApiCost.destroy({
            where: {
                timestamp: {
                    [Op.lt]: cutoffDate
                }
            }
        });
        
        console.log(`✅ ${deletedMessages} mensagens antigas removidas`);
        console.log(`✅ ${deletedCosts} registros de custo antigos removidos`);
    }

    async close() {
        await this.db.close();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const viewer = new DatabaseViewer();
    
    const command = process.argv[2];
    const parameter = process.argv[3];
    
    (async () => {
        await viewer.initialize();
        
        switch(command) {
            case 'report':
                await viewer.showReport();
                break;
                
            case 'search':
                if (!parameter) {
                    console.log('❌ Uso: node view-database.js search <nome_ou_telefone>');
                    break;
                }
                await viewer.searchUsers(parameter);
                break;
                
            case 'history':
                if (!parameter) {
                    console.log('❌ Uso: node view-database.js history <numero_telefone>');
                    break;
                }
                await viewer.showUserHistory(parameter);
                break;
                
            case 'costs':
                await viewer.showCostAnalytics();
                break;
                
            case 'export':
                await viewer.exportData();
                break;
                
            case 'clean':
                const days = parameter ? parseInt(parameter) : 30;
                await viewer.cleanOldData(days);
                break;
                
            default:
                // Exibe relatório por padrão
                await viewer.showReport();
                
                // Menu de opções
                console.log('📋 COMANDOS DISPONÍVEIS:');
                console.log('• node view-database.js report           - Relatório geral');
                console.log('• node view-database.js search <termo>   - Buscar usuários');
                console.log('• node view-database.js history <tel>    - Ver histórico completo');
                console.log('• node view-database.js costs            - Análise de custos');
                console.log('• node view-database.js export           - Exportar dados');
                console.log('• node view-database.js clean [dias]     - Limpar dados antigos');
                
                console.log('\n💡 EXEMPLOS:');
                console.log('• node view-database.js search maria');
                console.log('• node view-database.js history 5534988528');
                console.log('• node view-database.js clean 60');
                break;
        }
        
        await viewer.close();
    })();
}

module.exports = DatabaseViewer; 