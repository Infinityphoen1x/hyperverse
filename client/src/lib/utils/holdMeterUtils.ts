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
  prevCompletion: boolean,
  setIsGlowing: (glowing: boolean) => void,
  glowTimeoutRef: { current: NodeJS.Timeout | null },
  DECK_METER_COMPLETION_GLOW_DURATION: number
): HoldProgressData => {
  try {
    if (!Array.isArray(notes) || !Number.isFinite(currentTime)) return { progress: 0, shouldGlow: false, prevCompletion };

    const activeNote = notes.find(n => isActiveHoldNote(n, lane));

    if (!activeNote) return { progress: 0, shouldGlow: false, prevCompletion };

    if (!activeNote.pressHoldTime || activeNote.pressHoldTime <= 0) return { progress: 0, shouldGlow: false, prevCompletion };

    const beatmapHoldDuration = (activeNote.duration && activeNote.duration > 0)
      ? activeNote.duration
      : DECK_METER_DEFAULT_HOLD_DURATION;

    const elapsedFromNoteTime = currentTime - activeNote.time;

    if (elapsedFromNoteTime < 0) return { progress: 0, shouldGlow: false, prevCompletion };

    let progress = Math.min(elapsedFromNoteTime / beatmapHoldDuration, 1.0);

    if (!Number.isFinite(progress) || progress < 0 || progress > 1) progress = 0;

    // Trigger glow
    const shouldGlow = progress >= DECK_METER_COMPLETION_THRESHOLD && !prevCompletion;
    if (shouldGlow) {
      setIsGlowing(true);
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
      glowTimeoutRef.current = setTimeout(() => setIsGlowing(false), DECK_METER_COMPLETION_GLOW_DURATION);
      return { progress, shouldGlow: true, prevCompletion: true };
    } else if (progress < DECK_METER_COMPLETION_THRESHOLD) {
      return { progress, shouldGlow: false, prevCompletion: false };
    }

    return { progress, shouldGlow: false, prevCompletion };
  } catch (error) {
    GameErrors.log(`DeckMeter getHoldProgress error for lane ${lane}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return { progress: 0, shouldGlow: false, prevCompletion };
  }
};