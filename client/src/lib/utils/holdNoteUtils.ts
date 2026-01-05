// src/utils/holdNoteUtils.ts
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { calculateApproachGeometry, calculateLockedNearDistance, calculateHoldNoteGlow, calculateCollapseGeometry } from "@/lib/geometry/holdNoteGeometry";
import { calculateHoldNoteColors, determineGreyscaleState } from "@/lib/notes/hold/holdGreystate";
import { markAnimationCompletedIfDone, trackHoldNoteAnimationLifecycle, getHoldNoteFailureStates } from "@/lib/notes/hold/holdNoteHelpers";
import { FAILURE_ANIMATION_DURATION, HOLD_NOTE_STRIP_WIDTH_MULTIPLIER, JUDGEMENT_RADIUS, LEAD_TIME } from '@/lib/config';
import { getLaneAngle, getColorForLane } from '@/lib/utils/laneUtils';

export interface HoldNoteProcessedData {
  note: Note;
  rayAngle: number;
  nearDistance: number;
  farDistance: number;
  collapseProgress: number;
  approachProgress: number;
  pressHoldTime: number;
  failures: ReturnType<typeof getHoldNoteFailureStates>;
  failureTime: number;
  greyscaleState: ReturnType<typeof determineGreyscaleState>;
  finalGlowScale: number;
  colors: ReturnType<typeof calculateHoldNoteColors>;
  currentTime: number;
}

export function processSingleHoldNote(note: Note, currentTime: number, noteSpeedMultiplier: number = 1.0, tunnelRotation: number = 0): HoldNoteProcessedData | null {
  try {
    if (!note || !Number.isFinite(note.time) || !note.id) return null;
    
    // Skip completed hold notes (successfully released)
    if (note.hit && note.releaseTime) {
      return null;
    }

    const timeUntilHit = note.time - currentTime;
    if (!Number.isFinite(timeUntilHit) || !Number.isFinite(LEAD_TIME)) return null;

    const pressHoldTime = note.pressHoldTime || 0;
    const holdDuration = note.duration || 1000;
    const failures = getHoldNoteFailureStates(note);

    if (failures.hasAnyFailure && note.failureTime === undefined) {
      GameErrors.log(`CRITICAL: Note ${note.id} has failure but failureTime is missing!`);
      return null;
    }

    const failureTime = note.failureTime || currentTime;

    if (failures.hasAnyFailure) {
      const timeSinceFail = Math.max(0, currentTime - failureTime);
      if (timeSinceFail > FAILURE_ANIMATION_DURATION) {
        markAnimationCompletedIfDone(note, failures, timeSinceFail, currentTime);
        return null;
      }
    }

    const rayAngle = getLaneAngle(note.lane, tunnelRotation);
    if (!Number.isFinite(rayAngle)) {
      console.warn(`Invalid ray angle for lane ${note.lane}`);
      return null;
    }

    // Calculate effectiveLeadTime scaled by noteSpeedMultiplier to match tap note velocity
    const effectiveLeadTime = LEAD_TIME / noteSpeedMultiplier;

    // For early failures, calculate approach geometry at the time of failure (frozen, clamped to judgement)
    // For miss failures, calculate at current time allowing extension past judgement
    // For other cases, use current time with clamping
    let approachGeometry;
    if (failures.isTooEarlyFailure && failureTime) {
      const timeUntilHitAtFailure = note.time - failureTime;
      approachGeometry = calculateApproachGeometry(timeUntilHitAtFailure, pressHoldTime, failures.isTooEarlyFailure, holdDuration, false, false, effectiveLeadTime);
    } else {
      approachGeometry = calculateApproachGeometry(timeUntilHit, pressHoldTime, failures.isTooEarlyFailure, holdDuration, failures.isHoldMissFailure, false, effectiveLeadTime);
    }
    
    // Scale collapse duration by noteSpeedMultiplier to match note velocity
    // This ensures the collapse speed matches the approach speed
    const baseCollapseDuration = failures.hasAnyFailure ? FAILURE_ANIMATION_DURATION : holdDuration;
    const collapseDuration = baseCollapseDuration / noteSpeedMultiplier;
    const lockedNearDistance = calculateLockedNearDistance(note, pressHoldTime, failures.isTooEarlyFailure, approachGeometry.nearDistance, failureTime, failures.isHoldMissFailure);
    const stripWidth = holdDuration * HOLD_NOTE_STRIP_WIDTH_MULTIPLIER;
    // Use the actual approach geometry's far distance (what was being rendered)
    // not a recalculated value - this prevents discontinuous jumps on hit/press
    const farDistanceAtPress = approachGeometry.farDistance;
    
    // isActiveHold: true if pressed with no failure (collapse starts from noteTime to match meter fill)
    const isActiveHold = pressHoldTime > 0 && !failures.hasAnyFailure;
    const collapseGeo = calculateCollapseGeometry(pressHoldTime, collapseDuration, currentTime, lockedNearDistance || approachGeometry.nearDistance, farDistanceAtPress, approachGeometry.nearDistance, approachGeometry.farDistance, isActiveHold, note.time);

    // Only stop rendering if note has a failure that finished animating, NOT from collapse progress
    if (failures.hasAnyFailure && collapseGeo.collapseProgress >= 1.0) {
      // Failure animation complete - stop rendering
      return null;
    }

    const greyscaleState = determineGreyscaleState(failures, pressHoldTime, collapseGeo.nearDistance, note.hit || false);
    const glowCalc = calculateHoldNoteGlow(pressHoldTime, currentTime, collapseDuration, approachGeometry.nearDistance > 0 ? (approachGeometry.nearDistance - 1) / (JUDGEMENT_RADIUS - 1) : 0, note, isActiveHold, note.time);
    const baseColor = getColorForLane(note.lane);
    const colors = calculateHoldNoteColors(greyscaleState.isGreyed, note.lane, baseColor);
    const approachProgress = (approachGeometry.nearDistance - 1) / (JUDGEMENT_RADIUS - 1);

    trackHoldNoteAnimationLifecycle(note, failures, currentTime);

    return {
      note,
      rayAngle,
      nearDistance: collapseGeo.nearDistance,
      farDistance: collapseGeo.farDistance,
      collapseProgress: collapseGeo.collapseProgress,
      approachProgress,
      pressHoldTime,
      failures,
      failureTime,
      greyscaleState,
      finalGlowScale: glowCalc.finalGlowScale,
      colors,
      currentTime,
    };
  } catch (error) {
    console.warn(`Hold note processing error: ${error}`);
    return null;
  }
}