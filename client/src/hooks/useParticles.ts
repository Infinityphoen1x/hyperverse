// src/hooks/useParticles.ts
import { useState, useEffect } from 'react';
import { COMBO_MILESTONE, PARTICLES_PER_EFFECT, MAX_PARTICLES_BUFFER, PARTICLE_SIZE_MIN, PARTICLE_SIZE_MAX, PARTICLE_COLORS } from '@/lib/config/gameConstants';
import { generateParticles } from '@/utils/visualEffectsUtils'; // Utility factory

interface UseParticlesProps { combo: number; }
interface Particle { id: string; x: number; y: number; color: string; size: number; birthTime: number; }

export const useParticles = ({ combo }: UseParticlesProps): Particle[] => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (combo > 0 && combo % COMBO_MILESTONE === 0) {
      const newParticles = generateParticles(PARTICLES_PER_EFFECT);
      setParticles(prev => [...prev, ...newParticles].slice(-MAX_PARTICLES_BUFFER));
    }

    // Auto-cleanup
    const interval = setInterval(() => {
      setParticles(prev => prev.filter(p => Date.now() - p.birthTime < 1000));
    }, 100); // Throttle cleanup

    return () => clearInterval(interval);
  }, [combo]);

  return particles;
};