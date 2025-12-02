import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { LEAD_TIME, JUDGEMENT_RADIUS, HOLD_NOTE_STRIP_WIDTH_MULTIPLIER } from '@/lib/config/gameConstants';

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
  // For hold notes in approach phase, allow progress beyond 1.0 to continue showing far end
  // Don't clamp to 1.0 - let it go higher so far end stays visible as near end reaches judgement
  const approachProgress = Math.max(0, rawApproachProgress);
  
  // Keep near distance clamped to judgement radius (max approach)
  const nearDistance = Math.max(1, Math.min(JUDGEMENT_RADIUS, 1 + (approachProgress * (JUDGEMENT_RADIUS - 1))));
  // Far distance starts with visible thickness at vanishing point and expands as note approaches
  // Creates smooth triangle->trapezoid transition from the start
  // At progress=0: farDistance has initial separation (stripWidth * 0.1)
  // At progress=1: farDistance extends back more (stripWidth * 0.2)
  const farDistance = Math.max(1, 1 - (stripWidth * 0.1 * (1 + Math.min(approachProgress, 1))));
  
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
  isActiveHold: boolean = false,
  noteTime: number = 0
): CollapseGeometry => {
  if (!pressHoldTime || pressHoldTime === 0) {
    // Not pressed yet - return approach geometry (no collapse)
    return { nearDistance: approachNearDistance, farDistance: approachFarDistance, collapseProgress: 0 };
  }
  
  // For active holds (pressed with no failure), collapse should start from noteTime to match deck meter fill timing
  // For failures, collapse starts from pressHoldTime (frozen geometry at failure moment)
  const collapseStartTime = isActiveHold ? noteTime : pressHoldTime;
  const timeSinceCollapseStart = currentTime - collapseStartTime;
  const collapseProgress = Math.min(Math.max(timeSinceCollapseStart / collapseDuration, 0), 1.0);
  
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
  note: Note,
  isActiveHold: boolean = false,
  noteTime: number = 0
): GlowCalculation => {
  const hasActivePress = pressHoldTime > 0 || note.hit;
  
  const glowScale = hasActivePress ? 0.2 + (Math.min(approachProgress, 1.0) * 0.8) : 0.05;
  
  let collapseGlow = 0;
  if (pressHoldTime && pressHoldTime > 0) {
    // For active holds, glow collapse starts from noteTime to match deck meter timing
    // For failures, collapse starts from pressHoldTime
    const collapseStartTime = isActiveHold ? noteTime : pressHoldTime;
    const timeSinceCollapseStart = currentTime - collapseStartTime;
    const collapseGlowProgress = Math.min(Math.max(timeSinceCollapseStart / collapseDuration, 0), 1.0);
    collapseGlow = collapseGlowProgress > 0 ? (1 - collapseGlowProgress) * 0.8 : 0;
  }
  
  const finalGlowScale = hasActivePress ? Math.max(glowScale - collapseGlow, 0.1) : 0.05;
  
  return { glowScale, collapseGlow, finalGlowScale };
};

export const getTrapezoidCorners = (
  rayAngle: number,
  nearDistance: number,
  farDistance: number,
  vanishingPointX: number,
  vanishingPointY: number,
  noteId?: string
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } | null => {
  // Normalize angle to 0-360 range for consistent winding order
  const normalizedAngle = ((rayAngle % 360) + 360) % 360;
  
  // For angles in 270-90 range (right side), we need to swap left/right to maintain clockwise winding
  // This ensures consistent polygon winding across all lanes
  const needsSwap = normalizedAngle >= 270 || normalizedAngle < 90;
  
  const baseLeftAngle = needsSwap ? rayAngle + 15 : rayAngle - 15;
  const baseRightAngle = needsSwap ? rayAngle - 15 : rayAngle + 15;
  
  const leftRad = (baseLeftAngle * Math.PI) / 180;
  const rightRad = (baseRightAngle * Math.PI) / 180;
  
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
