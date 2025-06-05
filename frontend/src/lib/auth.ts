// Utilitários de autenticação JWT
import { API_BASE_URL } from './config';

const API_BASE = `${API_BASE_URL}/api/v1`;
console.log('🔗 API Base configurada para:', API_BASE);
const TOKEN_KEY = 'whatsapp_bot_token';
const TENANT_KEY = 'whatsapp_bot_tenant';

export interface Tenant {
  id: number;
  company_name: string;
  email: string;
  whatsapp_connected: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    tenant: Tenant;
  };
}

export interface RegisterData {
  company_name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Gerenciamento de token
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
};

// Gerenciamento de tenant
export const getTenant = (): Tenant | null => {
  const tenantData = localStorage.getItem(TENANT_KEY);
  return tenantData ? JSON.parse(tenantData) : null;
};

export const setTenant = (tenant: Tenant): void => {
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
};

// Verificar se está autenticado
export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) return false;
  
  try {
    // Verificar se token não expirou (JWT payload)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Converter para milliseconds
    return Date.now() < exp;
  } catch {
    return false;
  }
};

// Função para fazer chamadas autenticadas à API
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Se token expirou, remover e recarregar página
  if (response.status === 401 || response.status === 403) {
    removeToken();
    window.location.href = '/login';
    throw new Error('Token expirado');
  }

  const data = await response.json();
  
  if (!response.ok) {
    // Se tenant não encontrado (404), redirecionar para login
    if (response.status === 404 && (
      data.error?.includes('Tenant não encontrado') ||
      data.error?.includes('Tenant not found') ||
      endpoint.includes('/auth/me')
    )) {
      console.log('🔄 Tenant não encontrado - redirecionando para login...');
      removeToken();
      window.location.href = '/login';
      throw new Error('Tenant não encontrado');
    }
    
    throw new Error(data.error || 'Erro na API');
  }
  
  return data;
};

// Funções de autenticação
export const login = async (loginData: LoginData): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Erro no login');
  }

  // Salvar token e dados do tenant
  setToken(data.data.token);
  setTenant(data.data.tenant);
  
  return data;
};

export const register = async (registerData: RegisterData): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registerData),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Erro no registro');
  }

  // Salvar token e dados do tenant
  setToken(data.data.token);
  setTenant(data.data.tenant);
  
  return data;
};

export const logout = () => {
  removeToken();
  window.location.href = '/login';
};

export const getCurrentTenant = async (): Promise<Tenant> => {
  const data = await apiCall('/auth/me');
  return data.data.tenant;
};

export const refreshToken = async (): Promise<string> => {
  const data = await apiCall('/auth/refresh', { method: 'POST' });
  const newToken = data.data.token;
  setToken(newToken);
  return newToken;
}; 