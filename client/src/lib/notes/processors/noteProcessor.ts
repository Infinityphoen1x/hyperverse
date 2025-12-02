import { Note, GameConfig, ScoreState } from '@/lib/engine/gameTypes';
import { NoteValidator } from './noteValidator';
import { ScoringManager } from '@/lib/managers/scoringManager';
import { roundTime } from './noteUpdateHelpers';
import { checkTapAutoFail, checkHoldAutoFail } from './noteAutoFailHelpers';
import { GameErrors } from '@/lib/errors/errorLog';
import { TAP_RENDER_WINDOW_MS, LEAD_TIME } from '@/lib/config/gameConstants';

export type NoteUpdateResult = {
  updatedNote: Note;
  scoreChange?: ScoreState;
  success: boolean;
};

// ============================================================================
// NOTE PROCESSOR - Orchestrates note hit detection and state updates
// ============================================================================

export class NoteProcessor {
  constructor(
    private config: GameConfig,
    private validator: NoteValidator,
    private scorer: ScoringManager
  ) {}

  processTapHit(note: Note, currentTime: number): NoteUpdateResult {
    const timeSinceNote = currentTime - note.time;

    // Too early - pressed too far before note appears (TAP_RENDER_WINDOW_MS before note.time)
    if (timeSinceNote < -TAP_RENDER_WINDOW_MS) {
      GameErrors.updateHitStats({ tapTooEarlyFailures: (GameErrors.hitStats.tapTooEarlyFailures || 0) + 1 });
      GameErrors.log(`[TAP-HIT] noteId=${note.id} tapTooEarlyFailure at ${currentTime}ms`, currentTime);
      return {
        updatedNote: {
          ...note,
          tapTooEarlyFailure: true,
          failureTime: roundTime(currentTime),
        },
        scoreChange: this.scorer.recordMiss(),
        success: false,
      };
    }

    // Valid hit - small window around note.time (TAP_HIT_WINDOW on both sides)
    if (timeSinceNote >= -this.config.TAP_HIT_WINDOW && timeSinceNote <= this.config.TAP_HIT_WINDOW) {
      const scoreChange = this.scorer.recordHit(timeSinceNote);
      GameErrors.updateHitStats({ successfulHits: (GameErrors.hitStats.successfulHits || 0) + 1 });
      GameErrors.log(`[TAP-HIT] noteId=${note.id} successfulHit at ${currentTime}ms (timing: ${timeSinceNote.toFixed(0)}ms)`, currentTime);
      return {
        updatedNote: {
          ...note,
          hit: true,
        },
        scoreChange,
        success: true,
      };
    }

    // Too late - handled by auto-miss logic
    return { updatedNote: note, success: false };
  }

  processHoldStart(note: Note, currentTime: number): NoteUpdateResult {
    const timeSinceNote = currentTime - note.time;

    // Too early - pressed too far before note appears (LEAD_TIME before note.time)
    if (timeSinceNote < -LEAD_TIME) {
      GameErrors.updateHitStats({ tooEarlyFailures: (GameErrors.hitStats.tooEarlyFailures || 0) + 1 });
      GameErrors.log(`[HOLD-HIT] noteId=${note.id} tooEarlyFailure at ${currentTime}ms`, currentTime);
      return {
        updatedNote: {
          ...note,
          pressHoldTime: roundTime(currentTime),
          tooEarlyFailure: true,
          failureTime: roundTime(currentTime),
        },
        scoreChange: this.scorer.recordMiss(),
        success: false,
      };
    }

    // Too late - pressed after note has passed (use leniency window)
    const lateThreshold = this.config.HOLD_ACTIVATION_WINDOW;
    if (timeSinceNote > lateThreshold) {
      GameErrors.updateHitStats({ holdMissFailures: (GameErrors.hitStats.holdMissFailures || 0) + 1 });
      GameErrors.log(`[HOLD-HIT] noteId=${note.id} holdMissFailure at ${currentTime}ms`, currentTime);
      return {
        updatedNote: {
          ...note,
          pressHoldTime: roundTime(currentTime),
          holdMissFailure: true,
          failureTime: roundTime(currentTime),
        },
        scoreChange: this.scorer.recordMiss(),
        success: false,
      };
    }

    // Valid hold start
    return {
      updatedNote: {
        ...note,
        pressHoldTime: roundTime(currentTime),
      },
      success: true,
    };
  }

  processHoldEnd(note: Note, currentTime: number): NoteUpdateResult {
    const holdDuration = note.duration || 1000;
    const expectedReleaseTime = note.time + holdDuration;
    const timeSinceExpectedRelease = currentTime - expectedReleaseTime;
    const totalHoldTime = currentTime - note.time;

    // Released too early
    if (totalHoldTime < holdDuration) {
      return {
        updatedNote: {
          ...note,
          releaseTime: roundTime(currentTime),
          holdReleaseFailure: true,
          failureTime: roundTime(currentTime),
        },
        scoreChange: this.scorer.recordMiss(),
        success: false,
      };
    }

    // Valid release
    if (Math.abs(timeSinceExpectedRelease) <= this.config.HOLD_RELEASE_WINDOW) {
      const scoreChange = this.scorer.recordHit(timeSinceExpectedRelease);
      return {
        updatedNote: {
          ...note,
          hit: true,
          releaseTime: roundTime(currentTime),
        },
        scoreChange,
        success: true,
      };
    }

    // Released too late
    return {
      updatedNote: {
        ...note,
        releaseTime: roundTime(currentTime),
        holdReleaseFailure: true,
        failureTime: roundTime(currentTime),
      },
      scoreChange: this.scorer.recordMiss(),
      success: false,
    };
  }

  checkAutoFail(note: Note, currentTime: number): NoteUpdateResult | null {
    if (!this.validator.isNoteActive(note)) return null;

    if (note.type === 'TAP') {
      return checkTapAutoFail(note, currentTime, this.config, this.scorer);
    }

    if (note.type === 'SPIN_LEFT' || note.type === 'SPIN_RIGHT' || note.type === 'HOLD') {
      return checkHoldAutoFail(note, currentTime, this.config, this.scorer);
    }

    return null;
  }

  processNotesFrame(notes: Note[], currentTime: number): { updatedNotes: Note[]; shouldGameOver: boolean; scoreState: ScoreState | null } {
    let shouldGameOver = false;
    let hasChanges = false;
    let scoreUpdated = false;

    const updatedNotes = notes.map(note => {
      // Auto-fail check
      const autoFailResult = this.checkAutoFail(note, currentTime);
      if (autoFailResult && !autoFailResult.success) {
        // shouldGameOver = true; // Don't force game over on single miss, rely on health
        hasChanges = true;
        scoreUpdated = true;
        return autoFailResult.updatedNote;
      }

      // Cleanup check
      if (this.validator.shouldCleanupNote(note, currentTime)) {
        hasChanges = true;
        return { ...note, missed: true }; // Mark as missed if cleaned up without hit
      }

      return note;
    });
    
    const scoreState = scoreUpdated ? this.scorer.getState() : null;
    if (this.scorer.isDead()) shouldGameOver = true;

    return { updatedNotes: hasChanges ? updatedNotes : notes, shouldGameOver, scoreState };
  }
}
