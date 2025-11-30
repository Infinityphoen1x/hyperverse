export const TAP_FAILURE_ANIMATIONS = {
  TOO_EARLY: {
    duration: 800,
  },
  MISS: {
    duration: 1100,
  },
} as const;

export const TAP_HIT_FLASH = {
  DURATION: 600,
  FADE_START: 600,
  FADE_DURATION: 100,
} as const;

export const TAP_DEPTH = {
  MIN: 5,
  MAX: 40,
  FADE_TIME: 2000,
} as const;

export const TAP_RAY = {
  SPREAD_ANGLE: 8,
} as const;

export const TAP_COLORS = {
  STROKE_DEFAULT: 'rgba(255,255,255,0.8)',
  STROKE_FAILED: 'rgba(120, 120, 120, 1)',
  GLOW_SHADOW: (color: string) => `drop-shadow(0 0 35px ${color}) drop-shadow(0 0 20px ${color}) drop-shadow(0 0 10px ${color})`,
} as const;

export const TAP_OPACITY = {
  MIN_BASE: 0.4,
  MAX_PROGRESSION: 0.6,
  MIN_FADE: 0.1,
} as const;
