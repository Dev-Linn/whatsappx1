#!/usr/bin/env node

// Script para migrar banco de dados existente
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Configuração do SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'data/chatbot.db'),
    logging: console.log, // Mostrar SQL para debug
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});

async function migrateDatabase() {
    try {
        console.log('🔄 Iniciando migração do banco de dados...\n');
        
        await sequelize.authenticate();
        console.log('✅ Conexão com banco estabelecida!');
        
        // Verificar se as colunas já existem
        const [results] = await sequelize.query("PRAGMA table_info(users);");
        const existingColumns = results.map(col => col.name);
        
        console.log('📋 Colunas existentes na tabela users:', existingColumns);
        
        // Lista de colunas que precisamos adicionar
        const newColumns = [
            {
                name: 'sentiment',
                sql: "ALTER TABLE users ADD COLUMN sentiment TEXT DEFAULT 'neutro' CHECK (sentiment IN ('positivo', 'neutro', 'negativo'))"
            },
            {
                name: 'observations',
                sql: "ALTER TABLE users ADD COLUMN observations TEXT"
            },
            {
                name: 'last_analysis_at',
                sql: "ALTER TABLE users ADD COLUMN last_analysis_at DATETIME"
            },
            {
                name: 'messages_since_analysis',
                sql: "ALTER TABLE users ADD COLUMN messages_since_analysis INTEGER DEFAULT 0"
            }
        ];
        
        console.log('\n🔧 Verificando colunas que precisam ser adicionadas...');
        
        for (const column of newColumns) {
            if (!existingColumns.includes(column.name)) {
                console.log(`➕ Adicionando coluna: ${column.name}`);
                try {
                    await sequelize.query(column.sql);
                    console.log(`✅ Coluna ${column.name} adicionada com sucesso!`);
                } catch (error) {
                    console.error(`❌ Erro ao adicionar coluna ${column.name}:`, error.message);
                }
            } else {
                console.log(`⏭️ Coluna ${column.name} já existe, pulando...`);
            }
        }
        
        // Verificar se a coluna stage existe e tem os valores corretos
        if (existingColumns.includes('stage')) {
            console.log('\n🔧 Verificando valores da coluna stage...');
            
            // Atualizar usuários sem stage definido
            const [updatedStage] = await sequelize.query(`
                UPDATE users 
                SET stage = 'lead_frio' 
                WHERE stage IS NULL OR stage = ''
            `);
            
            if (updatedStage.changes > 0) {
                console.log(`✅ ${updatedStage.changes} usuários tiveram o stage atualizado para 'lead_frio'`);
            }
        }
        
        // Atualizar usuários sem sentiment definido
        const [updatedSentiment] = await sequelize.query(`
            UPDATE users 
            SET sentiment = 'neutro' 
            WHERE sentiment IS NULL OR sentiment = ''
        `);
        
        if (updatedSentiment.changes > 0) {
            console.log(`✅ ${updatedSentiment.changes} usuários tiveram o sentiment atualizado para 'neutro'`);
        }
        
        // Verificar estrutura final
        console.log('\n📋 Verificando estrutura final da tabela...');
        const [finalResults] = await sequelize.query("PRAGMA table_info(users);");
        
        console.log('\n📊 ESTRUTURA FINAL DA TABELA USERS:');
        finalResults.forEach(col => {
            console.log(`• ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - Default: ${col.dflt_value || 'NULL'}`);
        });
        
        // Testar uma consulta com os novos campos
        console.log('\n🧪 Testando consulta com novos campos...');
        const [testResults] = await sequelize.query(`
            SELECT id, name, phone, stage, sentiment, observations, last_analysis_at, messages_since_analysis 
            FROM users 
            LIMIT 3
        `);
        
        if (testResults.length > 0) {
            console.log('✅ Teste de consulta bem-sucedido!');
            console.log('📋 Primeiros registros:');
            testResults.forEach((user, index) => {
                console.log(`${index + 1}. ${user.name} - Stage: ${user.stage} - Sentiment: ${user.sentiment}`);
            });
        } else {
            console.log('ℹ️ Nenhum usuário encontrado no banco (banco vazio)');
        }
        
        // Adicionar colunas de áudio na tabela messages se não existirem
        const queryInterface = sequelize.getQueryInterface();
        
        try {
            // Verificar se as colunas já existem
            const tableDescription = await queryInterface.describeTable('messages');
            
            if (!tableDescription.is_audio) {
                await queryInterface.addColumn('messages', 'is_audio', {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false,
                    comment: 'Indica se a mensagem é um áudio'
                });
                console.log('✅ Coluna is_audio adicionada!');
            } else {
                console.log('ℹ️ Coluna is_audio já existe');
            }
            
            if (!tableDescription.audio_path) {
                await queryInterface.addColumn('messages', 'audio_path', {
                    type: DataTypes.STRING(500),
                    allowNull: true,
                    comment: 'Caminho do arquivo de áudio'
                });
                console.log('✅ Coluna audio_path adicionada!');
            } else {
                console.log('ℹ️ Coluna audio_path já existe');
            }
            
            if (!tableDescription.audio_duration) {
                await queryInterface.addColumn('messages', 'audio_duration', {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    comment: 'Duração do áudio em segundos'
                });
                console.log('✅ Coluna audio_duration adicionada!');
            } else {
                console.log('ℹ️ Coluna audio_duration já existe');
            }
            
            console.log('🎉 Migração concluída com sucesso!');
            console.log('📝 O sistema agora suporta mensagens de áudio.');
            
        } catch (error) {
            console.error('❌ Erro durante a migração:', error);
        }
        
    } catch (error) {
        console.error('❌ Erro durante a migração:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('🔌 Conexão fechada');
    }
}

// Executar migração
if (require.main === module) {
    migrateDatabase();
}

module.exports = migrateDatabase; 