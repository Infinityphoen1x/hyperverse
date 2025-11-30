import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import {
  HOLD_NOTE_STRIP_WIDTH_MULTIPLIER,
  LEAD_TIME,
  JUDGEMENT_RADIUS,
  HOLD_ANIMATION_DURATION,
  GREYSCALE_FILL_COLOR,
  GREYSCALE_GLOW_COLOR,
  COLOR_DECK_LEFT,
  COLOR_DECK_RIGHT,
} from '@/lib/utils/gameConstants';

export interface HoldNoteFailureStates {
  isTooEarlyFailure: boolean;
  isHoldReleaseFailure: boolean;
  isHoldMissFailure: boolean;
  hasAnyFailure: boolean;
}

export const getHoldNoteFailureStates = (note: Note): HoldNoteFailureStates => {
  const isTooEarlyFailure = note.tooEarlyFailure || false;
  const isHoldReleaseFailure = note.holdReleaseFailure || false;
  const isHoldMissFailure = note.holdMissFailure || false;
  
  return {
    isTooEarlyFailure,
    isHoldReleaseFailure,
    isHoldMissFailure,
    hasAnyFailure: isTooEarlyFailure || isHoldReleaseFailure || isHoldMissFailure,
  };
};

export const markAnimationCompletedIfDone = (
  note: Note,
  failures: HoldNoteFailureStates,
  timeSinceFail: number,
  currentTime: number
): void => {
  if (timeSinceFail > HOLD_ANIMATION_DURATION) {
    const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
    if (failures.isTooEarlyFailure) failureTypes.push('tooEarlyFailure');
    if (failures.isHoldReleaseFailure) failureTypes.push('holdReleaseFailure');
    if (failures.isHoldMissFailure) failureTypes.push('holdMissFailure');
    
    for (const failureType of failureTypes) {
      const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
      if (animEntry && animEntry.status !== 'completed') {
        GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
      }
    }
  }
};

export interface ApproachGeometry {
  nearDistance: number;
  farDistance: number;
}

export const calculateApproachGeometry = (
  timeUntilHit: number,
  pressHoldTime: number,
  isTooEarlyFailure: boolean,
  holdDuration: number
): ApproachGeometry => {
  const stripWidth = (holdDuration || 1000) * HOLD_NOTE_STRIP_WIDTH_MULTIPLIER;
  
  const rawApproachProgress = (LEAD_TIME - timeUntilHit) / LEAD_TIME;
  const isSuccessfulPress = pressHoldTime > 0 && !isTooEarlyFailure;
  const approachProgress = isSuccessfulPress ? Math.min(rawApproachProgress, 1.0) : rawApproachProgress;
  
  const nearDistance = Math.max(1, 1 + (approachProgress * (JUDGEMENT_RADIUS - 1)));
  const farDistance = Math.max(1, nearDistance - stripWidth);
  
  return { nearDistance, farDistance };
};

export interface CollapseGeometry {
  nearDistance: number;
  farDistance: number;
  collapseProgress: number;
}

export const calculateCollapseGeometry = (
  pressHoldTime: number,
  collapseDuration: number,
  currentTime: number,
  lockedNearDistance: number,
  farDistanceAtPress: number,
  approachNearDistance: number,
  approachFarDistance: number,
  isSuccessfulHit: boolean = false
): CollapseGeometry => {
  if (!pressHoldTime || pressHoldTime === 0) {
    if (!isSuccessfulHit) {
      return { nearDistance: approachNearDistance, farDistance: approachFarDistance, collapseProgress: 0 };
    }
    pressHoldTime = currentTime;
  }
  
  const timeSincePress = currentTime - pressHoldTime;
  const collapseProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
  
  const nearDistance = lockedNearDistance;
  const farDistance = farDistanceAtPress * (1 - collapseProgress) + lockedNearDistance * collapseProgress;
  
  return { nearDistance, farDistance, collapseProgress };
};

export const calculateLockedNearDistance = (
  note: Note,
  pressHoldTime: number,
  isTooEarlyFailure: boolean,
  approachNearDistance: number,
  failureTime: number | null
): number | null => {
  if (note.hit) return JUDGEMENT_RADIUS;
  if (!pressHoldTime || pressHoldTime === 0) return null;
  if (isTooEarlyFailure) return null;
  
  if (note.holdReleaseFailure) {
    if (!failureTime) return null;
    const timeUntilHitAtFailure = note.time - failureTime;
    const approachProgressAtFailure = Math.max((LEAD_TIME - timeUntilHitAtFailure) / LEAD_TIME, 0);
    return Math.max(1, 1 + (approachProgressAtFailure * (JUDGEMENT_RADIUS - 1)));
  }
  
  return approachNearDistance;
};

export interface GlowCalculation {
  glowScale: number;
  collapseGlow: number;
  finalGlowScale: number;
}

export const calculateHoldNoteGlow = (
  pressHoldTime: number,
  currentTime: number,
  collapseDuration: number,
  approachProgress: number,
  note: Note
): GlowCalculation => {
  const hasActivePress = pressHoldTime > 0 || note.hit;
  
  const glowScale = hasActivePress ? 0.2 + (Math.min(approachProgress, 1.0) * 0.8) : 0.05;
  
  let collapseGlow = 0;
  if (pressHoldTime && pressHoldTime > 0) {
    const timeSincePress = currentTime - pressHoldTime;
    const collapseGlowProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
    collapseGlow = collapseGlowProgress > 0 ? (1 - collapseGlowProgress) * 0.8 : 0;
  }
  
  const finalGlowScale = hasActivePress ? Math.max(glowScale - collapseGlow, 0.1) : 0.05;
  
  return { glowScale, collapseGlow, finalGlowScale };
};

export interface HoldNoteColors {
  fillColor: string;
  glowColor: string;
  strokeColor: string;
}

export const calculateHoldNoteColors = (
  isGreyed: boolean,
  lane: number,
  baseColor: string
): HoldNoteColors => {
  if (isGreyed) {
    return {
      fillColor: GREYSCALE_FILL_COLOR,
      glowColor: GREYSCALE_GLOW_COLOR,
      strokeColor: 'rgba(120, 120, 120, 1)',
    };
  }
  
  const fillColor = lane === -1 
    ? COLOR_DECK_LEFT 
    : lane === -2 
    ? COLOR_DECK_RIGHT 
    : baseColor;
  
  return {
    fillColor,
    glowColor: fillColor,
    strokeColor: 'rgba(255,255,255,1)',
  };
};

export const trackHoldNoteAnimationLifecycle = (
  note: Note,
  failures: HoldNoteFailureStates,
  currentTime: number
): void => {
  if (!failures.hasAnyFailure) return;
  
  const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
  if (failures.isTooEarlyFailure) failureTypes.push('tooEarlyFailure');
  if (failures.isHoldReleaseFailure) failureTypes.push('holdReleaseFailure');
  if (failures.isHoldMissFailure) failureTypes.push('holdMissFailure');
  
  for (const failureType of failureTypes) {
    let animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
    const failureTime = animEntry?.failureTime || note.failureTime || currentTime;
    const timeSinceFailure = Math.max(0, currentTime - failureTime);
    
    if (!animEntry) {
      GameErrors.trackAnimation(note.id, failureType, note.failureTime || currentTime);
      animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
    }
    
    if (animEntry) {
      if (animEntry.status === 'pending') {
        if (timeSinceFailure >= HOLD_ANIMATION_DURATION) {
          GameErrors.updateAnimation(note.id, { status: 'completed', renderStart: currentTime, renderEnd: currentTime });
        } else {
          GameErrors.updateAnimation(note.id, { status: 'rendering', renderStart: currentTime });
        }
      } else if (animEntry.status === 'rendering' && timeSinceFailure >= HOLD_ANIMATION_DURATION) {
        GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
      }
    }
  }
};

export interface GreyscaleState {
  isGreyed: boolean;
  reason: 'none' | 'tooEarlyImmediate' | 'holdMissAtJudgement' | 'holdReleaseFailure';
}

export const determineGreyscaleState = (
  failures: HoldNoteFailureStates,
  pressHoldTime: number,
  approachNearDistance: number
): GreyscaleState => {
  if (failures.isHoldReleaseFailure) {
    return { isGreyed: true, reason: 'holdReleaseFailure' };
  }
  
  if (failures.isTooEarlyFailure && pressHoldTime > 0) {
    return { isGreyed: true, reason: 'tooEarlyImmediate' };
  }
  
  if (failures.isHoldMissFailure && approachNearDistance >= JUDGEMENT_RADIUS * 0.7) {
    return { isGreyed: true, reason: 'holdMissAtJudgement' };
  }
  
  return { isGreyed: false, reason: 'none' };
};

export const getTrapezoidCorners = (
  rayAngle: number,
  nearDistance: number,
  farDistance: number,
  vanishingPointX: number,
  vanishingPointY: number,
  noteId?: string
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } | null => {
  const leftRayAngle = rayAngle - 15;
  const rightRayAngle = rayAngle + 15;
  const leftRad = (leftRayAngle * Math.PI) / 180;
  const rightRad = (rightRayAngle * Math.PI) / 180;
  
  const corners = {
    x1: vanishingPointX + Math.cos(leftRad) * farDistance,
    y1: vanishingPointY + Math.sin(leftRad) * farDistance,
    x2: vanishingPointX + Math.cos(rightRad) * farDistance,
    y2: vanishingPointY + Math.sin(rightRad) * farDistance,
    x3: vanishingPointX + Math.cos(rightRad) * nearDistance,
    y3: vanishingPointY + Math.sin(rightRad) * nearDistance,
    x4: vanishingPointX + Math.cos(leftRad) * nearDistance,
    y4: vanishingPointY + Math.sin(leftRad) * nearDistance,
  };
  
  const allFinite = Object.values(corners).every(v => Number.isFinite(v));
  if (!allFinite) {
    if (noteId) {
      GameErrors.log(`getTrapezoidCorners: Invalid coordinates for note ${noteId}: ${JSON.stringify(corners)}`);
    }
    return null;
  }
  
  return corners;
};
