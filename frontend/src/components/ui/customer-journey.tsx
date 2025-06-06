import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Globe, 
  MousePointer, 
  MessageCircle, 
  UserCheck, 
  ShoppingCart, 
  Star,
  Clock,
  MapPin,
  Smartphone,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyStep {
  id: string;
  name: string;
  timestamp: string;
  duration?: number; // em minutos
  platform: 'website' | 'whatsapp' | 'both';
  status: 'completed' | 'current' | 'future';
  icon: React.ReactNode;
  description: string;
  details?: {
    page?: string;
    source?: string;
    device?: 'mobile' | 'desktop';
    message?: string;
    agent?: string;
  };
  conversion?: {
    type: 'micro' | 'macro';
    value?: number;
  };
}

interface CustomerJourneyProps {
  steps: JourneyStep[];
  customerInfo: {
    id: string;
    name?: string;
    phone?: string;
    source: string;
    totalValue: number;
    conversionTime: number; // em horas
  };
  className?: string;
}

export const CustomerJourney = ({ 
  steps, 
  customerInfo,
  className = "" 
}: CustomerJourneyProps) => {

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const currentStepIndex = steps.findIndex(s => s.status === 'current');
  const progress = (completedSteps / steps.length) * 100;

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'website': return 'text-blue-400 bg-blue-500/20';
      case 'whatsapp': return 'text-green-400 bg-green-500/20';
      case 'both': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'website': return <Globe className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      case 'both': return <Smartphone className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  return (
    <Card className={cn("bg-gray-800 border-gray-700", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Jornada do Cliente
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "border-0",
              progress >= 80 ? "bg-green-600" : progress >= 50 ? "bg-yellow-600" : "bg-gray-600"
            )}>
              {progress.toFixed(0)}% Completa
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Informações do Cliente */}
        <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Cliente</div>
              <div className="text-white font-medium">
                {customerInfo.name || 'Lead #' + customerInfo.id}
              </div>
              {customerInfo.phone && (
                <div className="text-sm text-gray-300">{customerInfo.phone}</div>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-400">Origem</div>
              <div className="text-blue-400 font-medium">{customerInfo.source}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Valor Total</div>
              <div className="text-green-400 font-medium">
                R$ {customerInfo.totalValue.toLocaleString('pt-BR')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Tempo até Conversão</div>
              <div className="text-yellow-400 font-medium">
                {formatDuration(customerInfo.conversionTime * 60)}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progresso da Jornada</span>
            <span>{completedSteps}/{steps.length} etapas</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Timeline da Jornada */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isFuture = step.status === 'future';

            return (
              <div key={step.id} className="relative">
                {/* Linha de Conexão */}
                {!isLast && (
                  <div 
                    className={cn(
                      "absolute left-6 top-12 w-0.5 h-16 -ml-px",
                      isCompleted ? "bg-green-500" : "bg-gray-600"
                    )}
                  />
                )}

                {/* Step Container */}
                <div className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border transition-all duration-300",
                  isCurrent ? "border-blue-500 bg-blue-900/20 scale-105" :
                  isCompleted ? "border-green-600 bg-green-900/20" :
                  "border-gray-600 bg-gray-700/50"
                )}>
                  {/* Icon Circle */}
                  <div className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                    isCompleted ? "bg-green-600" :
                    isCurrent ? "bg-blue-600" : "bg-gray-600"
                  )}>
                    {step.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">{step.name}</h3>
                        <div className={cn(
                          "px-2 py-1 rounded-full text-xs flex items-center gap-1",
                          getPlatformColor(step.platform)
                        )}>
                          {getPlatformIcon(step.platform)}
                          {step.platform === 'both' ? 'Multi' : step.platform}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">{step.timestamp}</div>
                        {step.duration && (
                          <div className="text-xs text-gray-500">
                            {formatDuration(step.duration)}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-3">{step.description}</p>

                    {/* Detalhes Expandidos */}
                    {step.details && (
                      <div className="space-y-2">
                        {step.details.page && (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="h-3 w-3 text-blue-400" />
                            <span className="text-gray-400">Página:</span>
                            <span className="text-blue-400">{step.details.page}</span>
                          </div>
                        )}
                        {step.details.source && (
                          <div className="flex items-center gap-2 text-sm">
                            <MousePointer className="h-3 w-3 text-green-400" />
                            <span className="text-gray-400">Origem:</span>
                            <span className="text-green-400">{step.details.source}</span>
                          </div>
                        )}
                        {step.details.device && (
                          <div className="flex items-center gap-2 text-sm">
                            {step.details.device === 'mobile' ? 
                              <Smartphone className="h-3 w-3 text-purple-400" /> :
                              <Monitor className="h-3 w-3 text-purple-400" />
                            }
                            <span className="text-gray-400">Dispositivo:</span>
                            <span className="text-purple-400">{step.details.device}</span>
                          </div>
                        )}
                        {step.details.message && (
                          <div className="p-2 bg-gray-600/50 rounded text-sm">
                            <div className="text-gray-400 mb-1">Mensagem:</div>
                            <div className="text-white italic">"{step.details.message}"</div>
                          </div>
                        )}
                        {step.details.agent && (
                          <div className="flex items-center gap-2 text-sm">
                            <UserCheck className="h-3 w-3 text-yellow-400" />
                            <span className="text-gray-400">Atendente:</span>
                            <span className="text-yellow-400">{step.details.agent}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Conversão */}
                    {step.conversion && (
                      <div className={cn(
                        "mt-3 p-2 rounded-lg border flex items-center gap-2",
                        step.conversion.type === 'macro' ? 
                          "border-green-600 bg-green-900/20" : 
                          "border-yellow-600 bg-yellow-900/20"
                      )}>
                        <Star className={cn(
                          "h-4 w-4",
                          step.conversion.type === 'macro' ? "text-green-400" : "text-yellow-400"
                        )} />
                        <span className="text-white text-sm">
                          {step.conversion.type === 'macro' ? 'Conversão Principal' : 'Micro Conversão'}
                        </span>
                        {step.conversion.value && (
                          <span className="text-green-400 font-medium ml-auto">
                            R$ {step.conversion.value.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo Final */}
        <div className="mt-6 pt-6 border-t border-gray-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-blue-400">
                {steps.filter(s => s.platform === 'website').length}
              </div>
              <div className="text-gray-400 text-sm">Touchpoints Site</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-400">
                {steps.filter(s => s.platform === 'whatsapp').length}
              </div>
              <div className="text-gray-400 text-sm">Interações WhatsApp</div>
            </div>
            <div>
              <div className="text-xl font-bold text-purple-400">
                {steps.filter(s => s.conversion).length}
              </div>
              <div className="text-gray-400 text-sm">Conversões</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Dados de exemplo
export const sampleJourneySteps: JourneyStep[] = [
  {
    id: '1',
    name: 'Primeira Visita',
    timestamp: '10/12 - 14:32',
    duration: 3,
    platform: 'website',
    status: 'completed',
    icon: <Globe className="h-5 w-5 text-white" />,
    description: 'Cliente chegou ao site através do Google Ads',
    details: {
      page: '/produtos/smartphone',
      source: 'Google Ads - Campanha Black Friday',
      device: 'mobile'
    }
  },
  {
    id: '2',
    name: 'Visualização Produto',
    timestamp: '10/12 - 14:35',
    duration: 8,
    platform: 'website',
    status: 'completed',
    icon: <MousePointer className="h-5 w-5 text-white" />,
    description: 'Visualizou página do produto por 8 minutos',
    details: {
      page: '/produto/iphone-15-pro',
      device: 'mobile'
    },
    conversion: {
      type: 'micro'
    }
  },
  {
    id: '3',
    name: 'Primeiro Contato WhatsApp',
    timestamp: '10/12 - 14:43',
    duration: 5,
    platform: 'whatsapp',
    status: 'completed',
    icon: <MessageCircle className="h-5 w-5 text-white" />,
    description: 'Cliente iniciou conversa perguntando sobre preços',
    details: {
      message: 'Oi! Vi o iPhone 15 Pro no site. Qual o melhor preço à vista?',
      agent: 'IA Bot'
    }
  },
  {
    id: '4',
    name: 'Negociação',
    timestamp: '10/12 - 15:12',
    duration: 25,
    platform: 'whatsapp',
    status: 'completed',
    icon: <UserCheck className="h-5 w-5 text-white" />,
    description: 'Atendimento humano iniciado, negociação de preço e condições',
    details: {
      message: 'Posso fazer por R$ 4.200 à vista com desconto especial',
      agent: 'Maria Santos'
    },
    conversion: {
      type: 'micro'
    }
  },
  {
    id: '5',
    name: 'Retorno ao Site',
    timestamp: '10/12 - 16:45',
    duration: 4,
    platform: 'website',
    status: 'completed',
    icon: <Globe className="h-5 w-5 text-white" />,
    description: 'Cliente retornou para verificar especificações técnicas',
    details: {
      page: '/produto/iphone-15-pro/especificacoes',
      device: 'desktop'
    }
  },
  {
    id: '6',
    name: 'Fechamento da Venda',
    timestamp: '10/12 - 17:20',
    duration: 15,
    platform: 'whatsapp',
    status: 'completed',
    icon: <ShoppingCart className="h-5 w-5 text-white" />,
    description: 'Cliente confirmou compra e forneceu dados para entrega',
    details: {
      message: 'Ok, vou levar! Como faço o pagamento?',
      agent: 'Maria Santos'
    },
    conversion: {
      type: 'macro',
      value: 4200
    }
  },
  {
    id: '7',
    name: 'Pós-Venda',
    timestamp: '11/12 - 09:15',
    platform: 'whatsapp',
    status: 'current',
    icon: <Star className="h-5 w-5 text-white" />,
    description: 'Follow-up pós-venda e solicitação de avaliação',
    details: {
      message: 'Olá! Seu iPhone chegou bem? Gostaria de avaliar nosso atendimento?',
      agent: 'Bot Pós-Venda'
    }
  }
];

export const sampleCustomerInfo = {
  id: 'CUST-2024-001',
  name: 'João Silva',
  phone: '+55 11 99999-9999',
  source: 'Google Ads - Black Friday',
  totalValue: 4200,
  conversionTime: 2.8 // horas
}; 