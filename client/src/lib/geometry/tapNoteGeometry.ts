import { JUDGEMENT_RADIUS, TAP_DEPTH, TAP_RAY, LEAD_TIME, REFERENCE_BPM } from '@/lib/config/gameConstants';

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
  failureTime?: number
): number => {
  if (isFailedOrHit && Number.isFinite(noteTime) && Number.isFinite(currentTime)) {
    // Early failure: note failed BEFORE reaching hit line (failureTime < noteTime)
    // Use the frozen progress value - DO NOT CLAMP to allow smooth flow past judgement line
    if (failureTime !== undefined && failureTime < noteTime) {
      return Math.max(0, progress);
    }
    
    // Late failure or successful hit: note PASSED hit line (failureTime >= noteTime)
    // Continue morphing past the hit line using current time
    return Math.max(0, 1 - ((noteTime - currentTime) / TAP_DEPTH.FADE_TIME));
  }
  return Math.max(0, Math.min(1, progress));
};

const calculateDistances = (
  effectiveProgress: number,
  worldSpaceDepth: number,
  beatmapBpm: number = 120
): { nearDist: number; farDist: number } => {
  const clampedProgress = Math.max(0, Math.min(1, effectiveProgress));
  
  // Scale world-space depth by approach progress and BPM
  // At vanishing point (progress=0): scaled depth is tiny
  // At judgement (progress=1): scaled depth is full size
  const effectiveLEAD_TIME = LEAD_TIME * (REFERENCE_BPM / Math.max(1, beatmapBpm));
  // Use effectiveProgress to scale with approach speed
  const perspectiveScale = clampedProgress; // 0 at VP, 1 at judgement
  const scaledDepth = worldSpaceDepth * perspectiveScale;
  
  const nearDist = 1 + (effectiveProgress * (JUDGEMENT_RADIUS - 1));
  const farDist = Math.max(1, nearDist - scaledDepth);
  return { nearDist, farDist };
};

const calculateRayCorners = (
  vpX: number,
  vpY: number,
  rayAngle: number,
  nearDist: number,
  farDist: number
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } => {
  const leftRayAngle = rayAngle - TAP_RAY.SPREAD_ANGLE;
  const rightRayAngle = rayAngle + TAP_RAY.SPREAD_ANGLE;
  const leftRad = (leftRayAngle * Math.PI) / 180;
  const rightRad = (rightRayAngle * Math.PI) / 180;

  return {
    x1: vpX + Math.cos(leftRad) * farDist,
    y1: vpY + Math.sin(leftRad) * farDist,
    x2: vpX + Math.cos(rightRad) * farDist,
    y2: vpY + Math.sin(rightRad) * farDist,
    x3: vpX + Math.cos(rightRad) * nearDist,
    y3: vpY + Math.sin(rightRad) * nearDist,
    x4: vpX + Math.cos(leftRad) * nearDist,
    y4: vpY + Math.sin(leftRad) * nearDist,
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
  beatmapBpm: number = 120,
  worldSpaceDepth: number = 40
): TapNoteGeometry => {
  const isFailedOrHit = isFailed || isSuccessfulHit;
  const effectiveProgress = calculateEffectiveProgress(progress, isFailedOrHit, noteTime, currentTime, failureTime);
  const { nearDist, farDist } = calculateDistances(effectiveProgress, worldSpaceDepth, beatmapBpm);
  const corners = calculateRayCorners(vpX, vpY, tapRayAngle, nearDist, farDist);

  return {
    ...corners,
    points: `${corners.x1},${corners.y1} ${corners.x2},${corners.y2} ${corners.x3},${corners.y3} ${corners.x4},${corners.y4}`,
  };
};
