import { create } from 'zustand';

export interface ConsoleLogEntry {
  t: number;
  l: 'log' | 'warn' | 'error';
  m: string;
}

export interface ConsoleLogStoreState {
  logs: ConsoleLogEntry[];
  addLog: (entry: ConsoleLogEntry) => void;
  getLogs: () => ConsoleLogEntry[];
  clearLogs: () => void;
}

export const useConsoleLogStore = create<ConsoleLogStoreState>((set, get) => ({
  logs: [],

  addLog: (entry) => {
    set((state) => ({ logs: [...state.logs, entry] }));
  },

  getLogs: () => get().logs,

  clearLogs: () => set({ logs: [] }),
}));
