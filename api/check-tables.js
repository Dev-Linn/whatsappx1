const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../backend/data/whatsapp.db');

console.log('🔍 Verificando tabelas no banco:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar:', err.message);
        return;
    }
    console.log('✅ Conectado ao banco');
});

// Verificar todas as tabelas
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
    if (err) {
        console.error('❌ Erro ao buscar tabelas:', err.message);
    } else {
        console.log('\n📋 Todas as tabelas:');
        rows.forEach(row => {
            if (row.name.startsWith('whatsapp_')) {
                console.log(`   ✅ ${row.name} (NOVA)`);
            } else {
                console.log(`   📄 ${row.name}`);
            }
        });
        
        // Verificar especificamente as tabelas de integração
        const integrationTables = [
            'whatsapp_analytics_integration',
            'whatsapp_tracking_links',
            'whatsapp_click_tracking',
            'whatsapp_conversions'
        ];
        
        const existingTables = rows.map(r => r.name);
        const missingTables = integrationTables.filter(t => !existingTables.includes(t));
        
        console.log('\n🎯 Status das tabelas de integração:');
        integrationTables.forEach(table => {
            if (existingTables.includes(table)) {
                console.log(`   ✅ ${table}`);
            } else {
                console.log(`   ❌ ${table} (FALTANDO)`);
            }
        });
        
        if (missingTables.length > 0) {
            console.log(`\n⚠️  Faltam ${missingTables.length} tabelas. Execute novamente o script de criação.`);
        } else {
            console.log('\n🎉 Todas as tabelas de integração estão criadas!');
        }
    }
    
    db.close();
}); 