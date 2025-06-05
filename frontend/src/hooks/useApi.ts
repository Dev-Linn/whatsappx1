import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiCall } from '@/lib/auth';

const API_BASE = 'http://localhost:3001/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UseApiOptions {
  params?: Record<string, any>;
}

export const useApi = <T>(endpoint: string | null, options?: UseApiOptions) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize params to prevent unnecessary re-renders
  const memoizedParams = useMemo(() => {
    if (!options?.params) return undefined;
    
    // Remove undefined/null/empty values and stringify for comparison
    const cleanParams: Record<string, any> = {};
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        cleanParams[key] = value;
      }
    });
    
    return Object.keys(cleanParams).length > 0 ? cleanParams : undefined;
  }, [
    options?.params?.search,
    options?.params?.stage, 
    options?.params?.sentiment,
    options?.params?.page,
    options?.params?.limit
  ]);

  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    try {
      // Construir URL com parâmetros de query
      let url = endpoint;
      if (memoizedParams) {
        const params = new URLSearchParams();
        Object.entries(memoizedParams).forEach(([key, value]) => {
          params.append(key, String(value));
        });
        url += `?${params.toString()}`;
      }

      console.log(`🔄 Fazendo requisição autenticada para: ${url}`);
      setLoading(true);
      setError(null);
      
      const result = await apiCall(url);
      console.log(`📦 Dados recebidos:`, result);
      
      setData(result.data || null);
      setError(null);
      console.log('✅ Dados carregados com sucesso');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro de conexão';
      console.error('❌ Erro na requisição:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [endpoint, memoizedParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};

export const apiPost = async <T>(endpoint: string, body: any): Promise<ApiResponse<T>> => {
  try {
    console.log(`🔄 POST autenticado para: ${endpoint}`, body);
    const result = await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    console.log(`✅ POST response:`, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro de conexão';
    console.error('❌ Erro POST:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

export const apiPut = async <T>(endpoint: string, body: any): Promise<ApiResponse<T>> => {
  try {
    console.log(`🔄 PUT autenticado para: ${endpoint}`, body);
    const result = await apiCall(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    console.log(`✅ PUT response:`, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro de conexão';
    console.error('❌ Erro PUT:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

export const apiGet = async <T>(endpoint: string): Promise<ApiResponse<T>> => {
  try {
    console.log(`🔄 GET autenticado para: ${endpoint}`);
    const result = await apiCall(endpoint, {
      method: 'GET',
    });
    console.log(`✅ GET response:`, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro de conexão';
    console.error('❌ Erro GET:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};
