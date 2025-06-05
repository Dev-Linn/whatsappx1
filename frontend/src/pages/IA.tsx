import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useApi, apiPut, apiPost, apiGet } from "@/hooks/useApi";
import { 
  Bot, 
  Save, 
  Eye, 
  Settings, 
  Zap,
  FileText,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Brain,
  Star,
  Clock,
  Shield,
  Cpu
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PromptData {
  id?: number;
  base_prompt: string;
  clarification_prompt: string;
  qualification_prompt: string;
  ai_model: string;
  is_active: boolean;
  last_updated?: string;
  is_default: boolean;
}

interface PreviewData {
  preview: string;
  aiResponse: string;
  testSuccess: boolean;
  modelUsed: string;
  stats: {
    characters: number;
    estimated_tokens: number;
    estimated_cost_brl: string;
  };
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  available: boolean;
  recommended: boolean;
  features: string[];
}

const IA = () => {
  const [promptData, setPromptData] = useState<PromptData>({
    base_prompt: '',
    clarification_prompt: '',
    qualification_prompt: '',
    ai_model: 'gemini-1.5-flash',
    is_active: true,
    is_default: true
  });
  
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testMessage, setTestMessage] = useState("Oi, tudo bem?");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { toast } = useToast();
  const { tenant } = useAuth();

  // Carregar prompt atual
  const { data, loading, error, refetch } = useApi<PromptData>('/prompts');

  // Carregar modelos disponíveis
  useEffect(() => {
    const loadModels = async () => {
      try {
        const result = await apiGet('/prompts/models');
        if (result.success) {
          setAvailableModels(result.data as AIModel[]);
        }
      } catch (error) {
        console.error('Erro ao carregar modelos:', error);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (data && !loading) {
      setPromptData(data);
      setHasUnsavedChanges(false);
    }
  }, [data, loading]);

  // Detectar mudanças não salvas
  useEffect(() => {
    if (data && promptData) {
      const hasChanges = 
        promptData.base_prompt !== data.base_prompt ||
        promptData.clarification_prompt !== data.clarification_prompt ||
        promptData.qualification_prompt !== data.qualification_prompt ||
        promptData.ai_model !== data.ai_model;
      setHasUnsavedChanges(hasChanges);
    }
  }, [promptData, data]);

  const handleSave = async () => {
    if (!promptData.base_prompt?.trim()) {
      toast({
        title: "Erro",
        description: "O prompt base é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiPut('/prompts', {
        base_prompt: promptData.base_prompt,
        clarification_prompt: promptData.clarification_prompt,
        qualification_prompt: promptData.qualification_prompt,
        ai_model: promptData.ai_model
      });

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso!",
        });
        await refetch();
        setHasUnsavedChanges(false);
      } else {
        throw new Error(result.error || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!promptData.base_prompt?.trim()) {
      toast({
        title: "Erro",
        description: "Digite um prompt para visualizar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiPost('/prompts/test', {
        base_prompt: promptData.base_prompt,
        test_message: testMessage,
        ai_model: promptData.ai_model
      });

      if (result.success) {
        setPreviewData(result.data as PreviewData);
      } else {
        throw new Error(result.error || 'Erro ao gerar preview');
      }
    } catch (error) {
      console.error('Erro ao gerar preview:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar preview. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getModelIcon = (modelId: string) => {
    if (modelId.includes('2.5')) return <Cpu className="h-4 w-4" />;
    if (modelId.includes('2.0')) return <Zap className="h-4 w-4" />;
    if (modelId.includes('pro')) return <Shield className="h-4 w-4" />;
    return <Bot className="h-4 w-4" />;
  };

  const selectedModel = availableModels.find(model => model.id === promptData.ai_model);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-400 font-semibold mb-2">Erro ao carregar dados</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Configurações de IA</h1>
          <p className="text-gray-400">Personalize o comportamento e modelo do seu chatbot</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Modelo Atual</CardTitle>
              <Brain className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {getModelIcon(promptData.ai_model)}
                <span className="text-white text-sm font-medium">
                  {selectedModel?.name || promptData.ai_model}
                </span>
                {selectedModel?.recommended && (
                  <Star className="h-3 w-3 text-yellow-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedModel?.available ? 'Disponível' : 'Em breve'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Status do Prompt</CardTitle>
              <Bot className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {promptData.is_default ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <span className="text-yellow-400 text-sm">Padrão</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 text-sm">Personalizado</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {promptData.is_default ? 'Usando prompt padrão do sistema' : 'Usando prompt personalizado'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Tamanho do Prompt</CardTitle>
              <FileText className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {promptData.base_prompt?.length || 0}
              </div>
              <p className="text-xs text-gray-400">caracteres</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Última Atualização</CardTitle>
              <Clock className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-white">
                {promptData.last_updated 
                  ? new Date(promptData.last_updated).toLocaleDateString('pt-BR')
                  : 'Nunca'
                }
              </div>
              <p className="text-xs text-gray-400">última modificação</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Seleção de Modelo AI */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <span>Modelo de IA</span>
                  {hasUnsavedChanges && (
                    <Badge variant="secondary" className="text-yellow-400 bg-yellow-400/10">
                      Não salvo
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Escolha o modelo para seu chatbot
                  </label>
                  <Select 
                    value={promptData.ai_model} 
                    onValueChange={(value) => setPromptData(prev => ({ ...prev, ai_model: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Selecione um modelo" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {availableModels.map((model) => (
                        <SelectItem 
                          key={model.id} 
                          value={model.id}
                          disabled={!model.available}
                          className="text-white hover:bg-gray-600"
                        >
                          <div className="flex items-center space-x-2 w-full">
                            {getModelIcon(model.id)}
                            <span className="flex-1">{model.name}</span>
                            {model.recommended && <Star className="h-3 w-3 text-yellow-400" />}
                            {!model.available && (
                              <Badge variant="secondary" className="text-xs">Em breve</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedModel && (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-purple-400 mt-1">
                        {getModelIcon(selectedModel.id)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{selectedModel.name}</h4>
                        <p className="text-gray-300 text-sm mb-3">{selectedModel.description}</p>
                        
                        {/* Alerta se o modelo não está disponível */}
                        {!selectedModel.available && (
                          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2 mb-3">
                            <div className="flex items-center space-x-2 text-yellow-300 text-xs">
                              <Clock className="h-3 w-3" />
                              <span>Este modelo estará disponível em breve</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Dica para modelos Pro */}
                        {selectedModel.id.includes('pro') && (
                          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-2 mb-3">
                            <div className="flex items-center space-x-2 text-blue-300 text-xs">
                              <Shield className="h-3 w-3" />
                              <span>Modelos Pro têm limites menores na versão gratuita</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {selectedModel.features.map((feature, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Editor de Prompt */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                  <span>Prompt Principal</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={promptData.base_prompt}
                  onChange={(e) => setPromptData(prev => ({ ...prev, base_prompt: e.target.value }))}
                  placeholder="Digite o prompt principal do seu chatbot..."
                  className="min-h-[300px] bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                />
                
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{promptData.base_prompt?.length || 0}/10000 caracteres</span>
                  <span>~{Math.ceil((promptData.base_prompt?.length || 0) / 4)} tokens</span>
                </div>
              </CardContent>
            </Card>

            {/* Prompts Auxiliares */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-orange-400" />
                  <span>Prompts Auxiliares</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prompt de Esclarecimento
                  </label>
                  <Textarea
                    value={promptData.clarification_prompt}
                    onChange={(e) => setPromptData(prev => ({ ...prev, clarification_prompt: e.target.value }))}
                    placeholder="Como pedir esclarecimentos..."
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Prompt de Qualificação
                  </label>
                  <Textarea
                    value={promptData.qualification_prompt}
                    onChange={(e) => setPromptData(prev => ({ ...prev, qualification_prompt: e.target.value }))}
                    placeholder="Como qualificar leads..."
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Botão Salvar */}
            <div className="flex space-x-3">
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasUnsavedChanges}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </div>

          {/* Preview e Teste */}
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-green-400" />
                  <span>Testar Modelo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mensagem de Teste
                  </label>
                  <Textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Digite uma mensagem para testar..."
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handlePreview} 
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Testar Resposta
                </Button>

                {previewData && (
                  <div className="border border-gray-600 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">Modelo usado:</span>
                      <div className="flex items-center space-x-1">
                        {getModelIcon(previewData.modelUsed)}
                        <span className="text-white font-medium">{previewData.modelUsed}</span>
                      </div>
                    </div>
                    
                    {previewData.aiResponse && (
                      <>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Resposta da IA:</h4>
                        <div className={`border p-3 rounded text-sm ${
                          previewData.testSuccess 
                            ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30 text-gray-200'
                            : 'bg-red-900/20 border-red-500/30 text-red-200'
                        }`}>
                          <div className="flex items-start space-x-2">
                            {previewData.testSuccess ? (
                              <Bot className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              {previewData.testSuccess ? (
                                <pre className="whitespace-pre-wrap font-medium break-words">{previewData.aiResponse}</pre>
                              ) : (
                                <div className="space-y-2">
                                  <div className="font-medium text-red-300">Erro na API:</div>
                                  <div className="text-xs bg-red-900/30 p-2 rounded border border-red-500/30 break-all max-h-24 overflow-y-auto">
                                    {previewData.aiResponse.includes('GoogleGenerativeAI Error') ? (
                                      <>
                                        <div className="font-semibold mb-1">⚠️ Quota da API excedida</div>
                                        <div>O modelo {previewData.modelUsed} atingiu o limite de uso.</div>
                                        <div className="mt-1 text-red-300">
                                          💡 Dica: Tente usar um modelo diferente ou aguarde alguns minutos.
                                        </div>
                                      </>
                                    ) : (
                                      <div className="font-mono">{previewData.aiResponse}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {previewData.testSuccess && (
                            <div className="flex items-center space-x-1 mt-2 pt-2 border-t border-purple-500/20">
                              <CheckCircle className="h-3 w-3 text-green-400" />
                              <span className="text-xs text-green-400">Teste realizado com sucesso</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas */}
            {previewData && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-yellow-400" />
                    <span>Estatísticas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-lg font-bold text-white">
                        {previewData.stats.characters}
                      </div>
                      <p className="text-xs text-gray-400">caracteres</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">
                        {previewData.stats.estimated_tokens}
                      </div>
                      <p className="text-xs text-gray-400">tokens estimados</p>
                    </div>
                    <div className="col-span-2">
                      <div className="text-lg font-bold text-white">
                        R$ {previewData.stats.estimated_cost_brl}
                      </div>
                      <p className="text-xs text-gray-400">custo estimado por mensagem</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dicas */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <span>Dicas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-300">
                <p>• <strong>Flash:</strong> Modelos rápidos e econômicos</p>
                <p>• <strong>Pro:</strong> Modelos com melhor qualidade</p>
                <p>• <strong>2.0+:</strong> Versões mais avançadas</p>
                <p>• Teste diferentes modelos para achar o ideal</p>
                <p>• Modelos "Em breve" aparecerão automaticamente</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IA; 