// Shared game constants used across components

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
export const JUDGEMENT_RADIUS = 187;

// Hold note geometry constants
export const HOLD_NOTE_STRIP_WIDTH_MULTIPLIER = 0.15; // Convert duration (ms) to Z-depth
export const FAILURE_ANIMATION_DURATION = 1100; // ms - time for failure animations

// Soundpad timing
export const ACTIVATION_WINDOW = 300; // ms - hit window for notes
export const HIT_SUCCESS_DURATION = 200; // ms - how long hit feedback glows

// Soundpad colors - RGB values for dynamic styling
export const SOUNDPAD_COLORS = [
  'rgb(255,0,127)',   // Lane 0 (W) - pink
  'rgb(0,150,255)',   // Lane 1 (O) - blue
  'rgb(190,0,255)',   // Lane 2 (I) - purple
  'rgb(0,255,255)'    // Lane 3 (E) - cyan
];

// Soundpad Tailwind styles - derived from SOUNDPAD_COLORS
export const SOUNDPAD_STYLES = [
  { bg: 'bg-neon-pink/30', border: 'border-neon-pink/50', shadow: 'shadow-[0_0_15px_rgb(255,0,127)]' },
  { bg: 'bg-neon-blue/30', border: 'border-neon-blue/50', shadow: 'shadow-[0_0_15px_rgb(0,150,255)]' },
  { bg: 'bg-neon-purple/30', border: 'border-neon-purple/50', shadow: 'shadow-[0_0_15px_rgb(190,0,255)]' },
  { bg: 'bg-neon-cyan/30', border: 'border-neon-cyan/50', shadow: 'shadow-[0_0_15px_rgb(0,255,255)]' },
];

// Deck wheel rotation constants
export const ROTATION_SPEED = 2.0; // degrees per frame
export const SPIN_THRESHOLD = 30; // degrees - trigger onSpin after this rotation
export const STATE_UPDATE_INTERVAL = 50; // ms - batch state updates
export const DRAG_VELOCITY_THRESHOLD = 100; // px/s - minimum velocity for drag spin

// Visual effects - particle and animation constants
export const MAX_HEALTH = 200; // Game health system max
export const LOW_HEALTH_THRESHOLD = 160; // 80% of MAX_HEALTH - triggers continuous glitch
export const COMBO_MILESTONE = 5; // Trigger particle effect every N combos
export const COMBO_PERFECT_MILESTONE = 10; // Trigger perfect pulse every N combos
export const PARTICLES_PER_EFFECT = 12; // Number of particles spawned per combo milestone
export const MAX_PARTICLES_BUFFER = 60; // Max particles to keep alive at once
export const PARTICLE_SIZE_MIN = 4; // px
export const PARTICLE_SIZE_MAX = 12; // px
export const SHAKE_INTERVAL = 50; // ms - how often to update shake offset
export const SHAKE_OFFSET_MULTIPLIER = 16; // pixels - max random offset
export const SHAKE_DURATION = 300; // ms - how long shake lasts
export const CHROMATIC_DURATION = 400; // ms - how long chromatic aberration lasts
export const CHROMATIC_INTENSITY = 0.8; // 0-1, strength of effect
export const CHROMATIC_OFFSET_PX = 15; // pixels - aberration offset
export const GLITCH_BASE_INTERVAL = 400; // ms - base glitch interval
export const GLITCH_RANDOM_RANGE = 200; // ms - additional random time
export const GLITCH_OPACITY = 0.3; // 0-1, base opacity of glitch lines
export const GREYSCALE_INTENSITY = 0.8; // 0-1, max greyscale when health is 0
export const GLITCH_BACKGROUND_SIZE = 60; // px - height of glitch scan lines

// Visual effects - color palette for particle effects
export const PARTICLE_COLORS = [
  'hsl(120, 100%, 50%)',  // Green
  'hsl(0, 100%, 50%)',    // Red
  'hsl(180, 100%, 50%)',  // Cyan
  'hsl(280, 100%, 60%)',  // Purple
  'hsl(320, 100%, 60%)',  // Magenta
];
