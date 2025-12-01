// src/hooks/useGameDebugger.ts
import { useDebugValue as useReactDebugValue } from 'react';
import { useGameDebuggerStore } from '@/stores/useGameDebuggerStore';
import { FailureType } from '@/types/gameDebugTypes';

// Facade interface for debug operations
interface DebugFacade {
  log: (msg: string) => void;
  trackAnimation: (noteId: string, type: FailureType, failureTime?: number) => void;
  updateAnimation: (noteId: string, updates: any) => void;
  updateNoteStats: (notes: any[]) => void;
  updateRenderStats: (rendered: number, preMissed: number) => void;
  getAnimationStats: () => any;
  getNoteStats: () => any;
  getHitStats: () => any;
  getRenderStats: () => any;
}

export function useGameDebugger(enabled: boolean = true): DebugFacade {
  // Enabled facade: Dispatch actions
  const facade: DebugFacade = enabled ? {
    log: (msg) => useGameDebuggerStore.getState().log(msg),
    trackAnimation: (noteId, type, failureTime) => useGameDebuggerStore.getState().trackAnimation(noteId, type, failureTime),
    updateAnimation: (noteId, updates) => useGameDebuggerStore.getState().updateAnimation(noteId, updates),
    updateNoteStats: (notes) => useGameDebuggerStore.getState().updateNoteStats(notes),
    updateRenderStats: (rendered, preMissed) => useGameDebuggerStore.getState().updateRenderStats(rendered, preMissed),
    getAnimationStats: () => ({ total: useGameDebuggerStore.getState().animations.length }),
    getNoteStats: () => useGameDebuggerStore.getState().noteStats,
    getHitStats: () => useGameDebuggerStore.getState().hitStats,
    getRenderStats: () => useGameDebuggerStore.getState().renderStats,
  } : {
    // Disabled: Noop facade
    log: () => {},
    trackAnimation: () => {},
    updateAnimation: () => {},
    updateNoteStats: () => {},
    updateRenderStats: () => {},
    getAnimationStats: () => ({}),
    getNoteStats: () => ({}),
    getHitStats: () => ({}),
    getRenderStats: () => ({}),
  };

  return facade;
}

export function useDebugValue(debugFacade: DebugFacade): void {
  // Use store directly for reactive stats (bypasses facade for perf)
  const stats = useGameDebuggerStore((state) => ({
    animations: { total: state.animations.length /* derive */ },
    notes: state.noteStats,
    hits: state.hitStats,
    render: state.renderStats,
  }));

  useReactDebugValue(stats);
}