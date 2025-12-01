// src/stores/useParticlesStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import type { Particle } from '@/types/visualEffects';
import { PARTICLES_PER_EFFECT, MAX_PARTICLES_BUFFER } from '@/lib/config/gameConstants';
import { generateParticles } from '@/utils/visualEffectsUtils';

interface ParticlesState {
  particles: Particle[];

  // Actions
  addParticlesOnCombo: (combo: number) => void;
  // Internal: Called by subscription for cleanup
  cleanupParticles: () => void;
}

const LIFETIME_MS = 1000; // From your original

export const useParticlesStore = create<ParticlesState>()(
  produce((set, get) => ({
    particles: [],

    addParticlesOnCombo: (combo: number) => {
      const { COMBO_MILESTONE } = await import('@/lib/config/gameConstants'); // Dynamic import if needed
      if (combo > 0 && combo % COMBO_MILESTONE === 0) {
        const newParticles = generateParticles(PARTICLES_PER_EFFECT);
        set((state) => {
          state.particles.push(...newParticles);
          state.particles = state.particles.slice(-MAX_PARTICLES_BUFFER);
        });
      }
    },

    cleanupParticles: () => {
      set((state) => {
        const now = Date.now();
        state.particles = state.particles.filter(p => now - p.birthTime < LIFETIME_MS);
      });
    },
  }))
);

// Auto-cleanup subscription (runs globally, like your interval)
useParticlesStore.subscribe(
  () => {}, // No selector needed for side-effect
  () => {
    const interval = setInterval(() => useParticlesStore.getState().cleanupParticles(), 100);
    return () => clearInterval(interval);
  },
  { fireImmediately: true } // Starts on app load
);