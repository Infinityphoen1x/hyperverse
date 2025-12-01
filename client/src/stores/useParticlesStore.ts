import { create } from 'zustand';

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

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
