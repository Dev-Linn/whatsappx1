import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { API_ENDPOINTS } from "@/lib/config";

const GoogleCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Debug: mostrar a URL completa
        console.log('URL completa:', window.location.href);
        console.log('Search params:', window.location.search);
        console.log('Hash:', window.location.hash);
        
        // Pegar o código da URL (pode estar no search ou no hash)
        const urlParams = new URLSearchParams(window.location.search);
        let code = urlParams.get('code');
        let state = urlParams.get('state');
        
        // Se não encontrou no search, tentar no hash
        if (!code && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          code = hashParams.get('code');
          state = hashParams.get('state');
        }

        console.log('Código encontrado:', code);
        console.log('State encontrado:', state);

        if (!code) {
          // Verificar se é erro de autorização
          const error = urlParams.get('error');
          if (error) {
            throw new Error(`Erro de autorização: ${error}`);
          }
          throw new Error('Código de autorização não encontrado na URL');
        }

        // Verificar se temos token JWT
        const token = getToken();
        console.log('Token JWT:', token ? 'Presente' : 'Ausente');
        
        // Decodificar e validar consistência entre state e token
        let stateData = null;
        let tokenPayload = null;
        let tenantMismatch = false;
        
        if (state) {
          try {
            stateData = JSON.parse(atob(state));
            console.log('🔍 [STATE] Tenant do Google Auth:', stateData);
          } catch (e) {
            console.log('❌ [STATE] Erro ao decodificar state:', e);
          }
        }
        
        if (token) {
          try {
            tokenPayload = JSON.parse(atob(token.split('.')[1]));
            console.log('🔍 [TOKEN] Payload do JWT:', tokenPayload);
            console.log('🔍 [TOKEN] Tenant ID no token:', tokenPayload.tenantId || tokenPayload.tenant_id);
            console.log('🔍 [TOKEN] Email no token:', tokenPayload.email);
            
            // Verificar se há conflito de tenant
            if (stateData && tokenPayload) {
              const stateTenantId = stateData.tenantId;
              const tokenTenantId = tokenPayload.tenantId || tokenPayload.tenant_id;
              
              if (stateTenantId !== tokenTenantId) {
                tenantMismatch = true;
                console.log('🚨 [MISMATCH] Conflito de tenant detectado!');
                console.log('🚨 [MISMATCH] State tenant:', stateTenantId);
                console.log('🚨 [MISMATCH] Token tenant:', tokenTenantId);
              }
            }
          } catch (e) {
            console.log('❌ [TOKEN] Erro ao decodificar JWT:', e);
          }
        }
        
        // Se há conflito de tenant, redirecionar para login com mensagem específica
        if (tenantMismatch) {
          console.log('🔄 [REDIRECT] Redirecionando para login devido a conflito de tenant');
          
          toast({
            variant: "destructive",
            title: "Conflito de Sessão",
            description: "Detectamos um conflito entre sessões. Por favor, faça login novamente."
          });
          
          // Limpar localStorage e redirecionar
          localStorage.clear();
          
          if (window.opener) {
            window.opener.postMessage({
              type: 'ANALYTICS_ERROR',
              error: 'Conflito de tenant - faça login novamente'
            }, window.location.origin);
            window.close();
          } else {
            window.location.href = '/login';
          }
          return;
        }
        
        if (!token) {
          throw new Error('Token de autenticação não encontrado. Faça login novamente.');
        }

        // Enviar código para a API
        const response = await fetch(API_ENDPOINTS.ANALYTICS_CALLBACK, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code, state })
        });

        console.log('Response status:', response.status);
        const responseData = await response.json();
        console.log('Response data:', responseData);

        // Se erro 403, mostrar detalhes
        if (response.status === 403) {
          console.log('🚨 [403 ERROR] Erro de permissão detalhado:');
          console.log('🚨 [403 ERROR] Message:', responseData.message || responseData.error);
          console.log('🚨 [403 ERROR] Details:', responseData.details);
          console.log('🚨 [403 ERROR] Full response:', responseData);
        }

        if (response.ok) {
          toast({
            title: "Sucesso",
            description: "Conectado ao Google Analytics!"
          });
          
          // Se estamos em popup, redirecionar para popup de seleção
          if (window.opener) {
            window.location.href = '/analytics/popup';
          } else {
            navigate('/analytics');
          }
        } else {
          throw new Error(responseData.message || responseData.error || 'Erro na autenticação');
        }
      } catch (error) {
        console.error('Erro no callback:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || 'Erro ao processar autenticação'
        });
        
        // Se estamos em popup, não navegar
        if (!window.opener) {
          navigate('/analytics');
        }
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">Processando autenticação...</h2>
        <p className="text-gray-400">Aguarde enquanto conectamos ao Google Analytics</p>
      </div>
    </div>
  );
};

export default GoogleCallback; 