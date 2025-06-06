import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Clock, Target, Heart, Zap, Brain, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIMetrics {
  avgResponseTime: number; // em segundos
  accuracy: number; // percentual 0-100
  autoResolved: number; // percentual 0-100
  satisfaction: number; // 1-5 estrelas
  totalProcessed: number;
  errorsToday: number;
  lastInsight: string;
  status: 'active' | 'slow' | 'error' | 'offline';
  uptime: number; // percentual 0-100
  tokensUsed: number;
  tokensLimit: number;
}

interface AIStatusWidgetProps {
  metrics: AIMetrics;
  className?: string;
  showDetails?: boolean;
}

export const AIStatusWidget = ({ 
  metrics, 
  className = "",
  showDetails = true 
}: AIStatusWidgetProps) => {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'slow': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'slow': return 'Lento';
      case 'error': return 'Com Erro';
      case 'offline': return 'Offline';
      default: return 'Desconhecido';
    }
  };

  const getPerformanceLevel = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return { color: 'text-green-400', bg: 'bg-green-400' };
    if (value >= thresholds.fair) return { color: 'text-yellow-400', bg: 'bg-yellow-400' };
    return { color: 'text-red-400', bg: 'bg-red-400' };
  };

  const responseTimeLevel = getPerformanceLevel(
    metrics.avgResponseTime > 10 ? 0 : metrics.avgResponseTime > 5 ? 50 : 100,
    { good: 80, fair: 50 }
  );

  const accuracyLevel = getPerformanceLevel(metrics.accuracy, { good: 85, fair: 70 });
  const satisfactionLevel = getPerformanceLevel((metrics.satisfaction / 5) * 100, { good: 80, fair: 60 });

  return (
    <Card className={cn("bg-gray-800 border-gray-700", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            Assistente IA
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor(metrics.status))} />
            <Badge variant="outline" className="border-gray-600">
              {getStatusText(metrics.status)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Métricas Principais */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Tempo Resposta</span>
            </div>
            <div className={cn("text-xl font-bold", responseTimeLevel.color)}>
              {metrics.avgResponseTime.toFixed(1)}s
            </div>
            <div className="text-xs text-gray-500">
              {metrics.avgResponseTime < 3 ? 'Excelente' : 
               metrics.avgResponseTime < 6 ? 'Bom' : 'Precisa melhorar'}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Acurácia</span>
            </div>
            <div className={cn("text-xl font-bold", accuracyLevel.color)}>
              {metrics.accuracy.toFixed(1)}%
            </div>
            <Progress 
              value={metrics.accuracy} 
              className="h-2"
              // className={`h-2 [&>*]:${accuracyLevel.bg}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Auto-Resolvidas</span>
            </div>
            <div className="text-xl font-bold text-blue-400">
              {metrics.autoResolved.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              {metrics.totalProcessed} mensagens hoje
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Satisfação</span>
            </div>
            <div className={cn("text-xl font-bold", satisfactionLevel.color)}>
              {metrics.satisfaction.toFixed(1)}/5
            </div>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className={cn(
                    "w-3 h-3 rounded-full mr-1",
                    star <= metrics.satisfaction ? "bg-yellow-400" : "bg-gray-600"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {showDetails && (
          <>
            {/* Status Detalhado */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Uptime (24h)</span>
                <span className="text-green-400 font-medium">{metrics.uptime.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.uptime} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Uso de Tokens</span>
                <span className="text-blue-400 font-medium">
                  {((metrics.tokensUsed / metrics.tokensLimit) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(metrics.tokensUsed / metrics.tokensLimit) * 100} 
                className="h-2" 
              />
              <div className="text-xs text-gray-500 text-right">
                {metrics.tokensUsed.toLocaleString()} / {metrics.tokensLimit.toLocaleString()} tokens
              </div>
            </div>

            {/* Último Insight */}
            <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/20">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-400 mb-1">Último Insight IA</div>
                  <div className="text-white text-sm leading-relaxed">
                    {metrics.lastInsight}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Há 2 horas • Confiança: 87%
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
                Otimizar
              </button>
              <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
                Relatório
              </button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded-lg transition-colors">
                ⚙️
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Dados de exemplo para usar no componente
export const sampleAIMetrics: AIMetrics = {
  avgResponseTime: 2.4,
  accuracy: 87.5,
  autoResolved: 73.2,
  satisfaction: 4.2,
  totalProcessed: 156,
  errorsToday: 3,
  lastInsight: "Detectei que entre 14h-16h você recebe 40% mais mensagens sobre 'preços'. Considere ter respostas automáticas mais específicas sobre valores neste horário.",
  status: 'active',
  uptime: 99.2,
  tokensUsed: 85420,
  tokensLimit: 100000
}; 