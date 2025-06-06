import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, MessageCircle, Users, BarChart3, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CorrelationDataPoint {
  time: string;
  hour: number;
  whatsappMessages: number;
  websiteVisitors: number;
  conversions: number;
  whatsappLeads: number;
}

interface CorrelationInsight {
  type: 'positive' | 'negative' | 'neutral';
  correlation: number; // -1 a 1
  description: string;
  actionable: boolean;
  recommendation?: string;
}

interface CorrelationChartProps {
  data: CorrelationDataPoint[];
  insights: CorrelationInsight[];
  timeframe: '24h' | '7d' | '30d';
  className?: string;
}

export const CorrelationChart = ({ 
  data, 
  insights,
  timeframe,
  className = "" 
}: CorrelationChartProps) => {

  // Calcular correlação principal
  const mainCorrelation = insights.find(i => i.type === 'positive') || insights[0] || { 
    type: 'neutral' as const, 
    correlation: 0, 
    description: 'Não há dados suficientes para análise de correlação', 
    actionable: false 
  };
  
  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.7) return 'text-green-400';
    if (abs > 0.4) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getCorrelationStrength = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.7) return 'Forte';
    if (abs > 0.4) return 'Moderada';
    return 'Fraca';
  };

  // Custom tooltip para o gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{`${label}h`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey === 'whatsappMessages' ? '📱 Mensagens WhatsApp' :
               entry.dataKey === 'websiteVisitors' ? '🌐 Visitantes Site' :
               entry.dataKey === 'conversions' ? '🎯 Conversões' : entry.dataKey}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("bg-gray-800 border-gray-700", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            WhatsApp vs Website - Correlação
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-gray-600">
              {timeframe}
            </Badge>
            <Badge 
              className={cn(
                "border-0",
                mainCorrelation.correlation > 0.4 ? "bg-green-600" : 
                mainCorrelation.correlation < -0.4 ? "bg-red-600" : "bg-gray-600"
              )}
            >
              {getCorrelationStrength(mainCorrelation.correlation)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Gráfico Principal */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="hour" 
                stroke="#9CA3AF"
                tickFormatter={(value) => `${value}h`}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="whatsappMessages" 
                stroke="#25D366" 
                strokeWidth={3}
                name="Mensagens WhatsApp"
                dot={{ fill: '#25D366', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#25D366', strokeWidth: 2, fill: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="websiteVisitors" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Visitantes Site"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="conversions" 
                stroke="#F59E0B" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Conversões"
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Métricas de Correlação */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <MessageCircle className="h-4 w-4 text-green-400 mr-1" />
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div className={cn("text-lg font-bold", getCorrelationColor(mainCorrelation.correlation))}>
              {(mainCorrelation.correlation * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Correlação Geral</div>
          </div>

          <div className="text-center p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-lg font-bold text-green-400">
              {data.reduce((acc, curr) => acc + curr.conversions, 0)}
            </div>
            <div className="text-xs text-gray-400">Conversões Totais</div>
          </div>

          <div className="text-center p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-lg font-bold text-yellow-400">
              {Math.max(...data.map(d => d.whatsappMessages + d.websiteVisitors))}
            </div>
            <div className="text-xs text-gray-400">Pico de Atividade</div>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-3">
          <h4 className="text-white font-medium">Insights de Correlação</h4>
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={cn(
                "p-3 rounded-lg border",
                insight.type === 'positive' ? "border-green-600 bg-green-900/20" :
                insight.type === 'negative' ? "border-red-600 bg-red-900/20" :
                "border-gray-600 bg-gray-700/20"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {insight.type === 'positive' && <TrendingUp className="h-4 w-4 text-green-400" />}
                    {insight.type === 'negative' && <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />}
                    {insight.type === 'neutral' && <BarChart3 className="h-4 w-4 text-gray-400" />}
                    <span className={cn(
                      "text-sm font-medium",
                      insight.type === 'positive' ? "text-green-400" :
                      insight.type === 'negative' ? "text-red-400" : "text-gray-400"
                    )}>
                      Correlação: {(insight.correlation * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-white text-sm">{insight.description}</p>
                  {insight.recommendation && (
                    <p className="text-blue-400 text-sm mt-1">
                      💡 {insight.recommendation}
                    </p>
                  )}
                </div>
                {insight.actionable && (
                  <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded transition-colors">
                    Agir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
            📊 Relatório Detalhado
          </button>
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
            🎯 Otimizar Horários
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

// Dados de exemplo
export const sampleCorrelationData: CorrelationDataPoint[] = [
  { time: '00:00', hour: 0, whatsappMessages: 2, websiteVisitors: 5, conversions: 0, whatsappLeads: 1 },
  { time: '01:00', hour: 1, whatsappMessages: 1, websiteVisitors: 3, conversions: 0, whatsappLeads: 0 },
  { time: '02:00', hour: 2, whatsappMessages: 0, websiteVisitors: 2, conversions: 0, whatsappLeads: 0 },
  { time: '03:00', hour: 3, whatsappMessages: 1, websiteVisitors: 1, conversions: 0, whatsappLeads: 0 },
  { time: '04:00', hour: 4, whatsappMessages: 0, websiteVisitors: 2, conversions: 0, whatsappLeads: 0 },
  { time: '05:00', hour: 5, whatsappMessages: 2, websiteVisitors: 8, conversions: 0, whatsappLeads: 1 },
  { time: '06:00', hour: 6, whatsappMessages: 5, websiteVisitors: 15, conversions: 1, whatsappLeads: 2 },
  { time: '07:00', hour: 7, whatsappMessages: 12, websiteVisitors: 28, conversions: 1, whatsappLeads: 4 },
  { time: '08:00', hour: 8, whatsappMessages: 18, websiteVisitors: 42, conversions: 2, whatsappLeads: 7 },
  { time: '09:00', hour: 9, whatsappMessages: 25, websiteVisitors: 65, conversions: 3, whatsappLeads: 12 },
  { time: '10:00', hour: 10, whatsappMessages: 32, websiteVisitors: 78, conversions: 4, whatsappLeads: 15 },
  { time: '11:00', hour: 11, whatsappMessages: 28, websiteVisitors: 85, conversions: 5, whatsappLeads: 18 },
  { time: '12:00', hour: 12, whatsappMessages: 35, websiteVisitors: 92, conversions: 6, whatsappLeads: 22 },
  { time: '13:00', hour: 13, whatsappMessages: 42, websiteVisitors: 95, conversions: 7, whatsappLeads: 28 },
  { time: '14:00', hour: 14, whatsappMessages: 48, websiteVisitors: 105, conversions: 8, whatsappLeads: 32 },
  { time: '15:00', hour: 15, whatsappMessages: 52, websiteVisitors: 112, conversions: 9, whatsappLeads: 35 },
  { time: '16:00', hour: 16, whatsappMessages: 45, websiteVisitors: 98, conversions: 7, whatsappLeads: 30 },
  { time: '17:00', hour: 17, whatsappMessages: 38, websiteVisitors: 88, conversions: 6, whatsappLeads: 25 },
  { time: '18:00', hour: 18, whatsappMessages: 35, websiteVisitors: 82, conversions: 5, whatsappLeads: 22 },
  { time: '19:00', hour: 19, whatsappMessages: 42, websiteVisitors: 95, conversions: 6, whatsappLeads: 28 },
  { time: '20:00', hour: 20, whatsappMessages: 48, websiteVisitors: 102, conversions: 7, whatsappLeads: 32 },
  { time: '21:00', hour: 21, whatsappMessages: 38, websiteVisitors: 78, conversions: 5, whatsappLeads: 25 },
  { time: '22:00', hour: 22, whatsappMessages: 25, websiteVisitors: 52, conversions: 3, whatsappLeads: 15 },
  { time: '23:00', hour: 23, whatsappMessages: 8, websiteVisitors: 18, conversions: 1, whatsappLeads: 4 }
];

export const sampleCorrelationInsights: CorrelationInsight[] = [
  {
    type: 'positive',
    correlation: 0.84,
    description: 'Forte correlação positiva entre visitantes do site e mensagens WhatsApp. Quando o tráfego do site aumenta, as mensagens também aumentam.',
    actionable: true,
    recommendation: 'Considere aumentar investimento em tráfego durante horários de pico (14h-16h) para maximizar leads WhatsApp.'
  },
  {
    type: 'positive',
    correlation: 0.72,
    description: 'Picos de atividade acontecem simultaneamente entre 14h-16h em ambas as plataformas.',
    actionable: true,
    recommendation: 'Tenha atendentes dedicados neste horário para aproveitar o aumento de demanda.'
  },
  {
    type: 'neutral',
    correlation: 0.35,
    description: 'Correlação moderada entre conversões e volume total de mensagens. Qualidade > quantidade.',
    actionable: false
  }
]; 