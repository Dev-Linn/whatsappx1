# 📊 Integração Google Analytics - Jornada do Cliente

## 🎯 **OBJETIVO**
Conectar dados do site (Google Analytics) com dados do WhatsApp para criar jornadas completas.

## 🔧 **PASSO 1: Configurar Google Analytics 4 (GA4)**

### 1.1 **Instalar Google Analytics no Site**
```html
<!-- Adicionar no <head> do site -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 1.2 **Configurar Eventos Personalizados**
```javascript
// Quando usuário clica no botão WhatsApp
gtag('event', 'whatsapp_click', {
  'custom_parameter_1': 'whatsapp_button',
  'value': 1
});

// Quando usuário visita página de produto específico
gtag('event', 'page_view', {
  'page_title': 'Produto X',
  'page_location': window.location.href
});
```

## 🔧 **PASSO 2: Google Analytics Reporting API**

### 2.1 **Instalar Dependências**
```bash
cd api
npm install googleapis
```

### 2.2 **Configurar Credenciais**
```javascript
// api/services/google-analytics.js
const { google } = require('googleapis');

class GoogleAnalyticsService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: 'path/to/service-account.json', // Baixar do Google Cloud Console
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });
    
    this.analytics = google.analyticsdata('v1beta');
  }

  async getWebsiteVisitors(startDate, endDate) {
    const authClient = await this.auth.getClient();
    
    const request = {
      property: 'properties/GA4_PROPERTY_ID', // Seu Property ID
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'hour' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' }
      ],
      auth: authClient
    };

    const response = await this.analytics.properties.runReport(request);
    return response.data;
  }

  async getWhatsAppClicks(startDate, endDate) {
    const authClient = await this.auth.getClient();
    
    const request = {
      property: 'properties/GA4_PROPERTY_ID',
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'hour' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'whatsapp_click' }
        }
      },
      auth: authClient
    };

    const response = await this.analytics.properties.runReport(request);
    return response.data;
  }
}

module.exports = GoogleAnalyticsService;
```

## 🔧 **PASSO 3: Rastreamento de Origem**

### 3.1 **URL Parameters (UTM)**
```javascript
// No site - Capturar parâmetros UTM
function getUTMParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    utm_source: urlParams.get('utm_source'),
    utm_medium: urlParams.get('utm_medium'), 
    utm_campaign: urlParams.get('utm_campaign'),
    utm_content: urlParams.get('utm_content'),
    utm_term: urlParams.get('utm_term')
  };
}

// Salvar no localStorage
const utmData = getUTMParameters();
localStorage.setItem('utm_data', JSON.stringify(utmData));
```

### 3.2 **Conectar UTM com WhatsApp**
```javascript
// No botão do WhatsApp
function openWhatsApp() {
  const utmData = JSON.parse(localStorage.getItem('utm_data') || '{}');
  const phone = '5511999999999';
  const message = `Olá! Vim do site. Origem: ${utmData.utm_source || 'direto'}`;
  
  // Opcional: Enviar dados para nossa API antes de abrir WhatsApp
  fetch('/api/v1/track/whatsapp-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      utm_data: utmData,
      timestamp: new Date().toISOString(),
      page_url: window.location.href
    })
  });
  
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
}
```

## 🔧 **PASSO 4: Pixel do Facebook/Meta**

### 4.1 **Instalar Meta Pixel**
```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
```

### 4.2 **Eventos Personalizados**
```javascript
// Quando clica no WhatsApp
fbq('track', 'Contact', {
  content_name: 'WhatsApp Contact',
  content_category: 'Lead Generation'
});

// Quando gera lead qualificado
fbq('track', 'Lead', {
  content_name: 'Qualified Lead',
  value: 50, // Valor estimado do lead
  currency: 'BRL'
});
```

## 🔧 **PASSO 5: Implementar Tracking Avançado**

### 5.1 **Tabela de Tracking**
```sql
-- Nova tabela para rastrear origem
CREATE TABLE user_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100), 
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  referrer_url TEXT,
  landing_page TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### 5.2 **API Endpoint para Tracking**
```javascript
// api/routes/tracking.js
router.post('/whatsapp-click', async (req, res) => {
  const { utm_data, page_url, user_ip } = req.body;
  const tenant_id = req.tenant.id;
  
  try {
    // Salvar dados de tracking
    await db.sequelize.query(`
      INSERT INTO user_tracking (
        tenant_id, utm_source, utm_medium, utm_campaign, 
        landing_page, ip_address, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        tenant_id,
        utm_data.utm_source,
        utm_data.utm_medium,
        utm_data.utm_campaign,
        page_url,
        user_ip,
        generateSessionId()
      ]
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🔧 **PASSO 6: Valor de Conversão Automático**

### 6.1 **Sistema de Pontuação**
```javascript
// api/services/conversion-value.js
class ConversionValueService {
  calculateLeadValue(user, messages) {
    let score = 0;
    
    // Baseado na origem
    const tracking = user.tracking;
    if (tracking?.utm_source === 'google') score += 20;
    if (tracking?.utm_source === 'facebook') score += 15;
    
    // Baseado no engajamento
    const messageCount = messages.length;
    if (messageCount > 10) score += 30;
    if (messageCount > 5) score += 15;
    
    // Baseado no sentimento
    if (user.sentiment === 'positive') score += 25;
    if (user.sentiment === 'neutral') score += 10;
    
    // Baseado no tempo de resposta
    const avgResponseTime = this.calculateAvgResponseTime(messages);
    if (avgResponseTime < 300) score += 20; // < 5 min
    
    // Converter score para valor em R$
    return Math.round(score * 2.5); // R$ 2,50 por ponto
  }
}
```

## 🔧 **PASSO 7: Dashboard de Jornadas**

### 7.1 **Query Completa da Jornada**
```sql
-- Jornada completa do cliente
SELECT 
  u.id,
  u.name,
  u.phone,
  u.first_contact,
  u.last_contact,
  u.stage,
  u.sentiment,
  t.utm_source,
  t.utm_medium,
  t.utm_campaign,
  t.landing_page,
  COUNT(m.id) as message_count,
  AVG(m.response_time_seconds) as avg_response_time,
  SUM(CASE WHEN m.is_bot = 0 THEN 1 ELSE 0 END) as human_messages,
  ROUND((JULIANDAY(u.last_contact) - JULIANDAY(u.first_contact)) * 24, 1) as journey_duration_hours
FROM users u
LEFT JOIN user_tracking t ON u.id = t.user_id
LEFT JOIN messages m ON u.id = m.user_id
WHERE u.tenant_id = ?
AND u.first_contact >= ?
GROUP BY u.id
ORDER BY u.first_contact DESC
```

### 7.2 **Atualizar API Reports**
```javascript
// api/routes/reports.js - Adicionar à função generateCustomerJourneys
async function generateCustomerJourneys(db, tenant_id, startDate) {
  const users = await db.sequelize.query(`
    SELECT 
      u.id, u.name, u.phone, u.first_contact, u.last_contact, u.stage,
      t.utm_source, t.utm_medium, t.utm_campaign, t.landing_page,
      COUNT(m.id) as message_count
    FROM users u
    LEFT JOIN user_tracking t ON u.id = t.user_id  
    LEFT JOIN messages m ON u.id = m.user_id
    WHERE u.tenant_id = ? AND u.first_contact >= ?
    GROUP BY u.id
    ORDER BY u.last_contact DESC
    LIMIT 5
  `, {
    replacements: [tenant_id, startDate],
    type: db.sequelize.QueryTypes.SELECT
  });
  
  // ... resto da implementação
}
```

## 🎯 **PRÓXIMOS PASSOS - PRIORIDADE**

1. **🔥 URGENTE:** Configurar Google Analytics 4
2. **📊 IMPORTANTE:** Implementar tabela user_tracking
3. **🎯 MÉDIO:** Adicionar Meta Pixel  
4. **⚡ BONUS:** Sistema automático de valor de conversão

Quer que eu implemente algum desses pontos específicos primeiro? 