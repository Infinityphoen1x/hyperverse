/**
 * Visual effects constants
 * Particles, screen shake, chromatic aberration, glitch, greyscale, health
 */

export interface VisualEffects {
  maxHealth: number;
  lowHealthThreshold: number;
  comboMilestone: number;
  comboPerfectMilestone: number;
  particlesPerEffect: number;
  maxParticlesBuffer: number;
  particleSizeMin: number;
  particleSizeMax: number;
  shakeInterval: number;
  shakeOffsetMultiplier: number;
  shakeDuration: number;
  chromaticDuration: number;
  chromaticIntensity: number;
  chromaticOffsetPx: number;
  glitchBaseInterval: number;
  glitchRandomRange: number;
  glitchOpacity: number;
  greyscaleIntensity: number;
  glitchBackgroundSize: number;
}

export const VISUAL_EFFECTS: VisualEffects = {
  maxHealth: 200,
  lowHealthThreshold: 50,
  comboMilestone: 5,
  comboPerfectMilestone: 10,
  particlesPerEffect: 12,
  maxParticlesBuffer: 60,
  particleSizeMin: 4,
  particleSizeMax: 12,
  shakeInterval: 50,
  shakeOffsetMultiplier: 16,
  shakeDuration: 300,
  chromaticDuration: 400,
  chromaticIntensity: 0.8,
  chromaticOffsetPx: 15,
  glitchBaseInterval: 400,
  glitchRandomRange: 200,
  glitchOpacity: 0.3,
  greyscaleIntensity: 0.8,
  glitchBackgroundSize: 60,
};

export interface HealthThresholds {
  max: number;
  lowThreshold: number;
}

export const HEALTH_THRESHOLDS: HealthThresholds = {
  max: VISUAL_EFFECTS.maxHealth,
  lowThreshold: VISUAL_EFFECTS.lowHealthThreshold,
};

export const LOW_HEALTH_THRESHOLD = HEALTH_THRESHOLDS.lowThreshold;

export interface ComboMilestones {
  normal: number;
  perfect: number;
}

export const COMBO_MILESTONES: ComboMilestones = {
  normal: VISUAL_EFFECTS.comboMilestone,
  perfect: VISUAL_EFFECTS.comboPerfectMilestone,
};

export const COMBO_MILESTONE = COMBO_MILESTONES.normal;
export const COMBO_PERFECT_MILESTONE = COMBO_MILESTONES.perfect;

export interface ChromaticEffect {
  duration: number;
  intensity: number;
  offsetPx: number;
}

export const CHROMATIC_EFFECT: ChromaticEffect = {
  duration: VISUAL_EFFECTS.chromaticDuration,
  intensity: VISUAL_EFFECTS.chromaticIntensity,
  offsetPx: VISUAL_EFFECTS.chromaticOffsetPx,
};

export const CHROMATIC_DURATION = CHROMATIC_EFFECT.duration;
export const CHROMATIC_INTENSITY = CHROMATIC_EFFECT.intensity;
export const CHROMATIC_OFFSET_PX = CHROMATIC_EFFECT.offsetPx;

export const GREYSCALE_INTENSITY = VISUAL_EFFECTS.greyscaleIntensity;

export interface GlitchEffect {
  baseInterval: number;
  randomRange: number;
  opacity: number;
  backgroundSize: number;
}

export const GLITCH_EFFECT: GlitchEffect = {
  baseInterval: VISUAL_EFFECTS.glitchBaseInterval,
  randomRange: VISUAL_EFFECTS.glitchRandomRange,
  opacity: VISUAL_EFFECTS.glitchOpacity,
  backgroundSize: VISUAL_EFFECTS.glitchBackgroundSize,
};

export const GLITCH_BACKGROUND_SIZE = GLITCH_EFFECT.backgroundSize;
export const GLITCH_BASE_INTERVAL = GLITCH_EFFECT.baseInterval;
export const GLITCH_RANDOM_RANGE = GLITCH_EFFECT.randomRange;
export const GLITCH_OPACITY = GLITCH_EFFECT.opacity;

export interface ParticleSize {
  min: number;
  max: number;
}

export const PARTICLE_SIZE: ParticleSize = {
  min: VISUAL_EFFECTS.particleSizeMin,
  max: VISUAL_EFFECTS.particleSizeMax,
};

export const PARTICLE_SIZE_MIN = PARTICLE_SIZE.min;
export const PARTICLE_SIZE_MAX = PARTICLE_SIZE.max;
