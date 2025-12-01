// src/stores/useGameDebuggerStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import { useAnimationTrackerStore } from './useAnimationTrackerStore';
import type { Note } from '@/lib/engine/gameTypes';
import type { AnimationStatistics, AnimationTrackingEntry, FailureType, HitStatistics, NoteStatistics, RenderStatistics } from '@/types/gameDebugTypes';

const EMPTY_NOTE_STATS: NoteStatistics = {
  total: 0,
  tap: 0,
  hold: 0,
  hit: 0,
  missed: 0,
  failed: 0,
  byLane: {},
};
const EMPTY_HIT_STATS: HitStatistics = {
  successfulHits: 0,
  tapTooEarlyFailures: 0,
  tapMissFailures: 0,
  tooEarlyFailures: 0,
  holdMissFailures: 0,
  holdReleaseFailures: 0,
};

interface DebugState {
  // Logs
  errorLog: string[];
  MAX_LOG_SIZE: number;

  // Stats
  noteStats: NoteStatistics;
  hitStats: HitStatistics;
  renderStats: RenderStatistics;

  // Actions
  log: (message: string) => void;
  trackAnimation: (noteId: string, type: FailureType, failureTime?: number) => void;
  updateAnimation: (noteId: string, updates: Partial<AnimationTrackingEntry>) => void;
  updateRenderStats: (rendered: number, preMissed: number) => void;
  updateNoteStats: (notes: Note[]) => void;
  getAnimationStats: () => AnimationStatistics;
  getAnimationTracking: () => AnimationTrackingEntry[];
  getErrorLog: () => string[];
  getNoteStats: () => NoteStatistics;
  getHitStats: () => HitStatistics;
  getRenderStats: () => RenderStatistics;
  clear: () => void;
}

export const useGameDebuggerStore = create<DebugState>()(
  produce((set, get) => ({
    errorLog: [],
    MAX_LOG_SIZE: 100,
    noteStats: { ...EMPTY_NOTE_STATS },
    hitStats: { ...EMPTY_HIT_STATS },
    renderStats: { rendered: 0, preMissed: 0 },

    log: (message) => {
      const logEntry = `[${Date.now()}] ${message}`;
      set((state) => {
        state.errorLog.push(logEntry);
        if (state.errorLog.length > state.MAX_LOG_SIZE) state.errorLog.shift();
      });
      console.warn(`[GAME DEBUG] ${logEntry}`); // Always console if enabled globally
    },

    trackAnimation: (noteId, type, failureTime) => {
      useAnimationTrackerStore.getState().track(noteId, type, failureTime);
    },

    updateAnimation: (noteId, updates) => {
      useAnimationTrackerStore.getState().update(noteId, updates);
    },

    updateRenderStats: (rendered, preMissed) => {
      set({ renderStats: { rendered, preMissed } });
    },

    updateNoteStats: (notes) => {
      const noteStats = { ...EMPTY_NOTE_STATS };
      const hitStats = { ...EMPTY_HIT_STATS };
      for (const note of notes) {
        noteStats.total++;
        noteStats.byLane[note.lane] = (noteStats.byLane[note.lane] || 0) + 1;
        if (note.type === 'TAP') noteStats.tap++;
        else noteStats.hold++;
        if (note.hit) {
          noteStats.hit++;
          hitStats.successfulHits++;
        }
        if (note.missed) noteStats.missed++;

        const failures = getFailures(note);
        if (failures.length > 0) {
          noteStats.failed++;
          failures.forEach(f => {
            (hitStats as any)[`${f}Failures`]++; // Dynamic key for tapTooEarlyFailures, etc.
          });
        }
      }
      set({ noteStats, hitStats });
    },

    getAnimationStats: () => useAnimationTrackerStore.getState().getStats(),

    getAnimationTracking: () => useAnimationTrackerStore.getState().getEntries(),

    getErrorLog: () => [...get().errorLog],

    getNoteStats: () => ({ ...get().noteStats, byLane: { ...get().noteStats.byLane } }),

    getHitStats: () => ({ ...get().hitStats }),

    getRenderStats: () => ({ ...get().renderStats }),

    clear: () => {
      set({ errorLog: [] });
      useAnimationTrackerStore.getState().clear();
      set({ noteStats: { ...EMPTY_NOTE_STATS }, hitStats: { ...EMPTY_HIT_STATS }, renderStats: { rendered: 0, preMissed: 0 } });
    },
  }))
);

// Private helper (as util or inline)
function getFailures(note: Note): string[] {
  const failures: string[] = [];
  if (note.tapTooEarlyFailure) failures.push('tapTooEarly');
  if (note.tapMissFailure) failures.push('tapMiss');
  if (note.tooEarlyFailure) failures.push('tooEarly');
  if (note.holdMissFailure) failures.push('holdMiss');
  if (note.holdReleaseFailure) failures.push('holdRelease');
  return failures;
}