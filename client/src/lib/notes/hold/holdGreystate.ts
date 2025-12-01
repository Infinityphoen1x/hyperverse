import {
  GREYSCALE_FILL_COLOR,
  GREYSCALE_GLOW_COLOR,
  JUDGEMENT_RADIUS,
  COLOR_DECK_LEFT,
  COLOR_DECK_RIGHT,
} from '@/lib/config/gameConstants';
import { HoldNoteFailureStates } from './holdNoteHelpers';

export interface HoldNoteColors {
  fillColor: string;
  glowColor: string;
  strokeColor: string;
}

export const calculateHoldNoteColors = (
  isGreyed: boolean,
  lane: number,
  baseColor: string
): HoldNoteColors => {
  if (isGreyed) {
    return {
      fillColor: GREYSCALE_FILL_COLOR,
      glowColor: GREYSCALE_GLOW_COLOR,
      strokeColor: 'rgba(120, 120, 120, 1)',
    };
  }
  
  const fillColor = lane === -1 
    ? COLOR_DECK_LEFT 
    : lane === -2 
    ? COLOR_DECK_RIGHT 
    : baseColor;
  
  return {
    fillColor,
    glowColor: fillColor,
    strokeColor: 'rgba(255,255,255,1)',
  };
};

export interface GreyscaleState {
  isGreyed: boolean;
  reason: 'none' | 'tooEarlyImmediate' | 'holdMissAtJudgement' | 'holdReleaseFailure';
}

export const determineGreyscaleState = (
  failures: HoldNoteFailureStates,
  pressHoldTime: number,
  approachNearDistance: number
): GreyscaleState => {
  if (failures.isHoldReleaseFailure) {
    return { isGreyed: true, reason: 'holdReleaseFailure' };
  }
  
  if (failures.isTooEarlyFailure && pressHoldTime > 0) {
    return { isGreyed: true, reason: 'tooEarlyImmediate' };
  }
  
  if (failures.isHoldMissFailure && approachNearDistance >= JUDGEMENT_RADIUS * 0.7) {
    return { isGreyed: true, reason: 'holdMissAtJudgement' };
  }
  
  return { isGreyed: false, reason: 'none' };
};
