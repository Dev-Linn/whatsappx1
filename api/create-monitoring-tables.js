const ApiDatabase = require('./database');

(async () => {
  try {
    console.log('🏗️ Criando tabelas de monitoramento...');

    // Inicializar conexão com banco
    const db = new ApiDatabase();
    const connected = await db.initialize();
    
    if (!connected) {
      console.error('❌ Falha ao conectar com banco de dados');
      process.exit(1);
    }

    // Tabela de logs do sistema
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        service TEXT NOT NULL,
        tenant_id INTEGER,
        user_id INTEGER,
        ip_address TEXT,
        endpoint TEXT,
        response_time INTEGER,
        status_code INTEGER,
        error_stack TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela system_logs criada');

    // Tabela de alertas de monitoramento
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS monitoring_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        service_id TEXT,
        tenant_id INTEGER,
        message TEXT NOT NULL,
        severity TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        acknowledged BOOLEAN DEFAULT 0,
        acknowledged_by INTEGER,
        acknowledged_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela monitoring_alerts criada');

    // Tabela de registros de uptime
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS uptime_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        service_type TEXT NOT NULL DEFAULT 'whatsapp',
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela uptime_records criada');

    // Criar índices para performance
    await db.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp)`);
    await db.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_service ON system_logs(service)`);
    await db.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_system_logs_tenant ON system_logs(tenant_id)`);
    await db.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp ON monitoring_alerts(timestamp)`);
    await db.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_uptime_records_tenant ON uptime_records(tenant_id, timestamp)`);
    console.log('✅ Índices criados');

    console.log('🎉 Todas as tabelas de monitoramento foram criadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    process.exit(1);
  }
})(); 