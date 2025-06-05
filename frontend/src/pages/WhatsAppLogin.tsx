import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Smartphone, CheckCircle, AlertCircle, RotateCcw, Wifi, ArrowRight, LogOut, RefreshCw, Shield, Zap, Settings } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from "@/contexts/AuthContext";
import { useWhatsAppStatus } from "@/contexts/WhatsAppContext";

const WhatsAppLogin = () => {
  const { isAuthenticated } = useAuth();
  const { 
    whatsappStatus, 
    fetchStatus, 
    initializeWhatsApp, 
    restartWhatsApp, 
    logoutWhatsApp, 
    isLoading, 
    lastError, 
    isAutoRetrying 
  } = useWhatsAppStatus();
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState(false);
  const initializationAttempted = useRef(false);

  // Buscar status inicial quando a página carrega e inicializar se necessário (apenas uma vez)
  useEffect(() => {
    if (isAuthenticated && !initializationAttempted.current) {
      initializationAttempted.current = true;
      
      fetchStatus().then(() => {
        // Inicializar WhatsApp automaticamente quando:
        // 1. Não está conectado E
        // 2. Não há QR code ativo E  
        // 3. Não está fazendo logout ativo E
        // 4. Não está já inicializando
        const shouldAutoInitialize = !whatsappStatus.connected && 
                                    !whatsappStatus.qrCode && 
                                    !whatsappStatus.message.includes('Removendo') &&
                                    !whatsappStatus.message.includes('logout') &&
                                    !whatsappStatus.message.includes('Inicializando') &&
                                    !isLoading;
        
        if (shouldAutoInitialize) {
          console.log('🆕 WhatsAppLogin: Auto-inicializando WhatsApp (desconectado)...');
          initializeWhatsApp().catch(error => {
            console.error('❌ WhatsAppLogin: Erro ao auto-inicializar WhatsApp:', error);
          });
        }
      });
    }
  }, [isAuthenticated, fetchStatus]); // Removido whatsappStatus das dependências

  // Gerar imagem do QR Code quando disponível
  useEffect(() => {
    if (whatsappStatus.qrCode) {
      QRCode.toDataURL(whatsappStatus.qrCode, {
        width: 400,
        margin: 3,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      }).then(url => {
        setQrCodeImage(url);
      }).catch(err => {
        console.error('Erro ao gerar QR code:', err);
      });
    } else {
      setQrCodeImage('');
    }
  }, [whatsappStatus.qrCode]);

  const handleRestart = async () => {
    setIsRetrying(true);
    try {
      await restartWhatsApp();
      console.log('✅ Restart solicitado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao solicitar restart:', error);
    } finally {
      setTimeout(() => setIsRetrying(false), 3000);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logoutWhatsApp();
      console.log('✅ Logout solicitado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao solicitar logout:', error);
    }
  };

  const getStatusColor = () => {
    if (whatsappStatus.connected && whatsappStatus.authenticated) return "from-green-500 to-emerald-600";
    if (whatsappStatus.authenticated && !whatsappStatus.connected) return "from-yellow-500 to-orange-500";
    if (whatsappStatus.qrCode) return "from-blue-500 to-purple-600";
    if (whatsappStatus.message.includes('DESCONECTADO') || whatsappStatus.message.includes('🔴')) return "from-red-500 to-red-600";
    if (whatsappStatus.message.includes('Reconectando') || isAutoRetrying) return "from-orange-500 to-yellow-500";
    return "from-gray-500 to-gray-600";
  };

  const getStatusIcon = () => {
    if (whatsappStatus.connected && whatsappStatus.authenticated) return <CheckCircle className="h-6 w-6" />;
    if (whatsappStatus.qrCode) return <QrCode className="h-6 w-6" />;
    if (whatsappStatus.message.includes('DESCONECTADO') || whatsappStatus.message.includes('🔴')) return <AlertCircle className="h-6 w-6" />;
    if (whatsappStatus.message.includes('Reconectando') || isAutoRetrying) return <RefreshCw className="h-6 w-6 animate-spin" />;
    return <AlertCircle className="h-6 w-6" />;
  };

  const getStatusText = () => {
    if (whatsappStatus.connected && whatsappStatus.authenticated) return "✅ Conectado e Ativo";
    if (whatsappStatus.authenticated && !whatsappStatus.connected) return "🔄 Autenticado";
    if (whatsappStatus.qrCode) return "📱 Aguardando Scan";
    if (whatsappStatus.message.includes('DESCONECTADO') || whatsappStatus.message.includes('🔴')) return "🔴 DESCONECTADO";
    if (whatsappStatus.message.includes('Reconectando') || isAutoRetrying) return "🔄 Reconectando...";
    return "⏳ Conectando...";
  };

  return (
    <div className="p-6">
      {/* Background decorativo */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>
      
      <div className="relative max-w-6xl mx-auto">
        
        {/* Header Principal */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
                <Smartphone className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Conexão WhatsApp
              </h1>
              <p className="text-purple-400 font-medium">Configuração do Bot</p>
            </div>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Conecte seu WhatsApp e ative a automação inteligente
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          
          {/* Coluna Esquerda - Status e Informações */}
          <div className="space-y-6">
            
            {/* Status Card Moderno */}
            <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Wifi className="h-5 w-5 text-purple-400" />
                    </div>
                    Status da Conexão
                  </span>
                  {(isAutoRetrying || whatsappStatus.message.includes('Reconectando')) && (
                    <Badge variant="outline" className="text-orange-400 border-orange-400 bg-orange-900/20">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Auto-retry
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-xl bg-gradient-to-r ${getStatusColor()} text-white`}>
                  <div className="flex items-center gap-3">
                    {getStatusIcon()}
                    <span className="font-semibold text-lg">{getStatusText()}</span>
                  </div>
                </div>
                
                <Alert className="bg-gray-700/50 border-gray-600/50 backdrop-blur">
                  <AlertDescription className="text-gray-300">
                    {whatsappStatus.message}
                  </AlertDescription>
                </Alert>

                {/* Mostrar erros se existirem */}
                {lastError && !isAutoRetrying && (
                  <Alert className="bg-red-900/20 border-red-700/50 backdrop-blur">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-300">
                      {lastError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Info sobre reconexão automática */}
                {isAutoRetrying && (
                  <Alert className="bg-orange-900/20 border-orange-700/50 backdrop-blur">
                    <RefreshCw className="h-4 w-4 text-orange-400 animate-spin" />
                    <AlertDescription className="text-orange-300">
                      Sistema de reconexão automática ativo. Tentando restabelecer conexão...
                    </AlertDescription>
                  </Alert>
                )}
                
                {whatsappStatus.lastUpdate && (
                  <p className="text-xs text-gray-500">
                    Última atualização: {new Date(whatsappStatus.lastUpdate).toLocaleString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Voltar para Dashboard quando conectado */}
            {whatsappStatus.connected && whatsappStatus.authenticated && (
              <div className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                    <div>
                      <h3 className="text-white font-semibold text-lg">Sistema Ativo</h3>
                      <p className="text-gray-300 text-sm">WhatsApp conectado e funcionando</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      onClick={() => window.location.href = '/dashboard'}
                      className="bg-green-600 hover:bg-green-700 flex-1 min-w-fit"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Ver Dashboard
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={handleRestart}
                      disabled={isRetrying}
                      className="border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white bg-transparent"
                    >
                      <RotateCcw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                      {isRetrying ? 'Reiniciando...' : 'Reconectar'}
                    </Button>
                    
                    <Button 
                      onClick={handleDisconnect}
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-600 hover:text-white bg-transparent"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita - QR Code ou Success */}
          <div className="space-y-6">
            
            {/* QR Code Card */}
            {whatsappStatus.qrCode && qrCodeImage && !whatsappStatus.authenticated && (
              <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 shadow-xl">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-white flex items-center justify-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <QrCode className="h-6 w-6 text-purple-400" />
                    </div>
                    Escaneie para Conectar
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  
                  {/* QR Code com animação */}
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20 animate-pulse"></div>
                    <div className="relative bg-white p-6 rounded-2xl shadow-2xl">
                      <img 
                        src={qrCodeImage} 
                        alt="QR Code do WhatsApp" 
                        className="w-72 h-72 mx-auto rounded-lg"
                      />
                    </div>
                  </div>
                  
                  {/* Instruções elegantes */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Como conectar:</h3>
                    <div className="space-y-3 text-left max-w-sm mx-auto">
                      {[
                        "Abra o WhatsApp no seu celular",
                        "Toque em Menu → Dispositivos conectados",
                        "Toque em 'Conectar um dispositivo'",
                        "Escaneie este QR code"
                      ].map((step, index) => (
                        <div key={index} className="flex items-center gap-3 text-gray-300">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {index + 1}
                          </div>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Success Card */}
            {whatsappStatus.connected && whatsappStatus.authenticated && (
              <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 shadow-xl">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/25">
                        <CheckCircle className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full animate-bounce"></div>
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">🎉 WhatsApp Conectado!</h2>
                      <p className="text-gray-300 text-lg mb-4">
                        Seu chatbot está ativo e pronto para revolucionar suas conversas.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Online e funcionando</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading/Connecting State */}
            {!whatsappStatus.qrCode && !whatsappStatus.authenticated && (
              <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 shadow-xl">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center space-y-6">
                    {whatsappStatus.message.includes('DESCONECTADO') || whatsappStatus.message.includes('🔴') ? (
                      // Estado Desconectado - mais visível
                      <>
                        <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                          <AlertCircle className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-red-400 mb-2">WhatsApp Desconectado</h3>
                          <p className="text-gray-300 mb-4">
                            Sessão removida completamente. Para usar novamente, clique em "Reconectar" abaixo.
                          </p>
                          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <p className="text-red-300 text-sm font-medium">
                              💡 Um novo QR Code será gerado quando reconectar
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <Button 
                            variant="outline" 
                            onClick={handleRestart}
                            disabled={isRetrying}
                            className="border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white bg-transparent font-semibold px-6 py-2"
                          >
                            <RotateCcw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                            {isRetrying ? 'Reiniciando...' : '🔄 Reconectar WhatsApp'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      // Estado Conectando normal
                      <>
                        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                          <Wifi className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">Preparando Conexão...</h3>
                          <p className="text-gray-300">
                            Aguarde enquanto configuramos tudo para você.
                          </p>
                        </div>
                        <div className="flex justify-center">
                          <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
          </div>
        </div>

        {/* Info Footer */}
        <div className="text-center text-gray-400 text-sm space-y-2 mt-8">
          <p>🔒 Seus dados são mantidos seguros e privados</p>
          <p>⏱️ O QR code é renovado automaticamente para sua segurança</p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppLogin; 