// src/lib/errors/errorLog.ts
import { useGameDebuggerStore } from '@/stores/useGameDebuggerStore';
import type { AnimationTrackingEntry, FailureType } from '@/types/gameDebugTypes';

export const GameErrors = {
  // Public selectors (reactive)
  notes: [] as string[], // Legacy mutable; update via actions
  animations: [] as AnimationTrackingEntry[],
  noteStats: { total: 0, tap: 0, hold: 0, hit: 0, missed: 0, failed: 0, byLane: {} as Record<number, number> },
  renderStats: { rendered: 0, preMissed: 0 },
  hitStats: { successfulHits: 0, tapTooEarlyFailures: 0, tapMissFailures: 0, tooEarlyFailures: 0, holdMissFailures: 0, holdReleaseFailures: 0 },

  // Methods (dispatch to store)
  log(msg: string) {
    useGameDebuggerStore.getState().log(msg);
    // Sync legacy (if needed; otherwise remove)
    this.notes = [...useGameDebuggerStore.getState().notes];
  },

  trackAnimation(noteId: string, type: FailureType, failureTime?: number) {
    useGameDebuggerStore.getState().trackAnimation(noteId, type, failureTime);
    this.animations = [...useGameDebuggerStore.getState().animations];
  },

  updateAnimation(noteId: string, updates: Partial<AnimationTrackingEntry>) {
    useGameDebuggerStore.getState().updateAnimation(noteId, updates);
    this.animations = [...useGameDebuggerStore.getState().animations];
  },

  updateNoteStats(notes: any[]) {
    useGameDebuggerStore.getState().updateNoteStats(notes);
    // Sync legacy stats
    const store = useGameDebuggerStore.getState();
    this.noteStats = store.noteStats;
    this.hitStats = store.hitStats; // Assume hitStats updated in action if needed
  },

  updateRenderStats(rendered: number, preMissed: number) {
    useGameDebuggerStore.getState().updateRenderStats(rendered, preMissed);
    this.renderStats = useGameDebuggerStore.getState().renderStats;
  },

  getAnimationStats() {
    // Delegate to store (add if missing: selector for aggregated stats)
    return {
      total: useGameDebuggerStore.getState().animations.length,
      // ... compute from animations
    };
  },
};