import {
  GREYSCALE_FILL_COLOR,
  GREYSCALE_GLOW_COLOR,
} from '@/lib/config/gameConstants';
import { TapNoteState } from './tapNoteHelpers';
import { getColorForLane } from '@/lib/utils/laneUtils';

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

  if (state.isTapTooEarlyFailure) {
    return { isGreyed: true, reason: 'tapTooEarlyImmediate' };
  }
  
  // Greyscale when miss passes 70% through note (at judgement moment)
  if (state.isTapMissFailure && progress >= 0.7) {
    return { isGreyed: true, reason: 'tapMissAtJudgement' };
  }
  
  return { isGreyed: false, reason: 'none' };
};

export const calculateTapNoteColors = (
  greyscaleState: TapGreyscaleState,
  lane: number,
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
