// src/hooks/useGameDebugger.ts
import { useDebugValue as useReactDebugValue } from 'react';
import { useGameDebuggerStore } from '@/stores/useGameDebuggerStore';
import type { GameDebugger } from '@/lib/engine/gameDebugTools'; // Legacy type; adapt as needed

// Facade interface matching GameDebugger for compatibility
interface DebugFacade {
  log: (msg: string) => void;
  trackAnimation: (noteId: string, type: string, failureTime?: number) => void;
  updateAnimation: (noteId: string, updates: any) => void;
  updateNoteStats: (notes: any[]) => void;
  updateRenderStats: (rendered: number, preMissed: number) => void;
  getAnimationStats: () => any;
  getNoteStats: () => any;
  getHitStats: () => any;
  getRenderStats: () => any;
  clear: () => void;
}

export function useGameDebugger(enabled: boolean = true): DebugFacade {
  const store = useGameDebuggerStore;

  // Enabled facade: Dispatch actions
  const facade: DebugFacade = enabled ? {
    log: (msg) => store.getState().log(msg),
    trackAnimation: (noteId, type, failureTime) => store.getState().trackAnimation(noteId, type, failureTime),
    updateAnimation: (noteId, updates) => store.getState().updateAnimation(noteId, updates),
    updateNoteStats: (notes) => store.getState().updateNoteStats(notes),
    updateRenderStats: (rendered, preMissed) => store.getState().updateRenderStats(rendered, preMissed),
    getAnimationStats: () => ({ total: store.getState().animations.length /* derive more */ }),
    getNoteStats: () => store.getState().noteStats,
    getHitStats: () => store.getState().hitStats,
    getRenderStats: () => store.getState().renderStats,
    clear: () => store.getState().clear(),
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
    clear: () => {},
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