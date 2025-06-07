import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/config";
import { 
  Smartphone, 
  BarChart3, 
  Facebook, 
  Instagram, 
  Link2, 
  CheckCircle, 
  Lock, 
  AlertCircle,
  Zap,
  TrendingUp,
  Settings,
  ExternalLink,
  Star,
  Sparkles,
  Calendar,
  Globe
} from "lucide-react";
import IntegrationModal from "@/components/IntegrationModal";
import CelebrationModal from "@/components/CelebrationModal";
import { useNavigate } from "react-router-dom";
import { useWhatsAppStatus } from "@/contexts/WhatsAppContext";

interface IntegrationStatus {
  whatsapp: {
    connected: boolean;
    authenticated: boolean;
  };
  analytics: {
    authenticated: boolean;
    hasSelection: boolean;
  };
}

const Integrations = () => {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    whatsapp: { connected: false, authenticated: false },
    analytics: { authenticated: false, hasSelection: false }
  });
  const [showModal, setShowModal] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebrationCount, setCelebrationCount] = useState(0); // Contador de celebrações
  const { toast } = useToast();
  const navigate = useNavigate();
  const { whatsappStatus } = useWhatsAppStatus();

  // Carregar contador de celebrações do localStorage
  useEffect(() => {
    const stored = localStorage.getItem('celebration-count');
    if (stored) {
      setCelebrationCount(parseInt(stored));
    }
  }, []);

  useEffect(() => {
    checkIntegrationsStatus();
  }, []);

  // Atualizar quando o status do WhatsApp mudar (via Socket.IO)
  useEffect(() => {
    if (!loading) { // Só atualizar após o carregamento inicial
      checkIntegrationsStatus();
    }
  }, [whatsappStatus.connected, whatsappStatus.authenticated]);

  const checkIntegrationsStatus = async () => {
    try {
      const token = getToken();
      
      // Usar status do WhatsApp do contexto (já em tempo real via Socket.IO)
      const currentWhatsAppStatus = {
        connected: whatsappStatus.connected,
        authenticated: whatsappStatus.authenticated
      };
      
      console.log('✅ WhatsApp Status from Context:', currentWhatsAppStatus);
      console.log('📡 Full WhatsApp Status:', whatsappStatus);
      
      // Verificar status Analytics  
      const analyticsResponse = await fetch(API_ENDPOINTS.ANALYTICS_STATUS, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let analyticsStatus = { authenticated: false, hasSelection: false };

      if (analyticsResponse.ok) {
        analyticsStatus = await analyticsResponse.json();
        console.log('✅ Analytics Status:', analyticsStatus);
      } else {
        console.log('❌ Analytics Status Error:', analyticsResponse.status);
      }

      const newStatus = {
        whatsapp: currentWhatsAppStatus,
        analytics: analyticsStatus
      };

      // Verificar se desbloqueou nova integração cruzada
      const wasWhatsappAnalyticsAvailable = integrationStatus.whatsapp.connected && 
                                           integrationStatus.whatsapp.authenticated && 
                                           integrationStatus.analytics.authenticated && 
                                           integrationStatus.analytics.hasSelection;

      const isWhatsappAnalyticsAvailable = newStatus.whatsapp.connected && 
                                          newStatus.whatsapp.authenticated && 
                                          newStatus.analytics.authenticated && 
                                          newStatus.analytics.hasSelection;

      setIntegrationStatus(newStatus);

      // Mostrar celebração se desbloqueou (só se não estava disponível antes E se não passou do limite)
      if (!wasWhatsappAnalyticsAvailable && isWhatsappAnalyticsAvailable && celebrationCount < 2) {
        setTimeout(() => {
          console.log('🎉 Integração cruzada desbloqueada!');
          setShowCelebration('whatsapp-analytics');
          const newCount = celebrationCount + 1;
          setCelebrationCount(newCount);
          localStorage.setItem('celebration-count', newCount.toString());
        }, 1000);
      }

    } catch (error) {
      console.error('Erro ao verificar integrações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrationClick = (integrationId: string) => {
    if (integrationId === 'facebook' || integrationId === 'instagram') {
      toast({
        title: "Em Breve! 🚀",
        description: `A integração com ${integrationId === 'facebook' ? 'Facebook' : 'Instagram'} está em desenvolvimento.`,
      });
      return;
    }

    const whatsappConnected = integrationStatus.whatsapp.connected && integrationStatus.whatsapp.authenticated;
    const analyticsConnected = integrationStatus.analytics.authenticated && integrationStatus.analytics.hasSelection;

    if ((integrationId === 'whatsapp' && whatsappConnected) || (integrationId === 'analytics' && analyticsConnected)) {
      // Redirecionar para página de gerenciamento
      if (integrationId === 'whatsapp') {
        navigate('/whatsapp-login');
      } else if (integrationId === 'analytics') {
        navigate('/analytics');
      }
      return;
    }

    setShowModal(integrationId);
  };

  const handleCrossIntegrationClick = () => {
    const whatsappConnected = integrationStatus.whatsapp.connected && integrationStatus.whatsapp.authenticated;
    const analyticsConnected = integrationStatus.analytics.authenticated && integrationStatus.analytics.hasSelection;
    
    if (whatsappConnected && analyticsConnected) {
      navigate('/whatsapp-analytics-dashboard');
    } else {
      const connected = (whatsappConnected ? 1 : 0) + (analyticsConnected ? 1 : 0);
      toast({
        title: "Integração Bloqueada 🔒",
        description: `Conecte WhatsApp e Analytics primeiro (${connected}/2)`,
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-64 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const whatsappConnected = integrationStatus.whatsapp.connected && integrationStatus.whatsapp.authenticated;
  const analyticsConnected = integrationStatus.analytics.authenticated && integrationStatus.analytics.hasSelection;
  const crossIntegrationActive = whatsappConnected && analyticsConnected;
  const connectedCount = (whatsappConnected ? 1 : 0) + (analyticsConnected ? 1 : 0);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg">
            <Link2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Integrações
            </h1>
            <p className="text-purple-400 font-medium">Central de Conexões</p>
          </div>
        </div>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Conecte suas plataformas favoritas e desbloqueie o poder das integrações cruzadas
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Seu Progresso</h3>
            <Badge className="bg-blue-500 text-white">
              {connectedCount}/2 Conectadas
            </Badge>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(connectedCount / 2) * 100}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* Integrações Principais */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Globe className="h-6 w-6 text-blue-400" />
          Integrações Principais
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* WhatsApp */}
          <Card 
            className="bg-gray-800/50 backdrop-blur border-gray-700 hover:border-gray-600 transition-all cursor-pointer group h-full flex flex-col"
            onClick={() => handleIntegrationClick('whatsapp')}
          >
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg group-hover:scale-110 transition-transform">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                {whatsappConnected ? (
                  <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400 border-gray-600"><AlertCircle className="w-3 h-3 mr-1" />Desconectado</Badge>
                )}
              </div>
              <CardTitle className="text-white">WhatsApp Business</CardTitle>
              <p className="text-gray-400 text-sm">Chatbot inteligente com IA</p>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <div className="space-y-2 flex-1">
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  🤖 Chatbot com IA Gemini
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  ⚡ Automação 24/7
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📊 Análise de sentimentos
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  🎯 Geração de leads
                </div>
              </div>
              <Button 
                className={`w-full mt-auto ${
                  whatsappConnected 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {whatsappConnected ? 'Gerenciar' : 'Conectar'}
                {whatsappConnected ? <Settings className="w-4 h-4 ml-2" /> : <ExternalLink className="w-4 h-4 ml-2" />}
              </Button>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card 
            className="bg-gray-800/50 backdrop-blur border-gray-700 hover:border-gray-600 transition-all cursor-pointer group h-full flex flex-col"
            onClick={() => handleIntegrationClick('analytics')}
          >
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                {analyticsConnected ? (
                  <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400 border-gray-600"><AlertCircle className="w-3 h-3 mr-1" />Desconectado</Badge>
                )}
              </div>
              <CardTitle className="text-white">Google Analytics</CardTitle>
              <p className="text-gray-400 text-sm">Rastreamento e análise completa</p>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <div className="space-y-2 flex-1">
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📈 Métricas em tempo real
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  🎯 Rastreamento de conversões
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  👥 Análise de audiência
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📊 Relatórios personalizados
                </div>
              </div>
              <Button 
                className={`w-full mt-auto ${
                  analyticsConnected 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {analyticsConnected ? 'Gerenciar' : 'Conectar'}
                {analyticsConnected ? <Settings className="w-4 h-4 ml-2" /> : <ExternalLink className="w-4 h-4 ml-2" />}
              </Button>
            </CardContent>
          </Card>

          {/* Facebook */}
          <Card 
            className="bg-gray-800/50 backdrop-blur border-gray-700 hover:border-gray-600 transition-all cursor-pointer group h-full flex flex-col"
            onClick={() => handleIntegrationClick('facebook')}
          >
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg grayscale">
                  <Facebook className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-orange-500 text-white"><Calendar className="w-3 h-3 mr-1" />Em Breve</Badge>
              </div>
              <CardTitle className="text-white">Facebook Ads</CardTitle>
              <p className="text-gray-400 text-sm">Campanhas publicitárias</p>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <div className="space-y-2 flex-1">
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📢 Campanhas automáticas
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  🎯 Targeting avançado
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  💰 Otimização de ROI
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📊 Relatórios unificados
                </div>
              </div>
              <Button className="w-full bg-gray-600 cursor-not-allowed mt-auto" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>

          {/* Instagram */}
          <Card 
            className="bg-gray-800/50 backdrop-blur border-gray-700 hover:border-gray-600 transition-all cursor-pointer group h-full flex flex-col"
            onClick={() => handleIntegrationClick('instagram')}
          >
            <CardHeader className="pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 shadow-lg grayscale">
                  <Instagram className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-orange-500 text-white"><Calendar className="w-3 h-3 mr-1" />Em Breve</Badge>
              </div>
              <CardTitle className="text-white">Instagram Business</CardTitle>
              <p className="text-gray-400 text-sm">Marketing visual e stories</p>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <div className="space-y-2 flex-1">
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📸 Posts automáticos
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📱 Stories interativos
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  🎯 Hashtags inteligentes
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📈 Analytics detalhado
                </div>
              </div>
              <Button className="w-full bg-gray-600 cursor-not-allowed mt-auto" disabled>
                Em Breve
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Integrações Cruzadas */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-purple-400" />
          Integrações Avançadas
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
            Exclusivo
          </Badge>
        </h2>
        
        <div className="grid grid-cols-1 gap-6">
          <Card 
            className={`bg-gray-800/50 backdrop-blur border-gray-700 transition-all cursor-pointer group ${
              crossIntegrationActive ? 'border-purple-500/50 shadow-purple-500/10 shadow-lg' : ''
            }`}
            onClick={handleCrossIntegrationClick}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg ${
                  crossIntegrationActive ? 'group-hover:scale-110 transition-transform' : 'grayscale'
                }`}>
                  <Link2 className="h-6 w-6 text-white" />
                </div>
                {crossIntegrationActive ? (
                  <Badge className="bg-purple-500 text-white"><Sparkles className="w-3 h-3 mr-1" />Ativo</Badge>
                ) : connectedCount > 0 ? (
                  <Badge className="bg-yellow-500 text-white"><Star className="w-3 h-3 mr-1" />{connectedCount}/2</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-400 border-gray-600"><Lock className="w-3 h-3 mr-1" />Bloqueado</Badge>
                )}
              </div>
              <CardTitle className="text-white flex items-center gap-2">
                WhatsApp × Analytics
                {crossIntegrationActive && <Zap className="h-4 w-4 text-yellow-400" />}
              </CardTitle>
              <p className="text-gray-400 text-sm">Correlação completa do funil</p>
              
              {!crossIntegrationActive && (
                <div className="text-xs text-gray-500">
                  Requer: WhatsApp + Google Analytics ({connectedCount}/2)
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  🔗 Rastreamento end-to-end
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  💰 ROI por conversação
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  📊 Funil completo de conversão
                </div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  🎯 Otimização de campanhas
                </div>
              </div>

              {crossIntegrationActive && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">847</div>
                    <div className="text-xs text-gray-400">Conversas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">234</div>
                    <div className="text-xs text-gray-400">Cliques</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-400">45</div>
                    <div className="text-xs text-gray-400">Conversões</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400">320%</div>
                    <div className="text-xs text-gray-400">ROI</div>
                  </div>
                </div>
              )}

              <Button 
                className={`w-full ${
                  crossIntegrationActive 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
                disabled={!crossIntegrationActive}
              >
                {crossIntegrationActive ? 'Ver Dashboard' : `Conectar WhatsApp + Analytics`}
                {crossIntegrationActive ? <TrendingUp className="w-4 h-4 ml-2" /> : <Lock className="w-4 h-4 ml-2" />}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais */}
      {showModal && (
        <IntegrationModal 
          integrationId={showModal}
          onClose={() => setShowModal(null)}
          onSuccess={() => {
            setShowModal(null);
            setTimeout(() => checkIntegrationsStatus(), 1000);
          }}
        />
      )}

      {showCelebration && (
        <CelebrationModal 
          integrationType={showCelebration}
          onClose={() => setShowCelebration(null)}
        />
      )}
    </div>
  );
};

export default Integrations;