import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { LEAD_TIME, JUDGEMENT_RADIUS, HOLD_NOTE_STRIP_WIDTH_MULTIPLIER, REFERENCE_BPM, HOLD_RAY } from '@/lib/config/gameConstants';

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
  useFixedDepth: boolean = true,
  beatmapBpm: number = 120
): ApproachGeometry => {
  // Fixed depth mode - depth is proportional to duration AND approach speed
  // Near end approaches based on note.time
  // Far end = near end + fixed offset based on duration scaled by approach speed
  
  // LEAD_TIME scales with BPM to prevent note stacking on fast songs
  // At 120 BPM: LEAD_TIME = 4000ms (baseline)
  // At 240 BPM: LEAD_TIME = 2000ms (half - snappier, prevents doubled-up notes)
  // At 60 BPM: LEAD_TIME = 8000ms (double - longer window for slower songs)
  // Formula: effectiveLEAD_TIME = LEAD_TIME × (REFERENCE_BPM / beatmapBpm)
  
  const effectiveLEAD_TIME = LEAD_TIME * (REFERENCE_BPM / Math.max(1, beatmapBpm));
  
  const rawNearProgress = (effectiveLEAD_TIME - timeUntilHit) / effectiveLEAD_TIME;
  const nearProgress = Math.max(0, rawNearProgress);
  const nearDistance = Math.max(1, 1 + (nearProgress * (JUDGEMENT_RADIUS - 1)));
  
  if (useFixedDepth) {
    // Approach speed = tunnel distance / effective LEAD_TIME
    // This automatically scales with BPM since effectiveLEAD_TIME scales inversely
    // High BPM: shorter window, faster approach speed
    // Low BPM: longer window, slower approach speed
    // Hold visual depth = duration × approach speed
    const TUNNEL_DISTANCE = JUDGEMENT_RADIUS - 1; // 186 pixels
    const approachSpeed = TUNNEL_DISTANCE / effectiveLEAD_TIME; // pixels per millisecond
    const fixedDepthOffset = Math.max(1, holdDuration * approachSpeed);
    // Scale depth offset by approach progress (time-aware) to maintain constant z-depth in world space
    // perspectiveScale represents how far along the approach we are (0 at VP, 1 at judgement)
    // This naturally accounts for BPM through effectiveLEAD_TIME
    // At vanishing point: scaled offset is tiny, at judgement: scaled offset is full size
    // This creates visual growth of depth as note approaches while keeping z-depth constant
    const perspectiveScale = Math.max(0, (effectiveLEAD_TIME - timeUntilHit) / effectiveLEAD_TIME);
    const scaledDepthOffset = fixedDepthOffset * perspectiveScale;
    // Far end is closer to vanishing point (smaller distance), near end is at judgement
    const farDistance = Math.max(1, nearDistance - scaledDepthOffset);
    return { nearDistance, farDistance };
  } else {
    // LEGACY: Dynamic depth mode (both ends approach based on timing)
    const timeUntilHitFar = timeUntilHit + holdDuration;
    const rawFarProgress = (effectiveLEAD_TIME - timeUntilHitFar) / effectiveLEAD_TIME;
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
  isHoldMissFailure: boolean = false,
  beatmapBpm: number = 120
): number | null => {
  if (note.hit) return JUDGEMENT_RADIUS;
  if (!pressHoldTime || pressHoldTime === 0) return null;
  if (isTooEarlyFailure) return null;
  
  // For holdMissFailure, don't lock near distance - let approach geometry continue extending past judgement
  if (isHoldMissFailure) return null;
  
  if (note.holdReleaseFailure) {
    if (!failureTime) return null;
    const timeUntilHitAtFailure = note.time - failureTime;
    // Use effectiveLEAD_TIME scaled by BPM
    const effectiveLEAD_TIME = LEAD_TIME * (REFERENCE_BPM / Math.max(1, beatmapBpm));
    const approachProgressAtFailure = Math.max((effectiveLEAD_TIME - timeUntilHitAtFailure) / effectiveLEAD_TIME, 0);
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
  noteId?: string
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } | null => {
  // Allow partial rendering: notes can span from behind vanishing point (negative z) to in front (positive z)
  // Both ends must be at least slightly valid (distance > 0), but not necessarily both > 1
  // The SVG viewport will naturally clip negative x/y coordinates
  if (Math.max(nearDistance, farDistance) < 1) {
    return null;
  }
  
  // Normalize angle to 0-360 range for consistent winding order
  const normalizedAngle = ((rayAngle % 360) + 360) % 360;
  
  // For angles in 270-90 range (right side), we need to swap left/right to maintain clockwise winding
  // This ensures consistent polygon winding across all lanes
  const needsSwap = normalizedAngle >= 270 || normalizedAngle < 90;
  
  // Use fixed angle spread for both ends (true ray geometry)
  // Both left and right rays follow the same angle, creating proper perspective convergence
  // Width scales naturally with distance: width = 2 * distance * tan(angleSpread)
  // This ensures synchronized rate of change between near and far ends
  
  const leftAngle = needsSwap ? rayAngle + HOLD_RAY.SPREAD_ANGLE : rayAngle - HOLD_RAY.SPREAD_ANGLE;
  const rightAngle = needsSwap ? rayAngle - HOLD_RAY.SPREAD_ANGLE : rayAngle + HOLD_RAY.SPREAD_ANGLE;
  
  const leftRad = (leftAngle * Math.PI) / 180;
  const rightRad = (rightAngle * Math.PI) / 180;
  
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
  
  // Allow negative coordinates - SVG viewport will clip them naturally
  // This allows hold notes to render partially when they span across the vanishing point
  
  return corners;
};
