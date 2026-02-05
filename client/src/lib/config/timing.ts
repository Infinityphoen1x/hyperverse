/**
 * Game timing constants
 * Hit windows, lead times, accuracy thresholds, and engine timing
 */

/**
 * Core gameplay timing and scoring windows
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
  /** MAGIC_MS: constant for player speed calculation (effectiveLeadTime = MAGIC_MS / playerSpeed) */
  MAGIC_MS: number;
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
  
  // Dynamic judgment window scaling factors
  /** PERFECT early window scale: percentage of detection window (8%) */
  PERFECT_EARLY_SCALE: number;
  /** GOOD early window scale: percentage of detection window (20%) */
  GOOD_EARLY_SCALE: number;
  /** OK early window scale: percentage of detection window (32%) */
  OK_EARLY_SCALE: number;
  /** Minimum PERFECT early window to prevent impossibly tight timing */
  MIN_PERFECT_EARLY: number;
  /** Minimum GOOD early window to prevent impossibly tight timing */
  MIN_GOOD_EARLY: number;
  /** Minimum OK early window to prevent impossibly tight timing */
  MIN_OK_EARLY: number;
  /** Late miss buffer: extends detection window after OK.late */
  LATE_MISS_BUFFER: number;
  /** Fixed late windows for PERFECT timing (human reaction time) */
  PERFECT_LATE: number;
  /** Fixed late windows for GOOD timing */
  GOOD_LATE: number;
  /** Fixed late windows for OK timing */
  OK_LATE: number;
}

export const GAME_CONFIG: GameConfigConstants = {
  TAP_HIT_WINDOW: 150,
  TAP_FAILURE_BUFFER: 100,
  HOLD_HIT_WINDOW: 150,
  HOLD_MISS_TIMEOUT: 250,
  HOLD_RELEASE_OFFSET: 200,
  HOLD_RELEASE_WINDOW: 150,
  HOLD_ACTIVATION_WINDOW: 150,
  LEAD_TIME: 4000,
  MAGIC_MS: 80000, // effectiveLeadTime = MAGIC_MS / playerSpeed (speed 40 = 2000ms default)
  ACCURACY_PERFECT_MS: 50,
  ACCURACY_GREAT_MS: 100,
  ACCURACY_PERFECT_POINTS: 100,
  ACCURACY_GREAT_POINTS: 75,
  ACCURACY_NORMAL_POINTS: 50,
  MAX_HEALTH: 200,
  
  // Dynamic judgment window constants
  PERFECT_EARLY_SCALE: 0.08,   // 8% of detection window
  GOOD_EARLY_SCALE: 0.20,      // 20% of detection window
  OK_EARLY_SCALE: 0.32,        // 32% of detection window
  MIN_PERFECT_EARLY: 20,       // Minimum 20ms for PERFECT early
  MIN_GOOD_EARLY: 40,          // Minimum 40ms for GOOD early
  MIN_OK_EARLY: 60,            // Minimum 60ms for OK early
  LATE_MISS_BUFFER: 200,       // 200ms after OK.late for miss detection
  PERFECT_LATE: 30,            // Fixed late window for PERFECT
  GOOD_LATE: 70,               // Fixed late window for GOOD
  OK_LATE: 120,                // Fixed late window for OK
};

export const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;
export const TAP_FAILURE_BUFFER = GAME_CONFIG.TAP_FAILURE_BUFFER;
export const HOLD_HIT_WINDOW = GAME_CONFIG.HOLD_HIT_WINDOW;
export const HOLD_MISS_TIMEOUT = GAME_CONFIG.HOLD_MISS_TIMEOUT;
export const HOLD_RELEASE_OFFSET = GAME_CONFIG.HOLD_RELEASE_OFFSET;
export const HOLD_RELEASE_WINDOW = GAME_CONFIG.HOLD_RELEASE_WINDOW;
export const HOLD_ACTIVATION_WINDOW = GAME_CONFIG.HOLD_ACTIVATION_WINDOW;
export const LEAD_TIME = GAME_CONFIG.LEAD_TIME;
export const MAGIC_MS = GAME_CONFIG.MAGIC_MS;
export const ACCURACY_PERFECT_MS = GAME_CONFIG.ACCURACY_PERFECT_MS;
export const ACCURACY_GREAT_MS = GAME_CONFIG.ACCURACY_GREAT_MS;
export const ACCURACY_PERFECT_POINTS = GAME_CONFIG.ACCURACY_PERFECT_POINTS;
export const ACCURACY_GREAT_POINTS = GAME_CONFIG.ACCURACY_GREAT_POINTS;
export const ACCURACY_NORMAL_POINTS = GAME_CONFIG.ACCURACY_NORMAL_POINTS;
export const MAX_HEALTH = GAME_CONFIG.MAX_HEALTH;

// Dynamic judgment window exports
export const PERFECT_EARLY_SCALE = GAME_CONFIG.PERFECT_EARLY_SCALE;
export const GOOD_EARLY_SCALE = GAME_CONFIG.GOOD_EARLY_SCALE;
export const OK_EARLY_SCALE = GAME_CONFIG.OK_EARLY_SCALE;
export const MIN_PERFECT_EARLY = GAME_CONFIG.MIN_PERFECT_EARLY;
export const MIN_GOOD_EARLY = GAME_CONFIG.MIN_GOOD_EARLY;
export const MIN_OK_EARLY = GAME_CONFIG.MIN_OK_EARLY;
export const LATE_MISS_BUFFER = GAME_CONFIG.LATE_MISS_BUFFER;
export const PERFECT_LATE = GAME_CONFIG.PERFECT_LATE;
export const GOOD_LATE = GAME_CONFIG.GOOD_LATE;
export const OK_LATE = GAME_CONFIG.OK_LATE;

/**
 * Game engine timing - BPM ranges, note generation, and sync intervals
 */
export interface GameEngineTiming {
  easyBpm: number;
  mediumBpm: number;
  hardBpm: number;
  msPerMinute: number;
  noteStartTime: number;
  maxGeneratedNotes: number;
  spinAlternation: number;
  leadTime: number;
  tapRenderWindowMs: number;
  tapFallthroughWindowMs: number;
  holdRenderWindowMs: number;
  notesSyncInterval: number;
  stateUpdateBatchInterval: number;
  stateUpdateInterval: number;
}

export const GAME_ENGINE_TIMING: GameEngineTiming = {
  easyBpm: 60,
  mediumBpm: 90,
  hardBpm: 120,
  msPerMinute: 60000,
  noteStartTime: 2000,
  maxGeneratedNotes: 1000,
  spinAlternation: 8,
  leadTime: 4000,
  tapRenderWindowMs: 2000,
  tapFallthroughWindowMs: 1100,
  holdRenderWindowMs: 4000,
  notesSyncInterval: 16,
  stateUpdateBatchInterval: 50,
  stateUpdateInterval: 50,
};

export const STATE_UPDATE_INTERVAL = GAME_ENGINE_TIMING.stateUpdateInterval;
export const REFERENCE_BPM = 120;
export const DEFAULT_BEATMAP_BPM = 120;
