// src/stores/useApiStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import { useGameStore } from '@/stores/useGameStore'; // For cross-store updates

type UnauthorizedBehavior = "returnNull" | "throw";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface ApiState {
  // Per-endpoint state (keyed by URL/path)
  queries: Record<string, { data: unknown; loading: boolean; error: Error | null }>;

  // Actions
  apiRequest: <T>(method: string, url: string, data?: unknown) => Promise<T>;
  getQuery: <T>(url: string, on401?: UnauthorizedBehavior) => Promise<T | null>;
  // Mutations (e.g., POST)
  postData: <T>(url: string, data: unknown) => Promise<T>;
  // Utils (exposed for custom use)
  throwIfResNotOk: typeof throwIfResNotOk;
}

export const useApiStore = create<ApiState>()(
  produce((set, get) => ({
    queries: {},

    apiRequest: async <T>(method: string, url: string, data?: unknown): Promise<T> => {
      set((state) => {
        state.queries[url] = { ...state.queries[url], loading: true, error: null };
      });

      try {
        const res = await fetch(url, {
          method,
          headers: data ? { "Content-Type": "application/json" } : {},
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        await get().throwIfResNotOk(res);
        const json = await res.json();

        set((state) => {
          state.queries[url] = { data: json, loading: false, error: null };
        });

        // Cross-store: e.g., if beatmap URL, update game
        if (url.includes('/beatmaps')) {
          useGameStore.getState().loadBeatmap(json.text, json.difficulty);
        }

        return json as T;
      } catch (error) {
        const err = error as Error;
        set((state) => {
          state.queries[url] = { data: null, loading: false, error: err };
        });
        throw err;
      }
    },

    getQuery: async <T>(url: string, unauthorizedBehavior: UnauthorizedBehavior = "throw"): Promise<T | null> => {
      set((state) => {
        state.queries[url] = { ...state.queries[url], loading: true, error: null };
      });

      try {
        const res = await fetch(url, { credentials: "include" });
        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          set((state) => {
            state.queries[url] = { data: null, loading: false, error: null };
          });
          return null;
        }
        await get().throwIfResNotOk(res);
        const json = await res.json();

        set((state) => {
          state.queries[url] = { data: json, loading: false, error: null };
        });

        return json as T;
      } catch (error) {
        const err = error as Error;
        set((state) => {
          state.queries[url] = { data: null, loading: false, error: err };
        });
        throw err;
      }
    },

    postData: async <T>(url: string, data: unknown): Promise<T> => {
      return get().apiRequest('POST', url, data);
    },

    throwIfResNotOk,
  }))
);