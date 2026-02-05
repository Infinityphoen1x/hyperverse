import { Note, GameConfig, NoteType } from '@/lib/engine/gameTypes';
import { TAP_RENDER_WINDOW_MS, LEAD_TIME } from '@/lib/config';

// ============================================================================
// NOTE VALIDATOR - Pure functions for note state validation
// ============================================================================

export class NoteValidator {
  constructor(private config: GameConfig) {
    // Note: LEAD_TIME is now fixed regardless of BPM
    // Note speed multiplier handles visual rendering speed only
  }

  /**
   * Gap-based early detection window calculation
   * Prevents overlapping detection windows by limiting early detection to the gap since the previous note
   * @param notes All notes in the beatmap
   * @param lane The position to check (parameter name 'lane' for compatibility)
   * @param targetNote The note to calculate detection window for
   * @param effectiveLeadTime The render lead time (MAGIC_MS / playerSpeed)
   * @returns Early detection window in milliseconds
   */
  getEarlyDetectionWindow(
    notes: Note[],
    lane: number, // Position value (-2 to 3)
    targetNote: Note,
    effectiveLeadTime: number
  ): number {
    // Find previous note on this position
    const prevNotes = notes.filter(n => n.lane === lane && n.time < targetNote.time); // DEPRECATED: note.lane field
    if (prevNotes.length === 0) {
      return effectiveLeadTime; // First note: use full render window
    }

    const prevNote = prevNotes.reduce((latest, n) => 
      n.time > latest.time ? n : latest
    );
    
    const prevEnd = prevNote.type === 'HOLD' 
      ? prevNote.time + (prevNote.duration ?? 0) 
      : prevNote.time;
    
    const gap = Math.max(0, targetNote.time - prevEnd);
    
    // Use minimum: can't detect before visible OR before previous note ends
    return Math.min(gap, effectiveLeadTime);
  }

  /**
   * Dynamic judgment window calculation
   * Scales early windows with detection window for density-adaptive difficulty
   * Late windows stay fixed based on human reaction time
   * @param earlyDetectionMs The early detection window for this note
   * @returns Judgment windows for PERFECT, GOOD, OK, and TOO_EARLY/MISS
   */
  getJudgmentWindows(earlyDetectionMs: number) {
    const PERFECT_EARLY = Math.max(
      this.config.MIN_PERFECT_EARLY, 
      earlyDetectionMs * this.config.PERFECT_EARLY_SCALE
    );
    const GOOD_EARLY = Math.max(
      this.config.MIN_GOOD_EARLY, 
      earlyDetectionMs * this.config.GOOD_EARLY_SCALE
    );
    const OK_EARLY = Math.max(
      this.config.MIN_OK_EARLY, 
      earlyDetectionMs * this.config.OK_EARLY_SCALE
    );

    return {
      PERFECT: { early: PERFECT_EARLY, late: this.config.PERFECT_LATE },
      GOOD: { early: GOOD_EARLY, late: this.config.GOOD_LATE },
      OK: { early: OK_EARLY, late: this.config.OK_LATE },
      TOO_EARLY: earlyDetectionMs,  // Everything before OK.early
      MISS: this.config.LATE_MISS_BUFFER  // Everything after OK.late
    };
  }

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
    
    if (note.type === 'HOLD' && 
        note.holdMissFailure && note.failureTime) {
      return currentTime > note.failureTime + CLEANUP_DELAY;
    }
    
    return false;
  }

  findPressableTapNote(notes: Note[], lane: number, currentTime: number, effectiveLeadTime: number): Note | null { // lane: Position value
    // Find all TAP notes on this position that are within their dynamic detection window
    const candidates = notes.filter(n => {
      if (n.lane !== lane || n.type !== 'TAP' || !this.isNoteActive(n)) { // DEPRECATED: note.lane field
        return false;
      }
      
      // Calculate dynamic detection window for this note
      const earlyDetection = this.getEarlyDetectionWindow(notes, lane, n, effectiveLeadTime);
      const windows = this.getJudgmentWindows(earlyDetection);
      
      // Check if current time is within detection window
      const detectionStart = n.time - earlyDetection;
      const detectionEnd = n.time + windows.MISS;
      
      return currentTime >= detectionStart && currentTime <= detectionEnd;
    });
    
    // If multiple notes are pressable, return the closest one
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    
    return candidates.reduce((prev, curr) => 
      Math.abs(curr.time - currentTime) < Math.abs(prev.time - currentTime) ? curr : prev
    );
  }

  findClosestActiveNote(notes: Note[], lane: number, type: NoteType, currentTime: number): Note | null { // lane: Position value
    const candidates = notes.filter(n => 
      n.lane === lane && // DEPRECATED: note.lane field
      n.type === type && 
      this.isNoteActive(n) &&
      Number.isFinite(n.time)
    );

    if (candidates.length === 0) return null;

    return candidates.reduce((prev, curr) => 
      Math.abs(curr.time - currentTime) < Math.abs(prev.time - currentTime) ? curr : prev
    );
  }

  findPressableHoldNote(notes: Note[], lane: number, currentTime: number, effectiveLeadTime: number): Note | null { // lane: Position value
    // Find all HOLD notes on this position that are within their dynamic detection window
    const candidates = notes.filter(n => {
      if (n.lane !== lane || n.type !== 'HOLD' || !this.isNoteActive(n)) { // DEPRECATED: note.lane field
        return false;
      }
      
      // Calculate dynamic detection window for this note
      const earlyDetection = this.getEarlyDetectionWindow(notes, lane, n, effectiveLeadTime);
      const windows = this.getJudgmentWindows(earlyDetection);
      
      // Check if current time is within detection window
      const detectionStart = n.time - earlyDetection;
      const detectionEnd = n.time + windows.MISS;
      
      return currentTime >= detectionStart && currentTime <= detectionEnd;
    });
    
    // If multiple notes are pressable, return the closest one
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    
    return candidates.reduce((prev, curr) => 
      Math.abs(curr.time - currentTime) < Math.abs(prev.time - currentTime) ? curr : prev
    );
  }

  findActiveHoldNote(notes: Note[], lane: number, currentTime: number): Note | null { // lane: Position value
    return notes.find(n => 
      n.lane === lane && // DEPRECATED: note.lane field
      n.type === 'HOLD' &&
      n.pressHoldTime !== undefined &&
      n.pressHoldTime > 0 &&
      this.isNoteActive(n) &&
      currentTime - n.time >= -LEAD_TIME
    ) || null;
  }

  getActiveNotes(notes: Note[]): Note[] {
    return notes.filter(n => this.isNoteActive(n));
  }

  getCompletedNotes(notes: Note[]): Note[] {
    return notes.filter(n => n.hit || this.isNoteFailed(n));
  }

  getActiveNotesOnLane(notes: Note[], lane: number): Note[] { // Legacy name, lane: Position value
    return notes.filter(n => n.lane === lane && this.isNoteActive(n)); // DEPRECATED: note.lane field
  }

  /**
   * Get notes that are visible within the current time window
   * @param notes All notes
   * @param currentTime Current playback time in ms
   * @returns Notes that should be visible on screen
   */
  getVisibleNotes(notes: Note[], currentTime: number): Note[] {
    return notes.filter(n => 
      this.isNoteActive(n) &&
      n.time >= currentTime - LEAD_TIME &&
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
      if (n.tooEarlyFailure && currentTime >= n.time - LEAD_TIME) {
        return { ...n, tooEarlyFailure: false };
      }
      // Same for TAP notes
      if (n.tapTooEarlyFailure && currentTime >= n.time - TAP_RENDER_WINDOW_MS) {
        return { ...n, tapTooEarlyFailure: false };
      }
      return n;
    });
  }
}
