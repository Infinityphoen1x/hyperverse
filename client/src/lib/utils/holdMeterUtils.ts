// src/utils/holdMeterUtils.ts
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import {
  DECK_METER_COMPLETION_THRESHOLD,
  DECK_METER_DEFAULT_HOLD_DURATION,
} from '@/lib/config/gameConstants';

// Helper: Check if a note is an active (pressed, not failed) hold note on a specific lane
export const isActiveHoldNote = (note: Note, lane: number): boolean => {
  return !!(
    note &&
    note.lane === lane &&
    (note.type === 'SPIN_LEFT' || note.type === 'SPIN_RIGHT') &&
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
  DECK_METER_DEFAULT_HOLD_DURATION: number
): number => {
  try {
    if (!Array.isArray(notes) || !Number.isFinite(currentTime)) return 0;

    const activeNote = notes.find(n => isActiveHoldNote(n, lane));

    if (!activeNote) return 0;

    if (!activeNote.pressHoldTime || activeNote.pressHoldTime <= 0) return 0;

    const beatmapHoldDuration = (activeNote.duration && activeNote.duration > 0)
      ? activeNote.duration
      : DECK_METER_DEFAULT_HOLD_DURATION;

    const elapsedFromNoteTime = currentTime - activeNote.time;

    if (elapsedFromNoteTime < 0) return 0;

    let progress = Math.min(elapsedFromNoteTime / beatmapHoldDuration, 1.0);

    if (!Number.isFinite(progress) || progress < 0 || progress > 1) progress = 0;

    return progress;
  } catch (error) {
    GameErrors.log(`DeckMeter getHoldProgress error for lane ${lane}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return 0;
  }
};