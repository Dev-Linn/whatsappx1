const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../backend/data/whatsapp.db');

console.log('🌱 Inserindo dados de teste...');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar:', err.message);
        return;
    }
    console.log('✅ Conectado ao banco');
});

// Dados de teste
const testData = [
    // Configuração de integração para tenant 1
    {
        sql: `INSERT OR REPLACE INTO whatsapp_analytics_integration 
              (tenant_id, site_url, tracking_option, conversion_types) 
              VALUES (?, ?, ?, ?)`,
        params: [1, 'https://exemplo.com.br', 'automatic', '["visits","time","products","purchases"]']
    },
    
    // Alguns links rastreados
    {
        sql: `INSERT INTO whatsapp_tracking_links 
              (tenant_id, tracking_id, base_url, campaign_name, clicks_count) 
              VALUES (?, ?, ?, ?, ?)`,
        params: [1, 'wa_test_001', 'https://exemplo.com.br/produto1', 'campanha_novembro', 25]
    },
    {
        sql: `INSERT INTO whatsapp_tracking_links 
              (tenant_id, tracking_id, base_url, campaign_name, clicks_count) 
              VALUES (?, ?, ?, ?, ?)`,
        params: [1, 'wa_test_002', 'https://exemplo.com.br/produto2', 'campanha_dezembro', 18]
    },
    
    // Alguns cliques simulados
    {
        sql: `INSERT INTO whatsapp_click_tracking 
              (tenant_id, tracking_id, user_agent, converted, conversion_value) 
              VALUES (?, ?, ?, ?, ?)`,
        params: [1, 'wa_test_001', 'Mozilla/5.0 Test Browser', true, 89.90]
    },
    {
        sql: `INSERT INTO whatsapp_click_tracking 
              (tenant_id, tracking_id, user_agent, converted, conversion_value) 
              VALUES (?, ?, ?, ?, ?)`,
        params: [1, 'wa_test_001', 'Mozilla/5.0 Test Browser 2', false, null]
    },
    {
        sql: `INSERT INTO whatsapp_click_tracking 
              (tenant_id, tracking_id, user_agent, converted, conversion_value) 
              VALUES (?, ?, ?, ?, ?)`,
        params: [1, 'wa_test_002', 'Mozilla/5.0 Test Browser 3', true, 129.90]
    },
    
    // Algumas conversões
    {
        sql: `INSERT INTO whatsapp_conversions 
              (tenant_id, tracking_id, conversion_type, conversion_value, order_id) 
              VALUES (?, ?, ?, ?, ?)`,
        params: [1, 'wa_test_001', 'purchase', 89.90, 'ORDER_001']
    },
    {
        sql: `INSERT INTO whatsapp_conversions 
              (tenant_id, tracking_id, conversion_type, conversion_value, order_id) 
              VALUES (?, ?, ?, ?, ?)`,
        params: [1, 'wa_test_002', 'purchase', 129.90, 'ORDER_002']
    }
];

// Inserir dados sequencialmente
let completed = 0;
testData.forEach((item, index) => {
    db.run(item.sql, item.params, (err) => {
        completed++;
        
        if (err) {
            console.error(`❌ Erro no item ${index + 1}:`, err.message);
        } else {
            console.log(`✅ Item ${index + 1} inserido com sucesso`);
        }
        
        if (completed === testData.length) {
            // Verificar resultados
            db.all(`
                SELECT 
                    (SELECT COUNT(*) FROM whatsapp_analytics_integration) as integrations,
                    (SELECT COUNT(*) FROM whatsapp_tracking_links) as links,
                    (SELECT COUNT(*) FROM whatsapp_click_tracking) as clicks,
                    (SELECT COUNT(*) FROM whatsapp_conversions) as conversions
            `, (err, rows) => {
                if (!err && rows.length > 0) {
                    const stats = rows[0];
                    console.log('\n📊 Dados inseridos:');
                    console.log(`   📋 Integrações: ${stats.integrations}`);
                    console.log(`   🔗 Links: ${stats.links}`);
                    console.log(`   👆 Cliques: ${stats.clicks}`);
                    console.log(`   💰 Conversões: ${stats.conversions}`);
                }
                
                db.close((err) => {
                    if (err) {
                        console.error('❌ Erro ao fechar:', err.message);
                    } else {
                        console.log('\n✅ Banco fechado');
                        console.log('🎉 Dados de teste inseridos com sucesso!');
                        console.log('\n💡 Agora você pode testar as métricas na interface web.');
                    }
                });
            });
        }
    });
}); 