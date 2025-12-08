import { JUDGEMENT_RADIUS, TAP_DEPTH, TAP_RAY } from '@/lib/config';

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

const calculateDistances = (
  effectiveProgress: number,
  noteSpeedMultiplier: number = 1.0
): { nearDistance: number; farDistance: number } => {
  // Don't clamp perspectiveScale - it must scale proportionally with nearDistance
  // This prevents rapid depth change when notes approach past judgement
  // Both nearDistance and scaledDepth grow together, maintaining proportional depth
  const perspectiveScale = Math.max(0, effectiveProgress); // Allow > 1 past judgement
  // Depth is now FIXED - noteSpeedMultiplier affects render window duration, not geometry
  const scaledDepth = TAP_DEPTH.MAX * perspectiveScale;
  
  const nearDistance = 1 + (Math.max(0, effectiveProgress) * (JUDGEMENT_RADIUS - 1));
  const farDistance = Math.max(1, nearDistance - scaledDepth);
  return { nearDistance, farDistance };
};

const calculateRayCorners = (
  vpX: number,
  vpY: number,
  rayAngle: number,
  nearDistance: number,
  farDistance: number
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } => {
  const leftRayAngle = rayAngle - TAP_RAY.SPREAD_ANGLE;
  const rightRayAngle = rayAngle + TAP_RAY.SPREAD_ANGLE;
  const leftRad = (leftRayAngle * Math.PI) / 180;
  const rightRad = (rightRayAngle * Math.PI) / 180;

  return {
    x1: vpX + Math.cos(leftRad) * farDistance,
    y1: vpY + Math.sin(leftRad) * farDistance,
    x2: vpX + Math.cos(rightRad) * farDistance,
    y2: vpY + Math.sin(rightRad) * farDistance,
    x3: vpX + Math.cos(rightRad) * nearDistance,
    y3: vpY + Math.sin(rightRad) * nearDistance,
    x4: vpX + Math.cos(leftRad) * nearDistance,
    y4: vpY + Math.sin(leftRad) * nearDistance,
  };
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
  const { nearDistance, farDistance } = calculateDistances(effectiveProgress, 1.0);
  const corners = calculateRayCorners(vpX, vpY, tapRayAngle, nearDistance, farDistance);

  return {
    ...corners,
    points: `${corners.x1},${corners.y1} ${corners.x2},${corners.y2} ${corners.x3},${corners.y3} ${corners.x4},${corners.y4}`,
  };
};
