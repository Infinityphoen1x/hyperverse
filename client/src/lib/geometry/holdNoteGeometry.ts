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
  holdDuration: number,
  isHoldMissFailure: boolean = false
): ApproachGeometry => {
  // Cap stripWidth so far end never approaches vanishing point too closely
  // Max effective stripWidth is JUDGEMENT_RADIUS - 50 (keep far end at distance ~50+)
  const maxStripWidth = Math.max(JUDGEMENT_RADIUS - 50, 150);
  const stripWidth = Math.min((holdDuration || 1000) * HOLD_NOTE_STRIP_WIDTH_MULTIPLIER, maxStripWidth);
  
  const rawApproachProgress = (LEAD_TIME - timeUntilHit) / LEAD_TIME;
  // For hold notes in approach phase, allow progress beyond 1.0 to continue showing far end
  // Don't clamp to 1.0 - let it go higher so far end stays visible as near end reaches judgement
  const approachProgress = Math.max(0, rawApproachProgress);
  
  // For holdMissFailure: allow near end to extend PAST judgement radius (moving through user)
  // For other cases: clamp near distance to judgement radius
  const maxNearDistance = isHoldMissFailure ? Math.max(JUDGEMENT_RADIUS, 1 + (approachProgress * (JUDGEMENT_RADIUS - 1))) : Math.min(JUDGEMENT_RADIUS, 1 + (approachProgress * (JUDGEMENT_RADIUS - 1)));
  const nearDistance = Math.max(1, maxNearDistance);
  // Far distance is always stripWidth behind nearDistance, creating constant-width strip
  // Never clamp - farDistance should maintain proper depth even for long holds
  // This creates the moving strip effect: near end approaches while far end stays fixed depth behind
  const farDistance = nearDistance - stripWidth;
  
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
  // Prevent rendering notes with negative or very close-to-zero distance (not in valid visual window)
  if (nearDistance < 1 || farDistance < 1) {
    return null;
  }
  
  // Normalize angle to 0-360 range for consistent winding order
  const normalizedAngle = ((rayAngle % 360) + 360) % 360;
  
  // For angles in 270-90 range (right side), we need to swap left/right to maintain clockwise winding
  // This ensures consistent polygon winding across all lanes
  const needsSwap = normalizedAngle >= 270 || normalizedAngle < 90;
  
  // Calculate angle spread based on distance to maintain constant visual width (prevent hourglass)
  // Desired visual strip width: ~60 pixels at screen (slightly wider than TAP notes ~52px)
  // angleSpread = arctan(stripWidth / (2 * distance)) in radians → degrees
  const desiredStripWidth = 60;
  const angleSpreadRad = Math.atan(desiredStripWidth / (2 * Math.max(nearDistance, farDistance)));
  const angleSpreadDeg = angleSpreadRad * (180 / Math.PI);
  
  const baseLeftAngle = needsSwap ? rayAngle + angleSpreadDeg : rayAngle - angleSpreadDeg;
  const baseRightAngle = needsSwap ? rayAngle - angleSpreadDeg : rayAngle + angleSpreadDeg;
  
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
  
  // Validate all coordinates are finite (no NaN or Infinity)
  const allFinite = Object.values(corners).every(v => Number.isFinite(v));
  if (!allFinite) {
    if (noteId) {
      GameErrors.log(`getTrapezoidCorners: Invalid coordinates for note ${noteId}: ${JSON.stringify(corners)}`);
    }
    return null;
  }
  
  // Prevent rendering if any corner has negative coordinates (outside valid window)
  const allNonNegative = Object.values(corners).every(v => v >= 0);
  if (!allNonNegative) {
    if (noteId) {
      GameErrors.log(`getTrapezoidCorners: Negative coordinates for note ${noteId}: ${JSON.stringify(corners)}`);
    }
    return null;
  }
  
  return corners;
};
