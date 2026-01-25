// src/hooks/useApiMutation.ts
import { useCallback } from 'react';

export function useApiMutation<T>(method: 'POST' | 'PUT' | 'DELETE' = 'POST') {
  const mutate = useCallback(
    async (url: string, data?: unknown): Promise<T> => {
      try {
        console.log(`[API] ${method} ${url}`, data);
        // Mock implementation for mockup mode
        return {} as T;
      } catch (error) {
        console.error(`[API Error] ${method} ${url}:`, error);
        throw error;
      }
    },
    [method]
  );

  return { mutate };
}