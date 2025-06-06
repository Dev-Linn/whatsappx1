// 📊 SCRIPT DE TRACKING - COLE NO SEU SITE
// Adicione este script no <head> ou antes do </body> do seu site

(function() {
  'use strict';
  
  // Configuração
  const TRACKING_API = 'http://localhost:3001/api/v1/track'; // Alterar para seu domínio
  const SESSION_STORAGE_KEY = 'whatsapp_tracking_session';
  
  // Gerar session ID único
  function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  
  // Pegar session ID (criar se não existir)
  function getSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  }
  
  // Capturar parâmetros UTM da URL
  function getUTMParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_content: urlParams.get('utm_content'),
      utm_term: urlParams.get('utm_term'),
      landing_page: window.location.href
    };
  }
  
  // Salvar dados UTM no localStorage (persistir entre páginas)
  function saveUTMData() {
    const utmData = getUTMParameters();
    
    // Só salvar se tiver pelo menos um parâmetro UTM
    if (Object.values(utmData).some(value => value !== null)) {
      localStorage.setItem('whatsapp_utm_data', JSON.stringify(utmData));
      console.log('🔍 [TRACKING] UTM data salvo:', utmData);
    }
  }
  
  // Recuperar dados UTM salvos
  function getSavedUTMData() {
    const savedData = localStorage.getItem('whatsapp_utm_data');
    return savedData ? JSON.parse(savedData) : {};
  }
  
  // Enviar tracking para API
  async function sendTracking(eventType, extraData = {}) {
    try {
      const trackingData = {
        utm_data: getSavedUTMData(),
        page_url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        session_id: getSessionId(),
        event_type: eventType,
        timestamp: new Date().toISOString(),
        ...extraData
      };
      
      console.log('📡 [TRACKING] Enviando:', eventType, trackingData);
      
      const response = await fetch(`${TRACKING_API}/whatsapp-click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ [TRACKING] Tracking enviado:', result);
        
        // Salvar tracking_id para associar com usuário depois
        if (result.tracking_id) {
          localStorage.setItem('whatsapp_tracking_id', result.tracking_id);
        }
        
        return result;
      } else {
        console.error('❌ [TRACKING] Erro na resposta:', response.status);
      }
    } catch (error) {
      console.error('❌ [TRACKING] Erro ao enviar tracking:', error);
    }
  }
  
  // Função para abrir WhatsApp com tracking
  function openWhatsAppWithTracking(phone, message = '') {
    // Enviar tracking antes de abrir WhatsApp
    sendTracking('whatsapp_click', {
      phone: phone,
      message: message
    });
    
    // Construir URL do WhatsApp
    const utmData = getSavedUTMData();
    const origem = utmData.utm_source || 'site';
    const fullMessage = message + `\n\n(Origem: ${origem})`;
    
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(fullMessage)}`;
    
    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
  }
  
  // Auto-detectar cliques em links do WhatsApp
  function setupWhatsAppClickTracking() {
    document.addEventListener('click', function(event) {
      const target = event.target.closest('a');
      
      if (target && target.href) {
        // Detectar links do WhatsApp
        if (target.href.includes('wa.me') || 
            target.href.includes('whatsapp.com') ||
            target.href.includes('api.whatsapp.com')) {
          
          console.log('🎯 [TRACKING] Clique no WhatsApp detectado:', target.href);
          
          // Extrair telefone da URL
          const phoneMatch = target.href.match(/(\d{10,15})/);
          const phone = phoneMatch ? phoneMatch[1] : 'unknown';
          
          // Enviar tracking
          sendTracking('whatsapp_click', {
            phone: phone,
            link_url: target.href,
            link_text: target.textContent || target.innerText
          });
        }
      }
    });
  }
  
  // Inicialização quando a página carrega
  function init() {
    console.log('🚀 [TRACKING] Tracking do WhatsApp inicializado');
    
    // Salvar dados UTM se presentes
    saveUTMData();
    
    // Configurar tracking automático de cliques
    setupWhatsAppClickTracking();
    
    // Enviar page view
    sendTracking('page_view');
  }
  
  // Expor funções globalmente para uso manual
  window.WhatsAppTracking = {
    openWhatsApp: openWhatsAppWithTracking,
    sendTracking: sendTracking,
    getSessionId: getSessionId,
    getUTMData: getSavedUTMData
  };
  
  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();

/* 
📋 COMO USAR:

1. AUTOMÁTICO (detecta cliques automaticamente):
   <a href="https://wa.me/5511999999999?text=Olá!">Falar no WhatsApp</a>

2. MANUAL (controle total):
   <button onclick="WhatsAppTracking.openWhatsApp('5511999999999', 'Olá, vim do site!')">
     Abrir WhatsApp
   </button>

3. LINKS COM UTM (para campanhas):
   https://seusite.com.br/?utm_source=google&utm_medium=cpc&utm_campaign=vendas

4. VERIFICAR DADOS (no console do navegador):
   WhatsAppTracking.getUTMData()
   WhatsAppTracking.getSessionId()
*/ 