// src/stores/useAnimationTrackerStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import type { AnimationTrackingEntry, FailureType, AnimationStatistics } from '@/types/gameDebugTypes';

interface AnimationTrackerState {
  tracking: AnimationTrackingEntry[];
  MAX_ENTRIES: number;

  track: (noteId: string, type: FailureType, failureTime?: number) => void;
  update: (noteId: string, updates: Partial<AnimationTrackingEntry>) => void;
  getStats: () => AnimationStatistics;
  getEntries: () => AnimationTrackingEntry[];
  clear: () => void;
}

export const useAnimationTrackerStore = create<AnimationTrackerState>()(
  produce((set, get) => ({
    tracking: [],
    MAX_ENTRIES: 200,

    track: (noteId, type, failureTime) => {
      set((state) => {
        state.tracking.push({ noteId, type, failureTime, status: 'pending' as const });
        if (state.tracking.length > state.MAX_ENTRIES) {
          state.tracking.shift();
        }
      });
    },

    update: (noteId, updates) => {
      set((state) => {
        const entry = state.tracking.find(a => a.noteId === noteId);
        if (entry) {
          Object.assign(entry, updates);
        }
      });
    },

    getStats: () => {
      const { tracking } = get();
      return {
        total: tracking.length,
        completed: tracking.filter(a => a.status === 'completed').length,
        failed: tracking.filter(a => a.status === 'failed').length,
        pending: tracking.filter(a => a.status === 'pending').length,
        rendering: tracking.filter(a => a.status === 'rendering').length,
      };
    },

    getEntries: () => [...get().tracking],

    clear: () => set({ tracking: [] }),
  }))
);