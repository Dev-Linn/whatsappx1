import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Trophy, 
  Zap, 
  TrendingUp, 
  Link2, 
  ArrowRight,
  CheckCircle,
  DollarSign,
  Users,
  MessageSquare,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CelebrationModalProps {
  integrationType: string;
  onClose: () => void;
}

const CelebrationModal = ({ integrationType, onClose }: CelebrationModalProps) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setShowConfetti(true);
    // Auto-close após 8 segundos
    const timer = setTimeout(() => {
      onClose();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIntegrationData = () => {
    switch (integrationType) {
      case 'whatsapp-analytics':
        return {
          title: 'WhatsApp × Analytics',
          subtitle: 'Integração Avançada Desbloqueada!',
          description: 'Agora você pode rastrear o caminho completo dos seus leads',
          color: 'from-purple-500 to-pink-600',
          features: [
            {
              icon: Link2,
              title: 'Rastreamento End-to-End',
              description: 'WhatsApp → Site → Conversão'
            },
            {
              icon: DollarSign,
              title: 'ROI por Conversa',
              description: 'Veja o valor de cada interação'
            },
            {
              icon: TrendingUp,
              title: 'Otimização Automática',
              description: 'IA sugere melhorias baseadas em dados'
            },
            {
              icon: Target,
              title: 'Segmentação Avançada',
              description: 'Públicos personalizados por comportamento'
            }
          ],
          metrics: {
            conversations: '847',
            clicks: '234',
            conversions: '45', 
            roi: '326%'
          }
        };
      default:
        return null;
    }
  };

  const handleViewDashboard = () => {
    onClose();
    navigate('/whatsapp-analytics-dashboard');
  };

  const integrationData = getIntegrationData();
  
  if (!integrationData) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white overflow-hidden">
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <Sparkles 
                  className={`h-4 w-4 ${
                    i % 4 === 0 ? 'text-purple-400' :
                    i % 4 === 1 ? 'text-pink-400' :
                    i % 4 === 2 ? 'text-yellow-400' : 'text-blue-400'
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="relative z-10 space-y-8 p-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <div className="relative">
              <div className={`inline-flex p-6 rounded-3xl bg-gradient-to-r ${integrationData.color} shadow-2xl`}>
                <Trophy className="h-16 w-16 text-white animate-pulse" />
              </div>
              <div className="absolute -top-2 -right-2">
                <div className="bg-yellow-400 text-black p-2 rounded-full animate-spin">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                🎉 Parabéns!
              </h2>
              <h3 className="text-3xl font-bold text-white mb-2">
                {integrationData.title}
              </h3>
              <p className="text-xl text-purple-300 font-medium">
                {integrationData.subtitle}
              </p>
              <p className="text-lg text-gray-300 mt-4 max-w-2xl mx-auto">
                {integrationData.description}
              </p>
            </div>

            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-full border border-purple-500/30 animate-pulse">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="text-purple-300 font-semibold">Status: Integração Ativa</span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrationData.features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-gray-800/50 backdrop-blur border-gray-700 hover:border-purple-500/50 transition-all hover:scale-105"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${integrationData.color} shadow-lg`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-gray-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Live Metrics Preview */}
          <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur border-purple-500/30">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h4 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                  Primeiras Métricas Integradas
                </h4>
                <p className="text-gray-300 mt-2">Dados em tempo real da sua nova integração</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                  <MessageSquare className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-400">{integrationData.metrics.conversations}</div>
                  <div className="text-sm text-gray-400">Conversas</div>
                </div>
                <div className="text-center p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                  <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-400">{integrationData.metrics.clicks}</div>
                  <div className="text-sm text-gray-400">Cliques no Site</div>
                </div>
                <div className="text-center p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                  <Target className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-400">{integrationData.metrics.conversions}</div>
                  <div className="text-sm text-gray-400">Conversões</div>
                </div>
                <div className="text-center p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                  <DollarSign className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-400">{integrationData.metrics.roi}</div>
                  <div className="text-sm text-gray-400">ROI</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleViewDashboard}
              className={`bg-gradient-to-r ${integrationData.color} hover:opacity-90 text-lg px-8 py-6 text-white font-semibold`}
            >
              🚀 Ver Dashboard Completo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-8 py-6"
            >
              Continuar Explorando
            </Button>
          </div>

          {/* Footer Message */}
          <div className="text-center p-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-xl border border-green-500/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400 font-semibold">Tudo configurado automaticamente!</span>
            </div>
            <p className="text-gray-300 text-sm">
              Sua integração já está funcionando e coletando dados. Nenhuma configuração adicional necessária.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CelebrationModal; 