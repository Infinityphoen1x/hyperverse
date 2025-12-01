import { Note, GameConfig, NoteType } from '@/lib/engine/gameTypes';

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

  findPressableHoldNote(notes: Note[], lane: number, currentTime: number): Note | null {
    return notes.find(n => 
      n.lane === lane &&
      (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') &&
      this.isNoteActive(n) &&
      currentTime >= n.time - this.config.HOLD_ACTIVATION_WINDOW &&
      currentTime <= n.time + this.config.HOLD_ACTIVATION_WINDOW
    ) || null;
  }

  findActiveHoldNote(notes: Note[], lane: number, currentTime: number): Note | null {
    return notes.find(n => 
      n.lane === lane &&
      (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') &&
      n.pressHoldTime !== undefined &&
      n.pressHoldTime > 0 &&
      this.isNoteActive(n) &&
      currentTime - n.time >= -this.config.LEAD_TIME
    ) || null;
  }

  getActiveNotes(notes: Note[]): Note[] {
    return notes.filter(n => this.isNoteActive(n));
  }

  getCompletedNotes(notes: Note[]): Note[] {
    return notes.filter(n => n.hit || this.isNoteFailed(n));
  }

  getActiveNotesOnLane(notes: Note[], lane: number): Note[] {
    return notes.filter(n => n.lane === lane && this.isNoteActive(n));
  }

  /**
   * Get notes that are visible within the current time window
   * @param notes All notes
   * @param currentTime Current playback time in ms
   * @returns Notes that should be visible on screen
   */
  getVisibleNotes(notes: Note[], currentTime: number): Note[] {
    const leadTime = this.config.LEAD_TIME;
    return notes.filter(n => 
      this.isNoteActive(n) &&
      n.time >= currentTime - leadTime &&
      n.time <= currentTime + 1000 // Show notes up to 1 second ahead
    );
  }

  /**
   * Update note timings after time jump (e.g., on resume)
   * This ensures notes are in correct state relative to new current time
   * @param notes All notes
   * @param currentTime New current time in ms
   * @returns Notes updated for new time context (clears temporary state if needed)
   */
  updateNoteTimes(notes: Note[], currentTime: number): Note[] {
    return notes.map(n => {
      // If note was marked as too early relative to old time,
      // but is now within valid window at new time, reset early flag
      if (n.tooEarlyFailure && currentTime >= n.time - this.config.HOLD_ACTIVATION_WINDOW) {
        return { ...n, tooEarlyFailure: false };
      }
      return n;
    });
  }
}
