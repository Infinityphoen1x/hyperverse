import { Note, GameConfig, NoteType } from './engine/gameTypes';

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
}
