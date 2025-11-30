import { GREYSCALE_GLOW_COLOR, HOLD_ANIMATION_DURATION, HOLD_OPACITY, HOLD_STROKE, HOLD_GLOW } from '../config/constants';
import { HoldNoteFailureStates } from './hold/holdNoteHelpers';
import { HoldNoteColors, GreyscaleState } from './hold/holdGreystate';

export interface HoldNoteStyle {
  opacity: number;
  strokeWidth: number;
  filter: string;
}

const getBaseOpacity = (approachProgress: number): number =>
  HOLD_OPACITY.MIN_BASE + Math.min(approachProgress, 1.0) * HOLD_OPACITY.MAX_PROGRESSION;

const getFailureOpacity = (
  baseOpacity: number,
  failures: HoldNoteFailureStates,
  failureTime: number | undefined,
  currentTime: number
): number => {
  if (!failures.hasAnyFailure || !failureTime) return baseOpacity;
  
  const timeSinceFailure = Math.max(0, currentTime - failureTime);
  const failFadeProgress = Math.min(timeSinceFailure / HOLD_ANIMATION_DURATION, 1.0);
  return baseOpacity * (1.0 - failFadeProgress);
};

const getCollapseOpacity = (
  opacity: number,
  collapseProgress: number,
  pressHoldTime: number
): number => {
  if (collapseProgress > 0 && pressHoldTime > 0) {
    return Math.max(1.0 - collapseProgress, 0.0);
  }
  return opacity;
};

const calculateStrokeWidth = (
  approachProgress: number,
  collapseProgress: number
): number => {
  if (collapseProgress > 0) {
    return HOLD_STROKE.BASE_WIDTH + (1 - collapseProgress) * HOLD_STROKE.COLLAPSE_MULTIPLIER;
  }
  return HOLD_STROKE.BASE_WIDTH + approachProgress * HOLD_STROKE.APPROACH_MULTIPLIER;
};

const calculateGlowFilter = (
  greyscaleState: GreyscaleState,
  colors: HoldNoteColors,
  finalGlowScale: number
): string => {
  if (greyscaleState.isGreyed) {
    return `drop-shadow(0 0 8px ${GREYSCALE_GLOW_COLOR}) grayscale(1)`;
  }
  
  const outerShadow = Math.max(HOLD_GLOW.MIN_SHADOW, HOLD_GLOW.SHADOW_SCALE * finalGlowScale);
  const innerShadow = Math.max(HOLD_GLOW.MIN_INNER_SHADOW, HOLD_GLOW.INNER_SHADOW_SCALE * finalGlowScale);
  
  return `drop-shadow(0 0 ${outerShadow}px ${colors.glowColor}) drop-shadow(0 0 ${innerShadow}px ${colors.glowColor})`;
};

export const calculateHoldNoteStyle = (
  approachProgress: number,
  collapseProgress: number,
  pressHoldTime: number,
  failures: HoldNoteFailureStates,
  failureTime: number | undefined,
  currentTime: number,
  greyscaleState: GreyscaleState,
  colors: HoldNoteColors,
  finalGlowScale: number
): HoldNoteStyle => {
  const baseOpacity = getBaseOpacity(approachProgress);
  const failureOpacity = getFailureOpacity(baseOpacity, failures, failureTime, currentTime);
  const opacity = getCollapseOpacity(failureOpacity, collapseProgress, pressHoldTime);
  
  const strokeWidth = calculateStrokeWidth(approachProgress, collapseProgress);
  const filter = calculateGlowFilter(greyscaleState, colors, finalGlowScale);
  
  return { opacity, strokeWidth, filter };
};
