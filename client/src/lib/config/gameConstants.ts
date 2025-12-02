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
 * TAP note visual timing - controls when notes appear and disappear
 */
export interface TapNoteGeometry {
  /** Time before note.time that TAP note becomes visible (appears at VP), milliseconds */
  renderWindowMs: number;
  /** Time after judgement line passes before TAP note despawns, milliseconds */
  fallthroughWindowMs: number;
}
export const TAP_NOTE_GEOMETRY: TapNoteGeometry = {
  renderWindowMs: 4000,      // TAP notes visible 4000ms before hit (matches LEAD_TIME)
  fallthroughWindowMs: 200,  // Notes visible 200ms past judgement line before disappearing
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
  /** Health threshold where continuous glitch effect starts (25% of max) */
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
  lowHealthThreshold: 50,          // At ≤50 health (25%), continuous glitch starts
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

/**
 * UI color palette - hex and HSL colors for all interactive elements
 * Maps soundpad lanes, deck controls, and particle effects
 */
export interface UIColorPalette {
  /** Lane -1 (Q) deck control, left turntable */
  deckLeft: string;
  /** Lane -2 (P) deck control, right turntable */
  deckRight: string;
  /** Lane 0 (W) soundpad, 120° top-left */
  padW: string;
  /** Lane 1 (O) soundpad, 60° top-right */
  padO: string;
  /** Lane 2 (I) soundpad, 300° bottom-right */
  padI: string;
  /** Lane 3 (E) soundpad, 240° bottom-left */
  padE: string;
  /** Green particle color for combo effects */
  particleGreen: string;
  /** Red particle color for combo effects */
  particleRed: string;
}
export const UI_COLOR_PALETTE: UIColorPalette = {
  deckLeft: '#00FF00',              // Lane -1: Green
  deckRight: '#FF0000',             // Lane -2: Red
  padW: '#FF007F',                  // Lane 0: Pink
  padO: '#0096FF',                  // Lane 1: Blue
  padI: '#BE00FF',                  // Lane 2: Purple
  padE: '#00FFFF',                  // Lane 3: Cyan
  particleGreen: 'hsl(120, 100%, 50%)',  // Green particles
  particleRed: 'hsl(0, 100%, 50%)',      // Red particles
};
/** Individual color exports for convenience access */
export const COLOR_DECK_LEFT = UI_COLOR_PALETTE.deckLeft;
export const COLOR_DECK_RIGHT = UI_COLOR_PALETTE.deckRight;
export const COLOR_PAD_W = UI_COLOR_PALETTE.padW;
export const COLOR_PAD_O = UI_COLOR_PALETTE.padO;
export const COLOR_PAD_I = UI_COLOR_PALETTE.padI;
export const COLOR_PAD_E = UI_COLOR_PALETTE.padE;
export const COLOR_PARTICLE_GREEN = UI_COLOR_PALETTE.particleGreen;
export const COLOR_PARTICLE_RED = UI_COLOR_PALETTE.particleRed;

/**
 * YouTube loader UI strings - dialog and error messages
 */
export interface YouTubeUI {
  /** Main button label to open YouTube loader */
  labelButton: string;
  /** Dialog title when loading video */
  dialogTitle: string;
  /** Input field label */
  inputLabel: string;
  /** Input placeholder text */
  inputPlaceholder: string;
  /** Error message when URL/ID is empty */
  errorEmpty: string;
  /** Error message when URL/ID is invalid */
  errorInvalid: string;
  /** Load button label */
  buttonLoad: string;
  /** Cancel button label */
  buttonCancel: string;
  /** Label for video preview panel */
  previewLabel: string;
  /** Tooltip for preview video */
  previewTitle: string;
  /** Help text explaining video usage */
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

/**
 * YouTube preview panel dimensions and opacity settings
 */
export interface YouTubeDimensions {
  /** Preview panel width, pixels (w-64 Tailwind = 256px) */
  previewWidth: number;
  /** Preview panel height, pixels (h-36 Tailwind = 144px) */
  previewHeight: number;
  /** Default opacity when not hovering, 0-1 */
  previewOpacityDefault: number;
  /** Opacity when hovering over preview, 0-1 */
  previewOpacityHover: number;
  /** Close button icon size, pixels */
  closeIconSize: number;
}
export const YOUTUBE_DIMENSIONS: YouTubeDimensions = {
  previewWidth: 256,              // Tailwind w-64
  previewHeight: 144,             // Tailwind h-36 (16:9 aspect)
  previewOpacityDefault: 0.1,     // 10% - subtle background video
  previewOpacityHover: 0.2,       // 20% - more visible on hover
  closeIconSize: 14,              // Small close button
};

/**
 * YouTube embed iframe configuration for preview and background players
 */
export interface YouTubeEmbedOptions {
  /** Auto-start video (false = manual play control) */
  autoplay: boolean;
  /** Show YouTube player controls in iframe */
  controls: boolean;
  /** Hide YouTube branding in player */
  modestBranding: boolean;
  /** Enable JS API for player control */
  enableJsApi: boolean;
}
export const YOUTUBE_PREVIEW_EMBED_OPTIONS: YouTubeEmbedOptions = {
  autoplay: false,              // Player starts paused
  controls: false,              // No controls in preview
  modestBranding: true,         // Minimal YouTube UI
  enableJsApi: true             // Can control via JS
} as const;

export const YOUTUBE_BACKGROUND_EMBED_OPTIONS: YouTubeEmbedOptions = {
  autoplay: false,              // App controls timing
  controls: false,              // Hidden background player
  modestBranding: true,         // Minimal UI if visible
  enableJsApi: true             // Must sync with game timer
} as const;

// Down3D Note Lane - tunnel geometry constants (already in TUNNEL_GEOMETRY)

/**
 * Game engine timing - BPM ranges, note generation, and sync intervals
 */
export interface GameEngineTiming {
  /** Easy difficulty target BPM (slowest) */
  easyBpm: number;
  /** Medium difficulty target BPM */
  mediumBpm: number;
  /** Hard difficulty target BPM (fastest) */
  hardBpm: number;
  /** Conversion constant: milliseconds per minute, for BPM → time conversions */
  msPerMinute: number;
  /** Delay before first note spawns, milliseconds */
  noteStartTime: number;
  /** Cap on generated notes (procedural generation safety limit) */
  maxGeneratedNotes: number;
  /** Generate SPIN notes every N beats (4 = every 4th beat) */
  spinFrequency: number;
  /** Alternate SPIN_LEFT and SPIN_RIGHT every N beats */
  spinAlternation: number;
  /** HOLD notes appear this many ms before hit (matches TAP_RENDER_WINDOW_MS in TAP_NOTE_GEOMETRY) */
  leadTime: number;
  /** TAP notes appear this many ms before hit (currently 2000ms, unused - see TAP_NOTE_GEOMETRY) */
  tapRenderWindowMs: number;
  /** TAP notes stay visible this many ms after judgement line passes */
  tapFallthroughWindowMs: number;
  /** HOLD notes appear this many ms before hit */
  holdRenderWindowMs: number;
  /** Note sync animation update interval, milliseconds (~60fps) */
  notesSyncInterval: number;
  /** Batch state updates, milliseconds */
  stateUpdateBatchInterval: number;
  /** State update interval, milliseconds */
  stateUpdateInterval: number;
}
export const GAME_ENGINE_TIMING: GameEngineTiming = {
  easyBpm: 60,                   // Slowest difficulty
  mediumBpm: 90,                 // Medium speed
  hardBpm: 120,                  // Fastest difficulty (2 beats/sec)
  msPerMinute: 60000,            // 60 seconds × 1000ms
  noteStartTime: 2000,           // 2 second delay before first note
  maxGeneratedNotes: 1000,       // Safety cap to prevent memory issues
  spinFrequency: 4,              // Generate spin every 4 beats
  spinAlternation: 8,            // Alternate left/right every 8 beats
  leadTime: 4000,                // HOLD notes visible 4000ms before hit
  tapRenderWindowMs: 2000,       // TAP notes appear 2000ms before (unused - see TAP_NOTE_GEOMETRY)
  tapFallthroughWindowMs: 1100,  // TAP notes last 1100ms past judgement
  holdRenderWindowMs: 4000,      // HOLD notes visible 4000ms before hit
  notesSyncInterval: 16,         // ~60fps update rate (1000/60 ≈ 16ms)
  stateUpdateBatchInterval: 50,  // Batch updates every 50ms
  stateUpdateInterval: 50,       // 20Hz state updates
};

// BPM and tunnel speed calibration
export const REFERENCE_BPM = 120;               // Reference BPM for LEAD_TIME scaling (hardest difficulty)
export const DEFAULT_BEATMAP_BPM = 120;        // Default BPM if beatmap metadata missing

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

/**
 * GAME CONFIG - Single source of truth for all gameplay timing and scoring
 * Asymmetric windows: narrow before note.time, larger leniency after
 */
export interface GameConfigConstants {
  /** TAP note hit window: ±150ms around note.time for successful hit */
  TAP_HIT_WINDOW: number;
  /** TAP note failure buffer: extra time after TAP_HIT_WINDOW before auto-miss */
  TAP_FAILURE_BUFFER: number;
  /** HOLD note start window: ±150ms around note.time to successfully press hold */
  HOLD_HIT_WINDOW: number;
  /** HOLD note miss timeout: time after note.time before hold auto-fails if not pressed */
  HOLD_MISS_TIMEOUT: number;
  /** HOLD release offset: extra time before expected release before failure */
  HOLD_RELEASE_OFFSET: number;
  /** HOLD release window: ±time around expected release time for successful release */
  HOLD_RELEASE_WINDOW: number;
  /** HOLD activation window: max time after note.time to press hold (same as HIT_WINDOW) */
  HOLD_ACTIVATION_WINDOW: number;
  /** LEAD_TIME: milliseconds before note.time that notes become visible (appear at VP) */
  LEAD_TIME: number;
  /** Timing accuracy threshold for "PERFECT" rating, milliseconds */
  ACCURACY_PERFECT_MS: number;
  /** Timing accuracy threshold for "GREAT" rating, milliseconds */
  ACCURACY_GREAT_MS: number;
  /** Score points for PERFECT accuracy */
  ACCURACY_PERFECT_POINTS: number;
  /** Score points for GREAT accuracy */
  ACCURACY_GREAT_POINTS: number;
  /** Score points for normal hit */
  ACCURACY_NORMAL_POINTS: number;
  /** Game health system maximum (also MAX_HEALTH export) */
  MAX_HEALTH: number;
}

export const GAME_CONFIG: GameConfigConstants = {
  // TAP note timing (tight window around note.time)
  TAP_HIT_WINDOW: 150,            // ±150ms = 300ms total window
  TAP_FAILURE_BUFFER: 100,        // Additional 100ms before auto-miss
  // HOLD note timing (asymmetric: tight before, leniency after)
  HOLD_HIT_WINDOW: 150,           // ±150ms around note.time to press
  HOLD_MISS_TIMEOUT: 500,         // 500ms after note.time before auto-fail
  HOLD_RELEASE_OFFSET: 200,       // Time before expected release
  HOLD_RELEASE_WINDOW: 150,       // ±150ms around expected release
  HOLD_ACTIVATION_WINDOW: 150,    // Must match HOLD_HIT_WINDOW for sync verification
  // Rendering: notes visible this long before note.time
  LEAD_TIME: 4000,                // 4000ms before hit (notes approach from VP)
  // Accuracy thresholds for scoring
  ACCURACY_PERFECT_MS: 50,        // ±50ms = PERFECT
  ACCURACY_GREAT_MS: 100,         // ±100ms = GREAT
  ACCURACY_PERFECT_POINTS: 100,   // Points for PERFECT
  ACCURACY_GREAT_POINTS: 75,      // Points for GREAT
  ACCURACY_NORMAL_POINTS: 50,     // Points for normal/late hit
  // Game state
  MAX_HEALTH: 200,                // Health 0-200
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

/** TAP note failure animation durations */
export const TAP_FAILURE_ANIMATIONS = {
  TOO_EARLY: { duration: 1200 },  // Glitch effect when pressed too early
  MISS: { duration: 1100 },       // Glitch effect when missed
} as const;

/** TAP note hit flash animation timing */
export const TAP_HIT_FLASH = {
  DURATION: 600,                  // Total white flash duration
  FADE_START: 600,                // When fade-out begins (at end)
  FADE_DURATION: 100,             // Fade-out duration
} as const;

/** TAP note rendering depth (distance from VP) */
export const TAP_DEPTH = {
  MIN: 5,                         // Closest visible distance (pixels)
  MAX: 40,                        // Farthest distance before fade
  FADE_TIME: 2000,                // Fade-in duration as note approaches
} as const;

/** TAP note geometry - spread angle for 8° cone from each ray */
export const TAP_RAY = {
  SPREAD_ANGLE: 8,                // ±8° spread from lane ray (16° total)
} as const;

/** TAP note colors - stroke and glow effects */
export const TAP_COLORS = {
  STROKE_DEFAULT: 'rgba(255,255,255,0.8)',  // White outline during approach
  STROKE_FAILED: 'rgba(120, 120, 120, 1)',  // Grey outline when failed
  GLOW_SHADOW: (color: string) => `drop-shadow(0 0 35px ${color}) drop-shadow(0 0 20px ${color}) drop-shadow(0 0 10px ${color})`,  // Triple-layer glow
} as const;

/** TAP note opacity ranges for visual progression */
export const TAP_OPACITY = {
  MIN_BASE: 0.4,                  // Base opacity during approach
  MAX_PROGRESSION: 0.6,           // Peak opacity near judgement
  MIN_FADE: 0.1,                  // Opacity at start of approach
} as const;

// ============================================================================
// HOLD NOTE SPECIFIC CONSTANTS
// ============================================================================

/** HOLD note opacity ranges for visual progression through approach and hold */
export const HOLD_OPACITY = {
  MIN_BASE: 0.4,                  // Base opacity during approach
  MAX_PROGRESSION: 0.6,           // Peak opacity near judgement / during hold
} as const;

/** HOLD note stroke width scaling for perspective effect */
export const HOLD_STROKE = {
  BASE_WIDTH: 2,                  // Default stroke width (pixels)
  APPROACH_MULTIPLIER: 2,         // Stroke gets 2× thicker during approach
  COLLAPSE_MULTIPLIER: 2,         // Stroke gets 2× thicker when collapsing
} as const;

/** HOLD note glow effects - shadows and inner glow */
export const HOLD_GLOW = {
  MIN_SHADOW: 20,                 // Base outer shadow blur (pixels)
  SHADOW_SCALE: 25,               // Shadow scales 0-25px by distance
  MIN_INNER_SHADOW: 12,           // Base inner shadow blur
  INNER_SHADOW_SCALE: 15,         // Inner shadow scales 0-15px by distance
} as const;

// ============================================================================
// VISUAL EFFECT COLORS
// ============================================================================

/** Greyscale overlay color - applied when health reaches 0 */
export const GREYSCALE_FILL_COLOR = 'rgba(80, 80, 80, 0.8)';    // Dark grey fill
/** Greyscale glow color - complements greyscale effect */
export const GREYSCALE_GLOW_COLOR = 'rgba(100, 100, 100, 0.4)';
