import { Note, GameConfig } from '../engine/gameTypes';
import { ScoringManager } from '../managers/scoringManager';
import type { NoteUpdateResult } from './types';
import { roundTime } from './noteUpdateHelpers';

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
    shouldGameOver: scorer.isDead(),
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
      shouldGameOver: scorer.isDead(),
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
        shouldGameOver: scorer.isDead(),
      };
    }
  }

  return null;
};
