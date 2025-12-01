// src/hooks/useErrorLogs.ts
import { useState, useEffect } from 'react';
import { useErrorStore } from '@/stores/useErrorStore'; // Zustand store for errors/stats
import { countErrorsByCategory, formatLaneStats, resetHitStats, resetRenderStats } from '@/lib/utils/errorLogUtils';
import { GameErrors } from '@/lib/errors/errorLog';

interface UseErrorLogsReturn {
  errors: string[];
  animations: any[];
  errorCounts: { beatmapLoader: number; parser: number; converter: number; meter: number; trapezoid: number; game: number };
  noteStats: { total: number; tap: number; hold: number; hit: number; missed: number; failed: number; byLane: Record<number, number> };
  renderStats: { rendered: number; preMissed: number };
  hitStats: { successfulHits: number; tapTooEarlyFailures: number; tapMissFailures: number; tooEarlyFailures: number; holdMissFailures: number; holdReleaseFailures: number };
  animationStats: { total: number; completed: number; failed: number; pending: number; rendering: number };
  downloadUnifiedLogs: () => void;
  clearLogs: () => void;
}

export const useErrorLogs = (): UseErrorLogsReturn => {
  const {
    errors,
    animations,
    noteStats,
    renderStats,
    hitStats,
    animationStats,
    errorCounts,
    downloadUnifiedLogs,
    clearLogs,
  } = useErrorStore(); // Pull all from store selectors

  // If store doesn't poll, local effect can sync from GameErrors (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger store update if needed (store handles derivation)
      useErrorStore.getState().syncFromGameErrors();
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return {
    errors,
    animations,
    noteCounts: errorCounts, // Derived in store
    noteStats,
    renderStats,
    hitStats,
    animationStats,
    downloadUnifiedLogs,
    clearLogs,
  };
};