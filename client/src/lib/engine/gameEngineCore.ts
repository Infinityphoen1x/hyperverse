import { Note, GameConfig, ScoreState, InputHandler, Processor, PostProcessor } from './gameTypes';
import { TimingManager } from '../managers/timingManager';
import { ScoringManager } from '../managers/scoringManager';
import { NoteValidator } from '../notes/processors/noteValidator';
import { NoteProcessor } from '../notes/processors/noteProcessor';
import { GameEngineQueries } from './gameEngineQueries';
import { GameErrors } from '../errors/errorLog';

// ============================================================================
// GAME ENGINE CORE - Lightweight orchestrator that delegates to specialists
// ============================================================================

/**
 * GameEngineCore
 * 
 * Orchestrates game logic by delegating to specialized managers:
 * - TimingManager: Time calculations
 * - ScoringManager: Score/combo/health
 * - NoteValidator: Note state validation
 * - NoteProcessor: Hit detection and state updates
 * 
 * This class is intentionally thin - it just coordinates between managers.
 */
export class GameEngineCore {
  private timingManager: TimingManager;
  private scoringManager: ScoringManager;
  private validator: NoteValidator;
  private processor: NoteProcessor;
  private queries: GameEngineQueries;
  
  private notes: Note[];
  private releaseTimeMap: Map<string, number>;

  constructor(
    private config: GameConfig,
    initialNotes: Note[] = []
  ) {
    // Initialize state first
    this.notes = [...initialNotes];
    this.releaseTimeMap = new Map();
    
    // Initialize all managers
    this.timingManager = new TimingManager();
    this.scoringManager = new ScoringManager(config);
    this.validator = new NoteValidator(config);
    this.processor = new NoteProcessor(config, this.validator, this.scoringManager);
    this.queries = new GameEngineQueries(this.validator, this.scoringManager, this.notes);
  }

  // ==========================================================================
  // LIFECYCLE METHODS
  // ==========================================================================

  start(): void {
    this.reset();
    this.timingManager.start();
  }

  pause(): void {
    this.timingManager.pause();
  }

  resume(): void {
    this.timingManager.resume();
  }

  reset(newNotes?: Note[]): void {
    this.timingManager.reset();
    this.scoringManager.reset();
    if (newNotes) {
      this.notes = [...newNotes];
    }
    this.releaseTimeMap.clear();
  }

  // ==========================================================================
  // GETTERS - Expose read-only state
  // ==========================================================================

  getCurrentTime(videoTime?: number | null): number {
    return this.timingManager.getCurrentTime(videoTime);
  }

  getScore(): ScoreState {
    return this.scoringManager.getState();
  }

  getNotes(): Note[] {
    return [...this.notes];
  }

  getReleaseTime(noteId: string): number | undefined {
    return this.releaseTimeMap.get(noteId);
  }

  getConfig(): Readonly<GameConfig> {
    return Object.freeze({ ...this.config });
  }

  // ==========================================================================
  // FRAME PROCESSING - Called each animation frame
  // ==========================================================================

  /**
   * Process a single frame - cleanup notes and check auto-fails
   * Should be called every frame during gameplay
   */
  processFrame(currentTime: number): { shouldGameOver: boolean } {
    const result = this.processor.processNotesFrame(this.notes, currentTime);
    this.notes = result.updatedNotes;
    return { shouldGameOver: result.shouldGameOver };
  }

  // ==========================================================================
  // INPUT HANDLERS - Called when player presses/releases
  // ==========================================================================

  /**
   * Handle tap note input
   * @returns true if hit was successful, false otherwise
   */
  handleTap(lane: number, currentTime: number): boolean {
    return this.executeInputHandler(
      () => this.validator.findClosestActiveNote(this.notes, lane, 'TAP', currentTime),
      (note) => this.processor.processTapHit(note, currentTime),
      undefined,
      `TAP on lane ${lane}`
    );
  }

  /**
   * Handle hold note start (key press)
   * @returns true if press was successful, false otherwise
   */
  handleHoldStart(lane: number, currentTime: number): boolean {
    return this.executeInputHandler(
      () => this.validator.findPressableHoldNote(this.notes, lane, currentTime),
      (note) => this.processor.processHoldStart(note, currentTime),
      undefined,
      `HOLD_START on lane ${lane}`
    );
  }

  /**
   * Handle hold note end (key release)
   * @returns true if release was successful, false otherwise
   */
  handleHoldEnd(lane: number, currentTime: number): boolean {
    const note = this.validator.findActiveHoldNote(this.notes, lane, currentTime);
    if (!note || !note.pressHoldTime) {
      GameErrors.log(`GameEngineCore: No active HOLD to release on lane ${lane}`);
      return false;
    }

    const result = this.processor.processHoldEnd(note, currentTime);
    this.updateNote(note.id, result.updatedNote);
    this.releaseTimeMap.set(note.id, Math.round(currentTime));
    
    return result.success || false;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Common pattern for input handling: find → process → update
   * Reduces DRY violations across handleTap, handleHoldStart
   */
  private executeInputHandler(
    finder: InputHandler,
    processor: Processor,
    postProcessor?: PostProcessor,
    context?: string
  ): boolean {
    const note = finder();
    if (!note) {
      if (context) GameErrors.log(`GameEngineCore: No note found for ${context}`);
      return false;
    }

    const result = processor(note, this.getCurrentTime());
    this.updateNote(note.id, result.updatedNote);
    postProcessor?.(note, this.getCurrentTime());
    
    return result.success || false;
  }

  private updateNote(noteId: string, updatedNote: Note): void {
    const index = this.notes.findIndex(n => n.id === noteId);
    if (index !== -1) {
      this.notes[index] = updatedNote;
    }
  }

  // ==========================================================================
  // ADVANCED QUERIES - Delegated to GameEngineQueries
  // ==========================================================================

  getActiveNotes(): Note[] {
    return this.queries.getActiveNotes();
  }

  getCompletedNotes(): Note[] {
    return this.queries.getCompletedNotes();
  }

  getActiveNotesOnLane(lane: number): Note[] {
    return this.queries.getActiveNotesOnLane(lane);
  }

  isDead(): boolean {
    return this.queries.isDead();
  }
}
