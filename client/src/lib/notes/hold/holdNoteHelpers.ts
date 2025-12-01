import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { FAILURE_ANIMATION_DURATION } from '@/lib/config/gameConstants';

export interface HoldNoteFailureStates {
  isTooEarlyFailure: boolean;
  isHoldReleaseFailure: boolean;
  isHoldMissFailure: boolean;
  hasAnyFailure: boolean;
}

export const getHoldNoteFailureStates = (note: Note): HoldNoteFailureStates => {
  const isTooEarlyFailure = note.tooEarlyFailure || false;
  const isHoldReleaseFailure = note.holdReleaseFailure || false;
  const isHoldMissFailure = note.holdMissFailure || false;
  
  return {
    isTooEarlyFailure,
    isHoldReleaseFailure,
    isHoldMissFailure,
    hasAnyFailure: isTooEarlyFailure || isHoldReleaseFailure || isHoldMissFailure,
  };
};

export const markAnimationCompletedIfDone = (
  note: Note,
  failures: HoldNoteFailureStates,
  timeSinceFail: number,
  currentTime: number
): void => {
  if (timeSinceFail > FAILURE_ANIMATION_DURATION) {
    const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
    if (failures.isTooEarlyFailure) failureTypes.push('tooEarlyFailure');
    if (failures.isHoldReleaseFailure) failureTypes.push('holdReleaseFailure');
    if (failures.isHoldMissFailure) failureTypes.push('holdMissFailure');
    
    for (const failureType of failureTypes) {
      const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
      if (animEntry && !animEntry.completed) {
        GameErrors.updateAnimation(note.id, { completed: true });
      }
    }
  }
};

export const trackHoldNoteAnimationLifecycle = (
  note: Note,
  failures: HoldNoteFailureStates,
  currentTime: number
): void => {
  if (!failures.hasAnyFailure) return;
  
  const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
  if (failures.isTooEarlyFailure) failureTypes.push('tooEarlyFailure');
  if (failures.isHoldReleaseFailure) failureTypes.push('holdReleaseFailure');
  if (failures.isHoldMissFailure) failureTypes.push('holdMissFailure');
  
  for (const failureType of failureTypes) {
    let animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
    const failureTime = animEntry?.failureTime || note.failureTime || currentTime;
    const timeSinceFailure = Math.max(0, currentTime - failureTime);
    
    if (!animEntry) {
      GameErrors.trackAnimation(note.id, failureType, note.failureTime || currentTime);
      animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
    }
    
    if (animEntry) {
      if (!animEntry.completed && timeSinceFailure >= FAILURE_ANIMATION_DURATION) {
        GameErrors.updateAnimation(note.id, { completed: true });
      }
    }
  }
};

export { calculateApproachGeometry, calculateCollapseGeometry, calculateLockedNearDistance, calculateHoldNoteGlow, getTrapezoidCorners, type ApproachGeometry, type CollapseGeometry, type GlowCalculation } from '../../geometry/holdNoteGeometry';
export { calculateHoldNoteColors, determineGreyscaleState, type HoldNoteColors, type GreyscaleState } from './holdGreystate';
