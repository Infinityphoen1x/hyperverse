import { Note, GameConfig, ScoreState } from './gameTypes';
import { TimingManager } from './timingManager';
import { ScoringManager } from './scoringManager';
import { NoteValidator } from './noteValidator';
import { NoteProcessor } from './noteProcessor';

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
  
  private notes: Note[];
  private releaseTimeMap: Map<string, number>;

  constructor(
    private config: GameConfig,
    initialNotes: Note[] = []
  ) {
    // Initialize all managers
    this.timingManager = new TimingManager();
    this.scoringManager = new ScoringManager(config);
    this.validator = new NoteValidator(config);
    this.processor = new NoteProcessor(config, this.validator, this.scoringManager);
    
    // Initialize state
    this.notes = [...initialNotes];
    this.releaseTimeMap = new Map();
  }

  // ==========================================================================
  // LIFECYCLE METHODS
  // ==========================================================================

  start(): void {
    this.timingManager.start();
    this.scoringManager.reset();
    this.releaseTimeMap.clear();
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
    return this.notes;
  }

  getReleaseTime(noteId: string): number | undefined {
    return this.releaseTimeMap.get(noteId);
  }

  getConfig(): GameConfig {
    return this.config;
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
    const note = this.validator.findClosestActiveNote(this.notes, lane, 'TAP', currentTime);
    if (!note) return false;

    const result = this.processor.processTapHit(note, currentTime);
    this.updateNote(note.id, result.updatedNote);
    
    return result.success || false;
  }

  /**
   * Handle hold note start (key press)
   * @returns true if press was successful, false otherwise
   */
  handleHoldStart(lane: number, currentTime: number): boolean {
    const note = this.validator.findPressableHoldNote(this.notes, lane, currentTime);
    if (!note) return false;

    const result = this.processor.processHoldStart(note, currentTime);
    this.updateNote(note.id, result.updatedNote);
    
    return result.success || false;
  }

  /**
   * Handle hold note end (key release)
   * @returns true if release was successful, false otherwise
   */
  handleHoldEnd(lane: number, currentTime: number): boolean {
    const note = this.validator.findActiveHoldNote(this.notes, lane, currentTime);
    if (!note || !note.pressHoldTime) return false;

    const result = this.processor.processHoldEnd(note, currentTime);
    this.updateNote(note.id, result.updatedNote);
    
    // Track release time for animations
    this.releaseTimeMap.set(note.id, Math.round(currentTime));
    
    return result.success || false;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private updateNote(noteId: string, updatedNote: Note): void {
    const index = this.notes.findIndex(n => n.id === noteId);
    if (index !== -1) {
      this.notes[index] = updatedNote;
    }
  }

  // ==========================================================================
  // ADVANCED QUERIES - For UI/debugging
  // ==========================================================================

  /**
   * Get all active notes (not yet completed)
   */
  getActiveNotes(): Note[] {
    return this.validator.getActiveNotes(this.notes);
  }

  /**
   * Get all completed notes (hit or failed)
   */
  getCompletedNotes(): Note[] {
    return this.validator.getCompletedNotes(this.notes);
  }

  /**
   * Get active notes on a specific lane
   */
  getActiveNotesOnLane(lane: number): Note[] {
    return this.validator.getActiveNotesOnLane(this.notes, lane);
  }

  /**
   * Check if player is dead (health depleted)
   */
  isDead(): boolean {
    return this.scoringManager.isDead();
  }
}
