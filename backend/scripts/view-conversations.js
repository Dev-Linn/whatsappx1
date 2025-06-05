#!/usr/bin/env node

// Script para visualizar conversas armazenadas
const DatabaseManager = require('../src/database');

const db = new DatabaseManager();

console.log('🧠 Carregando dados de conversas...\n');

async function initialize() {
    const success = await db.initialize();
    if (!success) {
        console.error('❌ Erro ao conectar com banco de dados');
        process.exit(1);
    }
}

async function generateReport() {
    const report = await db.getUserReport();
    if (report) {
        console.log('👥 ===== RELATÓRIO DE USUÁRIOS =====');
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
        console.log('\n=====================================\n');
    }
}

async function searchUsers(query) {
    const { Op } = require('sequelize');
    console.log(`🔍 Buscando por: "${query}"\n`);
    
    const users = await db.User.findAll({
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
            console.log(`   📊 ${user.total_messages} mensagens - Último contato: ${lastContact}\n`);
        });
    }
}

async function showUserHistory(phone) {
    const user = await db.User.findOne({
        where: { phone },
        include: [{
            model: db.Message,
            as: 'messages',
            order: [['timestamp', 'ASC']],
            limit: 50
        }]
    });

    if (!user) {
        console.log(`❌ Nenhuma conversa encontrada para: ${phone}`);
        return;
    }

    console.log(`💬 HISTÓRICO DE CONVERSAS: ${user.name}\n`);
    console.log(`📞 Telefone: ${phone}`);
    console.log(`📅 Primeiro contato: ${new Date(user.first_contact).toLocaleDateString('pt-BR')}`);
    console.log(`📅 Último contato: ${new Date(user.last_contact).toLocaleDateString('pt-BR')}`);
    console.log(`📊 Total de mensagens: ${user.total_messages}\n`);
    
    if (user.messages && user.messages.length > 0) {
        console.log('📝 MENSAGENS:');
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

async function exportConversations() {
    console.log('📁 Exportando dados de conversas...\n');
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fs = require('fs');
    
    const users = await db.User.findAll({
        include: [{
            model: db.Message,
            as: 'messages',
            order: [['timestamp', 'ASC']]
        }]
    });
    
    const exportData = {
        export_date: new Date().toISOString(),
        total_users: users.length,
        conversations: users.reduce((acc, user) => {
            acc[user.phone] = {
                userName: user.name,
                firstContact: user.first_contact,
                lastContact: user.last_contact,
                messageCount: user.total_messages,
                messages: user.messages.map(msg => ({
                    timestamp: msg.timestamp,
                    date: new Date(msg.timestamp).toLocaleDateString('pt-BR'),
                    time: new Date(msg.timestamp).toLocaleTimeString('pt-BR'),
                    message: msg.content,
                    isFromBot: msg.is_bot,
                    messageLength: msg.content.length
                }))
            };
            return acc;
        }, {})
    };
    
    const exportFile = `conversations-export-${timestamp}.json`;
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`✅ Conversas exportadas para: ${exportFile}`);
}

async function cleanOldConversations(days = 30) {
    console.log(`🧹 Limpando conversas com mais de ${days} dias...\n`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Contar usuários antigos
    const oldUsersCount = await db.User.count({
        where: {
            last_contact: {
                [db.sequelize.Op.lt]: cutoffDate
            }
        }
    });
    
    if (oldUsersCount > 0) {
        // Remover mensagens primeiro
        await db.Message.destroy({
            include: [{
                model: db.User,
                as: 'user',
                where: {
                    last_contact: {
                        [db.sequelize.Op.lt]: cutoffDate
                    }
                }
            }]
        });
        
        // Remover usuários antigos
        const removedCount = await db.User.destroy({
            where: {
                last_contact: {
                    [db.sequelize.Op.lt]: cutoffDate
                }
            }
        });
        
        console.log(`🧹 ${removedCount} conversas antigas removidas (mais de ${days} dias)`);
    } else {
        console.log('✅ Nenhuma conversa antiga encontrada para remoção');
    }
}

async function resetConversations() {
    console.log('⚠️ AVISO: Esta operação removerá TODAS as conversas!');
    console.log('Digite "CONFIRMAR" para continuar:');
    
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('> ', async (answer) => {
        if (answer === 'CONFIRMAR') {
            await db.Message.destroy({ where: {}, truncate: true });
            await db.User.destroy({ where: {}, truncate: true });
            console.log('✅ Todas as conversas foram removidas!');
        } else {
            console.log('❌ Operação cancelada');
        }
        rl.close();
        await db.close();
    });
}

async function main() {
    await initialize();
    
    // Processa argumentos da linha de comando
    const command = process.argv[2];
    const parameter = process.argv[3];

    try {
        switch(command) {
            case 'report':
                await generateReport();
                break;
                
            case 'search':
                if (!parameter) {
                    console.log('❌ Uso: node view-conversations.js search <nome_ou_telefone>');
                    break;
                }
                await searchUsers(parameter);
                break;
                
            case 'history':
                if (!parameter) {
                    console.log('❌ Uso: node view-conversations.js history <numero_telefone>');
                    break;
                }
                await showUserHistory(parameter);
                break;
                
            case 'export':
                await exportConversations();
                break;
                
            case 'clean':
                const days = parameter ? parseInt(parameter) : 30;
                await cleanOldConversations(days);
                break;
                
            case 'reset':
                await resetConversations();
                return; // Não fecha o DB aqui pois o reset já faz isso
                
            default:
                // Exibe relatório por padrão
                await generateReport();
                
                // Menu de opções
                console.log('📋 COMANDOS DISPONÍVEIS:');
                console.log('• node view-conversations.js report           - Relatório de usuários');
                console.log('• node view-conversations.js search <termo>   - Buscar usuários');
                console.log('• node view-conversations.js history <tel>    - Ver histórico completo');
                console.log('• node view-conversations.js export           - Exportar dados');
                console.log('• node view-conversations.js clean [dias]     - Limpar conversas antigas');
                console.log('• node view-conversations.js reset            - Resetar memória (cuidado!)');
                
                console.log('\n💡 EXEMPLOS:');
                console.log('• node view-conversations.js search maria');
                console.log('• node view-conversations.js history 5534988528');
                console.log('• node view-conversations.js clean 60');
                break;
        }
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await db.close();
    }
}

main().catch(console.error); 