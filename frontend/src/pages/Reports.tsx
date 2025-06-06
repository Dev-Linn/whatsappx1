import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorrelationChart } from "@/components/ui/correlation-chart";
import { CustomerJourney } from "@/components/ui/customer-journey";
import { useApi } from "@/hooks/useApi";
import { BarChart3, TrendingUp, Users, MessageCircle, Clock, Download } from "lucide-react";

// Interfaces para dados reais
interface ReportsData {
  correlation: {
    data: Array<{
      time: string;
      hour: number;
      whatsappMessages: number;
      websiteVisitors: number;
      conversions: number;
      whatsappLeads: number;
    }>;
    insights: Array<{
      type: 'positive' | 'negative' | 'neutral';
      correlation: number;
      description: string;
      actionable: boolean;
      recommendation?: string;
    }>;
  };
  customerJourneys: Array<{
    steps: Array<{
      id: string;
      name: string;
      timestamp: string;
      duration?: number;
      platform: 'website' | 'whatsapp' | 'both';
      status: 'completed' | 'current' | 'future';
      icon: React.ReactNode;
      description: string;
      details?: any;
      conversion?: any;
    }>;
    customerInfo: {
      id: string;
      name?: string;
      phone?: string;
      source: string;
      totalValue: number;
      conversionTime: number;
    };
  }>;
  summary: {
    totalJourneys: number;
    avgConversionTime: number;
    topSources: Array<{ source: string; count: number }>;
    conversionRate: number;
  };
}

const Reports = () => {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [activeJourneyIndex, setActiveJourneyIndex] = useState(0);
  
  const { data, loading, error } = useApi<ReportsData>(`/reports?timeframe=${timeframe}`);

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
          <h2 className="text-red-400 font-semibold mb-2">Erro ao carregar relatórios</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const correlationData = data?.correlation?.data || [];
  const correlationInsights = data?.correlation?.insights || [];
  const customerJourneys = data?.customerJourneys || [];
  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                📊 Relatórios Avançados
              </h1>
              <p className="text-gray-400">
                Correlação WhatsApp vs Website • Jornadas do Cliente • Insights Avançados
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Timeframe Selector */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                {(['24h', '7d', '30d'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimeframe(period)}
                    className={`px-3 py-1 rounded-md text-sm transition-colors ${
                      timeframe === period
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
              <Button className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Jornadas Analisadas
                </CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {summary.totalJourneys}
                </div>
                <p className="text-xs text-gray-400">clientes únicos</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Tempo Médio Conversão
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {summary.avgConversionTime.toFixed(1)}h
                </div>
                <p className="text-xs text-gray-400">primeiro contato → venda</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Taxa de Conversão
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {summary.conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-400">lead → cliente</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">
                  Principal Origem
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-white">
                  {summary.topSources[0]?.source || 'N/A'}
                </div>
                <p className="text-xs text-gray-400">
                  {summary.topSources[0]?.count || 0} conversões
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Correlação WhatsApp vs Website */}
        <div className="mb-8">
          <CorrelationChart
            data={correlationData}
            insights={correlationInsights}
            timeframe={timeframe}
          />
        </div>

        {/* Seção de Jornadas do Cliente */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  🎯 Jornadas do Cliente
                  <Badge className="ml-2 bg-blue-600">
                    {customerJourneys.length} jornadas
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  Como medimos: Dados do WhatsApp + timestamps + mudanças de estágio
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Navegação entre jornadas */}
              {customerJourneys.length > 1 && (
                <div className="flex gap-2 mb-6 overflow-x-auto">
                  {customerJourneys.map((journey, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveJourneyIndex(index)}
                      className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                        activeJourneyIndex === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {journey.customerInfo.name || `Cliente #${journey.customerInfo.id}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Jornada Ativa */}
              {customerJourneys[activeJourneyIndex] && (
                <CustomerJourney
                  steps={customerJourneys[activeJourneyIndex].steps}
                  customerInfo={customerJourneys[activeJourneyIndex].customerInfo}
                />
              )}

              {customerJourneys.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">
                    Nenhuma jornada completa ainda
                  </h3>
                  <p className="text-gray-400">
                    Aguarde clientes completarem o funil para ver jornadas detalhadas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Como Funciona */}
        <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              💡 Como Medimos a Jornada do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-2">✅ O que conseguimos rastrear:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>Primeiro contato</strong> via WhatsApp</li>
                  <li>• <strong>Histórico completo</strong> de mensagens</li>
                  <li>• <strong>Mudanças de estágio</strong> (lead → interessado → cliente)</li>
                  <li>• <strong>Tempo entre cada etapa</strong> da jornada</li>
                  <li>• <strong>Sentimento do cliente</strong> ao longo do tempo</li>
                  <li>• <strong>Dados do Google Analytics</strong> (se configurado)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">⚠️ Limitações atuais:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Origem específica (Google Ads, Facebook) não rastreada</li>
                  <li>• Páginas visitadas antes do WhatsApp não conectadas</li>
                  <li>• Valor de conversão deve ser inserido manualmente</li>
                  <li>• Apenas jornadas que passam pelo WhatsApp</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports; 