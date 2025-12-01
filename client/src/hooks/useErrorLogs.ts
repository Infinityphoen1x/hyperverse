// src/hooks/useErrorLogs.ts
import { useEffect } from 'react';
import { useErrorStore } from '@/stores/useErrorStore';

export const useErrorLogs = () => {
  const state = useErrorStore();
  
  // Poll for updates from the non-reactive GameErrors object
  useEffect(() => {
    const interval = setInterval(() => {
      state.syncFromGameErrors();
    }, 500);
    return () => clearInterval(interval);
  }, [state]);

  return {
    errors: state.errors,
    animations: state.animations,
    noteCounts: state.errorCounts,
    noteStats: state.noteStats,
    renderStats: state.renderStats,
    hitStats: state.hitStats,
    animationStats: state.animationStats,
    downloadUnifiedLogs: state.downloadUnifiedLogs,
    clearLogs: state.clearLogs,
  };
};
