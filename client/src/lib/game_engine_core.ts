// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

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
  TAP_HIT_WINDOW: number;
  TAP_FAILURE_BUFFER: number;
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

// ============================================================================
// TIMING MANAGER - Handles all time-related calculations
// ============================================================================

export class TimingManager {
  private startTime: number = 0;
  private pausedTime: number = 0;
  private totalPausedDuration: number = 0;
  private isPaused: boolean = false;

  start(): void {
    this.startTime = performance.now();
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.isPaused = false;
  }

  pause(): void {
    if (!this.isPaused) {
      this.pausedTime = performance.now();
      this.isPaused = true;
    }
  }

  resume(): void {
    if (this.isPaused) {
      this.totalPausedDuration += performance.now() - this.pausedTime;
      this.isPaused = false;
      this.pausedTime = 0;
    }
  }

  getCurrentTime(videoTime?: number | null): number {
    // Prefer authoritative video time if available
    if (videoTime !== undefined && videoTime !== null && videoTime >= 0) {
      return Math.round(videoTime);
    }
    
    // Fallback to performance-based timing
    const now = performance.now();
    const elapsed = now - this.startTime - this.totalPausedDuration;
    return Math.round(Math.max(0, elapsed));
  }

  reset(): void {
    this.startTime = 0;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.isPaused = false;
  }
}

// ============================================================================
// SCORING MANAGER - Handles score, combo, health
// ============================================================================

export interface ScoreState {
  score: number;
  combo: number;
  health: number;
}

export class ScoringManager {
  private state: ScoreState;
  
  constructor(private config: GameConfig) {
    this.state = {
      score: 0,
      combo: 0,
      health: config.MAX_HEALTH,
    };
  }

  getState(): ScoreState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      score: 0,
      combo: 0,
      health: this.config.MAX_HEALTH,
    };
  }

  calculateHitScore(timingError: number): number {
    const absError = Math.abs(timingError);
    if (absError < this.config.ACCURACY_PERFECT_MS) {
      return this.config.ACCURACY_PERFECT_POINTS;
    }
    if (absError < this.config.ACCURACY_GREAT_MS) {
      return this.config.ACCURACY_GREAT_POINTS;
    }
    return this.config.ACCURACY_NORMAL_POINTS;
  }

  recordHit(timingError: number): ScoreState {
    const points = this.calculateHitScore(timingError);
    this.state.score += points;
    this.state.combo += 1;
    this.state.health = Math.min(this.config.MAX_HEALTH, this.state.health + 1);
    return this.getState();
  }

  recordMiss(): ScoreState {
    this.state.combo = 0;
    this.state.health = Math.max(0, this.state.health - 2);
    return this.getState();
  }

  isDead(): boolean {
    return this.state.health <= 0;
  }
}

// ============================================================================
// NOTE VALIDATOR - Pure functions for note state validation
// ============================================================================

export class NoteValidator {
  constructor(private config: GameConfig) {}

  isNoteActive(note: Note): boolean {
    return !note.hit && 
           !note.missed && 
           !note.tapTooEarlyFailure && 
           !note.tapMissFailure && 
           !note.tooEarlyFailure && 
           !note.holdMissFailure && 
           !note.holdReleaseFailure;
  }

  isNoteFailed(note: Note): boolean {
    return !!(note.tapTooEarlyFailure || 
              note.tapMissFailure || 
              note.tooEarlyFailure || 
              note.holdMissFailure || 
              note.holdReleaseFailure);
  }

  shouldCleanupNote(note: Note, currentTime: number): boolean {
    const CLEANUP_DELAY = 700;
    
    if (note.type === 'TAP' && note.hit && note.hitTime) {
      return currentTime > note.hitTime + CLEANUP_DELAY;
    }
    
    if ((note.type === 'SPIN_LEFT' || note.type === 'SPIN_RIGHT') && 
        note.holdMissFailure && note.failureTime) {
      return currentTime > note.failureTime + CLEANUP_DELAY;
    }
    
    return false;
  }

  findClosestActiveNote(notes: Note[], lane: number, type: NoteType, currentTime: number): Note | null {
    const candidates = notes.filter(n => 
      n.lane === lane && 
      n.type === type && 
      this.isNoteActive(n) &&
      Number.isFinite(n.time)
    );

    if (candidates.length === 0) return null;

    return candidates.reduce((prev, curr) => 
      Math.abs(curr.time - currentTime) < Math.abs(prev.time - currentTime) ? curr : prev
    );
  }

  findActiveHoldNote(notes: Note[], lane: number, currentTime: number): Note | null {
    return notes.find(n => 
      n.lane === lane &&
      (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') &&
      n.pressHoldTime !== undefined &&
      n.pressHoldTime > 0 &&
      this.isNoteActive(n) &&
      // Only match notes within lead time window
      currentTime - n.time >= -this.config.LEAD_TIME
    ) || null;
  }
}

// ============================================================================
// NOTE PROCESSOR - Handles note hit detection and state updates
// ============================================================================

export type NoteUpdateResult = {
  updatedNote: Note;
  scoreChange?: ScoreState;
  shouldGameOver?: boolean;
};

export class NoteProcessor {
  constructor(
    private config: GameConfig,
    private validator: NoteValidator,
    private scorer: ScoringManager
  ) {}

  processTapHit(note: Note, currentTime: number): NoteUpdateResult {
    const timeSinceNote = currentTime - note.time;

    // Too early
    if (timeSinceNote < -this.config.TAP_HIT_WINDOW) {
      const scoreChange = this.scorer.recordMiss();
      return {
        updatedNote: {
          ...note,
          pressTime: Math.round(currentTime),
          tapTooEarlyFailure: true,
          failureTime: Math.round(currentTime),
        },
        scoreChange,
      };
    }

    // Valid hit
    if (Math.abs(timeSinceNote) < this.config.TAP_HIT_WINDOW) {
      const scoreChange = this.scorer.recordHit(timeSinceNote);
      return {
        updatedNote: {
          ...note,
          hit: true,
          hitTime: Math.round(currentTime),
          pressTime: Math.round(currentTime),
        },
        scoreChange,
      };
    }

    // Too late - handled by auto-miss logic
    return { updatedNote: note };
  }

  processHoldStart(note: Note, currentTime: number): NoteUpdateResult {
    const timeSinceNote = currentTime - note.time;

    // Too early
    if (timeSinceNote < -this.config.HOLD_ACTIVATION_WINDOW) {
      const scoreChange = this.scorer.recordMiss();
      return {
        updatedNote: {
          ...note,
          pressHoldTime: Math.round(currentTime),
          tooEarlyFailure: true,
          failureTime: Math.round(currentTime),
        },
        scoreChange,
      };
    }

    // Too late
    if (timeSinceNote > this.config.HOLD_ACTIVATION_WINDOW) {
      const scoreChange = this.scorer.recordMiss();
      return {
        updatedNote: {
          ...note,
          pressHoldTime: Math.round(currentTime),
          holdMissFailure: true,
          failureTime: Math.round(currentTime),
        },
        scoreChange,
      };
    }

    // Valid hold start
    return {
      updatedNote: {
        ...note,
        pressHoldTime: Math.round(currentTime),
      },
    };
  }

  processHoldEnd(note: Note, currentTime: number): NoteUpdateResult {
    const holdDuration = note.duration || 1000;
    const expectedReleaseTime = note.time + holdDuration;
    const timeSinceExpectedRelease = currentTime - expectedReleaseTime;

    // Released too early
    if (currentTime - note.time < holdDuration) {
      const scoreChange = this.scorer.recordMiss();
      return {
        updatedNote: {
          ...note,
          releaseTime: Math.round(currentTime),
          holdReleaseFailure: true,
          failureTime: Math.round(currentTime),
        },
        scoreChange,
      };
    }

    // Valid release
    if (Math.abs(timeSinceExpectedRelease) <= this.config.HOLD_RELEASE_WINDOW) {
      const scoreChange = this.scorer.recordHit(timeSinceExpectedRelease);
      return {
        updatedNote: {
          ...note,
          hit: true,
          releaseTime: Math.round(currentTime),
          pressReleaseTime: Math.round(currentTime),
        },
        scoreChange,
      };
    }

    // Released too late
    const scoreChange = this.scorer.recordMiss();
    return {
      updatedNote: {
        ...note,
        releaseTime: Math.round(currentTime),
        holdReleaseFailure: true,
        failureTime: Math.round(currentTime),
      },
      scoreChange,
    };
  }

  checkAutoFail(note: Note, currentTime: number): NoteUpdateResult | null {
    if (!this.validator.isNoteActive(note)) return null;

    // TAP auto-fail
    if (note.type === 'TAP') {
      if (currentTime > note.time + this.config.TAP_HIT_WINDOW + this.config.TAP_FAILURE_BUFFER) {
        const scoreChange = this.scorer.recordMiss();
        return {
          updatedNote: {
            ...note,
            tapMissFailure: true,
            failureTime: Math.round(currentTime),
          },
          scoreChange,
          shouldGameOver: this.scorer.isDead(),
        };
      }
    }

    // HOLD auto-fail
    if (note.type === 'SPIN_LEFT' || note.type === 'SPIN_RIGHT') {
      // Never pressed
      if (!note.pressHoldTime && currentTime > note.time + this.config.HOLD_MISS_TIMEOUT) {
        const scoreChange = this.scorer.recordMiss();
        return {
          updatedNote: {
            ...note,
            holdMissFailure: true,
            failureTime: Math.round(currentTime),
          },
          scoreChange,
          shouldGameOver: this.scorer.isDead(),
        };
      }

      // Pressed but never released (timeout)
      if (note.pressHoldTime && note.pressHoldTime > 0 && !note.hit) {
        const noteHoldDuration = note.duration || 1000;
        if (currentTime > note.pressHoldTime + noteHoldDuration + this.config.HOLD_RELEASE_OFFSET) {
          const scoreChange = this.scorer.recordMiss();
          return {
            updatedNote: {
              ...note,
              holdReleaseFailure: true,
              failureTime: Math.round(currentTime),
            },
            scoreChange,
            shouldGameOver: this.scorer.isDead(),
          };
        }
      }
    }

    return null;
  }
}

// ============================================================================
// GAME ENGINE CORE - Orchestrates all managers
// ============================================================================

export class GameEngineCore {
  private timingManager: TimingManager;
  private scoringManager: ScoringManager;
  private validator: NoteValidator;
  private processor: NoteProcessor;
  private notes: Note[];
  private releaseTimeMap: Map<string, number>;

  constructor(
    private config: GameConfig,
    initialNotes: Note[] = []
  ) {
    this.timingManager = new TimingManager();
    this.scoringManager = new ScoringManager(config);
    this.validator = new NoteValidator(config);
    this.processor = new NoteProcessor(config, this.validator, this.scoringManager);
    this.notes = [...initialNotes];
    this.releaseTimeMap = new Map();
  }

  start(): void {
    this.timingManager.start();
    this.scoringManager.reset();
    this.notes = [...this.notes]; // Reset notes to fresh state
    this.releaseTimeMap.clear();
  }

  reset(newNotes?: Note[]): void {
    this.timingManager.reset();
    this.scoringManager.reset();
    if (newNotes) this.notes = [...newNotes];
    this.releaseTimeMap.clear();
  }

  pause(): void {
    this.timingManager.pause();
  }

  resume(): void {
    this.timingManager.resume();
  }

  getCurrentTime(videoTime?: number | null): number {
    return this.timingManager.getCurrentTime(videoTime);
  }

  getScore(): ScoreState {
    return this.scoringManager.getState();
  }

  getNotes(): Note[] {
    return this.notes;
  }

  getReleaseTime(noteId: string): number | undefined {
    return this.releaseTimeMap.get(noteId);
  }

  // Process frame - cleanup notes and check auto-fails
  processFrame(currentTime: number): { shouldGameOver: boolean } {
    let shouldGameOver = false;

    // Cleanup completed notes
    this.notes = this.notes.filter(note => 
      !this.validator.shouldCleanupNote(note, currentTime)
    );

    // Check for auto-fails
    this.notes = this.notes.map(note => {
      const result = this.processor.checkAutoFail(note, currentTime);
      if (result) {
        if (result.shouldGameOver) shouldGameOver = true;
        return result.updatedNote;
      }
      return note;
    });

    return { shouldGameOver };
  }

  // Handle tap input
  handleTap(lane: number, currentTime: number): boolean {
    const note = this.validator.findClosestActiveNote(this.notes, lane, 'TAP', currentTime);
    if (!note) return false;

    const result = this.processor.processTapHit(note, currentTime);
    this.updateNote(note.id, result.updatedNote);
    return result.updatedNote.hit || false;
  }

  // Handle hold start
  handleHoldStart(lane: number, currentTime: number): boolean {
    const note = this.validator.findActiveHoldNote(this.notes, lane, currentTime);
    if (!note) return false;

    const result = this.processor.processHoldStart(note, currentTime);
    this.updateNote(note.id, result.updatedNote);
    return !this.validator.isNoteFailed(result.updatedNote);
  }

  // Handle hold end
  handleHoldEnd(lane: number, currentTime: number): boolean {
    const note = this.validator.findActiveHoldNote(this.notes, lane, currentTime);
    if (!note || !note.pressHoldTime) return false;

    const result = this.processor.processHoldEnd(note, currentTime);
    this.updateNote(note.id, result.updatedNote);
    
    // Track release time for animations
    this.releaseTimeMap.set(note.id, Math.round(currentTime));
    
    return result.updatedNote.hit || false;
  }

  private updateNote(noteId: string, updatedNote: Note): void {
    const index = this.notes.findIndex(n => n.id === noteId);
    if (index !== -1) {
      this.notes[index] = updatedNote;
    }
  }
}
