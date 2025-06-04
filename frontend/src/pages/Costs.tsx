import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/useApi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Calculator, Target, Bot, TrendingUp } from 'lucide-react';

interface CostSummary {
  totalCosts: number;
  monthlyAverage: number;
  dailyAverage: number;
  costPerMessage: number;
  costsByDay: Array<{ date: string; cost: number; messages: number }>;
  costsByModel: Array<{ model: string; cost: number; usage: number; tokens: number }>;
  totalRequests: number;
  periodCosts: number;
}

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const Costs = () => {
  const { data: summary, loading: summaryLoading, error: summaryError } = useApi<CostSummary>('/costs/summary');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatCurrencyShort = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Análise de Custos</h1>
          <p className="text-gray-400">Monitore gastos com IA em tempo real</p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Custo Total</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrencyShort(summary?.totalCosts || 0)}
              </div>
              <p className="text-xs text-gray-400">gastos acumulados</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Média Mensal</CardTitle>
              <Calculator className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrencyShort(summary?.monthlyAverage || 0)}
              </div>
              <p className="text-xs text-gray-400">projeção mensal</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Custo por Mensagem</CardTitle>
              <Target className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(summary?.costPerMessage || 0)}
              </div>
              <p className="text-xs text-gray-400">média por interação</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total de Requisições</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {summary?.totalRequests || 0}
              </div>
              <p className="text-xs text-gray-400">chamadas à IA</p>
            </CardContent>
          </Card>
        </div>

        {summaryError && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <h2 className="text-red-400 font-semibold mb-2">Erro ao carregar resumo</h2>
            <p className="text-red-300">{summaryError}</p>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Custos por Dia */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Custos Diários</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={summary?.costsByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `R$ ${Number(value).toFixed(4)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                    formatter={(value: any, name: string) => [
                      name === 'cost' ? formatCurrency(Number(value)) : value,
                      name === 'cost' ? 'Custo' : 'Mensagens'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Custos por Modelo */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-cyan-400" />
                Modelos de IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary?.costsByModel && summary.costsByModel.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={summary.costsByModel}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ model, cost, usage }) => `${model}: ${formatCurrencyShort(cost)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                    >
                      {summary.costsByModel.map((entry, index) => (
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
                      formatter={(value: any, name: string) => [
                        name === 'cost' ? formatCurrencyShort(Number(value)) : 
                        name === 'usage' ? `${value} requisições` : 
                        name === 'tokens' ? `${value} tokens` : value,
                        name === 'cost' ? 'Custo' : 
                        name === 'usage' ? 'Uso' : 
                        name === 'tokens' ? 'Tokens' : name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Dados insuficientes</p>
                    <p className="text-sm">Use o bot para gerar dados</p>
                  </div>
                </div>
              )}
              
              {/* Lista de Modelos */}
              <div className="mt-4 space-y-2">
                {summary?.costsByModel?.map((model, index) => (
                  <div key={model.model} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-white text-sm">{model.model}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm">{formatCurrencyShort(model.cost)}</div>
                      <div className="text-gray-400 text-xs">{model.usage} usos</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Costs;
