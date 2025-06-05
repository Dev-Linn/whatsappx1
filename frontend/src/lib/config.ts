// Configuração da API baseada no ambiente
const getApiUrl = () => {
  // Se estiver em desenvolvimento (localhost), usar proxy do Vite
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';  // Usa proxy do Vite (/api -> localhost:3001/api)
  }
  
  // Se estiver em produção, usar o mesmo domínio na porta 3001
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3001`;
};

export const API_BASE_URL = getApiUrl();

// URLs específicas
export const API_ENDPOINTS = {
  // Analytics
  ANALYTICS_STATUS: `${API_BASE_URL}/api/v1/analytics/auth/status`,
  ANALYTICS_AUTH: `${API_BASE_URL}/api/v1/analytics/auth/google`,
  ANALYTICS_CALLBACK: `${API_BASE_URL}/api/v1/analytics/auth/google/callback`,
  ANALYTICS_ACCOUNTS: `${API_BASE_URL}/api/v1/analytics/accounts`,
  ANALYTICS_SELECTION: `${API_BASE_URL}/api/v1/analytics/selection`,
  ANALYTICS_DASHBOARD: `${API_BASE_URL}/api/v1/analytics/dashboard-data`,
  ANALYTICS_LOGOUT: `${API_BASE_URL}/api/v1/analytics/auth/logout`,
  
  // WhatsApp
  WHATSAPP_STATUS: `${API_BASE_URL}/api/v1/whatsapp/status`,
  
  // Users
  USERS_FOLLOWUP: `${API_BASE_URL}/api/v1/users/send-followup`,
  
  // Audio
  AUDIO_BASE: `${API_BASE_URL}/api/v1/audio`,
  
  // Socket.IO
  SOCKET_URL: API_BASE_URL || window.location.origin.replace(':8080', ':3001')
};

console.log('🔧 [CONFIG] API_BASE_URL:', API_BASE_URL);
console.log('🔧 [CONFIG] SOCKET_URL:', API_ENDPOINTS.SOCKET_URL); 