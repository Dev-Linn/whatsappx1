import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <p className="text-gray-300">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, redirecionar para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, renderizar o conteúdo
  return <>{children}</>;
};

export default ProtectedRoute; 