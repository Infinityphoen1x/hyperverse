// src/hooks/useAnimationTracker.ts
import { useAnimationTrackerStore } from '@/stores/useAnimationTrackerStore';
import type { AnimationTrackingEntry, AnimationStatistics } from '@/types/gameDebugTypes';
import { shallow } from 'zustand/shallow';

export function useAnimationTracker() {
  const {
    track,
    update,
    clear,
    getEntries,
    getStats,
  } = useAnimationTrackerStore();

  return {
    entries: getEntries(),
    stats: getStats(),
    track,
    update,
    clear,
  };
}

export function useAnimationStats(): AnimationStatistics {
  return useAnimationTrackerStore((state) => state.getStats());
}

export function useAnimationEntries(): AnimationTrackingEntry[] {
  return useAnimationTrackerStore((state) => state.getEntries(), shallow);
}