import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Building2, 
  MessageSquare, 
  DollarSign,
  Smartphone,
  Database,
  LogOut,
  RefreshCw,
  Trash2,
  Settings
} from 'lucide-react';

interface DashboardData {
  tenants: {
    total: number;
    active: number;
    inactive: number;
    connected: number;
  };
  users: {
    total: number;
  };
  messages: {
    total: number;
    today: number;
  };
  costs: {
    total: string;
  };
  lastUpdate: string;
}

interface Tenant {
  id: number;
  company_name: string;
  email: string;
  whatsapp_connected: boolean;
  status: string;
  created_at: string;
  stats: {
    users: number;
    messages: number;
  };
}

interface WhatsAppInstances {
  totalInstances: number;
  instances: Record<string, any>;
  timestamp?: string;
  error?: string;
}

export const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [whatsappInstances, setWhatsappInstances] = useState<WhatsAppInstances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificar autenticação admin
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/admin');
      return;
    }

    try {
      const payload = JSON.parse(atob(adminToken.split('.')[1]));
      if (!payload.isAdmin || payload.exp * 1000 <= Date.now()) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
        return;
      }
    } catch (error) {
      localStorage.removeItem('admin_token');
      navigate('/admin');
      return;
    }
  }, [navigate]);

  const makeAdminCall = async (endpoint: string, options: RequestInit = {}) => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      throw new Error('Token não encontrado');
    }

    const response = await fetch(`/api/v1/admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        ...options.headers,
      },
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('admin_token');
      navigate('/admin');
      throw new Error('Não autorizado');
    }

    return response.json();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, tenantsResponse, whatsappResponse] = await Promise.all([
        makeAdminCall('/dashboard'),
        makeAdminCall('/tenants'),
        makeAdminCall('/whatsapp/instances')
      ]);

      setDashboardData(dashboardResponse.data);
      setTenants(tenantsResponse.data);
      setWhatsappInstances(whatsappResponse.data);
      setError('');
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  const handleRestart = async (tenantId: number) => {
    try {
      await makeAdminCall(`/whatsapp/${tenantId}/restart`, { method: 'POST' });
      alert(`Restart da instância ${tenantId} iniciado`);
      loadData(); // Recarregar dados
    } catch (error) {
      alert('Erro ao reiniciar instância');
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('⚠️ ATENÇÃO! Isso irá DELETAR TODOS OS DADOS do banco. Confirma?')) {
      return;
    }

    if (!confirm('Última confirmação: TODOS os tenants, usuários e mensagens serão perdidos!')) {
      return;
    }

    try {
      await makeAdminCall('/database/reset', { method: 'POST' });
      alert('✅ Banco de dados resetado com sucesso!');
      loadData();
    } catch (error) {
      alert('❌ Erro ao resetar banco de dados');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando painel admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Painel Administrativo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate('/admin/monitoring')} variant="outline" size="sm">
                <Database className="w-4 h-4 mr-2" />
                Monitoramento
              </Button>
              <Button onClick={() => navigate('/admin/users')} variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Usuários
              </Button>
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={handleLogout} variant="destructive" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Cards de Estatísticas */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tenants</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.tenants.total}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.tenants.active} ativos, {dashboardData.tenants.connected} conectados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.users.total}</div>
                <p className="text-xs text-muted-foreground">Total de usuários</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.messages.total}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.messages.today} hoje
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custos</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {dashboardData.costs.total}</div>
                <p className="text-xs text-muted-foreground">Total gasto</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Tenants */}
          <Card>
            <CardHeader>
              <CardTitle>Tenants Cadastrados</CardTitle>
              <CardDescription>Gerenciar empresas do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenants.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum tenant encontrado</p>
                ) : (
                  tenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{tenant.company_name}</h4>
                          <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                            {tenant.status}
                          </Badge>
                          {tenant.whatsapp_connected && (
                            <Badge variant="outline" className="text-green-600">
                              <Smartphone className="w-3 h-3 mr-1" />
                              WhatsApp
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{tenant.email}</p>
                        <p className="text-xs text-gray-400">
                          {tenant.stats.users} usuários • {tenant.stats.messages} mensagens
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestart(tenant.id)}
                          disabled={!tenant.whatsapp_connected}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instâncias WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle>Instâncias WhatsApp</CardTitle>
              <CardDescription>Status das conexões WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              {whatsappInstances ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total de Instâncias:</span>
                    <Badge>{whatsappInstances.totalInstances}</Badge>
                  </div>
                  
                  {whatsappInstances.error && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertDescription className="text-yellow-800">
                        {whatsappInstances.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    {Object.entries(whatsappInstances.instances).map(([tenantId, instance]) => (
                      <div key={tenantId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Tenant {tenantId}</span>
                        <Badge variant={instance.connected ? 'default' : 'secondary'}>
                          {instance.connected ? 'Conectado' : 'Desconectado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Carregando...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ações de Sistema */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-red-600">⚠️ Zona de Perigo</CardTitle>
            <CardDescription>Ações irreversíveis do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleResetDatabase}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Resetar Banco de Dados
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              ⚠️ Esta ação irá deletar TODOS os dados permanentemente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 