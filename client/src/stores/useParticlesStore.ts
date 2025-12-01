import { create } from 'zustand';
import type { Particle } from '@/types/visualEffects';

export interface ParticlesStoreState {
  particles: Particle[];
  addParticle: (particle: Particle) => void;
  updateParticles: (updater: (p: Particle[]) => Particle[]) => void;
  clearParticles: () => void;
}

export const useParticlesStore = create<ParticlesStoreState>((set) => ({
  particles: [],

  addParticle: (particle) => {
    set((state) => ({ particles: [...state.particles, particle] }));
  },

  updateParticles: (updater) => {
    set((state) => ({ particles: updater(state.particles) }));
  },

  clearParticles: () => set({ particles: [] }),
}));
