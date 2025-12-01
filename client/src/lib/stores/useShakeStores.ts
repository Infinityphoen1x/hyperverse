// src/stores/useShakeStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import type { ShakeOffset } from '@/types/visualEffects';
import { COMBO_MILESTONE, SHAKE_INTERVAL, SHAKE_OFFSET_MULTIPLIER, SHAKE_DURATION } from '@/lib/config/gameConstants';

interface ShakeState {
  shakeOffset: ShakeOffset;
  startShake: (combo: number) => void;
  stopShake: () => void;
  updateShakeOffset: () => void; // For interval
}

const DEFAULT_OFFSET: ShakeOffset = { x: 0, y: 0 };

export const useShakeStore = create<ShakeState>()(
  produce((set, get) => ({
    shakeOffset: DEFAULT_OFFSET,

    startShake: (combo) => {
      if (combo > 0 && combo % COMBO_MILESTONE === 0) {
        set({ shakeOffset: getRandomOffset() });
        // Clear existing
        get().stopShake();
        // Start interval
        const interval = setInterval(() => get().updateShakeOffset(), SHAKE_INTERVAL);
        // Stop after duration
        const timeout = setTimeout(() => {
          clearInterval(interval);
          set({ shakeOffset: DEFAULT_OFFSET });
        }, SHAKE_DURATION);
        // Store refs globally (via closure)
        (get() as any).intervalRef = interval;
        (get() as any).timeoutRef = timeout;
      }
    },

    stopShake: () => {
      const state = get();
      if (state.intervalRef) clearInterval(state.intervalRef);
      if (state.timeoutRef) clearTimeout(state.timeoutRef);
      set({ shakeOffset: DEFAULT_OFFSET });
    },

    updateShakeOffset: () => set({ shakeOffset: getRandomOffset() }),
  }))
);

function getRandomOffset(): ShakeOffset {
  return {
    x: (Math.random() - 0.5) * SHAKE_OFFSET_MULTIPLIER,
    y: (Math.random() - 0.5) * SHAKE_OFFSET_MULTIPLIER,
  };
}

// Global refs for timers (Zustand doesn't persist refs, so extend state minimally)
let intervalRef: NodeJS.Timeout | null = null;
let timeoutRef: NodeJS.Timeout | null = null;
useShakeStore.setState({ intervalRef, timeoutRef } as any); // Type assertion for simplicity
useShakeStore.subscribe(
  (state) => state.shakeOffset,
  () => {}, // No-op for trigger
  { fireImmediately: false }
);