import { Note } from './gameTypes';
import { NoteValidator } from '@/lib/notes/processors/noteValidator';
import { ScoringManager } from '@/lib/managers/scoringManager';

/**
 * Query utilities for GameEngineCore
 * Provides convenient query methods for the UI and debugging
 */
export class GameEngineQueries {
  constructor(
    private validator: NoteValidator,
    private scoringManager: ScoringManager,
    private notes: Note[]
  ) {}

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
