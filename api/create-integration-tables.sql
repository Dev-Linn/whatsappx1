-- Tabelas para Sistema de Integração WhatsApp + Analytics
-- Criado em: 2024-01-15

-- Tabela para configurações de integração por tenant
CREATE TABLE IF NOT EXISTS whatsapp_analytics_integration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    site_url TEXT NOT NULL,
    tracking_option TEXT DEFAULT 'automatic', -- 'automatic' ou 'manual'
    conversion_types TEXT, -- JSON array com tipos de conversão rastreados
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id)
);

-- Tabela para links rastreados gerados
CREATE TABLE IF NOT EXISTS whatsapp_tracking_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    tracking_id TEXT NOT NULL UNIQUE,
    base_url TEXT NOT NULL,
    campaign_name TEXT,
    user_id TEXT, -- ID do usuário WhatsApp se disponível
    clicks_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tracking_id (tracking_id),
    INDEX idx_tenant_created (tenant_id, created_at)
);

-- Tabela para rastreamento de cliques
CREATE TABLE IF NOT EXISTS whatsapp_click_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    tracking_id TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    referrer TEXT,
    session_duration INTEGER, -- Em segundos
    pages_viewed INTEGER DEFAULT 1,
    converted BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(10,2),
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tracking_clicked (tracking_id, clicked_at),
    INDEX idx_tenant_clicked (tenant_id, clicked_at)
);

-- Tabela para eventos de conversão
CREATE TABLE IF NOT EXISTS whatsapp_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    tracking_id TEXT NOT NULL,
    conversion_type TEXT NOT NULL, -- 'purchase', 'lead', 'signup', etc.
    conversion_value DECIMAL(10,2),
    order_id TEXT,
    product_ids TEXT, -- JSON array
    customer_email TEXT,
    customer_phone TEXT,
    converted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_converted (tenant_id, converted_at),
    INDEX idx_tracking_converted (tracking_id, converted_at)
);

-- Tabela para métricas agregadas diárias
CREATE TABLE IF NOT EXISTS whatsapp_analytics_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    date DATE NOT NULL,
    whatsapp_conversations INTEGER DEFAULT 0,
    site_clicks INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    click_rate DECIMAL(5,2), -- Percentual
    conversion_rate DECIMAL(5,2), -- Percentual
    roi DECIMAL(8,2), -- Return on Investment
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, date),
    INDEX idx_tenant_date (tenant_id, date)
);

-- Triggers para atualizar contadores automaticamente

-- Trigger para incrementar clicks_count quando há um novo clique
CREATE TRIGGER IF NOT EXISTS update_click_count 
AFTER INSERT ON whatsapp_click_tracking
BEGIN
    UPDATE whatsapp_tracking_links 
    SET clicks_count = clicks_count + 1
    WHERE tracking_id = NEW.tracking_id AND tenant_id = NEW.tenant_id;
END;

-- Trigger para marcar conversão no click_tracking
CREATE TRIGGER IF NOT EXISTS mark_conversion 
AFTER INSERT ON whatsapp_conversions
BEGIN
    UPDATE whatsapp_click_tracking 
    SET converted = TRUE, conversion_value = NEW.conversion_value
    WHERE tracking_id = NEW.tracking_id AND tenant_id = NEW.tenant_id;
END;

-- Views para relatórios

-- View para métricas consolidadas por tenant
CREATE VIEW IF NOT EXISTS vw_whatsapp_analytics_summary AS
SELECT 
    t.id as tenant_id,
    t.email as tenant_email,
    wai.site_url,
    wai.tracking_option,
    COUNT(DISTINCT wtl.id) as total_links_generated,
    COUNT(DISTINCT wct.id) as total_clicks,
    COUNT(DISTINCT CASE WHEN wct.converted = 1 THEN wct.id END) as total_conversions,
    SUM(wc.conversion_value) as total_revenue,
    ROUND(AVG(wct.session_duration), 2) as avg_session_duration,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT wct.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN wct.converted = 1 THEN wct.id END) * 100.0 / COUNT(DISTINCT wct.id))
            ELSE 0 
        END, 2
    ) as conversion_rate
FROM tenants t
LEFT JOIN whatsapp_analytics_integration wai ON t.id = wai.tenant_id
LEFT JOIN whatsapp_tracking_links wtl ON t.id = wtl.tenant_id
LEFT JOIN whatsapp_click_tracking wct ON wtl.tracking_id = wct.tracking_id
LEFT JOIN whatsapp_conversions wc ON wct.tracking_id = wc.tracking_id
GROUP BY t.id, t.email, wai.site_url, wai.tracking_option;

-- View para funil de conversão por tenant
CREATE VIEW IF NOT EXISTS vw_whatsapp_conversion_funnel AS
SELECT 
    t.id as tenant_id,
    t.email as tenant_email,
    -- Dados do WhatsApp (mensagens do mês atual)
    COALESCE(wa_stats.conversations, 0) as whatsapp_conversations,
    COALESCE(wa_stats.messages, 0) as whatsapp_messages,
    -- Dados do site
    COALESCE(site_stats.clicks, 0) as site_clicks,
    COALESCE(site_stats.unique_visitors, 0) as unique_visitors,
    COALESCE(site_stats.conversions, 0) as conversions,
    COALESCE(site_stats.revenue, 0) as revenue,
    -- Métricas calculadas
    ROUND(
        CASE 
            WHEN wa_stats.conversations > 0 
            THEN (site_stats.clicks * 100.0 / wa_stats.conversations)
            ELSE 0 
        END, 1
    ) as click_rate,
    ROUND(
        CASE 
            WHEN site_stats.clicks > 0 
            THEN (site_stats.conversions * 100.0 / site_stats.clicks)
            ELSE 0 
        END, 1
    ) as conversion_rate
FROM tenants t
LEFT JOIN (
    SELECT 
        tenant_id,
        COUNT(DISTINCT conversation_id) as conversations,
        COUNT(*) as messages
    FROM messages 
    WHERE DATE(created_at) >= DATE('now', 'start of month')
    GROUP BY tenant_id
) wa_stats ON t.id = wa_stats.tenant_id
LEFT JOIN (
    SELECT 
        wct.tenant_id,
        COUNT(DISTINCT wct.id) as clicks,
        COUNT(DISTINCT wct.tracking_id) as unique_visitors,
        COUNT(DISTINCT CASE WHEN wct.converted = 1 THEN wct.id END) as conversions,
        SUM(wc.conversion_value) as revenue
    FROM whatsapp_click_tracking wct
    LEFT JOIN whatsapp_conversions wc ON wct.tracking_id = wc.tracking_id
    WHERE DATE(wct.clicked_at) >= DATE('now', 'start of month')
    GROUP BY wct.tenant_id
) site_stats ON t.id = site_stats.tenant_id;

-- Inserir dados iniciais de exemplo para demonstração
-- (apenas se não existir configuração)
INSERT OR IGNORE INTO whatsapp_analytics_integration 
(tenant_id, site_url, tracking_option, conversion_types) 
SELECT 
    id, 
    'https://exemplo.com.br', 
    'automatic',
    '["visits", "time", "products", "purchases"]'
FROM tenants 
WHERE id = 1;

-- Comentários finais
-- Este sistema permite:
-- 1. Configurar integração WhatsApp + Analytics por tenant
-- 2. Gerar links rastreados únicos para campanhas
-- 3. Rastrear cliques, sessões e conversões
-- 4. Calcular métricas de ROI e funil de conversão
-- 5. Gerar relatórios consolidados com views
-- 6. Manter histórico para análise temporal 