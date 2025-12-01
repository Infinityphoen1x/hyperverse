// src/hooks/useApiMutation.ts
import { useApiStore } from '@/stores/useApiStore';
import { useCallback } from 'react';

export function useApiMutation<T>(method: 'POST' | 'PUT' | 'DELETE' = 'POST') {
  const { apiRequest, postData } = useApiStore();

  const mutate = useCallback(
    async (url: string, data?: unknown) => {
      if (method === 'POST') {
        return postData<T>(url, data);
      }
      return apiRequest<T>(method, url, data);
    },
    [method, apiRequest, postData]
  );

  return { mutate };
}