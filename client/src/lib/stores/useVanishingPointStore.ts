// src/stores/useVanishingPointStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import { ANGLE_SHIFT_DISTANCE, ANGLE_SHIFT_DURATION } from '@/lib/config/gameConstants';
import { shallow } from 'zustand/shallow';

interface Offset {
  x: number;
  y: number;
}

interface VanishingPointState {
  vpOffset: Offset;
  startOffsetShift: (combo: number) => void;
  animateOffset: () => void; // For RAF
}

const DEFAULT_OFFSET: Offset = { x: 0, y: 0 };

export const useVanishingPointStore = create<VanishingPointState>()(
  produce((set, get) => ({
    vpOffset: DEFAULT_OFFSET,

    startOffsetShift: (combo) => {
      const currentMilestone = Math.floor(combo / 10) * 10;
      if (combo <= 0) return;
      const prevMilestone = get().prevMilestone || 0; // Assume added to state if needed
      if (currentMilestone === prevMilestone) return;
      set({ prevMilestone: currentMilestone });

      const now = Date.now();
      let targetOffset: Offset;
      if (currentMilestone % 50 === 0) {
        targetOffset = DEFAULT_OFFSET;
      } else {
        const angle = Math.random() * Math.PI * 2;
        targetOffset = {
          x: Math.cos(angle) * ANGLE_SHIFT_DISTANCE,
          y: Math.sin(angle) * ANGLE_SHIFT_DISTANCE,
        };
      }
      set({
        animationStart: now,
        currentOffset: get().vpOffset, // Start from current
        targetOffset,
      });
    },

    animateOffset: () => {
      const { animationStart, currentOffset, targetOffset, vpOffset } = get();
      const now = Date.now();
      const elapsed = now - animationStart;
      if (elapsed >= ANGLE_SHIFT_DURATION) return; // Stop if done

      const progress = Math.min(elapsed / ANGLE_SHIFT_DURATION, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const newX = currentOffset.x + (targetOffset.x - currentOffset.x) * easeProgress;
      const newY = currentOffset.y + (targetOffset.y - currentOffset.y) * easeProgress;
      set({ vpOffset: { x: newX, y: newY } });

      // Snap to target on completion (next frame)
      if (progress >= 1) {
        set({ vpOffset: targetOffset });
      }
    },
  }))
);

// Persistent RAF for animation (global, like interval in particles)
let rafId: number;
const loop = () => {
  useVanishingPointStore.getState().animateOffset();
  rafId = requestAnimationFrame(loop);
};
loop(); // Start on import; assumes game context

// Cleanup on unmount (e.g., in app root effect)
useVanishingPointStore.subscribe(
  () => {},
  () => {
    return () => cancelAnimationFrame(rafId);
  },
  { fireImmediately: false }
);