import { GREYSCALE_GLOW_COLOR, TAP_FAILURE_ANIMATIONS, TAP_HIT_FLASH, TAP_COLORS, TAP_OPACITY } from '@/lib/config';
import { TapNoteState } from './tapNoteHelpers';
import { TapNoteColors, TapGreyscaleState, determineTapGreyscaleState, calculateTapNoteColors } from './tapGreystate';

export interface TapNoteStyle {
  opacity: number;
  fill: string;
  stroke: string;
  filter: string;
  hitFlashIntensity: number;
}

const getBaseOpacity = (progress: number): number => TAP_OPACITY.MIN_BASE + (progress * TAP_OPACITY.MAX_PROGRESSION);

const getFailureOpacity = (state: TapNoteState, rawProgress: number): number => {
  const baseOpacity = getBaseOpacity(rawProgress);
  const animDuration = state.isTapTooEarlyFailure ? TAP_FAILURE_ANIMATIONS.TOO_EARLY.duration : TAP_FAILURE_ANIMATIONS.MISS.duration;
  const failProgress = Math.min(state.timeSinceFail / animDuration, 1.0);
  return baseOpacity * (1.0 - failProgress);
};

const getHitOpacity = (state: TapNoteState, progress: number): number => {
  if (state.timeSinceHit < TAP_HIT_FLASH.FADE_START) {
    return getBaseOpacity(progress);
  }
  const fadeProgress = (state.timeSinceHit - TAP_HIT_FLASH.FADE_START) / TAP_HIT_FLASH.FADE_DURATION;
  return Math.max(TAP_OPACITY.MIN_FADE, (1 - fadeProgress) * getBaseOpacity(progress));
};

const getApproachingOpacity = (progress: number): number => getBaseOpacity(progress);

const calculateHitFlashIntensity = (state: TapNoteState): number => {
  if (!state.isHit || state.timeSinceHit >= TAP_HIT_FLASH.DURATION) return 0;
  return Math.max(0, 1 - (state.timeSinceHit / TAP_HIT_FLASH.DURATION));
};

const calculateGlowFilter = (
  greyscaleState: TapGreyscaleState,
  colors: TapNoteColors,
  hitFlashIntensity: number
): string => {
  if (greyscaleState.isGreyed) {
    return `drop-shadow(0 0 8px ${GREYSCALE_GLOW_COLOR}) grayscale(1)`;
  }
  
  if (hitFlashIntensity > 0) {
    return TAP_COLORS.GLOW_SHADOW(colors.glowColor);
  }
  
  return '';
};

export const calculateTapNoteStyle = (
  progress: number,
  state: TapNoteState,
  noteColor: string,
  rawProgress: number = 0,
  lane: number = 0 // Position value (-2 to 3)
): TapNoteStyle => {
  const hitFlashIntensity = calculateHitFlashIntensity(state);
  const greyscaleState = determineTapGreyscaleState(state, rawProgress);
  const colors = calculateTapNoteColors(greyscaleState, lane, noteColor);

  let opacity: number;
  let filter = '';

  if (state.isTapTooEarlyFailure || state.isTapMissFailure) {
    opacity = getFailureOpacity(state, rawProgress);
    filter = calculateGlowFilter(greyscaleState, colors, 0);
  } else if (state.isHit) {
    opacity = getHitOpacity(state, progress);
    filter = calculateGlowFilter(greyscaleState, colors, hitFlashIntensity);
  } else {
    opacity = getApproachingOpacity(progress);
  }

  return { 
    opacity: Math.max(opacity, 0), 
    fill: colors.fillColor, 
    stroke: colors.strokeColor, 
    filter, 
    hitFlashIntensity 
  };
};

export { determineTapGreyscaleState, calculateTapNoteColors, type TapNoteColors, type TapGreyscaleState } from './tapGreystate';
