import { GREYSCALE_FILL_COLOR, GREYSCALE_GLOW_COLOR, TAP_FAILURE_ANIMATIONS, TAP_HIT_FLASH, TAP_COLORS, TAP_OPACITY } from './constants';
import { TapNoteState } from './tapNoteHelpers';

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

export const calculateTapNoteStyle = (
  progress: number,
  state: TapNoteState,
  noteColor: string,
  rawProgress: number = 0
): TapNoteStyle => {
  const hitFlashIntensity = calculateHitFlashIntensity(state);

  let opacity: number;
  let fill = noteColor;
  let stroke: string = TAP_COLORS.STROKE_DEFAULT;
  let filter = '';

  if (state.isTapTooEarlyFailure || state.isTapMissFailure) {
    opacity = getFailureOpacity(state, rawProgress);
    fill = GREYSCALE_FILL_COLOR;
    stroke = TAP_COLORS.STROKE_FAILED;
    filter = `drop-shadow(0 0 8px ${GREYSCALE_GLOW_COLOR}) grayscale(1)`;
  } else if (state.isHit) {
    opacity = getHitOpacity(state, progress);
    if (hitFlashIntensity > 0) {
      filter = TAP_COLORS.GLOW_SHADOW(noteColor);
    }
  } else {
    opacity = getApproachingOpacity(progress);
  }

  return { opacity: Math.max(opacity, 0), fill, stroke, filter, hitFlashIntensity };
};
