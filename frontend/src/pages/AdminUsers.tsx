import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Building2,
  MessageSquare,
  Filter
} from 'lucide-react';

interface User {
  id: number;
  phone_number: string;
  name: string;
  email: string;
  created_at: string;
  last_interaction: string;
  tenant: {
    id: number;
    company_name: string;
  };
  stats: {
    messages: number;
  };
}

interface Tenant {
  id: number;
  company_name: string;
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
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

  const loadUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedTenant) {
        queryParams.append('tenantId', selectedTenant);
      }
      queryParams.append('limit', '200');

      const [usersResponse, tenantsResponse] = await Promise.all([
        makeAdminCall(`/users?${queryParams.toString()}`),
        makeAdminCall('/tenants')
      ]);

      setUsers(usersResponse.data || []);
      setTenants(tenantsResponse.data || []);
      setError('');
    } catch (error) {
      setError('Erro ao carregar usuários');
      console.error('Erro:', error);
      setUsers([]);
      setTenants([]); // Also reset tenants as they are fetched together
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [selectedTenant]);

  // Filtrar usuários baseado na busca
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.phone_number?.includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.tenant?.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return 'N/A';
    // Formatar telefone brasileiro
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
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
              <Button 
                onClick={() => navigate('/admin/dashboard')} 
                variant="ghost" 
                size="sm"
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Usuários Cadastrados</h1>
                <p className="text-sm text-gray-500">Gerenciar usuários do sistema</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">
                {filteredUsers.length} usuários
              </Badge>
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

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, telefone, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtro por Tenant */}
              <div className="sm:w-64">
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id.toString()}>
                      {tenant.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={loadUsers} variant="outline">
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>
              {filteredUsers.length} usuários encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm || selectedTenant ? 'Nenhum usuário encontrado com os filtros aplicados' : 'Nenhum usuário cadastrado'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-lg">
                            {user.name || 'Sem nome'}
                          </h3>
                          <Badge variant="outline">
                            ID: {user.id}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {formatPhone(user.phone_number)}
                          </div>

                          {user.email && (
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {user.email}
                            </div>
                          )}

                          <div className="flex items-center">
                            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                            {user.tenant?.company_name || 'Sem tenant'}
                          </div>

                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            Criado: {formatDate(user.created_at)}
                          </div>

                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            Última interação: {formatDate(user.last_interaction)}
                          </div>

                          <div className="flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2 text-gray-400" />
                            {user.stats.messages} mensagens
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 lg:mt-0 lg:ml-4">
                        <Badge 
                          variant={user.last_interaction ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.last_interaction ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas */}
        {filteredUsers.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {filteredUsers.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total de usuários
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {filteredUsers.filter(u => u.last_interaction).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Usuários ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {filteredUsers.reduce((acc, user) => acc + user.stats.messages, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total de mensagens
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}; 