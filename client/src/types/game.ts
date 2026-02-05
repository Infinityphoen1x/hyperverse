// src/types/game.ts
// Core game types - single source of truth

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'RESUMING' | 'REWINDING' | 'GAME_OVER';
export type NoteType = 'TAP' | 'HOLD';
export type FailureType = 'tapTooEarlyFailure' | 'tapMissFailure' | 'tooEarlyFailure' | 'holdMissFailure' | 'holdReleaseFailure' | 'successful';

/**
 * Absolute position in tunnel (fixed coordinate system)
 * -2: Right horizontal (0°)
 * -1: Left horizontal (180°)
 *  0: Top-left (120°)
 *  1: Top-right (60°)
 *  2: Bottom-right (300°)
 *  3: Bottom-left (240°)
 */
export type AbsolutePosition = -2 | -1 | 0 | 1 | 2 | 3;

// Note structure
export interface Note {
  id: string;
  lane: number; // DEPRECATED: Use 'position' instead. -2 to 3 (absolute position in tunnel)
  time: number; // ms
  type: NoteType;
  duration?: number; // For HOLD notes
  hit: boolean;
  missed: boolean;
  pressHoldTime?: number; // Start of hold
  releaseTime?: number; // End of hold
  failureTime?: number;
  // Debug failure flags
  tapTooEarlyFailure?: boolean;
  tapMissFailure?: boolean;
  tooEarlyFailure?: boolean;
  holdMissFailure?: boolean;
  holdReleaseFailure?: boolean;
  beatmapStart?: number;
  beatmapEnd?: number;
}

export interface GameConfig {
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

export interface ScoreState {
  score: number;
  combo: number;
  health: number;
  missCount?: number;
}

export interface TimingResult {
  error: number;
  isWithinWindow: boolean;
  isTooEarly: boolean;
  isTooLate: boolean;
}

export type InputHandler = () => Note | null;
export type Processor = (note: Note, time: number) => { updatedNote: Note; success?: boolean };
export type PostProcessor = (note: Note, time: number) => void;

// Zustand Store Types
export interface GameStoreState {
  // Core game state
  gameState: GameState;
  difficulty: Difficulty;
  notes: Note[];
  currentTime: number;
  isPaused: boolean;
  
  // Score tracking
  score: number;
  combo: number;
  health: number;
  maxHealth: number;
  missCount: number;
  
  // UI state
  countdownSeconds: number;
  
  // Beatmap metadata
  beatmapBpm: number;
  
  // Player settings
  playerSpeed: number; // 5 to 80 - temporary slider value in settings (higher = faster notes)
  defaultPlayerSpeed: number; // 5 to 80 - persisted default used in gameplay
  targetFPS: number; // Target frame rate (30, 60, 120, 144, or 0 for unlimited)
  soundVolume: number; // 0.0 to 1.0 - master volume for sound effects
  soundMuted: boolean; // Master mute toggle for sound effects
  inputOffset: number; // -200 to +200ms - audio/visual calibration offset (positive = notes earlier, negative = notes later)
  disableRotation: boolean; // Disable tunnel rotation (for tutorials)
  
  // Tunnel rotation
  tunnelRotation: number; // Current rotation angle in degrees
  targetTunnelRotation: number; // Target rotation angle for animation
  animatedTunnelRotation: number; // Current animated rotation value (shared globally)
  idleRotation: number; // Idle sway animation angle
  
  // Spin alternation - tracks key press count per position for DJ deck direction alternation
  spinPressCountPerLane: { [position: number]: number };
  
  // Visual state - tracks which deck wheels are currently spinning (for horizontal positions -1/-2 with active HOLD notes)
  leftDeckSpinning: boolean; // Position -1 (Q) visual deck wheel spinning
  rightDeckSpinning: boolean; // Position -2 (P) visual deck wheel spinning
  
  // Actions
  setGameState: (state: GameState) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setNotes: (notes: Note[]) => void;
  setScore: (score: number) => void;
  setCombo: (combo: number) => void;
  setHealth: (health: number) => void;
  setMissCount: (missCount: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPaused: (paused: boolean) => void;
  setCountdownSeconds: (seconds: number) => void;
  setBeatmapBpm: (bpm: number) => void;
  setPlayerSpeed: (speed: number) => void;
  setDefaultPlayerSpeed: (speed: number) => void;
  setTargetFPS: (fps: number) => void;
  setSoundVolume: (volume: number) => void;
  setSoundMuted: (muted: boolean) => void;
  setInputOffset: (offset: number) => void;
  setDisableRotation: (disabled: boolean) => void;
  setTunnelRotation: (angle: number) => void;
  setTargetTunnelRotation: (angle: number) => void;
  setAnimatedTunnelRotation: (angle: number) => void;
  setIdleRotation: (angle: number) => void;
  incrementSpinPressCount: (position: number) => void;
  setLeftDeckSpinning: (spinning: boolean) => void;
  setRightDeckSpinning: (spinning: boolean) => void;
  
  // Game actions (position parameter represents absolute position -2 to 3)
  hitNote: (position: number) => void;
  hitPad: (position: number) => void;
  startDeckHold: (position: number) => void;
  endDeckHold: (position: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  unloadBeatmap: () => void;
  resetGameState: () => void;
  rewindGame: () => void;
  restartGame: () => void;
  
  // Computed selectors
  getVisibleNotes: () => Note[];
  getProcessedTapNotes: () => Note[];
  getHoldNotes: () => Note[];
  getActiveNotes: () => Note[];
  getCompletedNotes: () => Note[];
  getActiveNotesOnLane: (lane: number) => Note[];
  isDead: () => boolean;
}
