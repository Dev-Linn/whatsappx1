import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
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
  Tablet
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
  const { toast } = useToast();

  // Verificar status de autenticação ao carregar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = getToken();
      console.log('🔍 [ANALYTICS DEBUG] Token via getToken():', token ? `${token.substring(0, 20)}...` : 'NULL');
      console.log('🔍 [ANALYTICS DEBUG] localStorage keys:', Object.keys(localStorage));
      
              const response = await fetch('http://localhost:3001/api/v1/analytics/auth/status', {
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

  const startGoogleAuth = async () => {
    setLoading(true);
    try {
      const token = getToken();
      console.log('🔍 [ANALYTICS DEBUG] startGoogleAuth - Token:', token ? `${token.substring(0, 20)}...` : 'NULL');
      
      const response = await fetch('http://localhost:3001/api/v1/analytics/auth/google', {
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
              const response = await fetch('http://localhost:3001/api/v1/analytics/accounts', {
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
              const response = await fetch(`http://localhost:3001/api/v1/analytics/accounts/${accountId}/properties`, {
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
      const response = await fetch('http://localhost:3001/api/v1/analytics/selection', {
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
              const response = await fetch('http://localhost:3001/api/v1/analytics/dashboard-data', {
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
      await fetch('http://localhost:3001/api/v1/analytics/auth/logout', {
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
        <div className="text-center mb-8">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-green-600" />
          <h1 className="text-3xl font-bold text-white mb-2">Google Analytics</h1>
          <p className="text-gray-400">Conecte sua conta para visualizar dados de analytics</p>
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
      </div>
    );
  }

  if (step === 'account') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Selecionar Conta</h1>
          <p className="text-gray-400">Escolha a conta do Google Analytics que deseja usar</p>
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
      </div>
    );
  }

  if (step === 'property') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Selecionar Propriedade</h1>
          <p className="text-gray-400">Escolha a propriedade GA4 que deseja analisar</p>
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

      {analyticsData.length === 0 ? (
        <Alert className="bg-yellow-900/20 border-yellow-600">
          <AlertDescription className="text-yellow-200">
            Nenhum dado encontrado para o período selecionado.
          </AlertDescription>
        </Alert>
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
    </div>
  );
};

export default Analytics; 