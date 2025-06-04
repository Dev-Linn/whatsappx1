import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, MessageCircle, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { useWhatsAppStatus } from "@/contexts/WhatsAppContext";
import { useEffect, useRef } from "react";

interface DashboardData {
  overview: {
    totalUsers: number;
    totalMessages: number;
    totalCosts: string;
    activeUsersToday: number;
    activeUsersWeek: number;
    avgMessagesPerUser: string;
  };
  activity: {
    messagesYesterday: number;
    messagesThisWeek: number;
    costsToday: string;
    costsThisMonth: string;
  };
  leads: {
    hotLeads: number;
    sentimentDistribution: Array<{ sentiment: string; count: number }>;
    stageDistribution: Array<{ stage: string; count: number }>;
  };
}

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const Dashboard = () => {
  const { data, loading, error } = useApi<DashboardData>('/dashboard');
  const { isAuthenticated } = useAuth();
  const { whatsappStatus, fetchStatus, initializeWhatsApp } = useWhatsAppStatus();
  const initializationAttempted = useRef(false);

  // Inicializar WhatsApp automaticamente quando entrar no Dashboard (apenas uma vez)
  useEffect(() => {
    if (isAuthenticated && !initializationAttempted.current) {
      console.log('🏠 Dashboard carregado - verificando status do WhatsApp...');
      initializationAttempted.current = true;
      
      // Buscar status atual
      fetchStatus().then(() => {
        // Se não está conectado e não há QR code, inicializar
        if (!whatsappStatus.connected && !whatsappStatus.qrCode && 
            whatsappStatus.message === 'Aguardando conexão...') {
          console.log('🆕 Dashboard: Inicializando WhatsApp automaticamente...');
          initializeWhatsApp().catch(error => {
            console.error('❌ Dashboard: Erro ao inicializar WhatsApp:', error);
          });
        } else {
          console.log('🔍 Dashboard: WhatsApp já inicializado ou em processo');
        }
      });
    }
  }, [isAuthenticated, fetchStatus]); // Removido whatsappStatus e initializeWhatsApp das dependências

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-400 font-semibold mb-2">Erro ao carregar dados</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard WhatsApp Bot</h1>
          <p className="text-gray-400">Monitore seu bot de IA em tempo real</p>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data?.overview?.totalUsers || 0}</div>
              <p className="text-xs text-gray-400">leads cadastrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Mensagens</CardTitle>
              <MessageCircle className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data?.overview?.totalMessages || 0}</div>
              <p className="text-xs text-gray-400">mensagens processadas</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Custos Totais</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">R$ {parseFloat(data?.overview?.totalCosts || '0').toFixed(2)}</div>
              <p className="text-xs text-gray-400">gastos com IA</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Ativos Hoje</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data?.overview?.activeUsersToday || 0}</div>
              <p className="text-xs text-gray-400">usuários ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Atividade */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Mensagens Esta Semana</CardTitle>
              <MessageCircle className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data?.activity?.messagesThisWeek || 0}</div>
              <p className="text-xs text-gray-400">mensagens enviadas</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Custo Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">R$ {parseFloat(data?.activity?.costsToday || '0').toFixed(4)}</div>
              <p className="text-xs text-gray-400">gasto hoje</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Custo Este Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">R$ {parseFloat(data?.activity?.costsThisMonth || '0').toFixed(2)}</div>
              <p className="text-xs text-gray-400">gasto mensal</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Hot Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data?.leads?.hotLeads || 0}</div>
              <p className="text-xs text-gray-400">leads quentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usuários por Estágio */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Leads por Estágio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.leads?.stageDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ stage, count }) => `${stage}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(data?.leads?.stageDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sentimentos */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Distribuição de Sentimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.leads?.sentimentDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="sentiment" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#8B5CF6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
