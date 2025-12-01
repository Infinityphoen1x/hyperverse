// src/stores/useApiStore.ts
import { create } from 'zustand';

interface ApiStoreState {
  apiRequest: <T,>(method: string, url: string, data?: unknown) => Promise<T>;
  postData: <T,>(url: string, data?: unknown) => Promise<T>;
}

export const useApiStore = create<ApiStoreState>(() => ({
  apiRequest: async <T,>(method: string, url: string, data?: unknown): Promise<T> => {
    console.log(`[API] ${method} ${url}`, data);
    // Mock implementation for mockup mode
    return {} as T;
  },
  postData: async <T,>(url: string, data?: unknown): Promise<T> => {
    console.log(`[API] POST ${url}`, data);
    // Mock implementation for mockup mode
    return {} as T;
  },
}));
