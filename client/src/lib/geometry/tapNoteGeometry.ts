import { JUDGEMENT_RADIUS, TAP_DEPTH, TAP_RAY, VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_MAX_DISTANCE } from '@/lib/config';

export interface TapNoteGeometry {
  x1: number; y1: number;
  x2: number; y2: number;
  x3: number; y3: number;
  x4: number; y4: number;
  points: string;
}

const calculateEffectiveProgress = (
  progress: number,
  isFailedOrHit: boolean,
  noteTime: number,
  currentTime: number,
  failureTime?: number,
  isMissFailure?: boolean
): number => {
  // For miss failures: allow extending past judgement line (progress > 1)
  // This creates the same "fall through" effect as hold notes
  if (isMissFailure && failureTime) {
    // Continue past judgement line during miss failure animation
    return Math.max(0, progress); // No upper clamp
  }
  
  // For hits and too-early failures: clamp at judgement line
  return Math.max(0, Math.min(1, progress));
};

export const calculateDistances = (
  effectiveProgress: number
): { nearDistance: number; farDistance: number } => {
  // Don't clamp perspectiveScale - it must scale proportionally with nearDistance
  // This prevents rapid depth change when notes approach past judgement
  // Both nearDistance and scaledDepth grow together, maintaining proportional depth
  const perspectiveScale = Math.max(0, effectiveProgress); // Allow > 1 past judgement
  // Depth is now FIXED - playerSpeed (via effectiveLeadTime = MAGIC_MS / playerSpeed) affects render window duration, not geometry
  const scaledDepth = TAP_DEPTH.MAX * perspectiveScale;
  
  const nearDistance = 1 + (Math.max(0, effectiveProgress) * (JUDGEMENT_RADIUS - 1));
  const farDistance = Math.max(1, nearDistance - scaledDepth);
  return { nearDistance, farDistance };
};

export const calculateRayCorners = (
  vpX: number,
  vpY: number,
  rayAngle: number,
  nearDistance: number,
  farDistance: number,
  hexCenterX: number = VANISHING_POINT_X,
  hexCenterY: number = VANISHING_POINT_Y
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } => {
  // Sanitize inputs to prevent NaN propagation
  const safeVpX = isFinite(vpX) ? vpX : VANISHING_POINT_X;
  const safeVpY = isFinite(vpY) ? vpY : VANISHING_POINT_Y;
  const safeHexCenterX = isFinite(hexCenterX) ? hexCenterX : VANISHING_POINT_X;
  const safeHexCenterY = isFinite(hexCenterY) ? hexCenterY : VANISHING_POINT_Y;
  
  const leftRayAngle = rayAngle - TAP_RAY.SPREAD_ANGLE;
  const rightRayAngle = rayAngle + TAP_RAY.SPREAD_ANGLE;
  
  // Calculate fixed outer corner positions for left and right spread rays
  const leftRad = (leftRayAngle * Math.PI) / 180;
  const rightRad = (rightRayAngle * Math.PI) / 180;
  const leftOuterX = safeHexCenterX + TUNNEL_MAX_DISTANCE * Math.cos(leftRad);
  const leftOuterY = safeHexCenterY + TUNNEL_MAX_DISTANCE * Math.sin(leftRad);
  const rightOuterX = safeHexCenterX + TUNNEL_MAX_DISTANCE * Math.cos(rightRad);
  const rightOuterY = safeHexCenterY + TUNNEL_MAX_DISTANCE * Math.sin(rightRad);
  
  // Position corners along rays from VP to outer corners
  const farProgress = farDistance / TUNNEL_MAX_DISTANCE;
  const nearProgress = nearDistance / TUNNEL_MAX_DISTANCE;

  const result = {
    x1: safeVpX + (leftOuterX - safeVpX) * farProgress,
    y1: safeVpY + (leftOuterY - safeVpY) * farProgress,
    x2: safeVpX + (rightOuterX - safeVpX) * farProgress,
    y2: safeVpY + (rightOuterY - safeVpY) * farProgress,
    x3: safeVpX + (rightOuterX - safeVpX) * nearProgress,
    y3: safeVpY + (rightOuterY - safeVpY) * nearProgress,
    x4: safeVpX + (leftOuterX - safeVpX) * nearProgress,
    y4: safeVpY + (leftOuterY - safeVpY) * nearProgress,
  };
  
  // DEBUG: Log NaN in calculated corners
  const hasNaN = Object.values(result).some(v => !isFinite(v));
  if (hasNaN) {
    console.error('[calculateRayCorners] NaN in output:', {
      input: { vpX, vpY, rayAngle, nearDistance, farDistance, hexCenterX, hexCenterY },
      safe: { safeVpX, safeVpY, safeHexCenterX, safeHexCenterY },
      intermediate: { leftRayAngle, rightRayAngle, leftOuterX, leftOuterY, rightOuterX, rightOuterY, farProgress, nearProgress },
      output: result
    });
  }
  
  return result;
};

export const calculateTapNoteGeometry = (
  progress: number,
  tapRayAngle: number,
  vpX: number,
  vpY: number,
  isSuccessfulHit: boolean = false,
  currentTime: number = 0,
  isFailed: boolean = false,
  noteTime: number = 0,
  failureTime?: number,
  isMissFailure?: boolean
): TapNoteGeometry => {
  const isFailedOrHit = isFailed || isSuccessfulHit;
  const effectiveProgress = calculateEffectiveProgress(progress, isFailedOrHit, noteTime, currentTime, failureTime, isMissFailure);
  const { nearDistance, farDistance } = calculateDistances(effectiveProgress);
  const corners = calculateRayCorners(vpX, vpY, tapRayAngle, nearDistance, farDistance);

  return {
    ...corners,
    points: `${corners.x1},${corners.y1} ${corners.x2},${corners.y2} ${corners.x3},${corners.y3} ${corners.x4},${corners.y4}`,
  };
};
