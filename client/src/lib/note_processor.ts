import { Note, GameConfig, ScoreState } from './game_types';
import { NoteValidator } from './note_validator';
import { ScoringManager } from './scoring_manager';

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
          hitTime: Math.round(currentTime),
          pressTime: Math.round(currentTime),
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
      const scoreChange = this.scorer.recordMiss();
      return {
        updatedNote: {
          ...note,
          pressHoldTime: Math.round(currentTime),
          tooEarlyFailure: true,
          failureTime: Math.round(currentTime),
        },
        scoreChange,
        success: false,
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
        success: false,
      };
    }

    // Valid hold start
    return {
      updatedNote: {
        ...note,
        pressHoldTime: Math.round(currentTime),
      },
      success: true,
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
          releaseTime: Math.round(currentTime),
          pressReleaseTime: Math.round(currentTime),
        },
        scoreChange,
        success: true,
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
      success: false,
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
