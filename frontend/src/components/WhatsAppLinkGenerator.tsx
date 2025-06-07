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
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateLink = async () => {
    if (!baseUrl.trim()) {
      toast({
        variant: "destructive",
        title: "URL obrigatória",
        description: "Por favor, insira a URL do seu site"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('whatsapp_bot_token');
      const response = await fetch('/api/v1/analytics/integration/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          campaignName: campaignName.trim() || 'whatsapp_campaign'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedLink(result.trackedUrl);
        
        toast({
          title: "✅ Link Gerado!",
          description: "Link rastreado criado com sucesso"
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao gerar link');
      }
    } catch (error) {
      console.error('Erro ao gerar link:', error);
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
      
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
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
                  <Label htmlFor="base-url" className="text-white">
                    🌐 URL do seu site/página:
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
                  <div className="bg-gray-900 p-3 rounded border font-mono text-xs text-green-400">
                    {baseUrl || 'https://meuloja.com.br/produtos'}
                    <span className="text-blue-400">
                      ?utm_source=whatsapp&utm_medium=chat&utm_campaign=
                      {campaignName || 'whatsapp_campaign'}
                      &wa=TRACKING_ID&tenant=TENANT_ID
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Este link permitirá rastrear cada clique e conversão
                  </p>
                </CardContent>
              </Card>

              {/* Benefícios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-white font-medium flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    O que você vai rastrear:
                  </h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Quem clicou no link</li>
                    <li>• Tempo gasto no site</li>
                    <li>• Páginas visitadas</li>
                    <li>• Conversões realizadas</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-medium flex items-center text-sm">
                    <Zap className="h-4 w-4 mr-2 text-blue-500" />
                    Como usar o link:
                  </h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Cole no seu bot WhatsApp</li>
                    <li>• Envie em mensagens manuais</li>
                    <li>• Use em campanhas específicas</li>
                    <li>• Monitore no Analytics</li>
                  </ul>
                </div>
              </div>

              <Button 
                onClick={generateLink}
                disabled={isLoading || !baseUrl.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
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