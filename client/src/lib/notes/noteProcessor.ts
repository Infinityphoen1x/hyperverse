import { Note, GameConfig, ScoreState } from '../engine/gameTypes';
import { NoteValidator } from './noteValidator';
import { ScoringManager } from '../managers/scoringManager';

// ============================================================================
// NOTE PROCESSOR - Handles note hit detection and state updates
// ============================================================================

export type NoteUpdateResult = {
  updatedNote: Note;
  scoreChange?: ScoreState;
  shouldGameOver?: boolean;
  success?: boolean;
};

export class NoteProcessor {
  constructor(
    private config: GameConfig,
    private validator: NoteValidator,
    private scorer: ScoringManager
  ) {}

  private roundTime(time: number): number {
    return Math.round(time);
  }

  private createFailureUpdate(
    note: Note,
    currentTime: number,
    failureType: keyof Omit<Note, 'id' | 'type' | 'time' | 'lane' | 'duration' | 'hit' | 'missed'>
  ): NoteUpdateResult {
    const scoreChange = this.scorer.recordMiss();
    return {
      updatedNote: {
        ...note,
        [failureType]: true,
        failureTime: this.roundTime(currentTime),
      },
      scoreChange,
      success: false,
    };
  }

  private createSuccessUpdate(note: Note, currentTime: number, scoreChange: ScoreState): NoteUpdateResult {
    return {
      updatedNote: {
        ...note,
        hit: true,
        hitTime: this.roundTime(currentTime),
        pressReleaseTime: this.roundTime(currentTime),
      },
      scoreChange,
      success: true,
    };
  }

  processTapHit(note: Note, currentTime: number): NoteUpdateResult {
    const timeSinceNote = currentTime - note.time;

    // Too early
    if (timeSinceNote < -this.config.TAP_HIT_WINDOW) {
      return {
        updatedNote: {
          ...note,
          pressTime: this.roundTime(currentTime),
          tapTooEarlyFailure: true,
          failureTime: this.roundTime(currentTime),
        },
        scoreChange: this.scorer.recordMiss(),
        success: false,
      };
    }

    // Valid hit
    if (Math.abs(timeSinceNote) < this.config.TAP_HIT_WINDOW) {
      const scoreChange = this.scorer.recordHit(timeSinceNote);
      return {
        updatedNote: {
          ...note,
          hit: true,
          hitTime: this.roundTime(currentTime),
          pressTime: this.roundTime(currentTime),
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

    // Too early
    if (timeSinceNote < -this.config.HOLD_ACTIVATION_WINDOW) {
      return {
        updatedNote: {
          ...note,
          pressHoldTime: this.roundTime(currentTime),
          tooEarlyFailure: true,
          failureTime: this.roundTime(currentTime),
        },
        scoreChange: this.scorer.recordMiss(),
        success: false,
      };
    }

    // Too late
    if (timeSinceNote > this.config.HOLD_ACTIVATION_WINDOW) {
      return {
        updatedNote: {
          ...note,
          pressHoldTime: this.roundTime(currentTime),
          holdMissFailure: true,
          failureTime: this.roundTime(currentTime),
        },
        scoreChange: this.scorer.recordMiss(),
        success: false,
      };
    }

    // Valid hold start
    return {
      updatedNote: {
        ...note,
        pressHoldTime: this.roundTime(currentTime),
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
          releaseTime: this.roundTime(currentTime),
          holdReleaseFailure: true,
          failureTime: this.roundTime(currentTime),
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
          releaseTime: this.roundTime(currentTime),
          pressReleaseTime: this.roundTime(currentTime),
        },
        scoreChange,
        success: true,
      };
    }

    // Released too late
    return {
      updatedNote: {
        ...note,
        releaseTime: this.roundTime(currentTime),
        holdReleaseFailure: true,
        failureTime: this.roundTime(currentTime),
      },
      scoreChange: this.scorer.recordMiss(),
      success: false,
    };
  }

  private checkTapAutoFail(note: Note, currentTime: number): NoteUpdateResult | null {
    const autoFailThreshold = note.time + this.config.TAP_HIT_WINDOW + this.config.TAP_FAILURE_BUFFER;
    if (currentTime <= autoFailThreshold) return null;

    return {
      updatedNote: {
        ...note,
        tapMissFailure: true,
        failureTime: this.roundTime(currentTime),
      },
      scoreChange: this.scorer.recordMiss(),
      shouldGameOver: this.scorer.isDead(),
    };
  }

  private checkHoldAutoFail(note: Note, currentTime: number): NoteUpdateResult | null {
    // Never pressed
    if (!note.pressHoldTime && currentTime > note.time + this.config.HOLD_MISS_TIMEOUT) {
      return {
        updatedNote: {
          ...note,
          holdMissFailure: true,
          failureTime: this.roundTime(currentTime),
        },
        scoreChange: this.scorer.recordMiss(),
        shouldGameOver: this.scorer.isDead(),
      };
    }

    // Pressed but never released (timeout)
    if (note.pressHoldTime && note.pressHoldTime > 0 && !note.hit) {
      const noteHoldDuration = note.duration || 1000;
      const releaseFailThreshold = note.pressHoldTime + noteHoldDuration + this.config.HOLD_RELEASE_OFFSET;
      if (currentTime > releaseFailThreshold) {
        return {
          updatedNote: {
            ...note,
            holdReleaseFailure: true,
            failureTime: this.roundTime(currentTime),
          },
          scoreChange: this.scorer.recordMiss(),
          shouldGameOver: this.scorer.isDead(),
        };
      }
    }

    return null;
  }

  checkAutoFail(note: Note, currentTime: number): NoteUpdateResult | null {
    if (!this.validator.isNoteActive(note)) return null;

    if (note.type === 'TAP') {
      return this.checkTapAutoFail(note, currentTime);
    }

    if (note.type === 'SPIN_LEFT' || note.type === 'SPIN_RIGHT') {
      return this.checkHoldAutoFail(note, currentTime);
    }

    return null;
  }

  processNotesFrame(notes: Note[], currentTime: number): { updatedNotes: Note[]; shouldGameOver: boolean } {
    let shouldGameOver = false;
    const updatedNotes = notes.map(note => {
      // Auto-fail check
      const autoFailResult = this.checkAutoFail(note, currentTime);
      if (autoFailResult) {
        if (autoFailResult.shouldGameOver) {
          shouldGameOver = true;
        }
        return autoFailResult.updatedNote;
      }

      // Cleanup check
      if (this.validator.shouldCleanupNote(note, currentTime)) {
        return { ...note, missed: true };
      }

      return note;
    });

    return { updatedNotes, shouldGameOver };
  }
}
