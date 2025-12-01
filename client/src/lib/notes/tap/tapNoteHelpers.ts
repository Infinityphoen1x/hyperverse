import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { TAP_FAILURE_ANIMATIONS, TAP_RENDER_WINDOW_MS, TAP_FALLTHROUGH_WINDOW_MS, TAP_HIT_HOLD_DURATION } from '@/lib/config/gameConstants';

export interface TapNoteState {
  isHit: boolean;
  isFailed: boolean;
  isTapTooEarlyFailure: boolean;
  isTapMissFailure: boolean;
  failureTime: number | undefined;
  hitTime: number | undefined;
  timeSinceFail: number;
  timeSinceHit: number;
}

export const getTapNoteState = (note: Note, currentTime: number): TapNoteState => {
  const isHit = note.hit || false;
  const isTapTooEarlyFailure = note.tapTooEarlyFailure || false;
  const isTapMissFailure = note.tapMissFailure || false;
  const isFailed = isTapTooEarlyFailure || isTapMissFailure;
  const failureTime = note.failureTime;
  const hitTime = isHit ? currentTime : undefined;
  
  const timeSinceFail = failureTime ? Math.max(0, currentTime - failureTime) : 0;
  const timeSinceHit = isHit && hitTime ? Math.max(0, currentTime - hitTime) : 0;
  
  return { isHit, isFailed, isTapTooEarlyFailure, isTapMissFailure, failureTime, hitTime, timeSinceFail, timeSinceHit };
};

const getFailureAnimationDuration = (isTooEarly: boolean): number =>
  isTooEarly ? TAP_FAILURE_ANIMATIONS.TOO_EARLY.duration : TAP_FAILURE_ANIMATIONS.MISS.duration;

export const shouldRenderTapNote = (state: TapNoteState, timeUntilHit: number): boolean => {
  // Don't render if note is too far away or has passed fallthrough window
  if (timeUntilHit > TAP_RENDER_WINDOW_MS || timeUntilHit < -TAP_FALLTHROUGH_WINDOW_MS) return false;
  
  // Hide successful hits after hold duration expires
  if (state.isHit && state.timeSinceHit >= TAP_HIT_HOLD_DURATION) return false;
  
  // For failed notes, respect the failure animation duration
  // But also ensure the note stays visible while it's still in the natural render window
  // (e.g., a note tapped too early at -2000ms should not disappear until it naturally passes the hit line)
  if (state.isFailed) {
    const failureAnimDuration = state.isTapTooEarlyFailure 
      ? TAP_FAILURE_ANIMATIONS.TOO_EARLY.duration 
      : TAP_FAILURE_ANIMATIONS.MISS.duration;
    
    // Only hide after animation completes if the note has already passed its natural window
    if (state.timeSinceFail > failureAnimDuration && timeUntilHit < -TAP_FALLTHROUGH_WINDOW_MS) {
      return false;
    }
  }
  
  return true;
};

export const trackTapNoteAnimation = (note: Note, state: TapNoteState, currentTime: number): void => {
  if (!state.isFailed) return;
  
  const failureType = state.isTapTooEarlyFailure ? 'tapTooEarlyFailure' : 'tapMissFailure';
  const animDuration = getFailureAnimationDuration(state.isTapTooEarlyFailure);
  
  const animEntry = GameErrors.animations.find((a: any) => a.noteId === note.id && a.type === failureType);
  if (!animEntry) {
    GameErrors.trackAnimation(note.id, failureType, state.failureTime || currentTime);
  } else if (!animEntry.completed && state.timeSinceFail >= animDuration) {
    GameErrors.updateAnimation(note.id, { completed: true });
  }
};

export { calculateTapNoteGeometry, type TapNoteGeometry } from '../../geometry/tapNoteGeometry';
export { calculateTapNoteStyle, type TapNoteStyle, determineTapGreyscaleState, calculateTapNoteColors, type TapNoteColors, type TapGreyscaleState } from './tapNoteStyle';
