import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { TAP_RENDER_WINDOW_MS, TAP_FALLTHROUGH_WINDOW_MS, TAP_HIT_HOLD_DURATION, TAP_FAILURE_ANIMATIONS } from '../config/constants';

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
  const hitTime = note.hitTime;
  
  const timeSinceFail = failureTime ? Math.max(0, currentTime - failureTime) : 0;
  const timeSinceHit = isHit && hitTime ? Math.max(0, currentTime - hitTime) : 0;
  
  return { isHit, isFailed, isTapTooEarlyFailure, isTapMissFailure, failureTime, hitTime, timeSinceFail, timeSinceHit };
};

const getFailureAnimationDuration = (isTooEarly: boolean): number =>
  isTooEarly ? TAP_FAILURE_ANIMATIONS.TOO_EARLY.duration : TAP_FAILURE_ANIMATIONS.MISS.duration;

export const shouldRenderTapNote = (state: TapNoteState, timeUntilHit: number): boolean => {
  if (timeUntilHit > TAP_RENDER_WINDOW_MS || timeUntilHit < -TAP_FALLTHROUGH_WINDOW_MS) return false;
  if (state.isHit && state.timeSinceHit >= TAP_HIT_HOLD_DURATION) return false;
  
  const failureAnimDuration = state.isTapTooEarlyFailure 
    ? TAP_FAILURE_ANIMATIONS.TOO_EARLY.duration 
    : TAP_FAILURE_ANIMATIONS.MISS.duration;
  
  if (state.isFailed && state.timeSinceFail > failureAnimDuration) return false;
  return true;
};

export const trackTapNoteAnimation = (note: Note, state: TapNoteState, currentTime: number): void => {
  if (!state.isFailed) return;
  
  const failureType = state.isTapTooEarlyFailure ? 'tapTooEarlyFailure' : 'tapMissFailure';
  const animDuration = getFailureAnimationDuration(state.isTapTooEarlyFailure);
  
  const animEntry = GameErrors.animations.find((a: any) => a.noteId === note.id && a.type === failureType);
  if (!animEntry) {
    GameErrors.trackAnimation(note.id, failureType, state.failureTime || currentTime);
  } else if (animEntry.status === 'pending') {
    if (state.timeSinceFail >= animDuration) {
      GameErrors.updateAnimation(note.id, { status: 'completed', renderStart: currentTime, renderEnd: currentTime });
    } else {
      GameErrors.updateAnimation(note.id, { status: 'rendering', renderStart: currentTime });
    }
  } else if (animEntry.status === 'rendering' && state.timeSinceFail >= animDuration) {
    GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
  }
};

export { calculateTapNoteGeometry, type TapNoteGeometry } from '../geometry/tapNoteGeometry';
export { calculateTapNoteStyle, type TapNoteStyle } from './tap/tapNoteStyle';
