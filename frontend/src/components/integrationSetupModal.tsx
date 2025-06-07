import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  Zap,
  Code,
  Globe,
  MessageSquare,
  TrendingUp,
  Settings,
  Rocket,
  Monitor
} from "lucide-react";

interface IntegrationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const IntegrationSetupModal = ({ isOpen, onClose, onComplete }: IntegrationSetupModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [siteUrl, setSiteUrl] = useState("");
  const [trackingOption, setTrackingOption] = useState<"automatic" | "manual">("automatic");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência"
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('whatsapp_bot_token');
      const response = await fetch('/api/v1/analytics/integration/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          siteUrl: siteUrl || 'https://exemplo.com.br',
          trackingOption: trackingOption,
          conversionTypes: ['visits', 'time', 'products', 'purchases']
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "🎉 Integração Configurada!",
          description: "WhatsApp + Analytics conectados com sucesso!"
        });
        
        onComplete();
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao configurar integração');
      }
    } catch (error) {
      console.error('Erro ao configurar integração:', error);
      toast({
        variant: "destructive",
        title: "Erro na Configuração",
        description: error.message || "Não foi possível configurar a integração"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center items-center space-x-3 text-3xl mb-4">
              <div className="bg-blue-600 rounded-lg p-2">📘</div>
              <div className="text-xl">→</div>
              <div className="bg-pink-600 rounded-lg p-2">📷</div>
              <div className="text-xl">→</div>
              <div className="bg-red-600 rounded-lg p-2">📧</div>
              <div className="text-xl">→</div>
              <div className="bg-purple-600 rounded-lg p-2">🌐</div>
              <div className="text-xl">→</div>
              <div className="bg-green-600 rounded-lg p-2">💬</div>
              <div className="text-xl">→</div>
              <div className="bg-yellow-600 rounded-lg p-2">💰</div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-white mb-3">
                🚀 VEJA AS POSSIBILIDADES COM GOOGLE ANALYTICS
              </h3>
              <p className="text-gray-300 max-w-2xl mx-auto text-lg">
                Conecte seu <strong>Google Analytics</strong> e desbloqueie funcionalidades incríveis de tracking WhatsApp
              </p>
              <p className="text-green-400 max-w-xl mx-auto mt-2">
                ✨ Correlação automática entre conversas e visitantes do site
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">📘</div>
                  <p className="text-white font-medium">Facebook Ads</p>
                  <p className="text-gray-400 text-xs">Tracking completo</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">📷</div>
                  <p className="text-white font-medium">Instagram</p>
                  <p className="text-gray-400 text-xs">Stories & Posts</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">📧</div>
                  <p className="text-white font-medium">E-mail Mkt</p>
                  <p className="text-gray-400 text-xs">Campanhas & Auto</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">💬</div>
                  <p className="text-white font-medium">WhatsApp</p>
                  <p className="text-gray-400 text-xs">Conversas & Bot</p>
                </CardContent>
              </Card>
            </div>

            {/* Métricas Enterprise de Exemplo */}
            <div className="mt-6 p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-600 rounded-lg">
              <h4 className="text-purple-400 font-bold mb-4 flex items-center text-lg">
                <TrendingUp className="h-5 w-5 mr-2" />
                🏢 RESULTADOS ENTERPRISE REAIS:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-3 text-center">
                    <div className="text-white font-bold text-xl">2.847</div>
                    <div className="text-gray-400 text-xs">Campanhas Ativas</div>
                    <div className="text-gray-300 text-xs">Multi-canal</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-3 text-center">
                    <div className="text-white font-bold text-xl">74.3%</div>
                    <div className="text-gray-400 text-xs">Taxa Tracking</div>
                    <div className="text-gray-300 text-xs">Todas as fontes</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-3 text-center">
                    <div className="text-white font-bold text-xl">R$ 89.4k</div>
                    <div className="text-gray-400 text-xs">Receita Mensal</div>
                    <div className="text-gray-300 text-xs">Rastreada 100%</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-3 text-center">
                    <div className="text-white font-bold text-xl">6.8x</div>
                    <div className="text-gray-400 text-xs">ROI Médio</div>
                    <div className="text-gray-300 text-xs">Todos os canais</div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-3 text-center">
                    <div className="text-white font-bold text-xl">1.234</div>
                    <div className="text-gray-400 text-xs">Leads/mês</div>
                    <div className="text-gray-300 text-xs">Qualificados</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">
                🔗 COMO A INTEGRAÇÃO FUNCIONARÁ
              </h3>
              <p className="text-gray-400">Veja como o WhatsApp + Google Analytics trabalharão juntos</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  step: "1️⃣",
                  title: "Cliente vê sua campanha em QUALQUER lugar",
                  description: 'Facebook: "Promoção 50% OFF" | Instagram: Story com link | E-mail: Newsletter',
                  icon: <Globe className="h-5 w-5 text-blue-500" />,
                  metrics: "Todas as fontes rastreadas"
                },
                {
                  step: "2️⃣",
                  title: "Sistema gera link único para CADA origem",
                  description: 'FB: "loja.com?utm_source=facebook&campaign=promo50" | IG: "loja.com?utm_source=instagram&story=123"',
                  icon: <ExternalLink className="h-5 w-5 text-purple-500" />,
                  metrics: "Tracking ID único por canal"
                },
                {
                  step: "3️⃣",
                  title: "Google Analytics + Sistema correlacionam TUDO",
                  description: 'GA4: "Facebook → João Silva → 4min no site → WhatsApp → Comprou R$ 299"',
                  icon: <TrendingUp className="h-5 w-5 text-green-500" />,
                  metrics: "Journey completo mapeado"
                },
                {
                  step: "4️⃣",
                  title: "Dashboard ENTERPRISE mostra ROI de CADA canal",
                  description: 'Facebook: R$ 500 gasto → R$ 3.400 vendido | Instagram: R$ 200 → R$ 1.800 | E-mail: R$ 50 → R$ 800',
                  icon: <Settings className="h-5 w-5 text-yellow-500" />,
                  metrics: "ROI por canal + total"
                }
              ].map((item, index) => (
                <Card key={index} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{item.step}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            {item.icon}
                            <h4 className="text-white font-medium">{item.title}</h4>
                          </div>
                          <Badge className="bg-green-600 text-xs">
                            {item.metrics}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm italic">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">
                🎯 O QUE VOCÊ PODERÁ FAZER
              </h3>
              <p className="text-gray-400">Funcionalidades que serão liberadas após conectar o Analytics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">🔗</div>
                  <h4 className="text-white font-bold mb-2">Links Rastreados</h4>
                  <p className="text-gray-300 text-sm">
                    Gere links únicos para WhatsApp que se correlacionam automaticamente com visitas do Google Analytics
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <h4 className="text-white font-bold mb-2">Dashboard Unificado</h4>
                  <p className="text-gray-300 text-sm">
                    Veja dados do WhatsApp + Google Analytics em um só lugar com métricas de conversão
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <h4 className="text-white font-bold mb-2">ROI Real</h4>
                  <p className="text-gray-300 text-sm">
                    Calcule o retorno exato: da conversa no WhatsApp até a compra no site
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">🚀</div>
                  <h4 className="text-white font-bold mb-2">Automação Total</h4>
                  <p className="text-gray-300 text-sm">
                    Correlação automática entre mensagens do WhatsApp e sessões do Google Analytics
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
                        <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                📈 EXEMPLO DE RESULTADO
              </h3>
              <p className="text-gray-400">Veja como seus dados aparecerão após a integração</p>
            </div>

            <div className="bg-gray-900 p-4 rounded border border-gray-700 font-mono text-sm">
              <div className="mb-3 text-green-400">🎯 Dashboard Integrado - Exemplo Real:</div>
              <div className="space-y-2 text-gray-300">
                <div className="border-l-2 border-blue-500 pl-3">
                  <div className="text-blue-400">📱 WhatsApp: João Silva (+55 11 99999-9999)</div>
                  <div className="text-xs text-gray-500">├─ Conversa: "Quero ver os produtos" (14:32)</div>
                </div>
                
                <div className="border-l-2 border-green-500 pl-3">
                  <div className="text-green-400">🔗 Link Enviado: loja.com.br/produtos?utm_source=whatsapp</div>
                  <div className="text-xs text-gray-500">├─ Clique registrado (14:35)</div>
                </div>
                
                <div className="border-l-2 border-purple-500 pl-3">
                  <div className="text-purple-400">📊 Google Analytics: Sessão iniciada</div>
                  <div className="text-xs text-gray-500">├─ Origem: WhatsApp | Duração: 4min 23s</div>
                  <div className="text-xs text-gray-500">├─ Páginas: 3 | Produtos visualizados: 2</div>
                </div>
                
                <div className="border-l-2 border-yellow-500 pl-3">
                  <div className="text-yellow-400">💰 Conversão: R$ 149,90</div>
                  <div className="text-xs text-gray-500">└─ ROI: WhatsApp → R$ 149,90 em 8 minutos</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-3">
                  <div className="text-lg font-bold text-white">1 min</div>
                  <div className="text-xs text-gray-400">Tempo para clique</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-3">
                  <div className="text-lg font-bold text-white">4m 23s</div>
                  <div className="text-xs text-gray-400">Tempo no site</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-3">
                  <div className="text-lg font-bold text-white">100%</div>
                  <div className="text-xs text-gray-400">Correlação</div>
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-3">
                  <div className="text-lg font-bold text-white">R$ 149</div>
                  <div className="text-xs text-gray-400">Conversão</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Rocket className="h-16 w-16 mx-auto mb-4 text-purple-500" />
              <h3 className="text-2xl font-bold text-white mb-2">
                🏢 PLATAFORMA ENTERPRISE ATIVADA!
              </h3>
              <p className="text-purple-200">Sua central de marketing analytics está online</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-white font-medium">Site</p>
                  <p className="text-gray-400 text-xs">{siteUrl || "meuloja.com.br"}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-white font-medium">Analytics</p>
                  <p className="text-gray-400 text-xs">Conectado</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <Zap className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-white font-medium">Tracking</p>
                  <p className="text-gray-400 text-xs">
                    {trackingOption === "automatic" ? "Automático" : "Manual"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-green-900/20 border-green-600">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center space-x-2">
                  <span>🧪</span>
                  <span>TESTE AGORA:</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-300 text-sm">Links de teste multi-canal gerados:</p>
                <div className="bg-gray-900 p-3 rounded border relative space-y-1 font-mono text-xs">
                  <div className="text-blue-400">📘 {siteUrl || "empresa.com"}?utm_source=facebook&campaign=test</div>
                  <div className="text-pink-400">📷 {siteUrl || "empresa.com"}?utm_source=instagram&story=test</div>
                  <div className="text-green-400">💬 {siteUrl || "empresa.com"}?utm_source=whatsapp&wa=test123</div>
                  <div className="text-red-400">📧 {siteUrl || "empresa.com"}?utm_source=email&campaign=test</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 h-6 px-2 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                    onClick={() => copyToClipboard(`${siteUrl || "empresa.com"}?utm_source=whatsapp&wa=test123`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="text-sm text-gray-400 space-y-1">
                  <p>1. Teste qualquer um dos links acima</p>
                  <p>2. Volte aqui em 1 minuto</p>
                  <p>3. Veja a correlação automática funcionando! 📊</p>
                  <p className="text-purple-400 font-medium">🚀 Todos os canais já estão sendo rastreados!</p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h4 className="text-purple-400 font-bold mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                🏢 Métricas Enterprise que você vai monitorar:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">• ROI por canal (FB/IG/Email/WA):</span>
                    <span className="text-purple-400 font-medium">Individual</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Journey completo do usuário:</span>
                    <span className="text-blue-400 font-medium">100% mapeado</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Correlação automática:</span>
                    <span className="text-green-400 font-medium">Tempo real</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Performance por campanha:</span>
                    <span className="text-yellow-400 font-medium">Detalhada</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Conversão multi-canal:</span>
                    <span className="text-green-400 font-medium">Unificada</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Dashboard centralizado:</span>
                    <span className="text-purple-400 font-medium">Tempo real</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-600 p-4 rounded-lg">
              <h4 className="text-blue-400 font-medium mb-3 flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                🎯 Preview do Dashboard Integrado:
              </h4>
              <div className="text-xs text-gray-300 font-mono bg-gray-900 p-3 rounded border">
                <div className="mb-2 text-blue-400">📊 WhatsApp + Analytics Dashboard:</div>
                <div className="space-y-1">
                  <div>João Silva • +55 11 98765-4321 • Online há 2min</div>
                  <div className="ml-4 text-green-400">├─ Conversou: "Quero ver os preços" (14:32)</div>
                  <div className="ml-4 text-blue-400">├─ Clicou: loja.com.br/produtos (14:35)</div>
                  <div className="ml-4 text-yellow-400">├─ Visualizou: 3 produtos, 4min no site</div>
                  <div className="ml-4 text-green-400">└─ Converteu: R$ 489,90 • ROI: 3.8x</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">
              Passo {currentStep} de {totalSteps}
            </DialogTitle>
            <div className="flex space-x-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i + 1 <= currentStep ? "bg-green-500" : "bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
          <Progress value={progress} className="mt-2" />
        </DialogHeader>

        <div className="py-6">
          {renderStep()}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <div className="flex space-x-2">
            {currentStep === 1 && (
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Pular Demo
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={currentStep === 3 && !siteUrl.trim()}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Vamos ver as possibilidades...
                  </>
                ) : (
                  <>
                    Ver Demonstração!
                    <Rocket className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntegrationSetupModal; 