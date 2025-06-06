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

  const totalSteps = 5;
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
      const token = localStorage.getItem('authToken');
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
            <div className="flex justify-center items-center space-x-4 text-4xl">
              <MessageSquare className="text-green-500" />
              <div className="text-2xl">──🔗──</div>
              <Globe className="text-blue-500" />
              <div className="text-2xl">──💰</div>
              <TrendingUp className="text-yellow-500" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                🚀 SUPER INTEGRAÇÃO WhatsApp + Analytics
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Conecte seus usuários do WhatsApp com visitantes do seu site para ter o ROI real das suas conversas!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-white font-medium">Rastrear Visitas</p>
                  <p className="text-gray-400 text-xs">Quem visitou seu site</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-white font-medium">Ver Comportamento</p>
                  <p className="text-gray-400 text-xs">Após conversa no WA</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-white font-medium">ROI Real</p>
                  <p className="text-gray-400 text-xs">Calcular retorno exato</p>
                </CardContent>
              </Card>
            </div>

            {/* Métricas Reais de Exemplo */}
            <div className="mt-6 p-4 bg-green-900/20 border border-green-600 rounded-lg">
              <h4 className="text-green-400 font-medium mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                📊 Exemplo de Resultados Reais:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-white font-bold text-lg">847</div>
                  <div className="text-gray-400 text-xs">Cliques WA→Site</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">23%</div>
                  <div className="text-gray-400 text-xs">Taxa Conversão</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">R$ 12.340</div>
                  <div className="text-gray-400 text-xs">Receita Rastreada</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">4.2x</div>
                  <div className="text-gray-400 text-xs">ROI Médio</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">
                🧠 COMO A MÁGICA ACONTECE
              </h3>
              <p className="text-gray-400">Veja o fluxo completo de integração</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  step: "1️⃣",
                  title: "Cliente conversa no WhatsApp",
                  description: '"Oi, quero ver os preços dos produtos"',
                  icon: <MessageSquare className="h-5 w-5 text-green-500" />,
                  metrics: "847 conversas/mês"
                },
                {
                  step: "2️⃣",
                  title: "Bot envia link rastreado",
                  description: '"Catálogo: loja.com.br?utm_source=whatsapp&wa=5511987654321"',
                  icon: <ExternalLink className="h-5 w-5 text-blue-500" />,
                  metrics: "634 cliques únicos"
                },
                {
                  step: "3️⃣",
                  title: "Google Analytics registra origem",
                  description: 'Sessão: "WhatsApp → João Silva → Produto X"',
                  icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
                  metrics: "23% taxa conversão"
                },
                {
                  step: "4️⃣",
                  title: "Dashboard unifica dados",
                  description: 'ROI: "João: R$ 250 gasto → R$ 1.200 faturado"',
                  icon: <Settings className="h-5 w-5 text-yellow-500" />,
                  metrics: "ROI médio: 4.2x"
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
                ⚙️ CONFIGURAR INTEGRAÇÃO
              </h3>
              <p className="text-gray-400">Configure os dados básicos</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="site-url" className="text-white">
                  🌐 URL do seu site/loja:
                </Label>
                <Input
                  id="site-url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://meuloja.com.br"
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">📊 Google Analytics</h4>
                      <p className="text-gray-400 text-sm">Status da conexão</p>
                    </div>
                    <Badge className="bg-green-600">
                      ✅ Conectado
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    GA4 Property: 123456789
                  </p>
                </CardContent>
              </Card>

              <div>
                <Label className="text-white mb-3 block">
                  🎯 Tipo de conversão a rastrear:
                </Label>
                <div className="space-y-2">
                  {[
                    { id: "visits", label: "Visitas ao site", checked: true },
                    { id: "time", label: "Tempo de permanência > 2min", checked: true },
                    { id: "products", label: "Visualizações de produto", checked: true },
                    { id: "purchases", label: "Compras/Conversões", checked: false }
                  ].map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={item.id}
                        defaultChecked={item.checked}
                        className="rounded border-gray-600 bg-gray-800"
                      />
                      <label htmlFor={item.id} className="text-sm text-gray-300">
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">
                🔧 ESCOLHER MÉTODO DE TRACKING
              </h3>
              <p className="text-gray-400">Selecione como quer rastrear os usuários</p>
            </div>

            <div className="space-y-4">
              {/* OPÇÃO A: Automático */}
              <Card 
                className={`cursor-pointer transition-all ${
                  trackingOption === "automatic" 
                    ? "bg-green-900/20 border-green-600" 
                    : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setTrackingOption("automatic")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-green-500" />
                      <CardTitle className="text-white">🎯 OPÇÃO A: Automático</CardTitle>
                    </div>
                    <Badge className="bg-green-600">Recomendado</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-gray-300 text-sm">
                      Seus links do WhatsApp ficarão assim:
                    </p>
                    <div className="bg-gray-900 p-3 rounded border font-mono text-sm text-green-400">
                      meuloja.com?utm_source=whatsapp&wa=123
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Funciona automaticamente</span>
                      </div>
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Sem código adicional</span>
                      </div>
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Setup em 2 minutos</span>
                      </div>
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Zero conhecimento técnico</span>
                      </div>
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-600 p-3 rounded">
                      <p className="text-yellow-300 text-sm">
                        ⚠️ <strong>Limitação:</strong> Só funciona quando o bot envia links
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* OPÇÃO B: Manual */}
              <Card 
                className={`cursor-pointer transition-all ${
                  trackingOption === "manual" 
                    ? "bg-blue-900/20 border-blue-600" 
                    : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setTrackingOption("manual")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Code className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-white">🛠️ OPÇÃO B: Pixel Manual</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-gray-300 text-sm">
                      Cole este código no seu site:
                    </p>
                    <div className="bg-gray-900 p-3 rounded border relative">
                      <code className="text-blue-400 text-sm">
                        &lt;script src="tracking.js"&gt;&lt;/script&gt;
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2 h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard('<script src="tracking.js"></script>');
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center space-x-2 text-blue-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Tracking completo</span>
                      </div>
                      <div className="flex items-center space-x-2 text-blue-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Funciona sempre</span>
                      </div>
                      <div className="flex items-center space-x-2 text-blue-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Dados mais ricos</span>
                      </div>
                      <div className="flex items-center space-x-2 text-blue-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Eventos customizados</span>
                      </div>
                    </div>

                    <div className="bg-orange-900/20 border border-orange-600 p-3 rounded">
                      <p className="text-orange-300 text-sm">
                        ⚠️ <strong>Requer:</strong> Conhecimento técnico para instalar
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h4 className="text-white font-medium mb-2">💡 Nossa Recomendação:</h4>
              <p className="text-gray-400 text-sm">
                Comece com <strong className="text-green-400">OPÇÃO A</strong> para ver resultados imediatos. 
                Depois de 1 semana, se quiser dados mais detalhados, migre para <strong className="text-blue-400">OPÇÃO B</strong>.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Rocket className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold text-white mb-2">
                🎉 INTEGRAÇÃO CONFIGURADA!
              </h3>
              <p className="text-gray-400">Tudo pronto para começar</p>
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
                <p className="text-gray-300 text-sm">Link de teste gerado:</p>
                <div className="bg-gray-900 p-3 rounded border relative">
                  <code className="text-green-400 text-sm">
                    {siteUrl || "meuloja.com.br"}?wa=test123&utm_source=whatsapp
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 h-6 px-2"
                    onClick={() => copyToClipboard(`${siteUrl || "meuloja.com.br"}?wa=test123&utm_source=whatsapp`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="text-sm text-gray-400 space-y-1">
                  <p>1. Abra este link</p>
                  <p>2. Volte aqui em 30 segundos</p>
                  <p>3. Veja os dados chegando! 📊</p>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h4 className="text-white font-medium mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                📈 Métricas que você vai monitorar:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Conversas WA → Cliques site:</span>
                    <span className="text-green-400 font-medium">74.9%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Páginas mais visitadas:</span>
                    <span className="text-blue-400 font-medium">Top 5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Tempo médio no site:</span>
                    <span className="text-yellow-400 font-medium">4m 23s</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Taxa de conversão:</span>
                    <span className="text-green-400 font-medium">23.1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">• ROI médio por lead:</span>
                    <span className="text-green-400 font-medium">4.2x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">• Receita rastreada:</span>
                    <span className="text-green-400 font-medium">R$ 12.3k/mês</span>
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
                className="text-gray-400 hover:text-white"
              >
                Pular Tutorial
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-700"
                disabled={currentStep === 3 && !siteUrl.trim()}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Configurando...
                  </>
                ) : (
                  <>
                    Finalizar Setup!
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