import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { LEAD_TIME, JUDGEMENT_RADIUS, HOLD_NOTE_STRIP_WIDTH_MULTIPLIER, HOLD_RAY, VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_MAX_DISTANCE } from '@/lib/config';

export interface ApproachGeometry {
  nearDistance: number;
  farDistance: number;
}

export const calculateApproachGeometry = (
  timeUntilHit: number,
  pressHoldTime: number,
  isTooEarlyFailure: boolean,
  holdDuration: number,
  isHoldMissFailure: boolean = false,
  useFixedDepth: boolean = false,
  effectiveLeadTime: number = LEAD_TIME
): ApproachGeometry => {
  // effectiveLeadTime is calculated using MAGIC_MS / playerSpeed to match tap note velocity
  // This ensures hold and tap notes travel at the same speed
  
  const rawNearProgress = (effectiveLeadTime - timeUntilHit) / effectiveLeadTime;
  const nearProgress = Math.max(0, rawNearProgress);
  const nearDistance = Math.max(1, 1 + (nearProgress * (JUDGEMENT_RADIUS - 1)));
  
  if (useFixedDepth) {
    // LEGACY: Fixed depth mode - depth is proportional to duration
    // Near end approaches based on note.time
    // Far end = near end + fixed offset based on duration
    const TUNNEL_DISTANCE = JUDGEMENT_RADIUS - 1;
    const baseApproachSpeed = TUNNEL_DISTANCE / effectiveLeadTime;
    const baseDepthOffset = Math.max(1, holdDuration * baseApproachSpeed);
    const perspectiveScale = Math.max(0, (effectiveLeadTime - timeUntilHit) / effectiveLeadTime);
    const scaledDepthOffset = baseDepthOffset * perspectiveScale;
    const farDistance = Math.max(1, nearDistance - scaledDepthOffset);
    return { nearDistance, farDistance };
  } else {
    // Dynamic depth mode (both ends approach based on timing)
    // Far end represents actual position of a note at release time
    const timeUntilHitFar = timeUntilHit + holdDuration;
    const rawFarProgress = (effectiveLeadTime - timeUntilHitFar) / effectiveLeadTime;
    const farProgress = Math.max(0, rawFarProgress);
    const farDistance = Math.max(1, 1 + (farProgress * (JUDGEMENT_RADIUS - 1)));
    return { nearDistance, farDistance };
  }
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
  
  // For active holds, near end locks at judgment line, far end continues approaching
  // For failures, lock both ends at the distances when failure occurred
  const nearDistance = isActiveHold ? lockedNearDistance : lockedNearDistance;
  const farDistance = isActiveHold ? approachFarDistance : (farDistanceAtPress * (1 - collapseProgress) + lockedNearDistance * collapseProgress);
  
  return { nearDistance, farDistance, collapseProgress };
};

export const calculateLockedNearDistance = (
  note: Note,
  pressHoldTime: number,
  isTooEarlyFailure: boolean,
  approachNearDistance: number,
  failureTime: number | null,
  isHoldMissFailure: boolean = false
): number | null => {
  if (note.hit) return JUDGEMENT_RADIUS;
  if (!pressHoldTime || pressHoldTime === 0) return null;
  if (isTooEarlyFailure) return null;
  
  // For holdMissFailure, don't lock near distance - let approach geometry continue extending past judgement
  if (isHoldMissFailure) return null;
  
  if (note.holdReleaseFailure) {
    if (!failureTime) return null;
    const timeUntilHitAtFailure = note.time - failureTime;
    // Use fixed LEAD_TIME (no BPM scaling)
    const approachProgressAtFailure = Math.max((LEAD_TIME - timeUntilHitAtFailure) / LEAD_TIME, 0);
    return Math.max(1, 1 + (approachProgressAtFailure * (JUDGEMENT_RADIUS - 1)));
  }
  
  // For active holds (pressed with no failure), lock near distance at judgement line during collapse
  // The near end should remain fixed at the hit point (JUDGEMENT_RADIUS) while far end collapses inward
  return JUDGEMENT_RADIUS;
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
  noteId?: string,
  hexCenterX: number = VANISHING_POINT_X,
  hexCenterY: number = VANISHING_POINT_Y
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } | null => {
  // Sanitize inputs to prevent NaN propagation
  const safeVpX = isFinite(vanishingPointX) ? vanishingPointX : VANISHING_POINT_X;
  const safeVpY = isFinite(vanishingPointY) ? vanishingPointY : VANISHING_POINT_Y;
  const safeHexCenterX = isFinite(hexCenterX) ? hexCenterX : VANISHING_POINT_X;
  const safeHexCenterY = isFinite(hexCenterY) ? hexCenterY : VANISHING_POINT_Y;
  
  // Allow partial rendering: notes can span from behind vanishing point (negative z) to in front (positive z)
  // Show note as long as at least one end is visible (distance >= 1)
  // The SVG viewport will naturally clip portions behind the VP
  if (nearDistance < 1 && farDistance < 1) {
    return null; // Both ends behind VP - completely invisible
  }
  
  // Normalize angle to 0-360 range for consistent winding order
  const normalizedAngle = ((rayAngle % 360) + 360) % 360;
  
  // For angles in 270-90 range (right side), we need to swap left/right to maintain clockwise winding
  // This ensures consistent polygon winding across all lanes
  const needsSwap = normalizedAngle >= 270 || normalizedAngle < 90;
  
  // Calculate spread angles
  const leftAngle = needsSwap ? rayAngle + HOLD_RAY.SPREAD_ANGLE : rayAngle - HOLD_RAY.SPREAD_ANGLE;
  const rightAngle = needsSwap ? rayAngle - HOLD_RAY.SPREAD_ANGLE : rayAngle + HOLD_RAY.SPREAD_ANGLE;
  
  const leftRad = (leftAngle * Math.PI) / 180;
  const rightRad = (rightAngle * Math.PI) / 180;
  
  // Calculate fixed outer corner positions for left and right spread rays
  const leftOuterX = safeHexCenterX + TUNNEL_MAX_DISTANCE * Math.cos(leftRad);
  const leftOuterY = safeHexCenterY + TUNNEL_MAX_DISTANCE * Math.sin(leftRad);
  const rightOuterX = safeHexCenterX + TUNNEL_MAX_DISTANCE * Math.cos(rightRad);
  const rightOuterY = safeHexCenterY + TUNNEL_MAX_DISTANCE * Math.sin(rightRad);
  
  // Position corners along rays from VP to outer corners
  const farProgress = farDistance / TUNNEL_MAX_DISTANCE;
  const nearProgress = nearDistance / TUNNEL_MAX_DISTANCE;
  
  const corners = {
    x1: safeVpX + (leftOuterX - safeVpX) * farProgress,
    y1: safeVpY + (leftOuterY - safeVpY) * farProgress,
    x2: safeVpX + (rightOuterX - safeVpX) * farProgress,
    y2: safeVpY + (rightOuterY - safeVpY) * farProgress,
    x3: safeVpX + (rightOuterX - safeVpX) * nearProgress,
    y3: safeVpY + (rightOuterY - safeVpY) * nearProgress,
    x4: safeVpX + (leftOuterX - safeVpX) * nearProgress,
    y4: safeVpY + (leftOuterY - safeVpY) * nearProgress,
  };
  
  // Validate all coordinates are finite (no NaN or Infinity)
  const allFinite = Object.values(corners).every(v => Number.isFinite(v));
  if (!allFinite) {
    // console.error('[getTrapezoidCorners] NaN in output:', {
    //   noteId,
    //   input: { rayAngle, nearDistance, farDistance, vanishingPointX, vanishingPointY, hexCenterX, hexCenterY },
    //   safe: { safeVpX, safeVpY, safeHexCenterX, safeHexCenterY },
    //   intermediate: { normalizedAngle, needsSwap, leftAngle, rightAngle, leftOuterX, leftOuterY, rightOuterX, rightOuterY, farProgress, nearProgress },
    //   output: corners
    // });
  }
  if (!allFinite) {
    if (noteId) {
      GameErrors.log(`getTrapezoidCorners: Invalid coordinates for note ${noteId}: ${JSON.stringify(corners)}`);
    }
    return null;
  }
  
  // Allow negative coordinates - SVG viewport will clip them naturally
  // This allows hold notes to render partially when they span across the vanishing point
  
  return corners;
};
