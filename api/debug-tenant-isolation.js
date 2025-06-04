#!/usr/bin/env node

// Script para debugar isolamento de tenant
const ApiDatabase = require('./database');

async function debugTenantIsolation() {
    console.log('🔍 DEBUG: Testando isolamento de tenant...\n');
    
    const db = new ApiDatabase();
    await db.initialize();
    
    try {
        // 1. Verificar quantos tenants existem
        const tenants = await db.Tenant.findAll({
            attributes: ['id', 'company_name', 'email'],
            order: [['id', 'ASC']]
        });
        
        console.log('📊 TENANTS CADASTRADOS:');
        tenants.forEach(tenant => {
            console.log(`  - ID: ${tenant.id} | Email: ${tenant.email} | Empresa: ${tenant.company_name}`);
        });
        console.log('');
        
        // 2. Verificar usuários por tenant
        console.log('👥 USUÁRIOS POR TENANT:');
        for (const tenant of tenants) {
            const users = await db.User.findAll({
                where: { tenant_id: tenant.id },
                attributes: ['id', 'name', 'phone', 'tenant_id']
            });
            
            console.log(`  Tenant ${tenant.id} (${tenant.email}):`);
            if (users.length === 0) {
                console.log(`    ❌ Nenhum usuário encontrado`);
            } else {
                users.forEach(user => {
                    console.log(`    ✅ User ID: ${user.id} | Nome: ${user.name} | Phone: ${user.phone}`);
                });
            }
        }
        console.log('');
        
        // 3. Verificar usuários SEM tenant_id (problema!)
        console.log('⚠️  USUÁRIOS SEM TENANT_ID:');
        const usersWithoutTenant = await db.User.findAll({
            where: { tenant_id: null },
            attributes: ['id', 'name', 'phone', 'tenant_id']
        });
        
        if (usersWithoutTenant.length > 0) {
            console.log(`  ❌ PROBLEMA ENCONTRADO: ${usersWithoutTenant.length} usuários sem tenant_id!`);
            usersWithoutTenant.forEach(user => {
                console.log(`    - User ID: ${user.id} | Nome: ${user.name} | Phone: ${user.phone}`);
            });
        } else {
            console.log(`  ✅ Todos os usuários têm tenant_id definido`);
        }
        console.log('');
        
        // 4. Verificar mensagens por tenant
        console.log('💬 MENSAGENS POR TENANT:');
        for (const tenant of tenants) {
            const messages = await db.Message.count({
                where: { tenant_id: tenant.id }
            });
            
            console.log(`  Tenant ${tenant.id}: ${messages} mensagens`);
        }
        console.log('');
        
        // 5. Simular chamada da API getUsers para cada tenant
        console.log('🔧 TESTE: Simulando API getUsers():');
        for (const tenant of tenants) {
            const result = await db.getUsers({ tenant_id: tenant.id });
            console.log(`  Tenant ${tenant.id}: ${result.users.length} usuários retornados`);
            
            if (result.users.length > 0) {
                result.users.forEach(user => {
                    console.log(`    - ${user.name} (${user.phone})`);
                });
            }
        }
        
        console.log('\n✅ DEBUG concluído!');
        
    } catch (error) {
        console.error('❌ Erro no debug:', error);
    } finally {
        await db.close();
    }
}

debugTenantIsolation().catch(console.error); 