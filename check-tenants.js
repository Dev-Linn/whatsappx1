const Database = require('./api/database');

async function checkTenants() {
    const db = new Database();
    await db.initialize();
    
    console.log('🔍 Verificando tabela tenants...');
    
    try {
        const tenants = await db.sequelize.query('SELECT * FROM tenants', { 
            type: db.sequelize.QueryTypes.SELECT 
        });
        
        console.log(`📊 Total de tenants: ${tenants.length}`);
        
        tenants.forEach((tenant, index) => {
            console.log(`\n${index + 1}. ID: ${tenant.id}`);
            console.log(`   📧 Email: ${tenant.email}`);
            console.log(`   🏢 Empresa: ${tenant.company_name}`);
            console.log(`   📅 Criado: ${tenant.created_at}`);
        });
        
        // Verificar especificamente o email teste
        const testTenant = tenants.find(t => t.email === 'TesteUsuario@gmail.com');
        if (testTenant) {
            console.log('\n✅ Usuário TesteUsuario@gmail.com ENCONTRADO!');
            console.log('ID:', testTenant.id);
        } else {
            console.log('\n❌ Usuário TesteUsuario@gmail.com NÃO encontrado');
            console.log('Emails disponíveis:');
            tenants.forEach(t => console.log(`  - ${t.email}`));
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
    
    process.exit(0);
}

checkTenants(); 