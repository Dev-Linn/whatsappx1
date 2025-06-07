const Database = require('./backend/src/models/Database');

async function checkCorrelations() {
    try {
        const db = await Database.getInstance();
        
        console.log('🔍 VERIFICANDO CORRELAÇÕES E CONVERSAS...\n');
        
        // 1. Verificar links criados
        const links = await db.sequelize.query(`
            SELECT * FROM whatsapp_tracking_links 
            WHERE tenant_id = 1 
            ORDER BY created_at DESC
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`📝 LINKS CRIADOS: ${links.length}`);
        links.forEach(link => {
            console.log(`  - ${link.campaign_name} (${link.tracking_id})`);
        });
        
        // 2. Verificar cliques
        const clicks = await db.sequelize.query(`
            SELECT * FROM whatsapp_click_tracking 
            WHERE tenant_id = 1 
            ORDER BY clicked_at DESC
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`\n👆 CLIQUES REGISTRADOS: ${clicks.length}`);
        clicks.forEach(click => {
            console.log(`  - ${click.tracking_id} em ${click.clicked_at} (IP: ${click.ip_address})`);
        });
        
        // 3. Verificar correlações
        const correlations = await db.sequelize.query(`
            SELECT * FROM whatsapp_message_correlation 
            WHERE tenant_id = 1 
            ORDER BY correlated_at DESC
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`\n💬 CORRELAÇÕES ENCONTRADAS: ${correlations.length}`);
        correlations.forEach(corr => {
            console.log(`  - ${corr.phone_number}: "${corr.message_content}" (${corr.tracking_id})`);
            console.log(`    Método: ${corr.correlation_method} | Tempo: ${corr.time_elapsed_seconds}s`);
        });
        
        // 4. Verificar conversas recentes (últimas 10)
        const conversations = await db.sequelize.query(`
            SELECT * FROM conversations 
            WHERE tenant_id = 1 
            ORDER BY created_at DESC 
            LIMIT 10
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`\n💭 CONVERSAS RECENTES: ${conversations.length}`);
        conversations.forEach(conv => {
            console.log(`  - ${conv.phone_number}: ${conv.conversation_id} (${conv.created_at})`);
        });
        
        // 5. Verificar mensagens recentes
        const messages = await db.sequelize.query(`
            SELECT * FROM messages 
            WHERE tenant_id = 1 
            ORDER BY created_at DESC 
            LIMIT 20
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`\n📨 MENSAGENS RECENTES: ${messages.length}`);
        messages.forEach(msg => {
            console.log(`  - ${msg.sender_id}: "${msg.content}" (${msg.created_at})`);
        });
        
        // 6. TESTE: Buscar especificamente pelo número do Diego
        const diegoMessages = await db.sequelize.query(`
            SELECT * FROM messages 
            WHERE tenant_id = 1 AND sender_id LIKE '%5512997624728%'
            ORDER BY created_at DESC
        `, { type: db.sequelize.QueryTypes.SELECT });
        
        console.log(`\n🎯 MENSAGENS DO DIEGO (5512997624728): ${diegoMessages.length}`);
        diegoMessages.forEach(msg => {
            console.log(`  - "${msg.content}" em ${msg.created_at}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

checkCorrelations(); 