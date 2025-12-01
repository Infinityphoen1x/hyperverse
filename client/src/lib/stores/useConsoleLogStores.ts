// src/stores/useConsoleLogStore.ts
import { create } from 'zustand';

interface ConsoleLogEntry {
  t: number;
  l: 'log' | 'warn' | 'error';
  m: string;
}

interface ConsoleLogState {
  logs: ConsoleLogEntry[];
  addLog: (entry: ConsoleLogEntry) => void;
  clearLogs: () => void;
  downloadLogs: () => void;
}

export const useConsoleLogStore = create<ConsoleLogState>((set, get) => ({
  logs: [],
  addLog: (entry) => set(state => ({ logs: [...state.logs, entry] })),
  clearLogs: () => set({ logs: [] }),
  downloadLogs: () => {
    const state = get();
    const logData = {
      timestamp: new Date().toISOString(),
      consoleLogs: state.logs,
    };
    const jsonStr = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `console-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
}));