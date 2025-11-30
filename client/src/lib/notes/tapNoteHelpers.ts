import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import {
  JUDGEMENT_RADIUS,
  TAP_RENDER_WINDOW_MS,
  TAP_FALLTHROUGH_WINDOW_MS,
  TAP_HIT_HOLD_DURATION,
  GREYSCALE_FILL_COLOR,
  GREYSCALE_GLOW_COLOR,
} from '@/lib/utils/gameConstants';

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

export const shouldRenderTapNote = (state: TapNoteState, timeUntilHit: number): boolean => {
  if (timeUntilHit > TAP_RENDER_WINDOW_MS || timeUntilHit < -TAP_FALLTHROUGH_WINDOW_MS) return false;
  if (state.isHit && state.timeSinceHit >= TAP_HIT_HOLD_DURATION) return false;
  if (state.isTapTooEarlyFailure && state.timeSinceFail > 800) return false;
  if (state.isTapMissFailure && state.timeSinceFail > 1100) return false;
  return true;
};

export const trackTapNoteAnimation = (note: Note, state: TapNoteState, currentTime: number): void => {
  if (!state.isFailed) return;
  
  const failureType = state.isTapTooEarlyFailure ? 'tapTooEarlyFailure' : 'tapMissFailure';
  const animDuration = state.isTapTooEarlyFailure ? 800 : 1100;
  
  const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
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

export interface TapNoteGeometry {
  x1: number; y1: number;
  x2: number; y2: number;
  x3: number; y3: number;
  x4: number; y4: number;
  points: string;
}

export const calculateTapNoteGeometry = (
  progress: number,
  tapRayAngle: number,
  vpX: number,
  vpY: number,
  isSuccessfulHit: boolean = false,
  pressHoldTime: number = 0,
  currentTime: number = 0,
  isFailed: boolean = false,
  noteTime: number = 0
): TapNoteGeometry => {
  const MIN_DEPTH = 5;
  const MAX_DEPTH = 40;
  
  let effectiveProgress = progress;
  if ((isFailed || isSuccessfulHit) && Number.isFinite(noteTime) && Number.isFinite(currentTime)) {
    effectiveProgress = Math.max(0, 1 - ((noteTime - currentTime) / 2000));
  } else {
    effectiveProgress = Math.max(0, Math.min(1, progress));
  }
  
  const TRAPEZOID_DEPTH = MIN_DEPTH + (Math.min(effectiveProgress, 1) * (MAX_DEPTH - MIN_DEPTH));
  const nearDist = 1 + (effectiveProgress * (JUDGEMENT_RADIUS - 1));
  const farDist = Math.max(1, nearDist - TRAPEZOID_DEPTH);
  
  const tapLeftRayAngle = tapRayAngle - 8;
  const tapRightRayAngle = tapRayAngle + 8;
  const tapLeftRad = (tapLeftRayAngle * Math.PI) / 180;
  const tapRightRad = (tapRightRayAngle * Math.PI) / 180;
  
  const x1 = vpX + Math.cos(tapLeftRad) * farDist;
  const y1 = vpY + Math.sin(tapLeftRad) * farDist;
  const x2 = vpX + Math.cos(tapRightRad) * farDist;
  const y2 = vpY + Math.sin(tapRightRad) * farDist;
  const x3 = vpX + Math.cos(tapRightRad) * nearDist;
  const y3 = vpY + Math.sin(tapRightRad) * nearDist;
  const x4 = vpX + Math.cos(tapLeftRad) * nearDist;
  const y4 = vpY + Math.sin(tapLeftRad) * nearDist;
  
  return {
    x1, y1, x2, y2, x3, y3, x4, y4,
    points: `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`,
  };
};

export interface TapNoteStyle {
  opacity: number;
  fill: string;
  stroke: string;
  filter: string;
  hitFlashIntensity: number;
}

export const calculateTapNoteStyle = (
  progress: number,
  state: TapNoteState,
  noteColor: string,
  rawProgress: number = 0
): TapNoteStyle => {
  let opacity: number;
  let fill = noteColor;
  let stroke = 'rgba(255,255,255,0.8)';
  let filter = '';
  
  if (state.isTapTooEarlyFailure || state.isTapMissFailure) {
    opacity = 0.4 + (rawProgress * 0.6);
    const animDuration = state.isTapTooEarlyFailure ? 800 : 1100;
    const failProgress = Math.min(state.timeSinceFail / animDuration, 1.0);
    opacity = opacity * (1.0 - failProgress);
    fill = GREYSCALE_FILL_COLOR;
    stroke = 'rgba(120, 120, 120, 1)';
    filter = `drop-shadow(0 0 8px ${GREYSCALE_GLOW_COLOR}) grayscale(1)`;
  } else if (state.isHit) {
    if (state.timeSinceHit < 600) {
      opacity = 0.4 + (progress * 0.6);
    } else {
      const fadeProgress = (state.timeSinceHit - 600) / 100;
      opacity = Math.max(0.1, (1 - fadeProgress) * (0.4 + (progress * 0.6)));
    }
  } else {
    opacity = 0.4 + (progress * 0.6);
  }
  
  const hitFlashIntensity = state.isHit && state.timeSinceHit < 600 
    ? Math.max(0, 1 - (state.timeSinceHit / 600)) 
    : 0;
  
  if (state.isHit && hitFlashIntensity > 0) {
    filter = `drop-shadow(0 0 35px ${noteColor}) drop-shadow(0 0 20px ${noteColor}) drop-shadow(0 0 10px ${noteColor})`;
  }
  
  return { opacity: Math.max(opacity, 0), fill, stroke, filter, hitFlashIntensity };
};
