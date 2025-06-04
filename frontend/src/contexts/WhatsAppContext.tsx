import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiCall, getToken } from '@/lib/auth';
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const { tenant } = useAuth();

  // Configurar Socket.IO para updates em tempo real
  useEffect(() => {
    if (tenant) {
      const token = getToken();
      if (!token) return;

      const newSocket = io('http://localhost:3001', {
        auth: {
          token: token
        }
      });

      newSocket.on('connect', () => {
        console.log('🔌 Conectado ao Socket.IO para updates do WhatsApp');
      });

      newSocket.on('whatsapp-status', (status: WhatsAppStatus) => {
        console.log('📡 Status do WhatsApp atualizado via Socket.IO:', status);
        setWhatsappStatus(status);
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Desconectado do Socket.IO');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [tenant]);

  const fetchStatus = async () => {
    if (!tenant) return;
    
    setIsLoading(true);
    try {
      const response = await apiCall('/whatsapp/status');
      setWhatsappStatus(response.data);
    } catch (error) {
      console.error('Erro ao buscar status do WhatsApp:', error);
      setWhatsappStatus({
        connected: false,
        authenticated: false,
        qrCode: null,
        message: 'Erro ao conectar'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeWhatsApp = async () => {
    if (!tenant) return;
    
    setIsLoading(true);
    try {
      await apiCall('/whatsapp/initialize', {
        method: 'POST'
      });
      // O status será atualizado via Socket.IO
    } catch (error) {
      console.error('Erro ao inicializar WhatsApp:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const restartWhatsApp = async () => {
    setIsLoading(true);
    try {
      await apiCall('/whatsapp/restart', {
        method: 'POST'
      });
      // O status será atualizado via Socket.IO
    } catch (error) {
      console.error('Erro ao reiniciar WhatsApp:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutWhatsApp = async () => {
    setIsLoading(true);
    try {
      await apiCall('/whatsapp/logout', {
        method: 'POST'
      });
      // O status será atualizado via Socket.IO
    } catch (error) {
      console.error('Erro ao fazer logout do WhatsApp:', error);
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
    isLoading
  };

  return (
    <WhatsAppContext.Provider value={value}>
      {children}
    </WhatsAppContext.Provider>
  );
}; 