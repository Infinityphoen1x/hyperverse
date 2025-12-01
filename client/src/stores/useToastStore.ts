import { create } from 'zustand';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
}

export type ToastProps = Omit<Toast, 'id'>;

export interface ToastStoreState {
  toasts: Toast[];
  addToast: (toast: Toast) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = (props: ToastProps) => {
  const id = Math.random().toString(36).substring(2, 9);
  useToastStore.getState().addToast({ ...props, id });
  return { id, dismiss: () => useToastStore.getState().dismiss(id) };
};

export const useToast = () => {
  const { toasts, dismiss } = useToastStore();
  return { toast, toasts, dismiss };
};
