// src/utils/visualEffectsUtils.ts
import { PARTICLE_COLORS, PARTICLE_SIZE_MIN, PARTICLE_SIZE_MAX } from '@/lib/config/gameConstants';

export const generateParticles = (count: number) => {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `${now}-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    size: Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN) + PARTICLE_SIZE_MIN,
    birthTime: now,
  }));
};

export const toggleGlitchState = (prevGlitch: number, opacity: number): number => {
  return prevGlitch > 0 ? 0 : opacity;
};