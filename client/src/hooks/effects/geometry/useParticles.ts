// src/hooks/useParticles.ts
import { useParticlesStore } from '@/stores/useParticlesStore';
import type { Particle } from '@/types/visualEffects';

export const useParticles = (): Particle[] => {
  return useParticlesStore((state) => state.particles);
};