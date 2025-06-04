import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Tenant, 
  isAuthenticated, 
  getTenant, 
  logout as authLogout, 
  getCurrentTenant 
} from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  tenant: Tenant | null;
  loading: boolean;
  login: (tenant: Tenant) => void;
  logout: () => void;
  updateTenant: (tenant: Tenant) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isAuthenticated()) {
          const savedTenant = getTenant();
          if (savedTenant) {
            setTenant(savedTenant);
            setAuthenticated(true);
            
            // Atualizar dados do tenant da API
            try {
              const updatedTenant = await getCurrentTenant();
              setTenant(updatedTenant);
            } catch (error) {
              console.error('Erro ao atualizar dados do tenant:', error);
              // Se falhar, manter os dados salvos localmente
            }
          }
        }
      } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        // Se houve erro na verificação, fazer logout
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (tenantData: Tenant) => {
    setTenant(tenantData);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    setTenant(null);
    setAuthenticated(false);
    authLogout();
  };

  const handleUpdateTenant = (tenantData: Tenant) => {
    setTenant(tenantData);
  };

  const value: AuthContextType = {
    isAuthenticated: authenticated,
    tenant,
    loading,
    login: handleLogin,
    logout: handleLogout,
    updateTenant: handleUpdateTenant,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 