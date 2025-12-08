// src/types/game.ts
// Core game types - single source of truth

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'RESUMING' | 'REWINDING' | 'GAME_OVER';
export type NoteType = 'TAP' | 'HOLD';
export type FailureType = 'tapTooEarlyFailure' | 'tapMissFailure' | 'tooEarlyFailure' | 'holdMissFailure' | 'holdReleaseFailure' | 'successful';

// Note structure
export interface Note {
  id: string;
  lane: number; // -2 to 3
  time: number; // ms
  type: NoteType;
  duration?: number; // For HOLD/SPIN
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
  noteSpeedMultiplier: number; // 0.5 to 2.0 - temporary slider value in settings
  defaultNoteSpeedMultiplier: number; // 0.5 to 2.0 - persisted default used in gameplay
  
  // Tunnel rotation
  tunnelRotation: number; // Current rotation angle in degrees
  targetTunnelRotation: number; // Target rotation angle for animation
  animatedTunnelRotation: number; // Current animated rotation value (shared globally)
  
  // Spin alternation - tracks key press count per lane for DJ deck direction alternation
  spinPressCountPerLane: { [lane: number]: number };
  
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
  setNoteSpeedMultiplier: (multiplier: number) => void;
  setDefaultNoteSpeedMultiplier: (multiplier: number) => void;
  setTunnelRotation: (angle: number) => void;
  setTargetTunnelRotation: (angle: number) => void;
  setAnimatedTunnelRotation: (angle: number) => void;
  incrementSpinPressCount: (lane: number) => void;
  
  // Game actions
  hitNote: (lane: number) => void;
  hitPad: (lane: number) => void;
  startDeckHold: (lane: number) => void;
  endDeckHold: (lane: number) => void;
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
