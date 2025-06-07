// Script para verificar se o tracking de cliques está funcionando

const ApiDatabase = require('./database');

async function testClickTracking() {
    console.log('🔍 [CLICK TRACKING] Verificando cliques rastreados...');
    
    try {
        // Inicializar banco
        const database = new ApiDatabase();
        await database.initialize();
        
        // Verificar links criados
        const links = await database.sequelize.query(`
            SELECT * FROM whatsapp_tracking_links 
            WHERE tenant_id = 1 
            ORDER BY created_at DESC 
            LIMIT 5
        `, {
            type: database.sequelize.QueryTypes.SELECT
        });
        
        console.log('📊 [LINKS] Links rastreados criados:', links.length);
        links.forEach(link => {
            console.log(`🔗 ID: ${link.tracking_id} | URL: ${link.base_url} | Campanha: ${link.campaign_name}`);
        });
        
        // Verificar estrutura da tabela primeiro
        const tableInfo = await database.sequelize.query(`
            PRAGMA table_info(whatsapp_click_tracking)
        `, {
            type: database.sequelize.QueryTypes.SELECT
        });
        
        console.log('\n🔍 [ESTRUTURA] Colunas da tabela whatsapp_click_tracking:');
        tableInfo.forEach(col => {
            console.log(`  📋 ${col.name} (${col.type})`);
        });
        
        // Verificar cliques registrados (sem usar created_at)
        const clicks = await database.sequelize.query(`
            SELECT * FROM whatsapp_click_tracking 
            WHERE tenant_id = 1 
            LIMIT 10
        `, {
            type: database.sequelize.QueryTypes.SELECT
        });
        
        console.log('\n📈 [CLIQUES] Cliques registrados:', clicks.length);
        clicks.forEach(click => {
            console.log(`👆 ID: ${click.tracking_id} | IP: ${click.ip_address || 'N/A'} | Data: ${click.timestamp || click.created_at || 'N/A'}`);
        });
        
        // Estatísticas
        if (links.length > 0) {
            console.log('\n📊 [ESTATÍSTICAS]');
            console.log(`Total de links criados: ${links.length}`);
            console.log(`Total de cliques: ${clicks.length}`);
            console.log(`Taxa de clique: ${links.length > 0 ? ((clicks.length / links.length) * 100).toFixed(1) : 0}%`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar tracking:', error);
    }
}

testClickTracking(); 