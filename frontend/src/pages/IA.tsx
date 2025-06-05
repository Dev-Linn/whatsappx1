import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useApi, apiPut, apiPost } from "@/hooks/useApi";
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
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface PromptData {
  id?: number;
  base_prompt: string;
  clarification_prompt: string;
  qualification_prompt: string;
  is_active: boolean;
  last_updated?: string;
  is_default: boolean;
}

interface PreviewData {
  preview: string;
  aiResponse: string;
  testSuccess: boolean;
  stats: {
    characters: number;
    estimated_tokens: number;
    estimated_cost_brl: string;
  };
}

const IA = () => {
  const [promptData, setPromptData] = useState<PromptData>({
    base_prompt: '',
    clarification_prompt: '',
    qualification_prompt: '',
    is_active: true,
    is_default: true
  });
  
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testMessage, setTestMessage] = useState("Oi, tudo bem?");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { toast } = useToast();
  const { tenant } = useAuth();

  // Carregar prompt atual
  const { data, loading, error, refetch } = useApi<PromptData>('/prompts');

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
        promptData.qualification_prompt !== data.qualification_prompt;
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
        qualification_prompt: promptData.qualification_prompt
      });

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Prompt salvo com sucesso!",
        });
        await refetch();
        setHasUnsavedChanges(false);
      } else {
        throw new Error(result.error || 'Erro ao salvar prompt');
      }
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar prompt. Tente novamente.",
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
        test_message: testMessage
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
          <p className="text-gray-400">Personalize o comportamento do seu chatbot</p>
        </div>

        {/* Status e Informações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <Settings className="h-4 w-4 text-orange-400" />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor de Prompt */}
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-purple-400" />
                  <span>Prompt Principal</span>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-yellow-400">• Não salvo</span>
                  )}
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

                <div className="flex space-x-3">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving || !hasUnsavedChanges}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Prompts Auxiliares */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
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
          </div>

          {/* Preview e Teste */}
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-green-400" />
                  <span>Preview do Prompt</span>
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
                  Gerar Preview
                </Button>

                {previewData && (
                  <div className="border border-gray-600 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Prompt Final:</h4>
                    <div className="bg-gray-900 p-3 rounded text-xs text-gray-300 max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{previewData.preview}</pre>
                    </div>
                    
                    {previewData.aiResponse && (
                      <>
                        <h4 className="text-sm font-medium text-gray-300 mb-2 mt-4">Resposta da IA:</h4>
                        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-3 rounded text-sm text-gray-200">
                          <div className="flex items-start space-x-2">
                            <Bot className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <pre className="whitespace-pre-wrap font-medium">{previewData.aiResponse}</pre>
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
              <>
                {/* Resultado do Teste */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      {previewData.testSuccess ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      )}
                      <span>Status do Teste</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-300">IA Conectada:</span>
                        <span className={`text-sm font-medium ${previewData.testSuccess ? 'text-green-400' : 'text-yellow-400'}`}>
                          {previewData.testSuccess ? 'Sim' : 'Parcial'}
                        </span>
                      </div>
                      {!previewData.testSuccess && (
                        <p className="text-xs text-yellow-400">
                          ⚠️ Chave API do Gemini não configurada - apenas preview do prompt está disponível
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Estatísticas */}
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
              </>
            )}

            {/* Ajuda */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <span>Dicas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-300">
                <p>• Seja específico sobre a personalidade do bot</p>
                <p>• Defina claramente o produto/serviço</p>
                <p>• Inclua exemplos de como responder</p>
                <p>• Evite prompts muito longos para reduzir custos</p>
                <p>• Teste regularmente após mudanças</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IA; 