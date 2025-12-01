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

// Hold note geometry constants
export const HOLD_NOTE_STRIP_WIDTH_MULTIPLIER = 0.15; // Convert duration (ms) to Z-depth
export const FAILURE_ANIMATION_DURATION = 1100; // ms - time for failure animations

// Soundpad timing
export interface SoundpadTiming {
  activationWindow: number; // ms - hit window for notes
  hitSuccessDuration: number; // ms - how long hit feedback glows
  tapHitWindow: number; // ms - ±300ms window for TAP note hits
  tapFailureBuffer: number; // ms - buffer for YouTube timing jitter before marking note as failed
  holdMissTimeout: number; // ms - fail hold note if not pressed within this time
  holdReleaseOffset: number; // ms - additional time before hold release failure
  holdReleaseWindow: number; // ms - ±100ms accuracy window for hold release
  tapHitFlashDuration: number; // ms - how long hit flash lasts
  tapHitHoldDuration: number; // ms - how long successfully hit TAP notes stay visible (locked at tap position)
}
export const SOUNDPAD_TIMING: SoundpadTiming = {
  activationWindow: 300,
  hitSuccessDuration: 200,
  tapHitWindow: 300,
  tapFailureBuffer: 100,
  holdMissTimeout: 1100,
  holdReleaseOffset: 600,
  holdReleaseWindow: 100,
  tapHitFlashDuration: 600,
  tapHitHoldDuration: 700,
};

// Soundpad colors - RGB values for dynamic styling
export const SOUNDPAD_COLORS = [
  'rgb(255,0,127)', // Lane 0 (W) - pink
  'rgb(0,150,255)', // Lane 1 (O) - blue
  'rgb(190,0,255)', // Lane 2 (I) - purple
  'rgb(0,255,255)' // Lane 3 (E) - cyan
];

// Soundpad Tailwind styles - derived from SOUNDPAD_COLORS
export interface SoundpadStyle {
  bg: string;
  border: string;
  shadow: string;
}
export const SOUNDPAD_STYLES: SoundpadStyle[] = [
  { bg: 'bg-neon-pink/30', border: 'border-neon-pink/50', shadow: 'shadow-[0_0_15px_rgb(255,0,127)]' },
  { bg: 'bg-neon-blue/30', border: 'border-neon-blue/50', shadow: 'shadow-[0_0_15px_rgb(0,150,255)]' },
  { bg: 'bg-neon-purple/30', border: 'border-neon-purple/50', shadow: 'shadow-[0_0_15px_rgb(190,0,255)]' },
  { bg: 'bg-neon-cyan/30', border: 'border-neon-cyan/50', shadow: 'shadow-[0_0_15px_rgb(0,255,255)]' },
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

// Vanishing point angle shift (combo-triggered)
export interface AngleShift {
  interval: number; // Shift every 10x combo
  distance: number; // Max pixel distance from center - dramatic shift
  duration: number; // ms - 2 second smooth animation for visible ray adjustment
}
export const ANGLE_SHIFT: AngleShift = {
  interval: 10,
  distance: 20,
  duration: 2000,
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
export const PARTICLE_COLORS = [
  'hsl(120, 100%, 50%)', // Green
  'hsl(0, 100%, 50%)', // Red
  'hsl(180, 100%, 50%)', // Cyan
  'hsl(280, 100%, 60%)', // Purple
  'hsl(320, 100%, 60%)', // Magenta
];

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
export const COLOR_DECK_LEFT = '#00FF00'; // Q - green (left deck)
export const COLOR_DECK_RIGHT = '#FF0000'; // P - red (right deck)
export const COLOR_PAD_W = '#FF007F'; // W - pink (bottom-left)
export const COLOR_PAD_O = '#0096FF'; // O - blue (bottom-right)
export const COLOR_PAD_I = '#BE00FF'; // I - purple (top-right)
export const COLOR_PAD_E = '#00FFFF'; // E - cyan (top-left)
export const COLOR_PARTICLE_GREEN = 'hsl(120, 100%, 50%)'; // Green particles
export const COLOR_PARTICLE_RED = 'hsl(0, 100%, 50%)'; // Red particles

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
export const YOUTUBE_PREVIEW_EMBED_OPTIONS = {
  autoplay: false,
  controls: false,
  modestBranding: true,
  enableJsApi: true
} as const;
export const YOUTUBE_BACKGROUND_EMBED_OPTIONS = {
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

// Game Engine - accuracy point thresholds
export interface AccuracyThresholds {
  accuracyPerfectMs: number; // ≤50ms = 300 points
  accuracyGreatMs: number; // ≤100ms = 200 points
  accuracyPerfectPoints: number;
  accuracyGreatPoints: number;
  accuracyNormalPoints: number;
}
export const ACCURACY_THRESHOLDS: AccuracyThresholds = {
  accuracyPerfectMs: 50,
  accuracyGreatMs: 100,
  accuracyPerfectPoints: 300,
  accuracyGreatPoints: 200,
  accuracyNormalPoints: 100,
};

// Hold activation window (already in SOUNDPAD_TIMING)

// Down3D Note Lane - greyscale colors
export interface GreyscaleColors {
  fillColor: string; // Greyscale fill for failed notes
  glowColor: string; // Greyscale glow for failed notes
}
export const GREYSCALE_COLORS: GreyscaleColors = {
  fillColor: 'rgba(80, 80, 80, 0.8)',
  glowColor: 'rgba(100, 100, 100, 0.4)',
};

// Hold animation duration (already in FAILURE_ANIMATION_DURATION)
// Top-level exports for backward compatibility and direct access
export const MAX_HEALTH = VISUAL_EFFECTS.maxHealth;
export const LOW_HEALTH_THRESHOLD = VISUAL_EFFECTS.lowHealthThreshold;
export const COMBO_MILESTONE = VISUAL_EFFECTS.comboMilestone;
export const COMBO_PERFECT_MILESTONE = VISUAL_EFFECTS.comboPerfectMilestone;
export const CHROMATIC_DURATION = VISUAL_EFFECTS.chromaticDuration;
export const CHROMATIC_INTENSITY = VISUAL_EFFECTS.chromaticIntensity;
export const CHROMATIC_OFFSET_PX = VISUAL_EFFECTS.chromaticOffsetPx;
export const GREYSCALE_INTENSITY = VISUAL_EFFECTS.greyscaleIntensity;
export const GLITCH_BACKGROUND_SIZE = VISUAL_EFFECTS.glitchBackgroundSize;
export const GLITCH_BASE_INTERVAL = VISUAL_EFFECTS.glitchBaseInterval;
export const GLITCH_RANDOM_RANGE = VISUAL_EFFECTS.glitchRandomRange;
export const GLITCH_OPACITY = VISUAL_EFFECTS.glitchOpacity;
export const PARTICLE_SIZE_MIN = VISUAL_EFFECTS.particleSizeMin;
export const PARTICLE_SIZE_MAX = VISUAL_EFFECTS.particleSizeMax;
export const VANISHING_POINT_X = TUNNEL_GEOMETRY.vanishingPointX;
export const VANISHING_POINT_Y = TUNNEL_GEOMETRY.vanishingPointY;
export const TUNNEL_CONTAINER_WIDTH = TUNNEL_GEOMETRY.tunnelContainerWidth;
export const TUNNEL_CONTAINER_HEIGHT = TUNNEL_GEOMETRY.tunnelContainerHeight;
export const DECK_METER_COMPLETION_GLOW_DURATION = DECK_METER.completionGlowDuration;
