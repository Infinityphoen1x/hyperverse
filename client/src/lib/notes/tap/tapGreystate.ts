import {
  GREYSCALE_FILL_COLOR,
  GREYSCALE_GLOW_COLOR,
} from '@/lib/config';
import { TapNoteState } from './tapNoteHelpers';
import { getColorForPosition } from '@/lib/utils/laneUtils';

export interface TapNoteColors {
  fillColor: string;
  glowColor: string;
  strokeColor: string;
}

export interface TapGreyscaleState {
  isGreyed: boolean;
  reason: 'none' | 'tapTooEarlyImmediate' | 'tapMissAtJudgement';
}

export const determineTapGreyscaleState = (
  state: TapNoteState,
  progress: number
): TapGreyscaleState => {
  // Prevent greyscale if note was successfully hit
  if (state.isHit) {
    return { isGreyed: false, reason: 'none' };
  }

  // Immediate greyscale for too-early failure
  if (state.isTapTooEarlyFailure) {
    return { isGreyed: true, reason: 'tapTooEarlyImmediate' };
  }
  
  // Immediate greyscale for miss failure (removed progress gate for consistency)
  if (state.isTapMissFailure) {
    return { isGreyed: true, reason: 'tapMissAtJudgement' };
  }
  
  return { isGreyed: false, reason: 'none' };
};

export const calculateTapNoteColors = (
  greyscaleState: TapGreyscaleState,
  lane: number, // Position value (-2 to 3)
  baseColor: string
): TapNoteColors => {
  if (greyscaleState.isGreyed) {
    return {
      fillColor: GREYSCALE_FILL_COLOR,
      glowColor: GREYSCALE_GLOW_COLOR,
      strokeColor: 'rgba(120, 120, 120, 1)',
    };
  }
  
  return {
    fillColor: baseColor,
    glowColor: baseColor,
    strokeColor: 'rgba(255,255,255,1)',
  };
};
