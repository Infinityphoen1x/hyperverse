// src/stores/useErrorStore.ts (Updated - integrate utils/resets)
import { create } from 'zustand';
import { GameErrors } from '@/lib/errors/errorLog';
import { countErrorsByCategory, resetHitStats, resetRenderStats } from '../utils/errorLogUtils';

interface ErrorStoreState {
  errors: string[];
  animations: any[];
  noteStats: { total: number; tap: number; hold: number; hit: number; missed: number; failed: number; byLane: Record<number, number> };
  renderStats: { rendered: number; preMissed: number };
  hitStats: { successfulHits: number; tapTooEarlyFailures: number; tapMissFailures: number; tooEarlyFailures: number; holdMissFailures: number; holdReleaseFailures: number };
  animationStats: { total: number; completed: number; failed: number; pending: number; rendering: number };
  errorCounts: { beatmapLoader: number; parser: number; converter: number; meter: number; trapezoid: number; game: number };
}

interface ErrorStoreActions {
  syncFromGameErrors: () => void;
  downloadUnifiedLogs: () => void;
  clearLogs: () => void;
}

const initialState: ErrorStoreState = {
  errors: [],
  animations: [],
  noteStats: { total: 0, tap: 0, hold: 0, hit: 0, missed: 0, failed: 0, byLane: {} },
  renderStats: { rendered: 0, preMissed: 0 },
  hitStats: { successfulHits: 0, tapTooEarlyFailures: 0, tapMissFailures: 0, tooEarlyFailures: 0, holdMissFailures: 0, holdReleaseFailures: 0 },
  animationStats: { total: 0, completed: 0, failed: 0, pending: 0, rendering: 0 },
  errorCounts: { beatmapLoader: 0, parser: 0, converter: 0, meter: 0, trapezoid: 0, game: 0 },
};

export const useErrorStore = create<ErrorStoreState & ErrorStoreActions>((set, get) => ({
  ...initialState,

  syncFromGameErrors: () => {
    const state = get();
    set({
      errors: [...GameErrors.notes],
      animations: [...GameErrors.animations],
      noteStats: { ...GameErrors.noteStats },
      renderStats: { ...GameErrors.renderStats },
      hitStats: { ...GameErrors.hitStats },
      animationStats: GameErrors.getAnimationStats(),
      errorCounts: countErrorsByCategory(GameErrors.notes),
    });
  },

  downloadUnifiedLogs: () => {
    const state = get();
    const consoleLogs = (window as any).__consoleLogs || [];

    const logData = {
      timestamp: new Date().toISOString(),
      gameErrors: {
        errors: state.errors,
        animations: state.animations,
        stats: {
          notes: state.noteStats,
          render: state.renderStats,
          hits: state.hitStats,
          animation: state.animationStats,
        },
      },
      consoleLogs: consoleLogs.map((entry: any) => ({
        t: entry.t,
        level: entry.l,
        message: entry.m,
      })),
    };

    const jsonStr = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hyperverse-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  clearLogs: () => {
    const emptyHitStats = resetHitStats();
    const emptyRenderStats = resetRenderStats();
    GameErrors.notes = [];
    GameErrors.animations = [];
    GameErrors.renderStats = emptyRenderStats;
    GameErrors.hitStats = emptyHitStats;
    set(initialState);
  },
}));