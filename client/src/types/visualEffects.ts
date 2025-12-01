// src/types/visualEffects.ts
export interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  birthTime: number;
}

export interface ShakeOffset { x: number; y: number; }
export interface GlitchState { glitch: number; glitchPhase: number; glitchOpacityMultiplier: number; }