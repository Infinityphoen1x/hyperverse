import { create } from 'zustand';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export interface ToastStoreState {
  toasts: Toast[];
  toast: (options: Toast) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  toast: (options) => {
    const id = options.id || Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { ...options, id }] }));
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
