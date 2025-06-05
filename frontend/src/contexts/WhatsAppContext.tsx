import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiCall, getToken } from '@/lib/auth';
import { API_ENDPOINTS } from '@/lib/config';
import io, { Socket } from 'socket.io-client';

interface WhatsAppStatus {
  connected: boolean;
  authenticated: boolean;
  qrCode: string | null;
  message: string;
  lastUpdate?: string;
}

interface WhatsAppContextType {
  whatsappStatus: WhatsAppStatus;
  fetchStatus: () => Promise<void>;
  initializeWhatsApp: () => Promise<void>;
  restartWhatsApp: () => Promise<void>;
  logoutWhatsApp: () => Promise<void>;
  isLoading: boolean;
  lastError: string | null;
  isAutoRetrying: boolean;
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

export const useWhatsAppStatus = () => {
  const context = useContext(WhatsAppContext);
  if (!context) {
    throw new Error('useWhatsAppStatus must be used within a WhatsAppProvider');
  }
  return context;
};

interface WhatsAppProviderProps {
  children: React.ReactNode;
}

export const WhatsAppProvider: React.FC<WhatsAppProviderProps> = ({ children }) => {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({
    connected: false,
    authenticated: false,
    qrCode: null,
    message: 'Aguardando conexão...'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const { tenant } = useAuth();
  
  // Refs para controlar retry
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRetryAttemptsRef = useRef(0);
  const maxAutoRetries = 5;
  const connectionAttemptRef = useRef(false);

  // Limpar timeouts quando o componente desmontar
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Configurar Socket.IO para updates em tempo real com reconexão automática
  useEffect(() => {
    if (tenant && !connectionAttemptRef.current) {
      const token = getToken();
      if (!token) return;

      connectionAttemptRef.current = true;

      const newSocket = io(API_ENDPOINTS.SOCKET_URL, {
        auth: {
          token: token
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 20000
      });

      newSocket.on('connect', () => {
        console.log('🔌 Conectado ao Socket.IO para updates do WhatsApp');
        setLastError(null);
        connectionAttemptRef.current = false;
        
        // Buscar status atual quando conectar
        fetchStatus();
      });

      newSocket.on('whatsapp-status', (status: WhatsAppStatus) => {
        console.log('📡 Status do WhatsApp atualizado via Socket.IO:', status);
        setWhatsappStatus(status);
        setLastError(null);
        
        // Se conectou com sucesso, resetar contadores e parar auto-retry
        if (status.connected && status.authenticated) {
          autoRetryAttemptsRef.current = 0;
          setIsAutoRetrying(false);
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          console.log('✅ WhatsApp conectado - auto-retry resetado');
          return; // IMPORTANTE: sair aqui para não executar auto-retry
        }
        
        // Se recebeu status de reconexão automática em andamento, resetar contador
        if (status.message.includes('Reconectando automaticamente')) {
          setIsAutoRetrying(false); // Deixar o backend lidar com a reconexão
          return;
        }
        
        // Auto-retry APENAS se:
        // 1. NÃO está conectado
        // 2. NÃO foi logout manual (mensagem não contém "Desconectado!")
        // 3. NÃO está em processo de logout/remoção
        // 4. NÃO está já fazendo auto-retry
        // 5. Ainda tem tentativas disponíveis
        // 6. Mensagem indica problema real (não inicialização normal)
        // 7. NÃO há QR code válido sendo exibido (NOVO)
        const shouldAutoRetry = !status.connected && 
                               !status.authenticated &&
                               !status.qrCode && // NÃO fazer auto-retry se há QR code válido
                               !status.message.includes('Desconectado!') && 
                               !status.message.includes('logout') && 
                               !status.message.includes('Removendo') &&
                               !status.message.includes('Aguardando') &&
                               !status.message.includes('Inicializando') &&
                               !status.message.includes('Escaneie') &&
                               !status.message.includes('Último código disponível') && // Não interferir no último QR code
                               !status.message.includes('Use "Reconectar"') && // Aguardar ação manual
                               !isAutoRetrying &&
                               autoRetryAttemptsRef.current < maxAutoRetries &&
                               (status.message.includes('Erro') || 
                                status.message.includes('Falha') ||
                                status.message.includes('Target closed') ||
                                status.message.includes('Protocol error'));
        
        if (shouldAutoRetry) {
          console.log('🔄 Condições para auto-retry atendidas, iniciando...');
          scheduleAutoRetry();
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Desconectado do Socket.IO:', reason);
        connectionAttemptRef.current = false;
        
        if (reason === 'io server disconnect') {
          // Servidor desconectou, tentar reconectar manualmente
          setLastError('Conexão com servidor perdida. Tentando reconectar...');
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão Socket.IO:', error.message);
        setLastError(`Erro de conexão: ${error.message}`);
        connectionAttemptRef.current = false;
      });

      setSocket(newSocket);

      return () => {
        connectionAttemptRef.current = false;
        newSocket.close();
      };
    }
  }, [tenant]);

  // Auto-retry com backoff exponencial
  const scheduleAutoRetry = () => {
    if (autoRetryAttemptsRef.current >= maxAutoRetries || isAutoRetrying) {
      return;
    }

    setIsAutoRetrying(true);
    autoRetryAttemptsRef.current++;
    
    // Delay maior e mais agressivo: 30s, 60s, 90s, 120s, 150s
    const retryDelay = Math.min(30000 * autoRetryAttemptsRef.current, 150000);
    
    console.log(`🔄 Agendando auto-retry em ${retryDelay / 1000}s (tentativa ${autoRetryAttemptsRef.current}/${maxAutoRetries})`);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    retryTimeoutRef.current = setTimeout(async () => {
      try {
        console.log(`🔄 Executando auto-retry ${autoRetryAttemptsRef.current}/${maxAutoRetries}`);
        await restartWhatsApp();
      } catch (error) {
        console.error('❌ Erro no auto-retry:', error);
        setLastError(`Auto-retry falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        
        // Tentar novamente se ainda há tentativas (com delay maior)
        if (autoRetryAttemptsRef.current < maxAutoRetries) {
          setTimeout(() => {
            setIsAutoRetrying(false);
            scheduleAutoRetry();
          }, 5000); // 5s de delay antes de tentar novamente
        } else {
          setIsAutoRetrying(false);
        }
      }
    }, retryDelay);
  };

  const fetchStatus = async () => {
    if (!tenant) return;
    
    setIsLoading(true);
    setLastError(null);
    
    try {
      const response = await apiCall('/whatsapp/status');
      setWhatsappStatus(response.data);
    } catch (error) {
      console.error('Erro ao buscar status do WhatsApp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar';
      setLastError(errorMessage);
      setWhatsappStatus({
        connected: false,
        authenticated: false,
        qrCode: null,
        message: `Erro ao conectar: ${errorMessage}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeWhatsApp = async () => {
    if (!tenant) return;
    
    setIsLoading(true);
    setLastError(null);
    // Só resetar contador se for inicialização manual (não auto-retry)
    if (!isAutoRetrying) {
      autoRetryAttemptsRef.current = 0;
    }
    
    try {
      await apiCall('/whatsapp/initialize', {
        method: 'POST'
      });
      // O status será atualizado via Socket.IO
    } catch (error) {
      console.error('Erro ao inicializar WhatsApp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro na inicialização';
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const restartWhatsApp = async () => {
    setIsLoading(true);
    setLastError(null);
    
    // Limpar retry automático durante restart manual
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setIsAutoRetrying(false);
    
    try {
      await apiCall('/whatsapp/restart', {
        method: 'POST'
      });
      // O status será atualizado via Socket.IO
      autoRetryAttemptsRef.current = 0; // Reset counter on successful restart
    } catch (error) {
      console.error('Erro ao reiniciar WhatsApp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro no restart';
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutWhatsApp = async () => {
    setIsLoading(true);
    setLastError(null);
    
    // Parar auto-retry durante logout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setIsAutoRetrying(false);
    autoRetryAttemptsRef.current = maxAutoRetries; // Prevent auto-retry after logout
    
    try {
      await apiCall('/whatsapp/logout', {
        method: 'POST'
      });
      // O status será atualizado via Socket.IO
    } catch (error) {
      console.error('Erro ao fazer logout do WhatsApp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro no logout';
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: WhatsAppContextType = {
    whatsappStatus,
    fetchStatus,
    initializeWhatsApp,
    restartWhatsApp,
    logoutWhatsApp,
    isLoading,
    lastError,
    isAutoRetrying
  };

  return (
    <WhatsAppContext.Provider value={value}>
      {children}
    </WhatsAppContext.Provider>
  );
}; 