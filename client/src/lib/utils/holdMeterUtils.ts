// src/utils/holdMeterUtils.ts
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import {
  DECK_METER_COMPLETION_THRESHOLD,
  DECK_METER_DEFAULT_HOLD_DURATION,
  MAGIC_MS,
} from '@/lib/config';

// Helper: Check if a note is an active (pressed, not failed) hold note on a specific lane
export const isActiveHoldNote = (note: Note, lane: number): boolean => {
  return !!(
    note &&
    note.lane === lane &&
    note.type === 'HOLD' &&
    !note.hit &&
    !note.tooEarlyFailure &&
    !note.holdMissFailure &&
    !note.holdReleaseFailure &&
    note.pressHoldTime &&
    note.pressHoldTime > 0
  );
};

export interface HoldProgressData {
  progress: number;
  shouldGlow: boolean;
  prevCompletion: boolean;
}

export const getHoldProgress = (
  notes: Note[],
  currentTime: number,
  lane: number,
  DECK_METER_COMPLETION_THRESHOLD: number,
  DECK_METER_DEFAULT_HOLD_DURATION: number,
  playerSpeed: number = 20
): number => {
  try {
    if (!Array.isArray(notes) || !Number.isFinite(currentTime)) return 0;

    const activeNote = notes.find(n => isActiveHoldNote(n, lane));

    if (!activeNote) return 0;

    if (!activeNote.pressHoldTime || activeNote.pressHoldTime <= 0) return 0;

    const beatmapHoldDuration = (activeNote.duration && activeNote.duration > 0)
      ? activeNote.duration
      : DECK_METER_DEFAULT_HOLD_DURATION;

    // CRITICAL: Calculate progress based on the note's actual hold duration
    // The meter should fill from note.time to expectedReleaseTime (note.time + duration)
    // This ensures consistent meter fill rate regardless of when player pressed within hit window
    const expectedReleaseTime = activeNote.time + beatmapHoldDuration;
    const timeElapsedSinceNoteTime = currentTime - activeNote.time;
    
    // Progress is based on time since note.time (not pressHoldTime)
    // This way, pressing early/late within hit window doesn't affect meter fill rate
    let progress = Math.min(timeElapsedSinceNoteTime / beatmapHoldDuration, 1.0);

    if (!Number.isFinite(progress) || progress < 0 || progress > 1) progress = 0;

    return progress;
  } catch (error) {
    GameErrors.log(`DeckMeter getHoldProgress error for lane ${lane}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return 0;
  }
};