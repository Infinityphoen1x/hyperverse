// Consolidated constants file with game, hold note, and tap note constants

// ============================================================================
// GAME CONSTANTS (from lib/utils/gameConstants)
// ============================================================================

// Button configuration - all 6 lanes (4 soundpads + 2 deck controls)
export const BUTTON_CONFIG = [
  { lane: 0, key: 'W', angle: 120, color: '#FF007F' },    // W - top-left pink
  { lane: 1, key: 'O', angle: 60, color: '#0096FF' },     // O - top-right blue
  { lane: 2, key: 'I', angle: 300, color: '#BE00FF' },    // I - bottom-right purple
  { lane: 3, key: 'E', angle: 240, color: '#00FFFF' },    // E - bottom-left cyan
  { lane: -1, key: 'Q', angle: 180, color: '#00FF00' },   // Q - left deck green
  { lane: -2, key: 'P', angle: 0, color: '#FF0000' },     // P - right deck red
];

// 3D tunnel geometry constants
export const VANISHING_POINT_X = 350;
export const VANISHING_POINT_Y = 200;
export const LEAD_TIME = 4000; // ms
export const JUDGEMENT_RADIUS = 187; // px
export const HOLD_ANIMATION_DURATION = 1100; // ms
export const HOLD_ACTIVATION_WINDOW = 300; // ms
export const HEXAGON_RADII = [22, 52, 89, 135, 187, 248]; // px
export const RAY_ANGLES = [0, 60, 120, 180, 240, 300]; // degrees
export const TUNNEL_MAX_DISTANCE = 260; // px

// TAP note timing and visuals
export const TAP_RENDER_WINDOW_MS = 2000; // ms
export const TAP_FALLTHROUGH_WINDOW_MS = 1100; // ms
export const TAP_HIT_HOLD_DURATION = 700; // ms
export const HOLD_RENDER_WINDOW_MS = 4000; // ms
export const TAP_JUDGEMENT_LINE_WIDTH = 35; // px
export const HOLD_JUDGEMENT_LINE_WIDTH = 45; // px

// Tunnel container dimensions
export const TUNNEL_CONTAINER_WIDTH = 700; // px
export const TUNNEL_CONTAINER_HEIGHT = 600; // px

// Color palette
export const COLOR_DECK_LEFT = '#00FF00'; // Q - green
export const COLOR_DECK_RIGHT = '#FF0000'; // P - red
export const COLOR_PAD_W = '#FF007F'; // W - pink
export const COLOR_PAD_O = '#0096FF'; // O - blue
export const COLOR_PAD_I = '#BE00FF'; // I - purple
export const COLOR_PAD_E = '#00FFFF'; // E - cyan

// Greyscale colors
export const GREYSCALE_FILL_COLOR = 'rgba(80, 80, 80, 0.8)';
export const GREYSCALE_GLOW_COLOR = 'rgba(100, 100, 100, 0.4)';

// Hold note geometry
export const HOLD_NOTE_STRIP_WIDTH_MULTIPLIER = 0.15;
export const FAILURE_ANIMATION_DURATION = 1100; // ms

// ============================================================================
// TAP NOTE CONSTANTS
// ============================================================================

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

// ============================================================================
// HOLD NOTE CONSTANTS
// ============================================================================

export const HOLD_OPACITY = {
  MIN_BASE: 0.4,
  MAX_PROGRESSION: 0.6,
} as const;

export const HOLD_STROKE = {
  BASE_WIDTH: 2,
  APPROACH_MULTIPLIER: 2,
  COLLAPSE_MULTIPLIER: 2,
} as const;

export const HOLD_GLOW = {
  MIN_SHADOW: 20,
  SHADOW_SCALE: 25,
  MIN_INNER_SHADOW: 12,
  INNER_SHADOW_SCALE: 15,
} as const;
