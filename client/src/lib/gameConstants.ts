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

// Vanishing point angle shift (combo-triggered)
export const ANGLE_SHIFT_INTERVAL = 10; // Shift every 10x combo
export const ANGLE_SHIFT_DISTANCE = 20; // Max pixel distance from center - dramatic shift
export const ANGLE_SHIFT_DURATION = 2000; // ms - 2 second smooth animation for visible ray adjustment

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

// Deck hold meter constants
export const DECK_METER_SEGMENTS = 16; // Number of visual segments in meter
export const DECK_METER_SEGMENT_WIDTH = 60; // px - width of each segment
export const DECK_METER_COMPLETION_THRESHOLD = 0.95; // 0-1, progress needed to trigger glow
export const DECK_METER_COMPLETION_GLOW_DURATION = 400; // ms - how long glow animation lasts
export const DECK_METER_DEFAULT_HOLD_DURATION = 1000; // ms - default duration if beatmap doesn't specify

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
export const YOUTUBE_LABEL_BUTTON = 'LOAD YOUTUBE';
export const YOUTUBE_DIALOG_TITLE = 'LOAD YOUTUBE VIDEO';
export const YOUTUBE_INPUT_LABEL = 'YouTube URL or Video ID';
export const YOUTUBE_INPUT_PLACEHOLDER = 'https://youtube.com/watch?v=... or just the video ID';
export const YOUTUBE_ERROR_EMPTY = 'Please enter a YouTube URL or video ID';
export const YOUTUBE_ERROR_INVALID = 'Invalid YouTube URL or video ID';
export const YOUTUBE_BUTTON_LOAD = 'LOAD';
export const YOUTUBE_BUTTON_CANCEL = 'CANCEL';
export const YOUTUBE_PREVIEW_LABEL = '▶ YouTube';
export const YOUTUBE_PREVIEW_TITLE = 'YouTube video preview';
export const YOUTUBE_HELP_TEXT = 'The video will play silently in the background. Use its timing for gameplay sync.';

// YouTube overlay UI dimensions and opacity
export const YOUTUBE_PREVIEW_WIDTH = 256; // px (w-64 in Tailwind)
export const YOUTUBE_PREVIEW_HEIGHT = 144; // px (h-36 in Tailwind)
export const YOUTUBE_PREVIEW_OPACITY_DEFAULT = 0.1; // 10%
export const YOUTUBE_PREVIEW_OPACITY_HOVER = 0.2; // 20%
export const YOUTUBE_CLOSE_ICON_SIZE = 14; // px

// YouTube embed options for iframe configuration
export const YOUTUBE_PREVIEW_EMBED_OPTIONS = {
  autoplay: false,
  controls: false,
  modestBranding: true,
  enableJsApi: true
};

export const YOUTUBE_BACKGROUND_EMBED_OPTIONS = {
  autoplay: true,
  controls: false,
  modestBranding: true,
  enableJsApi: true
};

// Down3D Note Lane - tunnel geometry constants
export const LEAD_TIME = 4000; // ms - hold notes appear 4000ms before hit
export const JUDGEMENT_RADIUS = 187; // px - judgement line position in tunnel
export const HOLD_ANIMATION_DURATION = 1100; // ms - failure animation duration
export const HOLD_ACTIVATION_WINDOW = 300; // ms - ±300ms press accuracy window
export const TAP_HIT_FLASH_DURATION = 600; // ms - how long hit flash lasts
export const HEXAGON_RADII = [22, 52, 89, 135, 187, 248]; // px - tunnel hexagon ring distances
export const RAY_ANGLES = [0, 60, 120, 180, 240, 300]; // degrees - 6 tunnel rays
export const TUNNEL_MAX_DISTANCE = 260; // px - max distance for soundpad positioning

// Game Engine - note generation and timing
export const EASY_BPM = 60;
export const MEDIUM_BPM = 90;
export const HARD_BPM = 120;
export const MS_PER_MINUTE = 60000; // Conversion factor for BPM calculations
export const NOTE_START_TIME = 2000; // ms - delay before first note spawns
export const MAX_GENERATED_NOTES = 1000; // Cap for procedural note generation
export const SPIN_FREQUENCY = 4; // Generate spin notes every N beats
export const SPIN_ALTERNATION = 8; // Alternate left/right spins every N beats

// Game Engine - hit window and accuracy
export const TAP_HIT_WINDOW = 300; // ms - ±300ms window for TAP note hits
export const HOLD_MISS_TIMEOUT = 1100; // ms - fail hold note if not pressed within this time
export const HOLD_RELEASE_OFFSET = 600; // ms - additional time before hold release failure
export const HOLD_RELEASE_WINDOW = 100; // ms - ±100ms accuracy window for hold release

// Game Engine - accuracy point thresholds
export const ACCURACY_PERFECT_MS = 50; // ≤50ms = 300 points
export const ACCURACY_GREAT_MS = 100; // ≤100ms = 200 points
export const ACCURACY_PERFECT_POINTS = 300;
export const ACCURACY_GREAT_POINTS = 200;
export const ACCURACY_NORMAL_POINTS = 100;

// Game Engine - timing intervals (animation sync)
export const NOTES_SYNC_INTERVAL = 16; // ms - sync notes for smooth animations (~60fps)
export const STATE_UPDATE_BATCH_INTERVAL = 50; // ms - batch state updates to reduce renders

// Down3D Note Lane - TAP note timing and visuals
export const TAP_RENDER_WINDOW_MS = 2000; // ms - TAP notes appear 2000ms before hit
export const TAP_FALLTHROUGH_WINDOW_MS = 500; // ms - TAP notes visible 500ms after miss
export const HOLD_RENDER_WINDOW_MS = 4000; // ms - HOLD notes appear 4000ms before hit
export const TAP_JUDGEMENT_LINE_WIDTH = 35; // px - width of perpendicular judgement indicator
export const HOLD_JUDGEMENT_LINE_WIDTH = 45; // px - width of perpendicular judgement indicator for deck

// Down3D Note Lane - tunnel container dimensions
export const TUNNEL_CONTAINER_WIDTH = 700; // px
export const TUNNEL_CONTAINER_HEIGHT = 600; // px

// Down3D Note Lane - greyscale colors
export const GREYSCALE_FILL_COLOR = 'rgba(80, 80, 80, 0.8)'; // Greyscale fill for failed notes
export const GREYSCALE_GLOW_COLOR = 'rgba(100, 100, 100, 0.4)'; // Greyscale glow for failed notes
