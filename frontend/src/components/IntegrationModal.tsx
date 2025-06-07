import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Smartphone, 
  BarChart3, 
  ArrowRight, 
  CheckCircle, 
  Zap, 
  MessageSquare, 
  TrendingUp,
  Users,
  Bot,
  Target,
  Settings,
  ExternalLink,
  Sparkles,
  Globe,
  DollarSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IntegrationModalProps {
  integrationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const IntegrationModal = ({ integrationId, onClose, onSuccess }: IntegrationModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const getIntegrationData = () => {
    switch (integrationId) {
      case 'whatsapp':
        return {
          title: 'WhatsApp Business',
          icon: Smartphone,
          color: 'from-green-500 to-emerald-600',
          totalSteps: 4,
          steps: [
            {
              title: 'Chatbot Inteligente',
              description: 'IA Gemini integrada para conversas naturais',
              features: [
                '🤖 Respostas automáticas inteligentes',
                '🧠 Aprendizado contínuo das conversas',
                '🎯 Qualificação automática de leads',
                '📝 Histórico completo de interações'
              ],
              preview: '💬 "Olá! Como posso ajudar?" → IA analisa e responde automaticamente'
            },
            {
              title: 'Automação 24/7',
              description: 'Atendimento ininterrupto para seus clientes',
              features: [
                '⏰ Funcionamento 24 horas por dia',
                '🚀 Resposta em segundos',
                '📊 Análise de sentimentos em tempo real',
                '🔄 Escalação para humanos quando necessário'
              ],
              preview: '🌙 Mesmo de madrugada, seus leads são atendidos!'
            },
            {
              title: 'Próximo Nível',
              description: 'Desbloqueie integrações avançadas',
              features: [
                '🔓 Acesso a integrações cruzadas',
                '⚡ WhatsApp × Google Analytics',
                '📊 Correlação completa de dados',
                '🎯 ROI por conversa detalhado'
              ],
              preview: '🚀 Conecte Analytics e desbloqueie: WhatsApp × Analytics'
            },
            {
              title: 'Integração Avançada',
              description: 'Conecte com suas outras ferramentas',
              features: [
                '🔗 Sincronização com Google Analytics',
                '📈 Rastreamento de conversões',
                '💰 Cálculo de ROI por conversa',
                '🎯 Otimização baseada em dados'
              ],
              preview: '📊 WhatsApp → Site → Venda = ROI calculado automaticamente'
            }
          ]
        };
      
      case 'analytics':
        return {
          title: 'Google Analytics',
          icon: BarChart3,
          color: 'from-blue-500 to-indigo-600',
          totalSteps: 4,
          steps: [
            {
              title: 'Rastreamento Completo',
              description: 'Veja todos os dados dos seus visitantes',
              features: [
                '👥 Audiência em tempo real',
                '📍 Localização geográfica',
                '📱 Dispositivos utilizados',
                '🔍 Fontes de tráfego'
              ],
              preview: '📈 1,234 visitantes online agora → 67% mobile, 33% desktop'
            },
            {
              title: 'Conversões e ROI',
              description: 'Meça o que realmente importa',
              features: [
                '🎯 Metas e conversões personalizadas',
                '💰 Valor de cada conversão',
                '📊 Funil de vendas detalhado',
                '🔄 Attribution modeling'
              ],
              preview: '💡 Campanha Instagram → 45 conversões → R$ 12.500 em vendas'
            },
            {
              title: 'Relatórios Automáticos',
              description: 'Insights que você precisa, quando precisa',
              features: [
                '📧 Relatórios por email automáticos',
                '📱 Dashboard mobile responsivo',
                '🤖 Insights com IA',
                '🔄 Dados em tempo real'
              ],
              preview: '📨 Toda segunda receba: "Suas vendas subiram 23% esta semana"'
            },
            {
              title: 'Próximo Nível',
              description: 'Desbloqueie integrações avançadas',
              features: [
                '🔓 Acesso a integrações cruzadas',
                '⚡ Analytics × WhatsApp Business',
                '📊 Funil completo de conversão',
                '💰 ROI detalhado por canal'
              ],
              preview: '🚀 Conecte WhatsApp e desbloqueie: Analytics × WhatsApp'
            },
            {
              title: 'Integração Completa',
              description: 'Máximo poder dos seus dados',
              features: [
                '🔗 Sincronização bidirecional',
                '📈 Métricas correlacionadas',
                '🎯 Otimização automática',
                '🧠 Insights com IA avançada'
              ],
              preview: '📊 Tráfego → WhatsApp → Conversão = Dashboard unificado'
            }
          ]
        };
      
      default:
        return null;
    }
  };

  const handleConnect = () => {
    onClose();
    
    // Redirecionar para a página específica da integração
    if (integrationId === 'whatsapp') {
      navigate('/whatsapp-login');
    } else if (integrationId === 'analytics') {
      navigate('/analytics');
    }
    
    // Callback de sucesso será chamado quando voltar da integração
    setTimeout(() => onSuccess(), 2000);
  };

  const integrationData = getIntegrationData();
  
  if (!integrationData) return null;

  const currentStepData = integrationData.steps[currentStep - 1];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4 text-2xl">
            <div className={`p-3 rounded-xl bg-gradient-to-r ${integrationData.color} shadow-lg`}>
              <integrationData.icon className="h-8 w-8 text-white" />
            </div>
            <div>
              <span>Conectar {integrationData.title}</span>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-purple-500 text-white">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Passo {currentStep} de {integrationData.totalSteps}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`bg-gradient-to-r ${integrationData.color} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${(currentStep / integrationData.totalSteps) * 100}%` }}
            />
          </div>

          {/* Step Content */}
          <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${integrationData.color} shadow-lg`}>
                  {currentStep === 1 && <Bot className="h-12 w-12 text-white" />}
                  {currentStep === 2 && <Zap className="h-12 w-12 text-white" />}
                  {currentStep === 3 && <Target className="h-12 w-12 text-white" />}
                  {currentStep === 4 && <TrendingUp className="h-12 w-12 text-white" />}
                </div>
                
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {currentStepData.title}
                  </h3>
                  <p className="text-xl text-gray-300">
                    {currentStepData.description}
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-600">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-blue-400 font-medium">Preview</span>
                </div>
                <p className="text-gray-300 text-lg font-medium">
                  {currentStepData.preview}
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentStepData.features.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-lg border border-gray-700"
                  >
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Special Benefits for Final Step */}
              {currentStep === integrationData.totalSteps && (
                <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-6 rounded-xl border border-purple-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                    <h4 className="text-xl font-bold text-white">🎉 Bônus Exclusivo</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                      <DollarSign className="h-8 w-8 text-green-400 mx-auto mb-2" />
                      <div className="text-lg font-bold text-green-400">R$ 0</div>
                      <div className="text-sm text-gray-400">Taxa de Setup</div>
                    </div>
                    <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                      <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                      <div className="text-lg font-bold text-blue-400">Ilimitado</div>
                      <div className="text-sm text-gray-400">Contatos</div>
                    </div>
                    <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                      <MessageSquare className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                      <div className="text-lg font-bold text-purple-400">24/7</div>
                      <div className="text-sm text-gray-400">Suporte</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <Button 
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              Cancelar
            </Button>

            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button 
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300"
                >
                  Anterior
                </Button>
              )}
              
              {currentStep < integrationData.totalSteps ? (
                <Button 
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className={`bg-gradient-to-r ${integrationData.color} hover:opacity-90`}
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleConnect}
                  className={`bg-gradient-to-r ${integrationData.color} hover:opacity-90 text-lg px-8 py-6`}
                >
                  🚀 Conectar Agora
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-3">
            {Array.from({ length: integrationData.totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i + 1 <= currentStep 
                    ? `bg-gradient-to-r ${integrationData.color}` 
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntegrationModal; 