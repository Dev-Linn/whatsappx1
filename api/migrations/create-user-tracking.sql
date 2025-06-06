-- Migração: Adicionar tabela user_tracking para rastrear origem dos leads
-- Execute este SQL no seu banco de dados

CREATE TABLE IF NOT EXISTS user_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  tenant_id INTEGER NOT NULL,
  
  -- Dados UTM (Google Ads, Facebook Ads, etc)
  utm_source VARCHAR(100),        -- google, facebook, direct, etc
  utm_medium VARCHAR(100),        -- cpc, organic, social, etc  
  utm_campaign VARCHAR(100),      -- nome da campanha
  utm_content VARCHAR(100),       -- variação do anúncio
  utm_term VARCHAR(100),          -- palavra-chave
  
  -- Dados da sessão
  referrer_url TEXT,              -- de onde veio
  landing_page TEXT,              -- primeira página visitada
  ip_address VARCHAR(45),         -- IP do visitante
  user_agent TEXT,                -- navegador/dispositivo
  session_id VARCHAR(100),        -- ID único da sessão
  
  -- Dados do clique no WhatsApp
  whatsapp_click_timestamp TIMESTAMP,
  page_url_when_clicked TEXT,     -- em qual página clicou no WhatsApp
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_tracking_user_id ON user_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracking_tenant_id ON user_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tracking_utm_source ON user_tracking(utm_source);
CREATE INDEX IF NOT EXISTS idx_user_tracking_created_at ON user_tracking(created_at);

-- Adicionar coluna na tabela users para referenciar tracking
ALTER TABLE users ADD COLUMN tracking_id INTEGER REFERENCES user_tracking(id);

-- Adicionar coluna para valor de conversão calculado automaticamente
ALTER TABLE users ADD COLUMN estimated_value DECIMAL(10,2) DEFAULT 0; 