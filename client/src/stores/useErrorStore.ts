import { create } from 'zustand';

export interface ErrorStoreState {
  errors: string[];
  errorCount: number;
  addError: (error: string) => void;
  clearErrors: () => void;
  getErrors: () => string[];
}

export const useErrorStore = create<ErrorStoreState>((set, get) => ({
  errors: [],
  errorCount: 0,

  addError: (error) => {
    set((state) => ({
      errors: [...state.errors, error],
      errorCount: state.errorCount + 1,
    }));
  },

  clearErrors: () => set({ errors: [], errorCount: 0 }),

  getErrors: () => get().errors,
}));
