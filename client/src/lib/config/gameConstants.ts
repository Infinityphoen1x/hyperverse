// src/lib/config/gameConstants.ts
// Shared game constants used across components

// Button configuration - all 6 lanes (4 soundpads + 2 deck controls)
export interface ButtonConfig {
  lane: number;
  key: string;
  angle: number;
  color: string;
}
export const BUTTON_CONFIG: ButtonConfig[] = [
  { lane: 0, key: 'W', angle: 120, color: '#FF007F' }, // W - top-left pink
  { lane: 1, key: 'O', angle: 60, color: '#0096FF' }, // O - top-right blue
  { lane: 2, key: 'I', angle: 300, color: '#BE00FF' }, // I - bottom-right purple
  { lane: 3, key: 'E', angle: 240, color: '#00FFFF' }, // E - bottom-left cyan
  { lane: -1, key: 'Q', angle: 180, color: '#00FF00' }, // Q - left deck green
  { lane: -2, key: 'P', angle: 0, color: '#FF0000' }, // P - right deck red
];

// 3D tunnel geometry constants
export interface TunnelGeometry {
  vanishingPointX: number;
  vanishingPointY: number;
  tunnelMaxDistance: number;
  tunnelContainerWidth: number;
  tunnelContainerHeight: number;
  judgementRadius: number;
  hexagonRadii: number[];
  rayAngles: number[];
  tapJudgementLineWidth: number;
  holdJudgementLineWidth: number;
}
export const TUNNEL_GEOMETRY: TunnelGeometry = {
  vanishingPointX: 350,
  vanishingPointY: 300,
  tunnelMaxDistance: 260,
  tunnelContainerWidth: 700,
  tunnelContainerHeight: 600,
  judgementRadius: 187,
  hexagonRadii: [22, 52, 89, 135, 187, 248],
  rayAngles: [0, 60, 120, 180, 240, 300],
  tapJudgementLineWidth: 35,
  holdJudgementLineWidth: 45,
};

// Convenience exports for commonly used tunnel constants
export const RAY_ANGLES = TUNNEL_GEOMETRY.rayAngles;
export const TUNNEL_MAX_DISTANCE = TUNNEL_GEOMETRY.tunnelMaxDistance;

// Hold note geometry constants
export interface HoldNoteGeometry {
  stripWidthMultiplier: number; // Convert duration (ms) to Z-depth
  failureAnimationDuration: number; // ms - time for failure animations
}
export const HOLD_NOTE_GEOMETRY: HoldNoteGeometry = {
  stripWidthMultiplier: 0.15,
  failureAnimationDuration: 1100,
};

// Soundpad colors - RGB values for dynamic styling
export const SOUNDPAD_COLORS = [
  'rgb(255,0,127)', // Lane 0 (W) - pink
  'rgb(0,150,255)', // Lane 1 (O) - blue
  'rgb(190,0,255)', // Lane 2 (I) - purple
  'rgb(0,255,255)' // Lane 3 (E) - cyan
];

// Deck wheel rotation constants
export interface DeckRotation {
  rotationSpeed: number; // degrees per frame
  spinThreshold: number; // degrees - trigger onSpin after this rotation
  dragVelocityThreshold: number; // px/s - minimum velocity for drag spin
}
export const DECK_ROTATION: DeckRotation = {
  rotationSpeed: 2.0,
  spinThreshold: 30,
  dragVelocityThreshold: 100,
};

// Visual effects - particle and animation constants
export interface VisualEffects {
  maxHealth: number; // Game health system max
  lowHealthThreshold: number; // 80% of MAX_HEALTH - triggers continuous glitch
  comboMilestone: number; // Trigger particle effect every N combos
  comboPerfectMilestone: number; // Trigger perfect pulse every N combos
  particlesPerEffect: number; // Number of particles spawned per combo milestone
  maxParticlesBuffer: number; // Max particles to keep alive at once
  particleSizeMin: number; // px
  particleSizeMax: number; // px
  shakeInterval: number; // ms - how often to update shake offset
  shakeOffsetMultiplier: number; // pixels - max random offset
  shakeDuration: number; // ms - how long shake lasts
  chromaticDuration: number; // ms - how long chromatic aberration lasts
  chromaticIntensity: number; // 0-1, strength of effect
  chromaticOffsetPx: number; // pixels - aberration offset
  glitchBaseInterval: number; // ms - base glitch interval
  glitchRandomRange: number; // ms - additional random time
  glitchOpacity: number; // 0-1, base opacity of glitch lines
  greyscaleIntensity: number; // 0-1, max greyscale when health is 0
  glitchBackgroundSize: number; // px - height of glitch scan lines
}
export const VISUAL_EFFECTS: VisualEffects = {
  maxHealth: 200,
  lowHealthThreshold: 160,
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

// Visual effects - color palette for particle effects
export interface ParticleColorPalette {
  colors: string[];
}
export const PARTICLE_COLOR_PALETTE: ParticleColorPalette = {
  colors: [
    'hsl(120, 100%, 50%)', // Green
    'hsl(0, 100%, 50%)', // Red
    'hsl(180, 100%, 50%)', // Cyan
    'hsl(280, 100%, 60%)', // Purple
    'hsl(320, 100%, 60%)', // Magenta
  ],
};
export const PARTICLE_COLORS = PARTICLE_COLOR_PALETTE.colors;

// Deck hold meter constants
export interface DeckMeter {
  segments: number; // Number of visual segments in meter
  segmentWidth: number; // px - width of each segment
  completionThreshold: number; // 0-1, progress needed to trigger glow
  completionGlowDuration: number; // ms - how long glow animation lasts
  defaultHoldDuration: number; // ms - default duration if beatmap doesn't specify
}
export const DECK_METER: DeckMeter = {
  segments: 16,
  segmentWidth: 60,
  completionThreshold: 0.95,
  completionGlowDuration: 400,
  defaultHoldDuration: 1000,
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
export const MAX_HEALTH = HEALTH_THRESHOLDS.max;
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

// Game Engine exports
export const STATE_UPDATE_INTERVAL = GAME_ENGINE_TIMING.stateUpdateInterval;
