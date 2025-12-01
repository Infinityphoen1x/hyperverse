import { Note, ScoreState } from '@/lib/engine/gameTypes';

export type NoteUpdateResult = {
  updatedNote: Note;
  scoreChange?: ScoreState;
  success: boolean;
};

export const roundTime = (time: number): number => Math.round(time);

export const createFailureUpdate = (
  note: Note,
  currentTime: number,
  failureType: keyof Omit<Note, 'id' | 'type' | 'time' | 'lane' | 'duration' | 'hit' | 'missed'>,
  scoreChange: ScoreState
): NoteUpdateResult => ({
  updatedNote: {
    ...note,
    [failureType]: true,
    failureTime: roundTime(currentTime),
  },
  scoreChange,
  success: false,
});

export const createSuccessUpdate = (
  note: Note,
  currentTime: number,
  scoreChange: ScoreState
): NoteUpdateResult => ({
  updatedNote: {
    ...note,
    hit: true,
  },
  scoreChange,
  success: true,
});

export const createTapHitUpdate = (
  note: Note,
  currentTime: number,
  scoreChange: ScoreState,
  isTooEarly: boolean
): NoteUpdateResult => ({
  updatedNote: {
    ...note,
    hit: !isTooEarly,
    tapTooEarlyFailure: isTooEarly,
    failureTime: isTooEarly ? roundTime(currentTime) : undefined,
  },
  scoreChange,
  success: !isTooEarly,
});

export const createHoldStartUpdate = (
  note: Note,
  currentTime: number,
  scoreChange: ScoreState | undefined,
  failureType?: 'tooEarlyFailure' | 'holdMissFailure'
): NoteUpdateResult => ({
  updatedNote: {
    ...note,
    pressHoldTime: roundTime(currentTime),
    ...(failureType && { [failureType]: true, failureTime: roundTime(currentTime) }),
  },
  scoreChange,
  success: !failureType,
});

export const createHoldEndUpdate = (
  note: Note,
  currentTime: number,
  scoreChange: ScoreState,
  isValid: boolean
): NoteUpdateResult => ({
  updatedNote: {
    ...note,
    releaseTime: roundTime(currentTime),
    hit: isValid,
    holdReleaseFailure: !isValid,
    failureTime: isValid ? undefined : roundTime(currentTime),
  },
  scoreChange,
  success: isValid,
});
