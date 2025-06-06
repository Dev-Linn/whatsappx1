#!/usr/bin/env node

const Database = require('./api/database');
const { faker } = require('@faker-js/faker');
faker.locale = 'pt_BR';

async function populateTestData() {
    console.log('🔧 Iniciando população de dados de teste...');
    
    try {
        // Inicializar banco
        const apiDb = new Database();
        await apiDb.initialize();
        
        // Buscar o usuário teste
        const testUser = await apiDb.sequelize.query(
            'SELECT * FROM tenants WHERE email = ?',
            { replacements: ['testeusuario@gmail.com'], type: apiDb.sequelize.QueryTypes.SELECT }
        );
        
        if (!testUser || testUser.length === 0) {
            console.log('❌ Usuário testeusuario@gmail.com não encontrado!');
            console.log('Execute primeiro o registro do usuário no sistema.');
            return;
        }
        
        console.log('✅ Usuário encontrado:', testUser[0].company_name);
        const tenantId = testUser[0].id;
        
        // Verificar estrutura das tabelas
        console.log('🔍 Verificando estrutura das tabelas...');
        
        // Estrutura da tabela messages
        const messagesColumns = await apiDb.sequelize.query(
            "PRAGMA table_info(messages)",
            { type: apiDb.sequelize.QueryTypes.SELECT }
        );
        
        const hasPhoneColumn = messagesColumns.some(col => col.name === 'phone');
        console.log('📋 Tabela messages tem coluna phone:', hasPhoneColumn);
        
        // Limpar dados existentes
        console.log('🧹 Limpando dados existentes...');
        await apiDb.sequelize.query('DELETE FROM messages WHERE tenant_id = ?', { replacements: [tenantId] });
        await apiDb.sequelize.query('DELETE FROM users WHERE tenant_id = ?', { replacements: [tenantId] });
        await apiDb.sequelize.query('DELETE FROM conversations WHERE tenant_id = ?', { replacements: [tenantId] });
        
        // Criar usuários de teste
        console.log('👥 Criando usuários de teste...');
        const users = [];
        
        for (let i = 0; i < 50; i++) {
            const phone = `5511${faker.phone.number('9########').replace(/\D/g, '')}`;
            const user = {
                tenant_id: tenantId,
                phone: phone,
                name: faker.person.fullName(),
                first_contact: faker.date.between({ from: '2024-01-01', to: new Date() }),
                last_contact: faker.date.recent({ days: 30 }),
                total_messages: faker.number.int({ min: 1, max: 50 }),
                stage: faker.helpers.arrayElement(['lead_frio', 'interessado', 'negociando', 'cliente', 'perdido']),
                sentiment: faker.helpers.arrayElement(['positivo', 'neutro', 'negativo']),
                observations: faker.lorem.sentence({ min: 5, max: 15 }),
                last_analysis_at: faker.date.recent({ days: 7 }),
                messages_since_analysis: faker.number.int({ min: 0, max: 5 }),
                is_active: faker.helpers.arrayElement([true, true, true, false]),
                followup_enabled: faker.helpers.arrayElement([true, false]),
                followup_interval_hours: faker.helpers.arrayElement([24, 48, 72]),
                followup_count: faker.number.int({ min: 0, max: 3 })
            };
            
            // Inserir usuário
            await apiDb.sequelize.query(`
                INSERT INTO users (
                    tenant_id, phone, name, first_contact, last_contact, total_messages,
                    stage, sentiment, observations, last_analysis_at, messages_since_analysis,
                    is_active, followup_enabled, followup_interval_hours, followup_count,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, {
                replacements: [
                    user.tenant_id, user.phone, user.name, user.first_contact, user.last_contact,
                    user.total_messages, user.stage, user.sentiment, user.observations,
                    user.last_analysis_at, user.messages_since_analysis, user.is_active,
                    user.followup_enabled, user.followup_interval_hours, user.followup_count
                ]
            });
            
            users.push(user);
        }
        
        console.log(`✅ ${users.length} usuários criados!`);
        
        // Buscar os IDs dos usuários criados
        const createdUsers = await apiDb.sequelize.query(
            'SELECT id, phone, name FROM users WHERE tenant_id = ? ORDER BY id DESC LIMIT ?',
            { replacements: [tenantId, users.length], type: apiDb.sequelize.QueryTypes.SELECT }
        );
        
        // Criar mensagens de teste
        console.log('💬 Criando mensagens de teste...');
        const messageTemplates = [
            'Oi! Tenho interesse nas receitas de pudim',
            'Quanto custa o curso completo?',
            'Vocês têm desconto para pagamento à vista?',
            'Quando começam as próximas turmas?',
            'Já fiz outros cursos, esse é diferente?',
            'Posso pagar em parcelas?',
            'Qual é o prazo de acesso ao material?',
            'Tem certificado?',
            'Como funciona o suporte?',
            'Posso tirar dúvidas durante o curso?',
            'Obrigado pelas informações!',
            'Vou pensar e te respondo',
            'Pode me mandar mais detalhes?',
            'Fiquei interessado, como faço para comprar?',
            'Esse preço é promocional?'
        ];
        
        const botResponses = [
            'Olá! Que bom ter você aqui! 😊',
            'Nossas receitas são exclusivas e testadas!',
            'Temos uma promoção especial esta semana!',
            'O curso completo custa R$ 297,00',
            'Sim, temos desconto de 10% à vista!',
            'As turmas abrem toda segunda-feira',
            'Você terá acesso vitalício ao material',
            'Sim, emitimos certificado de conclusão',
            'Nosso suporte é 24/7 via WhatsApp',
            'Claro! Estou aqui para ajudar',
            'Fico no aguardo da sua decisão!',
            'Vou te enviar tudo por e-mail',
            'É só clicar no link de pagamento',
            'Sim, promoção válida até domingo!'
        ];
        
        let messageCount = 0;
        
        for (const user of createdUsers) {
            const numMessages = faker.number.int({ min: 2, max: 20 });
            
            for (let i = 0; i < numMessages; i++) {
                const isBot = i % 2 === 1;
                const content = isBot 
                    ? faker.helpers.arrayElement(botResponses)
                    : faker.helpers.arrayElement(messageTemplates);
                
                const timestamp = faker.date.between({ 
                    from: user.first_contact || '2024-01-01', 
                    to: new Date() 
                });
                
                // Query diferente dependendo se tem coluna phone
                if (hasPhoneColumn) {
                    await apiDb.sequelize.query(`
                        INSERT INTO messages (
                            tenant_id, user_id, phone, content, is_bot, timestamp,
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    `, {
                        replacements: [tenantId, user.id, user.phone, content, isBot, timestamp]
                    });
                } else {
                    await apiDb.sequelize.query(`
                        INSERT INTO messages (
                            tenant_id, user_id, content, is_bot, timestamp,
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    `, {
                        replacements: [tenantId, user.id, content, isBot, timestamp]
                    });
                }
                
                messageCount++;
            }
        }
        
        console.log(`✅ ${messageCount} mensagens criadas!`);
        
        // Criar conversas
        console.log('💭 Criando conversas...');
        for (let i = 0; i < Math.min(30, createdUsers.length); i++) {
            const user = createdUsers[i];
            const sessionId = `session_${user.id}_${Date.now()}_${i}`;
            const date = faker.date.recent({ days: 30 }).toISOString().split('T')[0];
            const messageCount = faker.number.int({ min: 2, max: 15 });
            
            await apiDb.sequelize.query(`
                INSERT INTO conversations (
                    tenant_id, user_id, session_id, date, message_count,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, {
                replacements: [tenantId, user.id, sessionId, date, messageCount]
            });
        }
        
        console.log('✅ 30 conversas criadas!');
        
        // Estatísticas finais
        const userCount = await apiDb.sequelize.query(
            'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?', 
            { replacements: [tenantId], type: apiDb.sequelize.QueryTypes.SELECT }
        );
        
        const messageCountFinal = await apiDb.sequelize.query(
            'SELECT COUNT(*) as count FROM messages WHERE tenant_id = ?', 
            { replacements: [tenantId], type: apiDb.sequelize.QueryTypes.SELECT }
        );
        
        const conversationCount = await apiDb.sequelize.query(
            'SELECT COUNT(*) as count FROM conversations WHERE tenant_id = ?', 
            { replacements: [tenantId], type: apiDb.sequelize.QueryTypes.SELECT }
        );
        
        console.log('\n🎉 Dados de teste criados com sucesso!');
        console.log(`📊 Estatísticas do tenant ${testUser[0].company_name}:`);
        console.log(`   👥 Usuários: ${userCount[0].count}`);
        console.log(`   💬 Mensagens: ${messageCountFinal[0].count}`);
        console.log(`   💭 Conversas: ${conversationCount[0].count}`);
        console.log('\nDashboard deve estar bem populado agora! 🚀');
        
    } catch (error) {
        console.error('❌ Erro ao popular dados:', error);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    populateTestData()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Erro:', error);
            process.exit(1);
        });
}

module.exports = populateTestData; 