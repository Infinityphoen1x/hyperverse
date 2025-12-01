// src/lib/config/useApiQuery.ts
import { useEffect, useState, useCallback } from 'react';
import { useApiStore } from '@/stores/useApiStore';

interface UseApiQueryReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>(url: string, on401?: "returnNull" | "throw"): UseApiQueryReturn<T> {
  const apiRequest = useApiStore(state => state.apiRequest);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<T>('GET', url);
      setData(result);
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (on401 === "throw") {
        throw errorObj;
      } else if (on401 === "returnNull") {
        setData(null);
      }
      setError(errorObj);
    } finally {
      setLoading(false);
    }
  }, [url, apiRequest, on401]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}