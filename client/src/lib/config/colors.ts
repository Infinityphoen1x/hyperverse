/**
 * Color constants for UI elements, lanes, and effects
 */

/**
 * Button configuration for all 6 lanes (4 soundpads + 2 deck controls)
 */
export interface ButtonConfig {
  lane: number;
  key: string;
  angle: number;
  color: string;
}

export const BUTTON_CONFIG: ButtonConfig[] = [
  { lane: 0, key: 'W', angle: 120, color: '#FF6600' }, // Neon orange (was pink #FF007F)
  { lane: 1, key: 'O', angle: 60, color: '#0096FF' },
  { lane: 2, key: 'I', angle: 300, color: '#BE00FF' },
  { lane: 3, key: 'E', angle: 240, color: '#00FFFF' },
  { lane: -1, key: 'Q', angle: 180, color: '#00FF00' },
  { lane: -2, key: 'P', angle: 0, color: '#FF0000' },
];

export const SOUNDPAD_COLORS = [
  'rgb(255,102,0)', // Neon orange (was rgb(255,0,127))
  'rgb(0,150,255)',
  'rgb(190,0,255)',
  'rgb(0,255,255)'
];

export interface UIColorPalette {
  deckLeft: string;
  deckRight: string;
  padW: string;
  padO: string;
  padI: string;
  padE: string;
  particleGreen: string;
  particleRed: string;
}

export const UI_COLOR_PALETTE: UIColorPalette = {
  deckLeft: '#00FF00',
  deckRight: '#FF0000',
  padW: '#FF6600', // Neon orange (was pink #FF007F)
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

export interface ParticleColorPalette {
  colors: string[];
}

export const PARTICLE_COLOR_PALETTE: ParticleColorPalette = {
  colors: [
    'hsl(120, 100%, 50%)',
    'hsl(0, 100%, 50%)',
    'hsl(180, 100%, 50%)',
    'hsl(280, 100%, 60%)',
    'hsl(320, 100%, 60%)',
  ],
};

export const PARTICLE_COLORS = PARTICLE_COLOR_PALETTE.colors;

export const TAP_COLORS = {
  STROKE_DEFAULT: 'rgba(255,255,255,0.8)',
  STROKE_FAILED: 'rgba(120, 120, 120, 1)',
  GLOW_SHADOW: (color: string) => `drop-shadow(0 0 35px ${color}) drop-shadow(0 0 20px ${color}) drop-shadow(0 0 10px ${color})`,
} as const;

export const GREYSCALE_FILL_COLOR = 'rgba(80, 80, 80, 0.8)';
export const GREYSCALE_GLOW_COLOR = 'rgba(100, 100, 100, 0.4)';
