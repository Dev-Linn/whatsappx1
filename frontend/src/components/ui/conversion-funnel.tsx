import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, ShoppingCart, Crown, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelStage {
  name: string;
  key: string;
  count: number;
  percentage: number;
  conversionRate?: number;
  color: string;
  icon: React.ReactNode | string;
  description: string;
}

interface ConversionFunnelProps {
  stages: FunnelStage[];
  className?: string;
  interactive?: boolean;
}

export const ConversionFunnel = ({ 
  stages, 
  className = "",
  interactive = true 
}: ConversionFunnelProps) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const maxCount = Math.max(...stages.map(s => s.count));

  // Função para renderizar ícones baseado no nome
  const renderIcon = (iconName: React.ReactNode | string) => {
    if (typeof iconName === 'string') {
      switch (iconName) {
        case 'Users': return <Users className="h-4 w-4 text-white" />;
        case 'UserCheck': return <UserCheck className="h-4 w-4 text-white" />;
        case 'ShoppingCart': return <ShoppingCart className="h-4 w-4 text-white" />;
        case 'Crown': return <Crown className="h-4 w-4 text-white" />;
        case 'UserX': return <UserX className="h-4 w-4 text-white" />;
        default: return <Users className="h-4 w-4 text-white" />;
      }
    }
    return iconName;
  };

  return (
    <Card className={cn("bg-gray-800 border-gray-700", className)}>
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Crown className="mr-2 h-5 w-5" />
          Funil de Conversão WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages && Array.isArray(stages) && stages.length > 0 ? (
            stages.map((stage, index) => {
              // Verificação de segurança
              if (!stage || typeof stage.count !== 'number') {
                console.warn('Stage inválido detectado:', stage);
                return null;
              }
              
              const isSelected = selectedStage === stage.key;
              const nextStage = stages[index + 1];
              const conversionToNext = nextStage && nextStage.count && stage.count
                ? ((nextStage.count / stage.count) * 100).toFixed(1)
                : null;

            return (
              <div key={stage.key} className="relative">
                {/* Stage Container */}
                <div 
                  className={cn(
                    "p-4 rounded-lg border transition-all duration-300 cursor-pointer",
                    isSelected 
                      ? "border-blue-500 bg-blue-900/20 scale-105" 
                      : "border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700",
                    interactive && "hover:scale-102"
                  )}
                  onClick={() => interactive && setSelectedStage(
                    selectedStage === stage.key ? null : stage.key
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                                             <div className={cn(
                         "p-2 rounded-lg",
                         stage.color
                       )}>
                         {renderIcon(stage.icon)}
                       </div>
                      <div>
                        <h3 className="text-white font-medium">{stage.name}</h3>
                        <p className="text-gray-400 text-sm">{stage.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {stage.count.toLocaleString('pt-BR')}
                      </div>
                      <div className="text-sm text-gray-400">
                        {stage.percentage.toFixed(1)}% do total
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative mb-3">
                    <div className="w-full bg-gray-600 rounded-full h-3">
                      <div 
                        className={cn(
                          "h-3 rounded-full transition-all duration-1000 ease-out",
                          stage.color.replace('bg-', 'bg-').replace('/20', '')
                        )}
                        style={{ 
                          width: `${(stage.count / maxCount) * 100}%`,
                          animationDelay: `${index * 200}ms`
                        }}
                      />
                    </div>
                    <div className="absolute right-0 top-4 text-xs text-gray-400">
                      {((stage.count / maxCount) * 100).toFixed(1)}% do maior
                    </div>
                  </div>

                  {/* Conversion Rate to Next Stage */}
                  {conversionToNext && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">
                        Conversão para próximo estágio
                      </span>
                      <Badge 
                        variant={parseFloat(conversionToNext) > 20 ? "default" : "secondary"}
                        className={parseFloat(conversionToNext) > 20 ? "bg-green-600" : "bg-yellow-600"}
                      >
                        {conversionToNext}%
                      </Badge>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-600 animate-slide-down">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Tempo médio neste estágio</div>
                          <div className="text-white font-medium">2.5 dias</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Taxa de abandono</div>
                          <div className="text-white font-medium">
                            {nextStage ? (100 - parseFloat(conversionToNext!)).toFixed(1) : 0}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Crescimento (7 dias)</div>
                          <div className="text-green-400 font-medium">+12.5%</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Ações sugeridas</div>
                          <div className="text-blue-400 font-medium cursor-pointer hover:underline">
                            Ver estratégias
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Arrow to Next Stage */}
                {index < stages.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-gray-500" />
                  </div>
                )}
              </div>
            );
          })
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg">📊 Carregando dados do funil...</div>
              <div className="text-gray-500 text-sm mt-2">Aguarde enquanto coletamos as informações</div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {stages && stages.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-600">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {stages.length > 1 && stages[0]?.count && stages[stages.length - 1]?.count
                    ? ((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)
                    : '0'
                  }%
                </div>
                <div className="text-gray-400 text-sm">Conversão Geral</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {stages.reduce((acc, stage) => acc + (stage?.count || 0), 0).toLocaleString('pt-BR')}
                </div>
                <div className="text-gray-400 text-sm">Total Leads</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {stages[stages.length - 1]?.count?.toLocaleString('pt-BR') || '0'}
                </div>
                <div className="text-gray-400 text-sm">Clientes</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Exemplo de dados para usar no componente
export const sampleFunnelData: FunnelStage[] = [
  {
    name: "Leads Frios",
    key: "lead_frio",
    count: 1250,
    percentage: 100,
    color: "bg-gray-500",
    icon: <Users className="h-4 w-4 text-white" />,
    description: "Primeiro contato via WhatsApp"
  },
  {
    name: "Interessados",
    key: "interessado", 
    count: 425,
    percentage: 34,
    color: "bg-yellow-500",
    icon: <UserCheck className="h-4 w-4 text-white" />,
    description: "Demonstraram interesse no produto"
  },
  {
    name: "Negociando",
    key: "negociando",
    count: 156,
    percentage: 12.5,
    color: "bg-orange-500",
    icon: <ShoppingCart className="h-4 w-4 text-white" />,
    description: "Em processo de negociação ativa"
  },
  {
    name: "Clientes",
    key: "cliente",
    count: 89,
    percentage: 7.1,
    color: "bg-green-500", 
    icon: <Crown className="h-4 w-4 text-white" />,
    description: "Conversão realizada com sucesso"
  }
]; 