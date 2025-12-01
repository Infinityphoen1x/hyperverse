// src/hooks/useApiQuery.ts
import { useApiStore } from '@/stores/useApiStore';

export function useApiQuery<T>(url: string, on401?: "returnNull" | "throw") {
  const { getQuery, queries } = useApiStore();
  const queryState = queries[url] || { data: null, loading: false, error: null };

  // Trigger fetch on mount/use (Zustand selectors re-run on changes)
  // For infinite/stale, add refetch action if needed

  return {
    data: queryState.data as T | null,
    loading: queryState.loading,
    error: queryState.error,
    refetch: () => getQuery<T>(url, on401),
  };
}