import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { API_ENDPOINTS, API_BASE_URL } from "@/lib/config";
import IntegrationSetupModal from "@/components/IntegrationSetupModal";
import WhatsAppLinkGenerator from "@/components/WhatsAppLinkGenerator";
import LinkManagement from "@/components/LinkManagement";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MousePointer, 
  Clock, 
  DollarSign,
  ExternalLink,
  RefreshCw,
  LogIn,
  LogOut,
  Globe,
  Smartphone,
  Monitor, 
  Tablet,
  Link2,
  MessageSquare,
  Rocket,
  Settings,
  Eye
} from "lucide-react";

interface AnalyticsData {
  date: string;
  deviceCategory: string;
  country: string;
  city: string;
  pagePath: string;
  sessionSource: string;
  sessionMedium: string;
  metrics: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDuration: number;
    bounceRate: number;
    conversions: number;
    totalRevenue: number;
    engagedSessions: number;
    engagementRate: number;
  };
}

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

interface AuthStatus {
  authenticated: boolean;
  hasSelection: boolean;
  selection: {
    account_id: string;
    property_id: string;
    account_name?: string;
    property_name?: string;
  } | null;
}

const Analytics = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'auth' | 'account' | 'property' | 'dashboard'>('auth');
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [integrationMetrics, setIntegrationMetrics] = useState(null);
  const [isIntegrationConfigured, setIsIntegrationConfigured] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generator' | 'management'>('dashboard');
  const { toast } = useToast();

  // Verificar status de autenticação ao carregar
  useEffect(() => {
    checkAuthStatus();
    checkIntegrationStatus();
    loadTrackingData();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = getToken();
      console.log('🔍 [ANALYTICS DEBUG] Token via getToken():', token ? `${token.substring(0, 20)}...` : 'NULL');
      console.log('🔍 [ANALYTICS DEBUG] localStorage keys:', Object.keys(localStorage));
      
              const response = await fetch(API_ENDPOINTS.ANALYTICS_STATUS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const status = await response.json();
        setAuthStatus(status);
        
        if (status.authenticated && status.hasSelection) {
          setStep('dashboard');
          loadDashboardData();
        } else if (status.authenticated) {
          setStep('account');
          loadAccounts();
        } else {
          setStep('auth');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setStep('auth');
    }
  };

  const checkIntegrationStatus = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/integration/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const metrics = await response.json();
        setIntegrationMetrics(metrics);
        setIsIntegrationConfigured(metrics.integrated);
      }
    } catch (error) {
      console.error('Erro ao verificar integração:', error);
    }
  };

  const loadTrackingData = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/integration/tracking-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de tracking:', error);
    }
  };

  const startGoogleAuth = async () => {
    setLoading(true);
    try {
      const token = getToken();
      console.log('🔍 [ANALYTICS DEBUG] startGoogleAuth - Token:', token ? `${token.substring(0, 20)}...` : 'NULL');
      
      const response = await fetch(API_ENDPOINTS.ANALYTICS_AUTH, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Abrir popup para autenticação direcionando para nossa página específica
        const popup = window.open(data.authUrl, 'google-auth', 'width=500,height=700,scrollbars=yes,resizable=yes');
        
        // Escutar mensagens da popup
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'ANALYTICS_CONNECTED' && event.data.success) {
            // Fechar popup e recarregar dados
            popup?.close();
            window.removeEventListener('message', messageListener);
            clearInterval(checkClosed);
            
            // Recarregar status e dados
            checkAuthStatus();
            toast({
              title: "Sucesso!",
              description: "Google Analytics conectado com sucesso!"
            });
          } else if (event.data.type === 'ANALYTICS_ERROR') {
            // Erro na popup
            popup?.close();
            window.removeEventListener('message', messageListener);
            clearInterval(checkClosed);
            
            // Se é conflito de tenant, mostrar mensagem específica e redirecionar
            if (event.data.error?.includes('conflito de tenant') || event.data.error?.includes('Conflito de tenant')) {
              toast({
                variant: "destructive",
                title: "Conflito de Sessão Detectado",
                description: "Redirecionando para login para resolver o conflito..."
              });
              
              setTimeout(() => {
                window.location.href = '/login';
              }, 2000);
            } else {
              toast({
                variant: "destructive",
                title: "Erro na Autenticação",
                description: event.data.error || 'Erro ao conectar com Google Analytics'
              });
            }
          }
        };

        // Adicionar listener para mensagens da popup
        window.addEventListener('message', messageListener);

        // Verificar se popup foi fechada manualmente
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            // Se fechou sem sucesso, apenas verificar status
            setTimeout(() => {
              checkAuthStatus();
            }, 1000);
          }
        }, 1000);

      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro na autenticação",
          description: error.message
        });
      }
    } catch (error) {
      console.error('Erro ao iniciar autenticação:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao conectar com Google Analytics"
      });
    } finally {
      setLoading(false);
    }
  };

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
        body: JSON.stringify({ accountId, propertyId })
      });

      if (response.ok) {
        setStep('dashboard');
        loadDashboardData();
        toast({
          title: "Sucesso",
          description: "Propriedade selecionada com sucesso!"
        });
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
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = getToken();
              const response = await fetch(API_ENDPOINTS.ANALYTICS_DASHBOARD, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.data || []);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = getToken();
      await fetch(API_ENDPOINTS.ANALYTICS_LOGOUT, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setAuthStatus(null);
      setAccounts([]);
      setProperties([]);
      setAnalyticsData([]);
      setStep('auth');
      
      toast({
        title: "Sucesso",
        description: "Logout realizado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Calcular métricas resumo
  const summaryMetrics = analyticsData.reduce((acc, item) => {
    acc.totalUsers += item.metrics.activeUsers;
    acc.totalSessions += item.metrics.sessions;
    acc.totalPageViews += item.metrics.screenPageViews;
    acc.totalRevenue += item.metrics.totalRevenue;
    return acc;
  }, {
    totalUsers: 0,
    totalSessions: 0,
    totalPageViews: 0,
    totalRevenue: 0
  });

  const avgBounceRate = analyticsData.length > 0 
    ? analyticsData.reduce((sum, item) => sum + item.metrics.bounceRate, 0) / analyticsData.length 
    : 0;

  const avgEngagementRate = analyticsData.length > 0 
    ? analyticsData.reduce((sum, item) => sum + item.metrics.engagementRate, 0) / analyticsData.length 
    : 0;

  // Agrupar dados por dispositivo
  const deviceData = analyticsData.reduce((acc, item) => {
    if (!acc[item.deviceCategory]) {
      acc[item.deviceCategory] = 0;
    }
    acc[item.deviceCategory] += item.metrics.sessions;
    return acc;
  }, {} as Record<string, number>);

  // Top países
  const countryData = Object.entries(
    analyticsData.reduce((acc, item) => {
      if (!acc[item.country]) {
        acc[item.country] = 0;
      }
      acc[item.country] += item.metrics.sessions;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      case 'desktop': return <Monitor className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (step === 'auth') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header com botão de integração */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Google Analytics</h1>
            <p className="text-gray-400">Conecte sua conta para visualizar dados de analytics</p>
          </div>
          <Button 
            onClick={() => setShowIntegrationModal(true)}
            variant="outline"
            className="border-green-600 text-green-400 hover:bg-green-900/20"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Integrar WhatsApp
          </Button>
        </div>

        <div className="text-center mb-8">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-green-600" />
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Conectar Google Analytics</CardTitle>
            <CardDescription>
              Autorize o acesso aos seus dados do Google Analytics para visualizar relatórios detalhados
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={startGoogleAuth}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Conectar com Google
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Modal de Integração */}
        <IntegrationSetupModal
          isOpen={showIntegrationModal}
          onClose={() => setShowIntegrationModal(false)}
          onComplete={() => {
            toast({
              title: "🎉 Integração Configurada!",
              description: "WhatsApp e Analytics agora estão conectados. Você pode começar a rastrear usuários!"
            });
            setShowIntegrationModal(false);
          }}
        />
      </div>
    );
  }

  if (step === 'account') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header com botão de integração */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Selecionar Conta</h1>
            <p className="text-gray-400">Escolha a conta do Google Analytics que deseja usar</p>
          </div>
          <Button 
            onClick={() => setShowIntegrationModal(true)}
            variant="outline"
            className="border-green-600 text-green-400 hover:bg-green-900/20"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Integrar WhatsApp
          </Button>
        </div>

        <div className="grid gap-4">
          {accounts.map((account) => {
            const accountId = account.name.split('/').pop() || '';
            return (
              <Card key={account.name} className="bg-gray-800 border-gray-700 hover:border-green-600 transition-colors">
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
                      Selecionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modal de Integração */}
        <IntegrationSetupModal
          isOpen={showIntegrationModal}
          onClose={() => setShowIntegrationModal(false)}
          onComplete={() => {
            toast({
              title: "🎉 Integração Configurada!",
              description: "WhatsApp e Analytics agora estão conectados. Você pode começar a rastrear usuários!"
            });
            setShowIntegrationModal(false);
          }}
        />
      </div>
    );
  }

  if (step === 'property') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header com botão de integração */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Selecionar Propriedade</h1>
            <p className="text-gray-400">Escolha a propriedade GA4 que deseja analisar</p>
          </div>
          <Button 
            onClick={() => setShowIntegrationModal(true)}
            variant="outline"
            className="border-green-600 text-green-400 hover:bg-green-900/20"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Integrar WhatsApp
          </Button>
        </div>

        <div className="grid gap-4">
          {properties.map((property) => {
            const propertyId = property.name.split('/').pop() || '';
            return (
              <Card key={property.name} className="bg-gray-800 border-gray-700 hover:border-green-600 transition-colors">
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
                      onClick={() => {
                        setSelectedProperty(propertyId);
                        saveSelection(selectedAccount, propertyId);
                      }}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Selecionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Button 
            variant="outline" 
            onClick={() => {
              setStep('account');
              setProperties([]);
            }}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            ← Voltar às Contas
          </Button>
        </div>

        {/* Modal de Integração */}
        <IntegrationSetupModal
          isOpen={showIntegrationModal}
          onClose={() => setShowIntegrationModal(false)}
          onComplete={() => {
            toast({
              title: "🎉 Integração Configurada!",
              description: "WhatsApp e Analytics agora estão conectados. Você pode começar a rastrear usuários!"
            });
            setShowIntegrationModal(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Google Analytics</h1>
          <p className="text-gray-400">Últimos 30 dias</p>
          {authStatus?.selection && (
            <Badge variant="outline" className="mt-2 border-green-600 text-green-400">
              Propriedade: {authStatus.selection.property_id}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!isIntegrationConfigured && (
            <Button 
              onClick={() => setShowIntegrationModal(true)}
              variant="outline"
              className="border-green-600 text-green-400 hover:bg-green-900/20"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Integrar WhatsApp
            </Button>
          )}
          <Button 
            onClick={loadDashboardData}
            disabled={loading}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            onClick={logout}
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === 'generator' ? 'default' : 'outline'}
            onClick={() => setActiveTab('generator')}
            className="flex items-center gap-2"
          >
            <Rocket className="h-4 w-4" />
            Gerar Links
          </Button>
          <Button
            variant={activeTab === 'management' ? 'default' : 'outline'}
            onClick={() => setActiveTab('management')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Gerenciar Links
          </Button>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'generator' && (
        <div className="mb-8">
          <WhatsAppLinkGenerator isIntegrationConfigured={isIntegrationConfigured} />
        </div>
      )}

      {activeTab === 'management' && (
        <div className="mb-8">
          <LinkManagement />
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div>

      {analyticsData.length === 0 ? (
        <div className="space-y-6">
          <Alert className="bg-yellow-900/20 border-yellow-600">
            <AlertDescription className="text-yellow-200">
              Nenhum dado encontrado para o período selecionado.
            </AlertDescription>
          </Alert>
          
          {/* Card de Integração WhatsApp quando não há dados */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-green-500" />
                Integrar WhatsApp com Analytics
              </CardTitle>
              <CardDescription>
                Conecte seus dados do WhatsApp com Google Analytics para ter uma visão unificada do ROI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 mb-2">
                    🚀 Rastreie usuários desde o primeiro contato no WhatsApp até a conversão final
                  </p>
                  <p className="text-xs text-gray-400">
                    Configure links rastreados, UTMs automáticos e dashboards unificados
                  </p>
                </div>
                <Button 
                  onClick={() => setShowIntegrationModal(true)}
                  className="bg-green-600 hover:bg-green-700 ml-4"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Configurar Integração
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seção de Métricas WhatsApp + Analytics */}
          <Card className={`${isIntegrationConfigured ? 'bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-600' : 'bg-gradient-to-r from-gray-900/20 to-gray-800/20 border-gray-600'}`}>
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                📊 {isIntegrationConfigured ? 'Métricas Integradas WhatsApp + Site' : 'Simulação: Métricas Integradas WhatsApp + Site'}
              </CardTitle>
              <CardDescription>
                {isIntegrationConfigured 
                  ? 'Dados reais da sua integração WhatsApp + Analytics'
                  : 'Veja como ficarão suas métricas após configurar a integração'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {isIntegrationConfigured && integrationMetrics ? 
                      integrationMetrics.whatsapp?.conversations || 0 : 847
                    }
                  </div>
                  <div className="text-sm text-gray-400">Conversas WhatsApp</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isIntegrationConfigured && integrationMetrics ? 
                      `↓ ${integrationMetrics.whatsapp?.clicks || 0} cliques no site (${integrationMetrics.whatsapp?.click_rate || 0}%)` :
                      '↓ 634 cliques no site (74.9%)'
                    }
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {isIntegrationConfigured && integrationMetrics ? 
                      `${integrationMetrics.analytics?.conversion_rate || 0}%` : '23.1%'
                    }
                  </div>
                  <div className="text-sm text-gray-400">Taxa de Conversão</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isIntegrationConfigured && integrationMetrics ? 
                      `${integrationMetrics.analytics?.conversions || 0} conversões de ${integrationMetrics.analytics?.sessions || 0} visitas` :
                      '146 conversões de 634 visitas'
                    }
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {isIntegrationConfigured && integrationMetrics ? 
                      `R$ ${Number(integrationMetrics.revenue?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                      'R$ 12.340'
                    }
                  </div>
                  <div className="text-sm text-gray-400">Receita Rastreada</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isIntegrationConfigured && integrationMetrics ? 
                      `ROI médio: ${integrationMetrics.revenue?.roi || 0}x` : 
                      'ROI médio: 4.2x'
                    }
                  </div>
                </div>
              </div>

              {/* Funil de Conversão Simulado */}
              <div className="space-y-3">
                <h4 className="text-white font-medium flex items-center">
                  <Rocket className="h-4 w-4 mr-2" />
                  🎯 Funil de Conversão Completo:
                </h4>
                
                <div className="space-y-2">
                  {(isIntegrationConfigured && integrationMetrics?.funnel ? integrationMetrics.funnel : [
                    { stage: 'WhatsApp Conversations', count: 847, rate: 100 },
                    { stage: 'Site Clicks', count: 634, rate: 74.9 },
                    { stage: 'Engaged Sessions', count: 312, rate: 49.2 },
                    { stage: 'Conversions', count: 146, rate: 23.1 }
                  ]).map((item, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 bg-gray-800 rounded border ${
                      index === 3 ? 'border-green-600' : 'border-gray-700'
                    }`}>
                      <div className="flex items-center space-x-3">
                        {index === 0 && <MessageSquare className="h-4 w-4 text-green-500" />}
                        {index === 1 && <ExternalLink className="h-4 w-4 text-blue-500" />}
                        {index === 2 && <Globe className="h-4 w-4 text-purple-500" />}
                        {index === 3 && <DollarSign className="h-4 w-4 text-yellow-500" />}
                        <span className={`text-white text-sm ${index === 3 ? 'font-medium' : ''}`}>
                          {index + 1}. {item.stage}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`font-${index === 3 ? 'bold' : 'medium'} ${
                          index === 0 ? 'text-green-400' : 
                          index === 1 ? 'text-blue-400' : 
                          index === 2 ? 'text-purple-400' : 'text-yellow-400'
                        }`}>
                          {item.count.toLocaleString('pt-BR')}
                        </div>
                        <div className={`text-xs ${
                          index === 3 ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {item.rate}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded">
                  <p className="text-yellow-200 text-sm">
                    💡 <strong>Insight:</strong> Com essa integração, você saberia que 23 de cada 100 pessoas que clicam nos seus links do WhatsApp fazem uma compra!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Usuários Totais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {summaryMetrics.totalUsers.toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Sessões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {summaryMetrics.totalSessions.toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                  <MousePointer className="h-4 w-4 mr-2" />
                  Visualizações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {summaryMetrics.totalPageViews.toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Receita
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  R$ {summaryMetrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Secundárias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Taxa de Rejeição Média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {avgBounceRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Taxa de Engajamento Média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {avgEngagementRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dispositivos e Países */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Dispositivos</CardTitle>
                <CardDescription>Sessões por tipo de dispositivo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(deviceData).map(([device, sessions]) => (
                    <div key={device} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device)}
                        <span className="text-white capitalize">{device}</span>
                      </div>
                      <span className="text-gray-400">{sessions.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Top Países</CardTitle>
                <CardDescription>Principais origens de tráfego</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {countryData.map(([country, sessions]) => (
                    <div key={country} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span className="text-white">{country}</span>
                      </div>
                      <span className="text-gray-400">{sessions.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Dashboard de Tracking WhatsApp */}
      {trackingData && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Link2 className="h-6 w-6 mr-3 text-green-500" />
            📊 Dashboard de Tracking WhatsApp
            <Button 
              onClick={loadTrackingData}
              size="sm" 
              variant="outline" 
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </h2>

          {/* Métricas Principais de Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="bg-gradient-to-br from-blue-800 to-blue-900 border-blue-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-200 flex items-center">
                  <Link2 className="h-4 w-4 mr-2" />
                  Links Criados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {trackingData.stats.totalLinks}
                </div>
                <div className="text-xs text-blue-300 mt-1">
                  Links rastreados ativos
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-800 to-green-900 border-green-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-200 flex items-center">
                  <MousePointer className="h-4 w-4 mr-2" />
                  Total de Cliques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {trackingData.stats.totalClicks}
                </div>
                <div className="text-xs text-green-300 mt-1">
                  Cliques registrados
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-800 to-purple-900 border-purple-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-200 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Taxa de Clique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {trackingData.stats.clickRate}%
                </div>
                <div className="text-xs text-purple-300 mt-1">
                  CTR médio dos links
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-800 to-yellow-900 border-yellow-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-200 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {trackingData.stats.clickRate >= 50 ? 'ALTA' : 
                   trackingData.stats.clickRate >= 20 ? 'MÉDIA' : 'BAIXA'}
                </div>
                <div className="text-xs text-yellow-300 mt-1">
                  Classificação geral
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Cliques por Dia */}
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                📈 Cliques nos Últimos 7 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {trackingData.stats.chartData.map((day, index) => {
                  const maxClicks = Math.max(...trackingData.stats.chartData.map(d => d.clicks));
                  const height = maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0;
                  
                  return (
                    <div key={index} className="text-center">
                      <div className="h-32 flex items-end justify-center mb-2">
                        <div 
                          className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t w-full transition-all duration-300 hover:from-blue-400 hover:to-blue-300 cursor-pointer"
                          style={{ height: `${Math.max(height, 8)}%` }}
                          title={`${day.clicks} cliques`}
                        />
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(day.date).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </div>
                      <div className="text-sm font-medium text-white">
                        {day.clicks}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Lista Detalhada de Links */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Link2 className="h-5 w-5 mr-2" />
                🔗 Links Rastreados Detalhados
              </CardTitle>
              <CardDescription>
                Todos os links criados e suas estatísticas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trackingData.stats.linkStats.map((link, index) => (
                  <div key={index} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {link.campaignName}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            ID: {link.trackingId}
                          </span>
                        </div>
                        
                        <div className="text-white text-sm mb-1 break-all">
                          🎯 <strong>Destino:</strong> {link.baseUrl}
                        </div>
                        
                        <div className="text-gray-400 text-xs">
                          📅 <strong>Criado:</strong> {new Date(link.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          {link.clickCount}
                        </div>
                        <div className="text-xs text-gray-400">
                          {link.clickCount === 1 ? 'clique' : 'cliques'}
                        </div>
                      </div>
                    </div>
                    
                    {link.clicks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="text-xs text-gray-400 mb-2">
                          👆 Últimos cliques:
                        </div>
                        <div className="space-y-1">
                          {link.clicks.slice(0, 3).map((click, clickIndex) => (
                            <div key={clickIndex} className="text-xs text-gray-500 flex justify-between">
                              <span>🕐 {new Date(click.clicked_at).toLocaleString('pt-BR')}</span>
                              <span>📍 {click.ip_address}</span>
                            </div>
                          ))}
                          {link.clicks.length > 3 && (
                            <div className="text-xs text-gray-600">
                              + {link.clicks.length - 3} cliques anteriores...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {trackingData.stats.linkStats.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum link rastreado encontrado.</p>
                    <p className="text-sm">Crie seu primeiro link usando o botão acima!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

        </div>
      )}

      {/* Modal de Integração WhatsApp + Analytics */}
      <IntegrationSetupModal
        isOpen={showIntegrationModal}
        onClose={() => setShowIntegrationModal(false)}
        onComplete={() => {
          toast({
            title: "🎉 Integração Configurada!",
            description: "WhatsApp e Analytics agora estão conectados. Você pode começar a rastrear usuários!"
          });
          setShowIntegrationModal(false);
          // Recarregar status de integração
          checkIntegrationStatus();
        }}
      />
    </div>
  );
};

export default Analytics; 