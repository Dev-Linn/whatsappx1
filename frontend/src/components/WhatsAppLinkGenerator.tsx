import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  ExternalLink,
  Link2,
  QrCode,
  MessageSquare,
  TrendingUp,
  Zap
} from "lucide-react";

interface WhatsAppLinkGeneratorProps {
  isIntegrationConfigured: boolean;
}

const WhatsAppLinkGenerator = ({ isIntegrationConfigured }: WhatsAppLinkGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [linkType, setLinkType] = useState("website");
  const [whatsappNumber, setWhatsappNumber] = useState("5534999999999");
  const [defaultMessage, setDefaultMessage] = useState("");
  const [useIntermediatePage, setUseIntermediatePage] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateLink = async () => {
    console.log('🔍 [DEBUG] Botão clicado! Tipo:', linkType);
    console.log('🔍 [DEBUG] Dados:', { 
      linkType, 
      baseUrl: baseUrl.trim(), 
      whatsappNumber: whatsappNumber.trim(),
      defaultMessage: defaultMessage.trim(),
      campaignName: campaignName.trim(),
      useIntermediatePage 
    });

    // Validações baseadas no tipo de link
    if (linkType === 'whatsapp') {
      if (!whatsappNumber.trim()) {
        console.log('❌ [DEBUG] Número do WhatsApp vazio');
        toast({
          variant: "destructive",
          title: "Número obrigatório",
          description: "Por favor, insira o número do WhatsApp"
        });
        return;
      }
    } else {
      if (!baseUrl.trim()) {
        console.log('❌ [DEBUG] URL vazia');
        toast({
          variant: "destructive",
          title: "URL obrigatória",
          description: "Por favor, insira a URL do destino"
        });
        return;
      }
    }

    console.log('✅ [DEBUG] Validações passaram, fazendo requisição...');
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('whatsapp_bot_token');
      console.log('🔍 [DEBUG] Token:', token ? `${token.substring(0, 20)}...` : 'NULL');
      
      const requestBody = {
        linkType: linkType,
        destinationUrl: linkType !== 'whatsapp' ? baseUrl.trim() : null,
        whatsappNumber: linkType === 'whatsapp' ? whatsappNumber.trim() : null,
        message: linkType === 'whatsapp' ? defaultMessage.trim() : null,
        campaignName: campaignName.trim() || 'whatsapp_campaign',
        useIntermediatePage: linkType === 'whatsapp' ? useIntermediatePage : false,
        defaultMessage: linkType === 'whatsapp' ? defaultMessage.trim() : null
      };
      
      console.log('🔍 [DEBUG] Request body:', requestBody);
      
      const response = await fetch('/api/v1/analytics/integration/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔍 [DEBUG] Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ [DEBUG] Response data:', result);
        setGeneratedLink(result.trackedUrl);
        
        toast({
          title: "✅ Link Gerado!",
          description: "Link rastreado criado com sucesso"
        });
      } else {
        const error = await response.json();
        console.error('❌ [DEBUG] Response error:', error);
        throw new Error(error.error || error.message || 'Erro ao gerar link');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Catch error:', error);
      toast({
        variant: "destructive",
        title: "Erro na Geração",
        description: error.message || "Não foi possível gerar o link rastreado"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "📋 Copiado!",
      description: "Link copiado para a área de transferência"
    });
  };

  const resetForm = () => {
    setBaseUrl("");
    setCampaignName("");
    setLinkType("website");
    setWhatsappNumber("5534999999999");
    setDefaultMessage("");
    setUseIntermediatePage(false);
    setGeneratedLink("");
  };

  if (!isIntegrationConfigured) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Link2 className="h-4 w-4 mr-2" />
          Gerar Link Rastreado
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-green-500" />
            Gerar Link Rastreado para WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!generatedLink ? (
            <>
              {/* Formulário de Geração */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="link-type" className="text-white">
                    🔗 Tipo de Link:
                  </Label>
                  <select
                    id="link-type"
                    value={linkType}
                    onChange={(e) => setLinkType(e.target.value)}
                    className="mt-1 w-full p-2 bg-gray-800 border border-gray-700 text-white rounded-md"
                  >
                    <option value="website">🌐 Site/Página Web</option>
                    <option value="whatsapp">📱 WhatsApp Direto</option>
                    <option value="custom">🔧 Link Personalizado</option>
                  </select>
                </div>

                {linkType === 'website' || linkType === 'custom' ? (
                  <div>
                    <Label htmlFor="base-url" className="text-white">
                      🌐 URL do destino:
                    </Label>
                    <Input
                      id="base-url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://meuloja.com.br/produtos"
                      className="mt-1 bg-gray-800 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      URL completa da página que você quer rastrear
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="whatsapp-number" className="text-white">
                      📱 Número do WhatsApp:
                    </Label>
                    <Input
                      id="whatsapp-number"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="5534999999999"
                      className="mt-1 bg-gray-800 border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Número com código do país (ex: 5534999999999)
                    </p>
                  </div>
                )}

                {linkType === 'whatsapp' && (
                  <>
                    <div>
                      <Label htmlFor="default-message" className="text-white">
                        💬 Mensagem Padrão:
                      </Label>
                      <textarea
                        id="default-message"
                        value={defaultMessage}
                        onChange={(e) => setDefaultMessage(e.target.value)}
                        placeholder="Olá! Vim através do link rastreado."
                        className="mt-1 w-full p-2 bg-gray-800 border border-gray-700 text-white rounded-md resize-none"
                        rows={3}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Mensagem que aparecerá pré-preenchida no WhatsApp
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="use-intermediate"
                        checked={useIntermediatePage}
                        onChange={(e) => setUseIntermediatePage(e.target.checked)}
                        className="rounded bg-gray-800 border-gray-700"
                      />
                      <Label htmlFor="use-intermediate" className="text-white text-sm">
                        🎯 Usar página intermediária (coleta mais dados)
                      </Label>
                    </div>
                    <p className="text-xs text-gray-400 ml-6">
                      Mostra uma página antes de abrir o WhatsApp para coletar localização e tempo
                    </p>
                  </>
                )}

                <div>
                  <Label htmlFor="campaign-name" className="text-white">
                    🎯 Nome da campanha (opcional):
                  </Label>
                  <Input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="promocao_dezembro, produto_x, etc."
                    className="mt-1 bg-gray-800 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Ajuda a identificar a origem do tráfego nos relatórios
                  </p>
                </div>
              </div>

              {/* Preview do que será gerado */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">
                    📊 Preview do Link Rastreado:
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 p-3 rounded border font-mono text-xs break-all">
                    {linkType === 'whatsapp' ? (
                      <>
                        <span className="text-green-400">https://lucrogourmet.shop/track/TRACKING_ID</span>
                        <span className="text-blue-400">?tenant=TENANT_ID</span>
                        <div className="mt-2 text-yellow-400">
                          👆 {useIntermediatePage ? 'Página intermediária' : 'Redirecionamento direto'} para:
                        </div>
                        <div className="text-green-400 mt-1">
                          https://wa.me/{whatsappNumber.replace(/\D/g, '') || '5534999999999'}?text=
                          {encodeURIComponent(defaultMessage || 'Olá! Vim através do link rastreado.')}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-green-400">https://lucrogourmet.shop/track/TRACKING_ID</span>
                        <span className="text-blue-400">?tenant=TENANT_ID&url={baseUrl || 'https://meuloja.com.br'}</span>
                        <div className="mt-2 text-yellow-400">
                          👆 Redirecionamento direto para: {baseUrl || 'https://meuloja.com.br/produtos'}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {linkType === 'whatsapp' && useIntermediatePage 
                      ? 'Coletará localização, tempo na página e outros dados antes de abrir WhatsApp'
                      : 'Este link permitirá rastrear cada clique e conversão'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Benefícios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-white font-medium flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    O que você vai rastrear:
                  </h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Quem clicou no link</li>
                    <li>• {linkType === 'whatsapp' && useIntermediatePage ? 'Localização e tempo na página' : 'Tempo gasto no site'}</li>
                    <li>• {linkType === 'whatsapp' ? 'Abertura do WhatsApp' : 'Páginas visitadas'}</li>
                    <li>• Conversões realizadas</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-medium flex items-center text-sm">
                    <Zap className="h-4 w-4 mr-2 text-blue-500" />
                    Como usar o link:
                  </h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {linkType === 'whatsapp' ? (
                      <>
                        <li>• Compartilhe em redes sociais</li>
                        <li>• Envie por email/SMS</li>
                        <li>• Use em anúncios online</li>
                        <li>• Cole em bio de Instagram</li>
                      </>
                    ) : (
                      <>
                        <li>• Cole no seu bot WhatsApp</li>
                        <li>• Envie em mensagens manuais</li>
                        <li>• Use em campanhas específicas</li>
                        <li>• Monitore no Analytics</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  console.log('🔍 [DEBUG] Botão clicado!');
                  generateLink();
                }}
                disabled={isLoading || (linkType !== 'whatsapp' && !baseUrl.trim()) || (linkType === 'whatsapp' && !whatsappNumber.trim())}
                className="w-full bg-green-600 hover:bg-green-700 cursor-pointer"
                type="button"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Gerando Link...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Gerar Link Rastreado
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Link Gerado */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Link Rastreado Gerado!
                  </h3>
                  <p className="text-gray-400">
                    Seu link está pronto para ser usado no WhatsApp
                  </p>
                </div>

                <Card className="bg-green-900/20 border-green-600">
                  <CardHeader>
                    <CardTitle className="text-green-400 text-sm">
                      🔗 Seu Link Rastreado:
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 p-3 rounded border relative">
                      <code className="text-green-400 text-sm break-all">
                        {generatedLink}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2 h-6 px-2"
                        onClick={() => copyToClipboard(generatedLink)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Próximos Passos */}
                <Card className="bg-blue-900/20 border-blue-600">
                  <CardHeader>
                    <CardTitle className="text-blue-400 text-sm">
                      🎯 Próximos Passos:
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="text-sm text-gray-300 space-y-2">
                      <li>1. 📋 <strong>Copie o link</strong> clicando no botão acima</li>
                      <li>2. 🤖 <strong>Configure no seu bot</strong> WhatsApp ou envie manualmente</li>
                      <li>3. 📊 <strong>Monitore os resultados</strong> na página Analytics</li>
                      <li>4. 💰 <strong>Acompanhe as conversões</strong> e calcule o ROI</li>
                    </ol>
                  </CardContent>
                </Card>

                <div className="flex space-x-2">
                  <Button 
                    onClick={() => {
                      resetForm();
                    }}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Gerar Outro Link
                  </Button>
                  <Button 
                    onClick={() => setIsOpen(false)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppLinkGenerator; 