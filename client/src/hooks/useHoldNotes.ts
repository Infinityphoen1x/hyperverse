import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { calculateApproachGeometry, calculateLockedNearDistance, calculateHoldNoteGlow, calculateCollapseGeometry } from "@/lib/notes/holdNoteGeometry";
import { calculateHoldNoteColors, determineGreyscaleState } from "@/lib/notes/holdGreystate";
import { markAnimationCompletedIfDone, trackHoldNoteAnimationLifecycle, getHoldNoteFailureStates } from "@/lib/notes/holdNoteHelpers";
import { HOLD_ANIMATION_DURATION, FAILURE_ANIMATION_DURATION, HOLD_NOTE_STRIP_WIDTH_MULTIPLIER, JUDGEMENT_RADIUS, LEAD_TIME } from '@/lib/utils/gameConstants';
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

export function useHoldNotes(visibleNotes: Note[], currentTime: number): HoldNoteProcessedData[] {
  const processedNotes: HoldNoteProcessedData[] = [];

  visibleNotes
    .filter((n) => n && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && n.id)
    .forEach((note) => {
      try {
        if (!note || !Number.isFinite(note.time) || !note.id) return;

        const timeUntilHit = note.time - currentTime;
        if (!Number.isFinite(timeUntilHit) || !Number.isFinite(LEAD_TIME)) return;

        const pressHoldTime = note.pressHoldTime || 0;
        const holdDuration = note.duration || 1000;
        const failures = getHoldNoteFailureStates(note);

        if (failures.hasAnyFailure && note.failureTime === undefined) {
          GameErrors.log(`CRITICAL: Note ${note.id} has failure but failureTime is missing!`);
          return;
        }

        const failureTime = note.failureTime || currentTime;

        if (failures.hasAnyFailure) {
          const timeSinceFail = Math.max(0, currentTime - failureTime);
          if (timeSinceFail > HOLD_ANIMATION_DURATION) {
            markAnimationCompletedIfDone(note, failures, timeSinceFail, currentTime);
            return;
          }
        }

        const rayAngle = getLaneAngle(note.lane);
        if (!Number.isFinite(rayAngle)) {
          console.warn(`Invalid ray angle for lane ${note.lane}`);
          return;
        }

        const approachGeometry = calculateApproachGeometry(timeUntilHit, pressHoldTime, failures.isTooEarlyFailure, holdDuration);
        const collapseDuration = failures.hasAnyFailure ? FAILURE_ANIMATION_DURATION : holdDuration;
        const lockedNearDistance = calculateLockedNearDistance(note, pressHoldTime, failures.isTooEarlyFailure, approachGeometry.nearDistance, failureTime);

        const stripWidth = holdDuration * HOLD_NOTE_STRIP_WIDTH_MULTIPLIER;
        const farDistanceAtPress = lockedNearDistance ? Math.max(1, lockedNearDistance - stripWidth) : approachGeometry.farDistance;

        const collapseGeo = calculateCollapseGeometry(pressHoldTime, collapseDuration, currentTime, lockedNearDistance || approachGeometry.nearDistance, farDistanceAtPress, approachGeometry.nearDistance, approachGeometry.farDistance, note.hit);

        if (collapseGeo.collapseProgress >= 1.0) return;

        const greyscaleState = determineGreyscaleState(failures, pressHoldTime, approachGeometry.nearDistance);
        const glowCalc = calculateHoldNoteGlow(pressHoldTime, currentTime, collapseDuration, approachGeometry.nearDistance > 0 ? (approachGeometry.nearDistance - 1) / (JUDGEMENT_RADIUS - 1) : 0, note);

        const baseColor = getColorForLane(note.lane);
        const colors = calculateHoldNoteColors(greyscaleState.isGreyed, note.lane, baseColor);
        const approachProgress = (approachGeometry.nearDistance - 1) / (JUDGEMENT_RADIUS - 1);

        trackHoldNoteAnimationLifecycle(note, failures, currentTime);

        processedNotes.push({ note, rayAngle, nearDistance: collapseGeo.nearDistance, farDistance: collapseGeo.farDistance, collapseProgress: collapseGeo.collapseProgress, approachProgress, pressHoldTime, failures, failureTime, greyscaleState, finalGlowScale: glowCalc.finalGlowScale, colors, currentTime });
      } catch (error) {
        console.warn(`Hold note processing error: ${error}`);
      }
    });

  return processedNotes;
}
