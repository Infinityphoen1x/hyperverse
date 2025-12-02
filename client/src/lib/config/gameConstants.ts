// src/lib/config/gameConstants.ts
// Shared game constants used across components

/**
 * Button configuration for all 6 lanes (4 soundpads + 2 deck controls)
 * 
 * SOUNDPAD LANES (0-3): Hexagonal tunnel, clockwise from top
 *  - Lane 0 (W): 120° top-left pink - SOUNDPAD_W
 *  - Lane 1 (O): 60° top-right blue - SOUNDPAD_O
 *  - Lane 2 (I): 300° bottom-right purple - SOUNDPAD_I
 *  - Lane 3 (E): 240° bottom-left cyan - SOUNDPAD_E
 * 
 * DECK CONTROL LANES (negative): Turntable controls outside tunnel
 *  - Lane -1 (Q): 180° left deck green - DECK_LEFT
 *  - Lane -2 (P): 0° right deck red - DECK_RIGHT
 */
export interface ButtonConfig {
  /** Lane ID: 0-3 for soundpads, negative for deck controls (-1, -2) */
  lane: number;
  /** Keyboard key binding for this button */
  key: string;
  /** Angle in degrees from center (0-360), used for hexagon positioning and deck rotation */
  angle: number;
  /** Hex color code for button and note rendering */
  color: string;
}

export const BUTTON_CONFIG: ButtonConfig[] = [
  // SOUNDPAD LANES (tunnel): 4 hexagon rays, 60° apart, clockwise from top
  { lane: 0, key: 'W', angle: 120, color: '#FF007F' }, // Lane 0 (W): 120° top-left, pink
  { lane: 1, key: 'O', angle: 60, color: '#0096FF' },  // Lane 1 (O): 60° top-right, blue
  { lane: 2, key: 'I', angle: 300, color: '#BE00FF' }, // Lane 2 (I): 300° bottom-right, purple
  { lane: 3, key: 'E', angle: 240, color: '#00FFFF' }, // Lane 3 (E): 240° bottom-left, cyan
  // DECK CONTROL LANES (turntable): outside tunnel, opposite sides
  { lane: -1, key: 'Q', angle: 180, color: '#00FF00' }, // Lane -1 (Q): 180° left deck, green
  { lane: -2, key: 'P', angle: 0, color: '#FF0000' },   // Lane -2 (P): 0° right deck, red
];

/**
 * 2D polar coordinate tunnel geometry for perspective rendering
 * Uses 6 lanes (0-3 soundpads, -1 to -2 decks) radiating from vanishing point
 */
export interface TunnelGeometry {
  /** Center X coordinate of tunnel perspective (vanishing point) */
  vanishingPointX: number;
  /** Center Y coordinate of tunnel perspective (vanishing point) */
  vanishingPointY: number;
  /** Max distance (from vanishing point) before notes despawn, pixels */
  tunnelMaxDistance: number;
  /** SVG container width in pixels */
  tunnelContainerWidth: number;
  /** SVG container height in pixels */
  tunnelContainerHeight: number;
  /** Distance where notes are scored (judgement line), pixels from vanishing point */
  judgementRadius: number;
  /** 6 concentric hexagon radii for visual layering (inner to outer), pixels */
  hexagonRadii: number[];
  /** 6 ray angles (lanes) at 60° intervals: 0°, 60°, 120°, 180°, 240°, 300° */
  rayAngles: number[];
  /** Thickness of TAP note hit zone around judgement line, pixels */
  tapJudgementLineWidth: number;
  /** Thickness of HOLD note hit zone around judgement line, pixels */
  holdJudgementLineWidth: number;
}

export const TUNNEL_GEOMETRY: TunnelGeometry = {
  // Vanishing point: center of perspective (where all rays converge)
  vanishingPointX: 350,    // Center X of 700px wide container
  vanishingPointY: 300,    // Center Y of 600px tall container
  // Rendering range
  tunnelMaxDistance: 260,  // Notes visible from VP to 260px (at distance=1 to distance=187)
  tunnelContainerWidth: 700,   // SVG viewport width
  tunnelContainerHeight: 600,  // SVG viewport height
  // Scoring zone: where notes must reach to be hit
  judgementRadius: 187,    // Matches 5th hexagon radius (notes are scored here)
  // 6 concentric hexagon layers for visual hierarchy and depth illusion
  hexagonRadii: [22, 52, 89, 135, 187, 248],  // Inner → Outer (pixel distances from VP)
  // 6 lanes (soundpads + decks) evenly spaced 60° apart
  rayAngles: [0, 60, 120, 180, 240, 300],     // Degrees from VP center
  // Hit zones: thickness of scoring window around judgement line
  tapJudgementLineWidth: 35,   // ±17.5px from judgement line
  holdJudgementLineWidth: 45,  // ±22.5px from judgement line
};

// Convenience exports for commonly used tunnel constants
export const RAY_ANGLES = TUNNEL_GEOMETRY.rayAngles;
export const TUNNEL_MAX_DISTANCE = TUNNEL_GEOMETRY.tunnelMaxDistance;
export const TAP_JUDGEMENT_LINE_WIDTH = TUNNEL_GEOMETRY.tapJudgementLineWidth;
export const JUDGEMENT_RADIUS = TUNNEL_GEOMETRY.judgementRadius;

/**
 * HOLD note visual geometry - controls strip rendering and failure animation
 * HOLD notes render as strips with duration mapped to visual width
 */
export interface HoldNoteGeometry {
  /** Multiplier: duration (ms) × this value = visual width in pixels at judgement */
  stripWidthMultiplier: number;
  /** Time for failure animation (glitch effect) to play, milliseconds */
  failureAnimationDuration: number;
}
export const HOLD_NOTE_GEOMETRY: HoldNoteGeometry = {
  stripWidthMultiplier: 0.15,        // 1000ms duration → 150px strip width
  failureAnimationDuration: 1100,    // Glitch effect duration on missed hold
};

/**
 * TAP note visual timing - controls when notes appear, disappear, and hit feedback
 */
export interface TapNoteGeometry {
  /** Time before note.time that TAP note becomes visible (appears at VP), milliseconds */
  renderWindowMs: number;
  /** Time after judgement line passes before TAP note despawns, milliseconds */
  fallthroughWindowMs: number;
  /** Duration to show hit flash animation after successful hit, milliseconds */
  hitHoldDurationMs: number;
}
export const TAP_NOTE_GEOMETRY: TapNoteGeometry = {
  renderWindowMs: 4000,      // TAP notes visible 4000ms before hit (matches LEAD_TIME)
  fallthroughWindowMs: 200,  // Notes visible 200ms past judgement line before disappearing
  hitHoldDurationMs: 200,    // White flash on successful hit lasts 200ms
};

/** RGB colors for 4 soundpad lanes (index = lane number) */
export const SOUNDPAD_COLORS = [
  'rgb(255,0,127)',   // Lane 0 (W): 120° top-left, pink
  'rgb(0,150,255)',   // Lane 1 (O): 60° top-right, blue
  'rgb(190,0,255)',   // Lane 2 (I): 300° bottom-right, purple
  'rgb(0,255,255)'    // Lane 3 (E): 240° bottom-left, cyan
];

/**
 * Deck (turntable) rotation mechanics - for deck wheel (lanes -1 and -2)
 */
export interface DeckRotation {
  /** Base rotation increment per frame, degrees */
  rotationSpeed: number;
  /** Total rotation required to trigger spin note activation, degrees */
  spinThreshold: number;
  /** Min drag speed to count as spin input, pixels per second */
  dragVelocityThreshold: number;
}
export const DECK_ROTATION: DeckRotation = {
  rotationSpeed: 2.0,              // 2° per frame at ~60fps ≈ 120°/sec
  spinThreshold: 30,               // Hold note activates after 30° total rotation
  dragVelocityThreshold: 100,      // Drag must be ≥100px/s to register as spin
};

/**
 * Visual effects - particle spawning, screen effects, and health state animations
 */
export interface VisualEffects {
  /** Game health maximum (also MAX_HEALTH constant) */
  maxHealth: number;
  /** Health threshold where continuous glitch effect starts (80% of max) */
  lowHealthThreshold: number;
  /** Spawn particles every N combo count (normal milestone) */
  comboMilestone: number;
  /** Spawn particles every N combo count (perfect-only milestone) */
  comboPerfectMilestone: number;
  /** Particles spawned per combo milestone trigger */
  particlesPerEffect: number;
  /** Max particles allowed alive at once (buffer pool size) */
  maxParticlesBuffer: number;
  /** Particle sprite size range, pixels */
  particleSizeMin: number;
  particleSizeMax: number;
  /** Screen shake: update interval between offset changes, milliseconds */
  shakeInterval: number;
  /** Screen shake: max random offset per update, pixels */
  shakeOffsetMultiplier: number;
  /** Screen shake: total duration, milliseconds */
  shakeDuration: number;
  /** Chromatic aberration (RGB split): duration, milliseconds */
  chromaticDuration: number;
  /** Chromatic aberration: effect strength, 0-1 */
  chromaticIntensity: number;
  /** Chromatic aberration: RGB channel offset, pixels */
  chromaticOffsetPx: number;
  /** Glitch effect: base interval between glitch pulses, milliseconds */
  glitchBaseInterval: number;
  /** Glitch effect: random variance added to interval, milliseconds */
  glitchRandomRange: number;
  /** Glitch effect: base opacity of glitch scan lines, 0-1 */
  glitchOpacity: number;
  /** Greyscale filter: max intensity at 0 health, 0-1 */
  greyscaleIntensity: number;
  /** Glitch effect: height of scan line effect, pixels */
  glitchBackgroundSize: number;
}
export const VISUAL_EFFECTS: VisualEffects = {
  maxHealth: 200,                  // Health ranges 0-200
  lowHealthThreshold: 160,         // At ≤160 health (80%), continuous glitch starts
  comboMilestone: 5,               // Particles spawn at combos 5, 10, 15, etc.
  comboPerfectMilestone: 10,       // Perfect-only particles at 10, 20, 30, etc.
  particlesPerEffect: 12,          // 12 particles per trigger
  maxParticlesBuffer: 60,          // Max 60 particles total on screen
  particleSizeMin: 4,              // Smallest particle sprite: 4px
  particleSizeMax: 12,             // Largest particle sprite: 12px
  shakeInterval: 50,               // Screen shake updates every 50ms (~20Hz)
  shakeOffsetMultiplier: 16,       // Max ±16px shake per frame
  shakeDuration: 300,              // Screen shake lasts 300ms total
  chromaticDuration: 400,          // RGB aberration lasts 400ms
  chromaticIntensity: 0.8,         // 80% strength aberration (strong effect)
  chromaticOffsetPx: 15,           // RGB channels offset 15px apart
  glitchBaseInterval: 400,         // Glitch pulses every 400ms
  glitchRandomRange: 200,          // Plus 0-200ms random variance
  glitchOpacity: 0.3,              // Glitch lines at 30% opacity
  greyscaleIntensity: 0.8,         // Full greyscale at 0 health (80%)
  glitchBackgroundSize: 60,        // Scan lines 60px tall
};

/**
 * Color palette for particle effects (spawned on combo milestones)
 */
export interface ParticleColorPalette {
  /** Array of HSL color strings for particle variety */
  colors: string[];
}
export const PARTICLE_COLOR_PALETTE: ParticleColorPalette = {
  colors: [
    'hsl(120, 100%, 50%)',   // Bright green
    'hsl(0, 100%, 50%)',     // Bright red
    'hsl(180, 100%, 50%)',   // Bright cyan
    'hsl(280, 100%, 60%)',   // Bright purple
    'hsl(320, 100%, 60%)',   // Bright magenta
  ],
};
/** Convenience export: direct reference to particle colors */
export const PARTICLE_COLORS = PARTICLE_COLOR_PALETTE.colors;

/**
 * Deck hold meter display - shows progress for SPIN_LEFT/SPIN_RIGHT hold notes
 * Meter fills as player holds rotation, glows when complete
 */
export interface DeckMeter {
  /** Number of visual segments in the meter bar */
  segments: number;
  /** Width of each segment, pixels */
  segmentWidth: number;
  /** Progress threshold to trigger completion glow, 0-1 (1 = 100%) */
  completionThreshold: number;
  /** Duration of glow pulse when meter completes, milliseconds */
  completionGlowDuration: number;
  /** Default hold duration if beatmap doesn't specify, milliseconds */
  defaultHoldDuration: number;
}
export const DECK_METER: DeckMeter = {
  segments: 16,                    // 16 segments = 16 × 60px = 960px total width
  segmentWidth: 60,                // Each segment fills independently as hold progresses
  completionThreshold: 0.95,       // Glow at 95% full (allows 5% tolerance)
  completionGlowDuration: 400,     // Glow pulse lasts 400ms
  defaultHoldDuration: 1000,       // If beatmap missing, hold requires 1000ms
};

// Color palette - consolidated references for UI elements
export interface UIColorPalette {
  deckLeft: string; // Q - green (left deck)
  deckRight: string; // P - red (right deck)
  padW: string; // W - pink (bottom-left)
  padO: string; // O - blue (bottom-right)
  padI: string; // I - purple (top-right)
  padE: string; // E - cyan (top-left)
  particleGreen: string; // Green particles
  particleRed: string; // Red particles
}
export const UI_COLOR_PALETTE: UIColorPalette = {
  deckLeft: '#00FF00',
  deckRight: '#FF0000',
  padW: '#FF007F',
  padO: '#0096FF',
  padI: '#BE00FF',
  padE: '#00FFFF',
  particleGreen: 'hsl(120, 100%, 50%)',
  particleRed: 'hsl(0, 100%, 50%)',
};
export const COLOR_DECK_LEFT = UI_COLOR_PALETTE.deckLeft;
export const COLOR_DECK_RIGHT = UI_COLOR_PALETTE.deckRight;
export const COLOR_PAD_W = UI_COLOR_PALETTE.padW;
export const COLOR_PAD_O = UI_COLOR_PALETTE.padO;
export const COLOR_PAD_I = UI_COLOR_PALETTE.padI;
export const COLOR_PAD_E = UI_COLOR_PALETTE.padE;
export const COLOR_PARTICLE_GREEN = UI_COLOR_PALETTE.particleGreen;
export const COLOR_PARTICLE_RED = UI_COLOR_PALETTE.particleRed;

// YouTube overlay UI strings
export interface YouTubeUI {
  labelButton: string;
  dialogTitle: string;
  inputLabel: string;
  inputPlaceholder: string;
  errorEmpty: string;
  errorInvalid: string;
  buttonLoad: string;
  buttonCancel: string;
  previewLabel: string;
  previewTitle: string;
  helpText: string;
}
export const YOUTUBE_UI: YouTubeUI = {
  labelButton: 'LOAD YOUTUBE',
  dialogTitle: 'LOAD YOUTUBE VIDEO',
  inputLabel: 'YouTube URL or Video ID',
  inputPlaceholder: 'https://youtube.com/watch?v=... or just the video ID',
  errorEmpty: 'Please enter a YouTube URL or video ID',
  errorInvalid: 'Invalid YouTube URL or video ID',
  buttonLoad: 'LOAD',
  buttonCancel: 'CANCEL',
  previewLabel: '▶ YouTube',
  previewTitle: 'YouTube video preview',
  helpText: 'The video will play silently in the background. Use its timing for gameplay sync.',
};

// YouTube overlay UI dimensions and opacity
export interface YouTubeDimensions {
  previewWidth: number; // px (w-64 in Tailwind)
  previewHeight: number; // px (h-36 in Tailwind)
  previewOpacityDefault: number; // 10%
  previewOpacityHover: number; // 20%
  closeIconSize: number; // px
}
export const YOUTUBE_DIMENSIONS: YouTubeDimensions = {
  previewWidth: 256,
  previewHeight: 144,
  previewOpacityDefault: 0.1,
  previewOpacityHover: 0.2,
  closeIconSize: 14,
};

// YouTube embed options for iframe configuration
export interface YouTubeEmbedOptions {
  autoplay: boolean;
  controls: boolean;
  modestBranding: boolean;
  enableJsApi: boolean;
}
export const YOUTUBE_PREVIEW_EMBED_OPTIONS: YouTubeEmbedOptions = {
  autoplay: false,
  controls: false,
  modestBranding: true,
  enableJsApi: true
} as const;

export const YOUTUBE_BACKGROUND_EMBED_OPTIONS: YouTubeEmbedOptions = {
  autoplay: false,
  controls: false,
  modestBranding: true,
  enableJsApi: true
} as const;

// Down3D Note Lane - tunnel geometry constants (already in TUNNEL_GEOMETRY)

// Game Engine - note generation and timing
export interface GameEngineTiming {
  easyBpm: number;
  mediumBpm: number;
  hardBpm: number;
  msPerMinute: number; // Conversion factor for BPM calculations
  noteStartTime: number; // ms - delay before first note spawns
  maxGeneratedNotes: number; // Cap for procedural note generation
  spinFrequency: number; // Generate spin notes every N beats
  spinAlternation: number; // Alternate left/right spins every N beats
  leadTime: number; // ms - hold notes appear 4000ms before hit
  tapRenderWindowMs: number; // ms - TAP notes appear 2000ms before hit
  tapFallthroughWindowMs: number; // ms - TAP notes visible through full failure animation (HOLD_ANIMATION_DURATION)
  holdRenderWindowMs: number; // ms - HOLD notes appear 4000ms before hit
  notesSyncInterval: number; // ms - sync notes for smooth animations (~60fps)
  stateUpdateBatchInterval: number; // ms - batch state updates to reduce renders
  stateUpdateInterval: number; // ms - batch state updates
}
export const GAME_ENGINE_TIMING: GameEngineTiming = {
  easyBpm: 60,
  mediumBpm: 90,
  hardBpm: 120,
  msPerMinute: 60000,
  noteStartTime: 2000,
  maxGeneratedNotes: 1000,
  spinFrequency: 4,
  spinAlternation: 8,
  leadTime: 4000,
  tapRenderWindowMs: 2000,
  tapFallthroughWindowMs: 1100,
  holdRenderWindowMs: 4000,
  notesSyncInterval: 16,
  stateUpdateBatchInterval: 50,
  stateUpdateInterval: 50,
};

// Hold animation duration (already in FAILURE_ANIMATION_DURATION)

// Grouped convenience interfaces for related visual effects
export interface HealthThresholds {
  max: number;
  lowThreshold: number;
}
export const HEALTH_THRESHOLDS: HealthThresholds = {
  max: VISUAL_EFFECTS.maxHealth,
  lowThreshold: VISUAL_EFFECTS.lowHealthThreshold,
};

export interface ComboMilestones {
  normal: number;
  perfect: number;
}
export const COMBO_MILESTONES: ComboMilestones = {
  normal: VISUAL_EFFECTS.comboMilestone,
  perfect: VISUAL_EFFECTS.comboPerfectMilestone,
};

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

export interface ParticleSize {
  min: number;
  max: number;
}
export const PARTICLE_SIZE: ParticleSize = {
  min: VISUAL_EFFECTS.particleSizeMin,
  max: VISUAL_EFFECTS.particleSizeMax,
};

export interface TunnelViewport {
  vanishingPointX: number;
  vanishingPointY: number;
  containerWidth: number;
  containerHeight: number;
}
export const TUNNEL_VIEWPORT: TunnelViewport = {
  vanishingPointX: TUNNEL_GEOMETRY.vanishingPointX,
  vanishingPointY: TUNNEL_GEOMETRY.vanishingPointY,
  containerWidth: TUNNEL_GEOMETRY.tunnelContainerWidth,
  containerHeight: TUNNEL_GEOMETRY.tunnelContainerHeight,
};

export interface DeckWheelConfig {
  rotationSpeed: number;
  spinThreshold: number;
  dragVelocityThreshold: number;
}
export const DECK_WHEEL_CONFIG: DeckWheelConfig = {
  rotationSpeed: DECK_ROTATION.rotationSpeed,
  spinThreshold: DECK_ROTATION.spinThreshold,
  dragVelocityThreshold: DECK_ROTATION.dragVelocityThreshold,
};

// Top-level exports for backward compatibility and direct access
// Health exports
export const LOW_HEALTH_THRESHOLD = HEALTH_THRESHOLDS.lowThreshold;

// Combo exports
export const COMBO_MILESTONE = COMBO_MILESTONES.normal;
export const COMBO_PERFECT_MILESTONE = COMBO_MILESTONES.perfect;

// Chromatic effect exports
export const CHROMATIC_DURATION = CHROMATIC_EFFECT.duration;
export const CHROMATIC_INTENSITY = CHROMATIC_EFFECT.intensity;
export const CHROMATIC_OFFSET_PX = CHROMATIC_EFFECT.offsetPx;

// Greyscale export
export const GREYSCALE_INTENSITY = VISUAL_EFFECTS.greyscaleIntensity;

// Glitch effect exports
export const GLITCH_BACKGROUND_SIZE = GLITCH_EFFECT.backgroundSize;
export const GLITCH_BASE_INTERVAL = GLITCH_EFFECT.baseInterval;
export const GLITCH_RANDOM_RANGE = GLITCH_EFFECT.randomRange;
export const GLITCH_OPACITY = GLITCH_EFFECT.opacity;

// Particle size exports
export const PARTICLE_SIZE_MIN = PARTICLE_SIZE.min;
export const PARTICLE_SIZE_MAX = PARTICLE_SIZE.max;

// Tunnel geometry exports
export const HEXAGON_RADII = TUNNEL_GEOMETRY.hexagonRadii;
export const HOLD_JUDGEMENT_LINE_WIDTH = TUNNEL_GEOMETRY.holdJudgementLineWidth;

// Tunnel viewport exports
export const VANISHING_POINT_X = TUNNEL_VIEWPORT.vanishingPointX;
export const VANISHING_POINT_Y = TUNNEL_VIEWPORT.vanishingPointY;
export const TUNNEL_CONTAINER_WIDTH = TUNNEL_VIEWPORT.containerWidth;
export const TUNNEL_CONTAINER_HEIGHT = TUNNEL_VIEWPORT.containerHeight;

// Hold Note Geometry exports
export const HOLD_NOTE_STRIP_WIDTH_MULTIPLIER = HOLD_NOTE_GEOMETRY.stripWidthMultiplier;
export const FAILURE_ANIMATION_DURATION = HOLD_NOTE_GEOMETRY.failureAnimationDuration;

// Tap Note Geometry exports
export const TAP_RENDER_WINDOW_MS = TAP_NOTE_GEOMETRY.renderWindowMs;
export const TAP_FALLTHROUGH_WINDOW_MS = TAP_NOTE_GEOMETRY.fallthroughWindowMs;
export const TAP_HIT_HOLD_DURATION = TAP_NOTE_GEOMETRY.hitHoldDurationMs;

// Deck Meter exports
export const DECK_METER_SEGMENTS = DECK_METER.segments;
export const DECK_METER_SEGMENT_WIDTH = DECK_METER.segmentWidth;
export const DECK_METER_COMPLETION_THRESHOLD = DECK_METER.completionThreshold;
export const DECK_METER_COMPLETION_GLOW_DURATION = DECK_METER.completionGlowDuration;
export const DECK_METER_DEFAULT_HOLD_DURATION = DECK_METER.defaultHoldDuration;

// Deck Rotation exports
export const ROTATION_SPEED = DECK_WHEEL_CONFIG.rotationSpeed;
export const SPIN_THRESHOLD = DECK_WHEEL_CONFIG.spinThreshold;
export const DRAG_VELOCITY_THRESHOLD = DECK_WHEEL_CONFIG.dragVelocityThreshold;

// ============================================================================
// GAME CONFIG - Single source of truth for all gameplay constants
// ============================================================================

export interface GameConfigConstants {
  TAP_HIT_WINDOW: number;
  TAP_FAILURE_BUFFER: number;
  HOLD_HIT_WINDOW: number;
  HOLD_MISS_TIMEOUT: number;
  HOLD_RELEASE_OFFSET: number;
  HOLD_RELEASE_WINDOW: number;
  HOLD_ACTIVATION_WINDOW: number;
  LEAD_TIME: number;
  ACCURACY_PERFECT_MS: number;
  ACCURACY_GREAT_MS: number;
  ACCURACY_PERFECT_POINTS: number;
  ACCURACY_GREAT_POINTS: number;
  ACCURACY_NORMAL_POINTS: number;
  MAX_HEALTH: number;
}

export const GAME_CONFIG: GameConfigConstants = {
  TAP_HIT_WINDOW: 150,
  TAP_FAILURE_BUFFER: 100,
  HOLD_HIT_WINDOW: 150,
  HOLD_MISS_TIMEOUT: 500,
  HOLD_RELEASE_OFFSET: 200,
  HOLD_RELEASE_WINDOW: 150,
  HOLD_ACTIVATION_WINDOW: 150,
  LEAD_TIME: 4000,
  ACCURACY_PERFECT_MS: 50,
  ACCURACY_GREAT_MS: 100,
  ACCURACY_PERFECT_POINTS: 100,
  ACCURACY_GREAT_POINTS: 75,
  ACCURACY_NORMAL_POINTS: 50,
  MAX_HEALTH: 200,
};

// Game Config exports (individual constants for convenience)
export const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;
export const TAP_FAILURE_BUFFER = GAME_CONFIG.TAP_FAILURE_BUFFER;
export const HOLD_HIT_WINDOW = GAME_CONFIG.HOLD_HIT_WINDOW;
export const HOLD_MISS_TIMEOUT = GAME_CONFIG.HOLD_MISS_TIMEOUT;
export const HOLD_RELEASE_OFFSET = GAME_CONFIG.HOLD_RELEASE_OFFSET;
export const HOLD_RELEASE_WINDOW = GAME_CONFIG.HOLD_RELEASE_WINDOW;
export const HOLD_ACTIVATION_WINDOW = GAME_CONFIG.HOLD_ACTIVATION_WINDOW;
export const LEAD_TIME = GAME_CONFIG.LEAD_TIME;
export const ACCURACY_PERFECT_MS = GAME_CONFIG.ACCURACY_PERFECT_MS;
export const ACCURACY_GREAT_MS = GAME_CONFIG.ACCURACY_GREAT_MS;
export const ACCURACY_PERFECT_POINTS = GAME_CONFIG.ACCURACY_PERFECT_POINTS;
export const ACCURACY_GREAT_POINTS = GAME_CONFIG.ACCURACY_GREAT_POINTS;
export const ACCURACY_NORMAL_POINTS = GAME_CONFIG.ACCURACY_NORMAL_POINTS;

// Game Engine exports
export const STATE_UPDATE_INTERVAL = GAME_ENGINE_TIMING.stateUpdateInterval;
export const MAX_HEALTH = GAME_CONFIG.MAX_HEALTH;

// ============================================================================
// TAP NOTE SPECIFIC CONSTANTS
// ============================================================================

export const TAP_FAILURE_ANIMATIONS = {
  TOO_EARLY: { duration: 1200 },
  MISS: { duration: 1100 },
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
// HOLD NOTE SPECIFIC CONSTANTS
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

// Greyscale colors for visual effects
export const GREYSCALE_FILL_COLOR = 'rgba(80, 80, 80, 0.8)';
export const GREYSCALE_GLOW_COLOR = 'rgba(100, 100, 100, 0.4)';
