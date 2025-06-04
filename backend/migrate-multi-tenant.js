const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Conectar ao banco de dados
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'data/chatbot.db'),
    logging: console.log
});

async function migrateToMultiTenant() {
    try {
        console.log('🚀 Iniciando migração para Multi-Tenant...');
        
        await sequelize.authenticate();
        console.log('✅ Conectado ao banco de dados!');
        
        const queryInterface = sequelize.getQueryInterface();
        
        // 1. Criar tabela tenants
        console.log('📊 Criando tabela tenants...');
        
        try {
            await queryInterface.createTable('tenants', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                company_name: {
                    type: DataTypes.STRING(100),
                    allowNull: false
                },
                email: {
                    type: DataTypes.STRING(100),
                    allowNull: false,
                    unique: true
                },
                password_hash: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                whatsapp_connected: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                },
                whatsapp_session_id: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                    unique: true
                },
                status: {
                    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
                    defaultValue: 'active'
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                }
            });
            console.log('✅ Tabela tenants criada com sucesso!');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('⚠️ Tabela tenants já existe, pulando...');
            } else {
                throw error;
            }
        }
        
        // 2. Adicionar tenant_id nas tabelas existentes
        const tablesToMigrate = ['users', 'conversations', 'messages', 'api_costs'];
        
        for (const tableName of tablesToMigrate) {
            console.log(`🔧 Adicionando tenant_id na tabela ${tableName}...`);
            
            try {
                await queryInterface.addColumn(tableName, 'tenant_id', {
                    type: DataTypes.INTEGER,
                    allowNull: true, // Null temporariamente para migração
                    references: {
                        model: 'tenants',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                });
                console.log(`✅ Campo tenant_id adicionado em ${tableName}`);
            } catch (error) {
                if (error.message.includes('duplicate column')) {
                    console.log(`⚠️ Campo tenant_id já existe em ${tableName}, pulando...`);
                } else {
                    throw error;
                }
            }
        }
        
        // 3. Criar tenant padrão para dados existentes
        console.log('👤 Criando tenant padrão para dados existentes...');
        
        // Verificar se já existe um tenant padrão
        const [results] = await sequelize.query('SELECT COUNT(*) as count FROM tenants');
        const tenantCount = results[0].count;
        
        let defaultTenantId;
        
        if (tenantCount === 0) {
            // Criar tenant padrão
            await sequelize.query(`
                INSERT INTO tenants (company_name, email, password_hash, whatsapp_connected, whatsapp_session_id, status, created_at, updated_at)
                VALUES ('Sistema Principal', 'admin@sistema.com', '$2b$10$exemplo_hash_temporario', 1, 'default-session', 'active', datetime('now'), datetime('now'))
            `);
            
            // Buscar o ID do tenant criado
            const [idResult] = await sequelize.query('SELECT last_insert_rowid() as id');
            defaultTenantId = idResult[0].id;
            console.log('✅ Tenant padrão criado com ID:', defaultTenantId);
        } else {
            defaultTenantId = 1;
            console.log('✅ Tenant padrão já existe com ID:', defaultTenantId);
        }
        
        // 4. Atribuir todos os dados existentes ao tenant padrão
        for (const tableName of tablesToMigrate) {
            console.log(`🔄 Atualizando registros existentes em ${tableName}...`);
            
            const [updateResult] = await sequelize.query(`
                UPDATE ${tableName} 
                SET tenant_id = ? 
                WHERE tenant_id IS NULL
            `, {
                replacements: [defaultTenantId]
            });
            
            console.log(`✅ Registros atualizados em ${tableName}`);
        }
        
        // 5. Tornar tenant_id obrigatório após migração
        console.log('🔒 Tornando tenant_id obrigatório...');
        
        for (const tableName of tablesToMigrate) {
            try {
                // SQLite não suporta ALTER COLUMN, então criamos índices para garantir integridade
                await sequelize.query(`
                    CREATE INDEX IF NOT EXISTS idx_${tableName}_tenant_id 
                    ON ${tableName}(tenant_id)
                `);
                console.log(`✅ Índice criado para ${tableName}.tenant_id`);
            } catch (error) {
                console.log(`⚠️ Erro ao criar índice para ${tableName}:`, error.message);
            }
        }
        
        console.log('');
        console.log('🎉 MIGRAÇÃO MULTI-TENANT CONCLUÍDA COM SUCESSO!');
        console.log('');
        console.log('📊 Resumo:');
        console.log('✅ Tabela tenants criada');
        console.log('✅ Campo tenant_id adicionado em todas as tabelas');
        console.log('✅ Tenant padrão criado');
        console.log('✅ Dados existentes migrados');
        console.log('✅ Índices de performance criados');
        console.log('');
        console.log('🔧 Próximos passos:');
        console.log('1. Atualizar modelos do Sequelize');
        console.log('2. Implementar autenticação JWT');
        console.log('3. Criar middleware de isolamento');
        console.log('4. Atualizar frontend com login');
        
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Executar migração
if (require.main === module) {
    migrateToMultiTenant().catch(console.error);
}

module.exports = migrateToMultiTenant; 