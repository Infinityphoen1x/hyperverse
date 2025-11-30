import { Note, GameConfig } from '@/lib/engine/gameTypes';
import { ScoringManager } from '@/lib/managers/scoringManager';
import { roundTime } from './noteUpdateHelpers';
import type { NoteUpdateResult } from './noteUpdateHelpers';

export const checkTapAutoFail = (
  note: Note,
  currentTime: number,
  config: GameConfig,
  scorer: ScoringManager
): NoteUpdateResult | null => {
  const autoFailThreshold = note.time + config.TAP_HIT_WINDOW + config.TAP_FAILURE_BUFFER;
  if (currentTime <= autoFailThreshold) return null;

  return {
    updatedNote: {
      ...note,
      tapMissFailure: true,
      failureTime: roundTime(currentTime),
    },
    scoreChange: scorer.recordMiss(),
    success: false,
  };
};

export const checkHoldAutoFail = (
  note: Note,
  currentTime: number,
  config: GameConfig,
  scorer: ScoringManager
): NoteUpdateResult | null => {
  // Never pressed
  if (!note.pressHoldTime && currentTime > note.time + config.HOLD_MISS_TIMEOUT) {
    return {
      updatedNote: {
        ...note,
        holdMissFailure: true,
        failureTime: roundTime(currentTime),
      },
      scoreChange: scorer.recordMiss(),
      success: false,
    };
  }

  // Pressed but never released (timeout)
  if (note.pressHoldTime && note.pressHoldTime > 0 && !note.hit) {
    const noteHoldDuration = note.duration || 1000;
    const releaseFailThreshold = note.pressHoldTime + noteHoldDuration + config.HOLD_RELEASE_OFFSET;
    if (currentTime > releaseFailThreshold) {
      return {
        updatedNote: {
          ...note,
          holdReleaseFailure: true,
          failureTime: roundTime(currentTime),
        },
        scoreChange: scorer.recordMiss(),
        success: false,
      };
    }
  }

  return null;
};
