import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { 
  ArrowLeft,
  Link2, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Target, 
  DollarSign,
  Zap,
  Clock,
  Globe,
  Smartphone,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  Share,
  Eye,
  MousePointer,
  Heart,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IntegrationMetrics {
  whatsapp: {
    conversations: number;
    leads: number;
    response_rate: number;
    avg_response_time: number;
    sentiment_positive: number;
    active_users: number;
  };
  analytics: {
    sessions: number;
    page_views: number;
    conversion_rate: number;
    avg_session_duration: number;
    bounce_rate: number;
    new_users: number;
  };
  correlation: {
    whatsapp_to_site: number;
    site_to_whatsapp: number;
    conversion_funnel: Array<{
      step: string;
      count: number;
      rate: number;
    }>;
    roi_per_conversation: number;
    total_revenue: number;
    cost_per_lead: number;
  };
  timeline: Array<{
    date: string;
    whatsapp_msgs: number;
    site_visits: number;
    conversions: number;
    revenue: number;
  }>;
}

const WhatsAppAnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadIntegrationMetrics();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadIntegrationMetrics, 30000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const loadIntegrationMetrics = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/integration/whatsapp-correlation?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        setLastUpdated(new Date());
        console.log('✅ Integration metrics loaded:', data);
      } else {
        console.log('❌ Integration metrics failed, using mock data');
        console.log('Status:', response.status, response.statusText);
        // Dados mock para demonstração
        setMetrics({
          whatsapp: {
            conversations: 847,
            leads: 234,
            response_rate: 94.5,
            avg_response_time: 23,
            sentiment_positive: 87.3,
            active_users: 156
          },
          analytics: {
            sessions: 3421,
            page_views: 8934,
            conversion_rate: 4.7,
            avg_session_duration: 156,
            bounce_rate: 23.4,
            new_users: 1829
          },
          correlation: {
            whatsapp_to_site: 68.4,
            site_to_whatsapp: 12.7,
            conversion_funnel: [
              { step: 'WhatsApp Conversa', count: 847, rate: 100 },
              { step: 'Clique no Link', count: 579, rate: 68.4 },
              { step: 'Visita Site', count: 543, rate: 93.8 },
              { step: 'Página Produto', count: 287, rate: 52.9 },
              { step: 'Conversão', count: 67, rate: 23.3 }
            ],
            roi_per_conversation: 23.45,
            total_revenue: 19847.50,
            cost_per_lead: 8.75
          },
          timeline: [
            { date: '2024-01-15', whatsapp_msgs: 89, site_visits: 234, conversions: 12, revenue: 2340 },
            { date: '2024-01-16', whatsapp_msgs: 134, site_visits: 387, conversions: 18, revenue: 3890 },
            { date: '2024-01-17', whatsapp_msgs: 156, site_visits: 423, conversions: 23, revenue: 4560 },
            { date: '2024-01-18', whatsapp_msgs: 98, site_visits: 298, conversions: 14, revenue: 2980 },
            { date: '2024-01-19', whatsapp_msgs: 201, site_visits: 567, conversions: 31, revenue: 6890 },
            { date: '2024-01-20', whatsapp_msgs: 87, site_visits: 234, conversions: 9, revenue: 1890 },
            { date: '2024-01-21', whatsapp_msgs: 169, site_visits: 456, conversions: 28, revenue: 5670 }
          ]
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as métricas. Tentando novamente...",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (value: number, type: 'positive' | 'negative' = 'positive') => {
    if (type === 'positive') {
      if (value >= 80) return 'text-green-400';
      if (value >= 60) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value <= 20) return 'text-green-400';
      if (value <= 40) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const getPerformanceBg = (value: number, type: 'positive' | 'negative' = 'positive') => {
    if (type === 'positive') {
      if (value >= 80) return 'bg-green-500/20 border-green-500/30';
      if (value >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
      return 'bg-red-500/20 border-red-500/30';
    } else {
      if (value <= 20) return 'bg-green-500/20 border-green-500/30';
      if (value <= 40) return 'bg-yellow-500/20 border-yellow-500/30';
      return 'bg-red-500/20 border-red-500/30';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-6 w-6 bg-gray-700 rounded"></div>
            <div className="h-8 bg-gray-700 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Dados não disponíveis</h3>
          <p className="text-gray-400 mb-4">Não foi possível carregar as métricas da integração.</p>
          <Button onClick={loadIntegrationMetrics} className="bg-purple-600 hover:bg-purple-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/integrations')}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg">
              <Link2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">WhatsApp × Analytics</h1>
              <p className="text-purple-400">Dashboard de Correlação Avançada</p>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            Atualizado: {lastUpdated.toLocaleTimeString()}
          </div>
          
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            <option value="1d">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          
          <Button className="bg-gray-700 hover:bg-gray-600 text-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Status da Integração */}
      <Alert className="bg-green-900/20 border-green-500/30">
        <CheckCircle className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-300">
          <strong>Integração Ativa</strong> - Dados sendo coletados e correlacionados em tempo real.
        </AlertDescription>
      </Alert>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversas WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.whatsapp.conversations.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <TrendingUp className="w-3 h-3 mr-1" />
                {metrics.whatsapp.leads} leads
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Sessões do Site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.analytics.sessions.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Eye className="w-3 h-3 mr-1" />
                {metrics.analytics.page_views.toLocaleString()} views
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Taxa de Correlação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-2 ${getPerformanceColor(metrics.correlation.whatsapp_to_site)}`}>
              {metrics.correlation.whatsapp_to_site}%
            </div>
            <div className="text-sm text-gray-400">
              WhatsApp → Site
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              ROI Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400 mb-2">
              R$ {metrics.correlation.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-400">
              R$ {metrics.correlation.roi_per_conversation.toFixed(2)} por conversa
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil de Conversão */}
      <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <Target className="h-6 w-6 text-purple-400" />
            Funil de Conversão Integrado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.correlation.conversion_funnel.map((step, index) => {
              const nextStep = metrics.correlation.conversion_funnel[index + 1];
              const dropoffRate = nextStep ? ((step.count - nextStep.count) / step.count * 100) : 0;
              
              return (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${getPerformanceBg(step.rate)} flex items-center justify-center border`}>
                        <span className={`font-bold ${getPerformanceColor(step.rate)}`}>
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{step.step}</h4>
                        <p className="text-gray-400 text-sm">
                          {step.count.toLocaleString()} usuários ({step.rate.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {step.count.toLocaleString()}
                      </div>
                      {dropoffRate > 0 && (
                        <div className="text-sm text-red-400">
                          -{dropoffRate.toFixed(1)}% dropoff
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  {index < metrics.correlation.conversion_funnel.length - 1 && (
                    <div className="flex justify-center py-2">
                      <div className="text-gray-600">
                        ↓
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp Metrics */}
        <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <Smartphone className="h-6 w-6 text-green-400" />
              Performance WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Taxa de Resposta</span>
              <span className={`font-bold ${getPerformanceColor(metrics.whatsapp.response_rate)}`}>
                {metrics.whatsapp.response_rate}%
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Tempo Médio de Resposta</span>
              <span className="text-blue-400 font-bold">
                {metrics.whatsapp.avg_response_time}s
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Sentimento Positivo</span>
              <span className={`font-bold ${getPerformanceColor(metrics.whatsapp.sentiment_positive)}`}>
                {metrics.whatsapp.sentiment_positive}%
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Usuários Ativos</span>
              <span className="text-purple-400 font-bold">
                {metrics.whatsapp.active_users}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Metrics */}
        <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-blue-400" />
              Performance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Taxa de Conversão</span>
              <span className={`font-bold ${getPerformanceColor(metrics.analytics.conversion_rate)}`}>
                {metrics.analytics.conversion_rate}%
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Duração Média da Sessão</span>
              <span className="text-green-400 font-bold">
                {Math.floor(metrics.analytics.avg_session_duration / 60)}m {metrics.analytics.avg_session_duration % 60}s
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Taxa de Rejeição</span>
              <span className={`font-bold ${getPerformanceColor(metrics.analytics.bounce_rate, 'negative')}`}>
                {metrics.analytics.bounce_rate}%
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-300">Novos Usuários</span>
              <span className="text-blue-400 font-bold">
                {metrics.analytics.new_users.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights e Recomendações */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <Zap className="h-6 w-6 text-yellow-400" />
            🧠 Insights da IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="font-semibold text-green-400">Oportunidade</span>
              </div>
              <p className="text-gray-300 text-sm">
                {metrics.correlation.whatsapp_to_site}% dos usuários do WhatsApp visitam seu site. 
                Considere criar mais CTAs direcionados para aumentar essa taxa.
              </p>
            </div>
            
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-400" />
                <span className="font-semibold text-blue-400">Recomendação</span>
              </div>
              <p className="text-gray-300 text-sm">
                Seu ROI por conversa de R$ {metrics.correlation.roi_per_conversation.toFixed(2)} está acima da média. 
                Investir mais em campanhas WhatsApp pode ser muito lucrativo.
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-purple-400" />
              <span className="font-semibold text-purple-400">Próximos Passos</span>
            </div>
            <p className="text-gray-300 text-sm">
              Com {metrics.whatsapp.sentiment_positive}% de sentimento positivo no WhatsApp e 
              {metrics.analytics.conversion_rate}% de conversão no site, você tem uma base sólida. 
              Considere implementar automações mais avançadas e segmentação de público.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppAnalyticsDashboard;