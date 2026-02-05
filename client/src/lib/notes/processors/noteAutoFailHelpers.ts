import { Note, GameConfig } from '@/lib/engine/gameTypes';
import { ScoringManager } from '@/lib/managers/scoringManager';
import { NoteValidator } from './noteValidator';
import { roundTime } from './noteUpdateHelpers';
import { GameErrors } from '@/lib/errors/errorLog';
import type { NoteUpdateResult } from './noteUpdateHelpers';

export const checkTapAutoFail = (
  note: Note,
  allNotes: Note[],
  currentTime: number,
  effectiveLeadTime: number,
  config: GameConfig,
  validator: NoteValidator,
  scorer: ScoringManager
): NoteUpdateResult | null => {
  // Calculate dynamic detection window for this note
  const earlyDetection = validator.getEarlyDetectionWindow(allNotes, note.lane, note, effectiveLeadTime);
  const windows = validator.getJudgmentWindows(earlyDetection);
  
  // Trigger miss after OK.late + LATE_MISS_BUFFER window expires
  const autoFailThreshold = note.time + windows.OK.late + windows.MISS;
  if (currentTime <= autoFailThreshold) return null;

  GameErrors.updateHitStats({ tapMissFailures: (GameErrors.hitStats.tapMissFailures || 0) + 1 });
  GameErrors.log(`[TAP-MISS] noteId=${note.id} tapMissFailure at ${currentTime}ms`, currentTime);
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
  allNotes: Note[],
  currentTime: number,
  effectiveLeadTime: number,
  config: GameConfig,
  validator: NoteValidator,
  scorer: ScoringManager
): NoteUpdateResult | null => {
  // Calculate dynamic detection window for this note
  const earlyDetection = validator.getEarlyDetectionWindow(allNotes, note.lane, note, effectiveLeadTime);
  const windows = validator.getJudgmentWindows(earlyDetection);
  
  // Never pressed - use dynamic miss window
  const missThreshold = note.time + windows.OK.late + windows.MISS;
  if (!note.pressHoldTime && currentTime > missThreshold) {
    GameErrors.updateHitStats({ holdMissFailures: (GameErrors.hitStats.holdMissFailures || 0) + 1 });
    GameErrors.log(`[HOLD-MISS] noteId=${note.id} holdMissFailure at ${currentTime}ms (never pressed)`, currentTime);
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
    // Apply offset to late side for auto-fail threshold
    const releaseFailThreshold = note.pressHoldTime + noteHoldDuration + config.HOLD_RELEASE_WINDOW + config.HOLD_RELEASE_OFFSET;
    if (currentTime > releaseFailThreshold) {
      GameErrors.updateHitStats({ holdReleaseFailures: (GameErrors.hitStats.holdReleaseFailures || 0) + 1 });
      GameErrors.log(`[HOLD-RELEASE] noteId=${note.id} holdReleaseFailure at ${currentTime}ms`, currentTime);
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
