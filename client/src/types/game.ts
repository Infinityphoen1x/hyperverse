// src/types/game.ts
// Core game types - single source of truth (including debug)

// Enums/Primitives
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'RESUMING' | 'GAME_OVER';
export type NoteType = 'TAP' | 'HOLD' | 'SPIN_LEFT' | 'SPIN_RIGHT';
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
  // Debug failure flags (for getFailures)
  tapTooEarlyFailure?: boolean;
  tapMissFailure?: boolean;
  tooEarlyFailure?: boolean;
  holdMissFailure?: boolean;
  holdReleaseFailure?: boolean;
  beatmapStart?: number;
  beatmapEnd?: number;
}

// Config
export interface GameConfig {
  maxHealth: number;
  bpm: number;
  difficulty: Difficulty;
  // ... other configs
}

// Scoring
export interface ScoreState {
  score: number;
  combo: number;
  health: number;
  accuracy: number; // 0-100
  maxCombo: number;
}

// Timing
export interface TimingResult {
  currentTime: number;
  isPlaying: boolean;
  elapsed: number;
}

// Handlers
export type InputHandler = (currentTime: number) => Note | null;
export type Processor = (note: Note, currentTime: number) => { success: boolean; updatedNote: Note; points?: number; accuracy?: number };
export type PostProcessor = (note: Note, currentTime: number) => void;

// Sync Config
export interface SyncConfig {
  notesInterval: number;
  stateInterval: number;
}

// Zustand Store Interfaces
export interface GameStateStore {
  gameState: GameState;
  isPaused: boolean;
  currentTime: number;
  notes: Note[];
  score: number;
  combo: number;

  startGame: () => void;
  // ... other actions
}

export interface NotesStoreState {
  notes: Note[];
  releaseTimeMap: Map<string, number>;

  getActiveNotes: () => Note[];
  // ... other
}

export interface ScoringStoreState {
  scoreState: ScoreState;

  addPoints: (points: number) => void;
  // ... other
}

// ============================================================================
// DEBUG TYPES
// ============================================================================

export interface AnimationTrackingEntry {
  noteId: string;
  type: FailureType;
  failureTime?: number;
  renderStart?: number;
  renderEnd?: number;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  errorMsg?: string;
}

export interface NoteStatistics {
  total: number;
  tap: number;
  hold: number;
  hit: number;
  missed: number;
  failed: number;
  byLane: Record<number, number>;
}

export interface HitStatistics {
  successfulHits: number;
  tapTooEarlyFailures: number;
  tapMissFailures: number;
  tooEarlyFailures: number;
  holdMissFailures: number;
  holdReleaseFailures: number;
}

export interface RenderStatistics {
  rendered: number;
  preMissed: number;
}

export interface AnimationStatistics {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  rendering: number;
}

// Empty defaults (for resets)
export const EMPTY_NOTE_STATS: NoteStatistics = {
  total: 0,
  tap: 0,
  hold: 0,
  hit: 0,
  missed: 0,
  failed: 0,
  byLane: {},
};
export const EMPTY_HIT_STATS: HitStatistics = {
  successfulHits: 0,
  tapTooEarlyFailures: 0,
  tapMissFailures: 0,
  tooEarlyFailures: 0,
  holdMissFailures: 0,
  holdReleaseFailures: 0,
};