import { JUDGEMENT_RADIUS, TAP_DEPTH, TAP_RAY } from '@/lib/config/gameConstants';

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
  currentTime: number
): number => {
  if (isFailedOrHit && Number.isFinite(noteTime) && Number.isFinite(currentTime)) {
    return Math.max(0, 1 - ((noteTime - currentTime) / TAP_DEPTH.FADE_TIME));
  }
  return Math.max(0, Math.min(1, progress));
};

const calculateDistances = (effectiveProgress: number): { nearDist: number; farDist: number } => {
  const trapezoidDepth = TAP_DEPTH.MIN + (Math.min(effectiveProgress, 1) * (TAP_DEPTH.MAX - TAP_DEPTH.MIN));
  const nearDist = 1 + (effectiveProgress * (JUDGEMENT_RADIUS - 1));
  const farDist = Math.max(1, nearDist - trapezoidDepth);
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
  noteTime: number = 0
): TapNoteGeometry => {
  const isFailedOrHit = isFailed || isSuccessfulHit;
  const effectiveProgress = calculateEffectiveProgress(progress, isFailedOrHit, noteTime, currentTime);
  const { nearDist, farDist } = calculateDistances(effectiveProgress);
  const corners = calculateRayCorners(vpX, vpY, tapRayAngle, nearDist, farDist);

  return {
    ...corners,
    points: `${corners.x1},${corners.y1} ${corners.x2},${corners.y2} ${corners.x3},${corners.y3} ${corners.x4},${corners.y4}`,
  };
};
