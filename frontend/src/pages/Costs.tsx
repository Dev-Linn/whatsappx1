import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Calculator, Target, Bot, TrendingUp, Settings, Zap, Brain, BarChart3 } from 'lucide-react';
import { useState } from "react";

interface CostSummary {
  totalCosts: number;
  monthlyAverage: number;
  dailyAverage: number;
  costPerMessage: number;
  costsByDay: Array<{ date: string; cost: number; messages: number }>;
  costsByModel: Array<{ 
    model: string; 
    cost: number; 
    usage: number; 
    tokens: number;
    efficiency?: number;
    status?: 'active' | 'deprecated' | 'beta';
  }>;
  totalRequests: number;
  periodCosts: number;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  costPerToken: number;
  maxTokens: number;
  status: 'active' | 'deprecated' | 'beta';
  description: string;
}

// Modelos disponíveis (preparado para o futuro)
const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    costPerToken: 0.00002,
    maxTokens: 1048576,
    status: 'active',
    description: 'Modelo rápido e eficiente para conversas'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4 Omni',
    provider: 'OpenAI',
    costPerToken: 0.00005,
    maxTokens: 128000,
    status: 'beta',
    description: 'Modelo multimodal avançado'
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    costPerToken: 0.00003,
    maxTokens: 200000,
    status: 'active',
    description: 'Modelo equilibrado para análises'
  }
];

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

const Costs = () => {
  const [selectedModel, setSelectedModel] = useState<string>('current');
  const [showModelConfig, setShowModelConfig] = useState(false);

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

  const getModelStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900/30 text-green-400 border-green-500';
      case 'beta': return 'bg-blue-900/30 text-blue-400 border-blue-500';
      case 'deprecated': return 'bg-red-900/30 text-red-400 border-red-500';
      default: return 'bg-gray-900/30 text-gray-400 border-gray-500';
    }
  };

  const calculateEfficiency = (cost: number, usage: number, tokens: number) => {
    if (usage === 0) return 0;
    return (tokens / usage) / (cost / usage);
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
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-center">Custos Diários</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {summary?.costsByDay && summary.costsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={summary.costsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      fontSize={11}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={11}
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
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <div className="text-center">
                    <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Sem dados de custos diários</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custos por Modelo */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-center flex items-center justify-center gap-2">
                <Brain className="h-5 w-5 text-cyan-400" />
                Custos de IA por Modelo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {summary?.costsByModel && summary.costsByModel.length > 0 ? (
                <div className="space-y-4">
                  {/* Gráfico de Pizza - Só mostra se há dados com custos > 0 */}
                  {summary.costsByModel.some(model => model.cost > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={summary.costsByModel.filter(model => model.cost > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ model, cost }) => `${model}: ${formatCurrencyShort(cost)}`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="cost"
                        >
                          {summary.costsByModel.filter(model => model.cost > 0).map((entry, index) => (
                            <Cell key={`pie-cell-${entry.model}-${index}`} fill={COLORS[index % COLORS.length]} />
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
                            name === 'tokens' ? `${value.toLocaleString()} tokens` : value,
                            name === 'cost' ? 'Custo' : 
                            name === 'usage' ? 'Uso' : 
                            name === 'tokens' ? 'Tokens' : name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : null}
                  
                  {/* Lista Detalhada de Modelos */}
                  <div className="space-y-2">
                    <h4 className="text-white font-medium text-center flex items-center justify-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      Detalhamento por Modelo
                    </h4>
                    
                    {summary.costsByModel.map((model, index) => {
                      const efficiency = calculateEfficiency(model.cost, model.usage, model.tokens);
                      const avgCostPerUse = model.usage > 0 ? model.cost / model.usage : 0;
                      const avgTokensPerUse = model.usage > 0 ? model.tokens / model.usage : 0;
                      
                      return (
                        <div key={`model-detail-${model.model}-${index}`} className="bg-gray-700/40 rounded-lg p-3 border border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <h5 className="text-white font-medium text-sm">{model.model}</h5>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-semibold text-sm">{formatCurrencyShort(model.cost)}</div>
                              <div className="text-gray-400 text-xs">custo total</div>
                            </div>
                          </div>
                          
                          {/* Métricas Detalhadas */}
                          <div className="grid grid-cols-3 gap-3 mt-2">
                            <div className="text-center">
                              <div className="text-base font-semibold text-cyan-400">{model.usage}</div>
                              <div className="text-xs text-gray-400">usos</div>
                            </div>
                            <div className="text-center">
                              <div className="text-base font-semibold text-green-400">
                                {model.tokens.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-400">tokens</div>
                            </div>
                            <div className="text-center">
                              <div className="text-base font-semibold text-orange-400">
                                {formatCurrency(avgCostPerUse)}
                              </div>
                              <div className="text-xs text-gray-400">custo/uso</div>
                            </div>
                          </div>
                          
                          {/* Eficiência */}
                          <div className="mt-2 pt-2 border-t border-gray-600">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-400">Tokens por uso:</span>
                              <span className="text-white">{avgTokensPerUse.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1 text-xs">
                              <span className="text-gray-400">Eficiência:</span>
                              <span className="text-purple-400">
                                {model.usage === 0 ? '⚪ Sem uso' :
                                 efficiency > 1000 ? '⭐ Excelente' : 
                                 efficiency > 500 ? '✅ Boa' : 
                                 efficiency > 100 ? '⚠️ Regular' : '🔴 Baixa'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <div className="text-center">
                    <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhum modelo de IA encontrado</p>
                    <p className="text-xs mt-1">Use o bot para gerar dados</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Costs;
