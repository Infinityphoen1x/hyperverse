// src/stores/useTimingStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';

interface TimingState {
  currentTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  startTime: number | null;
  pauseTime: number | null;

  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  syncToVideoTime: (videoTimeMs: number) => void;
  getCurrentTime: (videoTime?: number | null) => number;
}

export const useTimingStore = create<TimingState>()(
  produce((set, get) => ({
    currentTime: 0,
    isPlaying: false,
    isPaused: false,
    startTime: null,
    pauseTime: null,

    start: () => {
      const now = Date.now();
      set({ isPlaying: true, isPaused: false, startTime: now, currentTime: 0 });
    },

    pause: () => {
      if (!get().isPlaying) return;
      const now = Date.now();
      const elapsed = now - (get().startTime ?? 0);
      set({ isPaused: true, pauseTime: now, currentTime: get().currentTime + elapsed });
    },

    resume: () => {
      if (!get().isPaused) return;
      const now = Date.now();
      const pausedElapsed = now - (get().pauseTime ?? 0);
      set({ isPaused: false, pauseTime: null, startTime: (get().startTime ?? 0) + pausedElapsed });
    },

    reset: () => set({ currentTime: 0, isPlaying: false, isPaused: false, startTime: null, pauseTime: null }),

    syncToVideoTime: (videoTimeMs) => set({ currentTime: videoTimeMs }),

    getCurrentTime: (videoTime) => videoTime ?? get().currentTime,
  }))
);