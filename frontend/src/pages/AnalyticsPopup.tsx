import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { API_ENDPOINTS } from "@/lib/config";
import { BarChart3, CheckCircle, ArrowRight } from "lucide-react";

interface Account {
  name: string;
  displayName: string;
}

interface Property {
  name: string;
  displayName: string;
  timeZone?: string;
  currencyCode?: string;
}

const AnalyticsPopup = () => {
  const [step, setStep] = useState<'account' | 'property' | 'success'>('account');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.ANALYTICS_ACCOUNTS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message
        });
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar contas do Google Analytics"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async (accountId: string) => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS_ACCOUNTS}/${accountId}/properties`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties);
        setStep('property');
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message
        });
      }
    } catch (error) {
      console.error('Erro ao carregar propriedades:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar propriedades"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSelection = async (accountId: string, propertyId: string) => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.ANALYTICS_SELECTION, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId,
          propertyId
        })
      });

      if (response.ok) {
        setStep('success');
        
        // Aguardar um pouco e fechar a popup, comunicando sucesso ao pai
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'ANALYTICS_CONNECTED',
              success: true 
            }, window.location.origin);
            window.close();
          }
        }, 2000);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message
        });
      }
    } catch (error) {
      console.error('Erro ao salvar seleção:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar seleção"
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'account') {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h1 className="text-2xl font-bold text-white mb-2">Selecionar Conta</h1>
            <p className="text-gray-400">Escolha a conta do Google Analytics que deseja usar</p>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Carregando contas...</p>
                </CardContent>
              </Card>
            ) : (
              accounts.map((account) => {
                const accountId = account.name.split('/').pop() || '';
                return (
                  <Card key={account.name} className="bg-gray-800 border-gray-700 hover:border-green-600 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{account.displayName}</h3>
                          <p className="text-sm text-gray-400">ID: {accountId}</p>
                        </div>
                        <Button 
                          onClick={() => {
                            setSelectedAccount(accountId);
                            loadProperties(accountId);
                          }}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Selecionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'property') {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h1 className="text-2xl font-bold text-white mb-2">Selecionar Propriedade</h1>
            <p className="text-gray-400">Escolha a propriedade GA4 que deseja analisar</p>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Carregando propriedades...</p>
                </CardContent>
              </Card>
            ) : (
              properties.map((property) => {
                const propertyId = property.name.split('/').pop() || '';
                return (
                  <Card key={property.name} className="bg-gray-800 border-gray-700 hover:border-green-600 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{property.displayName}</h3>
                          <p className="text-sm text-gray-400">ID: {propertyId}</p>
                          {property.timeZone && (
                            <p className="text-xs text-gray-500">
                              Fuso: {property.timeZone} | Moeda: {property.currencyCode || 'N/A'}
                            </p>
                          )}
                        </div>
                        <Button 
                          onClick={() => saveSelection(selectedAccount, propertyId)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Conectar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold text-white mb-2">Google Analytics Conectado!</h1>
          <p className="text-gray-400 mb-4">Fechando janela e carregando dados...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return null;
};

export default AnalyticsPopup; 