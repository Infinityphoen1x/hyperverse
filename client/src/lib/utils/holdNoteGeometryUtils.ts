// src/utils/holdNoteGeometry.ts
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import {
  LEAD_TIME,
  JUDGEMENT_RADIUS,
  HOLD_NOTE_STRIP_WIDTH_MULTIPLIER,
} from '@/lib/config/gameConstants';

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
  const linearApproachProgress = isSuccessfulPress ? Math.min(rawApproachProgress, 1.0) : rawApproachProgress;

  // Apply cubic perspective warp for consistent 3D speed feeling
  const approachProgress = Math.pow(Math.max(0, linearApproachProgress), 3);

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

export interface TrapezoidCorners {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

export const getTrapezoidCorners = (
  rayAngle: number,
  nearDistance: number,
  farDistance: number,
  vanishingPointX: number,
  vanishingPointY: number,
  noteId?: string
): TrapezoidCorners | null => {
  const leftRayAngle = rayAngle - 15;
  const rightRayAngle = rayAngle + 15;
  const leftRad = (leftRayAngle * Math.PI) / 180;
  const rightRad = (rightRayAngle * Math.PI) / 180;

  const corners: TrapezoidCorners = {
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