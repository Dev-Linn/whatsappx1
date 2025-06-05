import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, LogIn } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificar se já está logado como admin
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      try {
        const payload = JSON.parse(atob(adminToken.split('.')[1]));
        if (payload.isAdmin && payload.exp * 1000 > Date.now()) {
          navigate('/admin/dashboard');
          return;
        }
      } catch (error) {
        // Token inválido, remover
        localStorage.removeItem('admin_token');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('admin_token', data.data.token);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'Erro no login');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Área Administrativa</CardTitle>
          <CardDescription>
            Acesso restrito para administradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sistema.com"
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Entrando...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Sistema de administração v1.0
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 