/**
 * Core game engine types
 * For use in Zustand game store and game engine
 */

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'RESUMING' | 'REWINDING' | 'GAME_OVER';
export type NoteType = 'TAP' | 'SPIN_LEFT' | 'SPIN_RIGHT';

export interface Note {
  id: string;
  lane: number;
  time: number;
  type: NoteType;
  duration?: number;
  
  // State flags
  hit: boolean;
  missed: boolean;
  
  // Failure types
  tapTooEarlyFailure?: boolean;
  tapMissFailure?: boolean;
  tooEarlyFailure?: boolean;
  holdMissFailure?: boolean;
  holdReleaseFailure?: boolean;
  
  // Timing data
  pressTime?: number;
  hitTime?: number;
  pressHoldTime?: number;
  releaseTime?: number;
  pressReleaseTime?: number;
  failureTime?: number;
  
  // Beatmap bounds
  beatmapStart?: number;
  beatmapEnd?: number;
}

export interface GameConfig {
  // Tap note timing windows
  TAP_HIT_WINDOW: number;
  TAP_FAILURE_BUFFER: number;
  
  // Hold note timing windows
  HOLD_MISS_TIMEOUT: number;
  HOLD_RELEASE_OFFSET: number;
  HOLD_RELEASE_WINDOW: number;
  HOLD_ACTIVATION_WINDOW: number;
  
  // General
  LEAD_TIME: number;
  
  // Scoring
  ACCURACY_PERFECT_MS: number;
  ACCURACY_GREAT_MS: number;
  ACCURACY_PERFECT_POINTS: number;
  ACCURACY_GREAT_POINTS: number;
  ACCURACY_NORMAL_POINTS: number;
  
  // Health
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

export type FailureType = 
  | 'tapTooEarlyFailure'
  | 'tapMissFailure'
  | 'tooEarlyFailure'
  | 'holdMissFailure'
  | 'holdReleaseFailure';

// Input handler types for GameEngineCore
export type InputHandler = () => Note | null;
export type Processor = (note: Note, time: number) => { updatedNote: Note; success?: boolean };
export type PostProcessor = (note: Note, time: number) => void;

/**
 * Zustand Store Types
 */

export interface GameStoreState {
  // Core game state
  gameState: GameState;
  difficulty: Difficulty;
  notes: Note[];
  customNotes: Note[] | undefined;
  
  // Score tracking
  score: number;
  combo: number;
  health: number;
  maxHealth: number;
  
  // Timing
  currentTime: number;
  isPaused: boolean;
  
  // Actions
  setGameState: (state: GameState) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setNotes: (notes: Note[]) => void;
  setCustomNotes: (notes: Note[] | undefined) => void;
  setScore: (score: number) => void;
  setCombo: (combo: number) => void;
  setHealth: (health: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPaused: (paused: boolean) => void;
  
  // Complex actions
  resetGame: (notes: Note[]) => void;
}
