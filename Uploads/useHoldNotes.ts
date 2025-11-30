// src/hooks/useHoldNotes.ts
import { useEffect } from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import {
  calculateApproachGeometry,
  calculateLockedNearDistance,
  calculateHoldNoteGlow,
} from "@/lib/notes/holdNoteGeometry";
import {
  calculateHoldNoteColors,
  determineGreyscaleState,
} from "@/lib/notes/holdGreystate";
import {
  markAnimationCompletedIfDone,
  trackHoldNoteAnimationLifecycle,
  getHoldNoteFailureStates,
} from "@/lib/notes/holdNoteHelpers";
import {
  HOLD_ANIMATION_DURATION,
  FAILURE_ANIMATION_DURATION,
  HOLD_NOTE_STRIP_WIDTH_MULTIPLIER,
  JUDGEMENT_RADIUS,
  LEAD_TIME,
} from '@/lib/utils/gameConstants';
import { getLaneAngle } from '@/lib/utils/laneUtils';

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
        if (!note || !Number.isFinite(note.time) || !note.id) {
          return;
        }

        const timeUntilHit = note.time - currentTime;

        if (!Number.isFinite(timeUntilHit) || !Number.isFinite(LEAD_TIME)) {
          return;
        }

        const pressHoldTime = note.pressHoldTime || 0;
        const holdDuration = note.duration || 1000;

        const failures = getHoldNoteFailureStates(note);

        if (failures.hasAnyFailure && note.failureTime === undefined) {
          GameErrors.log(
            `CRITICAL: Note ${note.id} has ${
              failures.isTooEarlyFailure
                ? 'tooEarlyFailure'
                : failures.isHoldReleaseFailure
                ? 'holdReleaseFailure'
                : 'holdMissFailure'
            } but failureTime is missing!`
          );
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

        const approachGeometry = calculateApproachGeometry(
          timeUntilHit,
          pressHoldTime,
          failures.isTooEarlyFailure,
          holdDuration
        );
        const approachNearDistance = approachGeometry.nearDistance;
        const approachFarDistance = approachGeometry.farDistance;

        const collapseDuration = failures.hasAnyFailure ? FAILURE_ANIMATION_DURATION : holdDuration;

        const lockedNearDistance = calculateLockedNearDistance(
          note,
          pressHoldTime,
          failures.isTooEarlyFailure,
          approachNearDistance,
          failureTime
        );

        const stripWidth = (note.duration || 1000) * HOLD_NOTE_STRIP_WIDTH_MULTIPLIER;
        const farDistanceAtPress =
          lockedNearDistance ? Math.max(1, lockedNearDistance - stripWidth) : approachFarDistance;
        const collapseGeo = calculateCollapseGeometry(
          pressHoldTime,
          collapseDuration,
          currentTime,
          lockedNearDistance || approachNearDistance,
          farDistanceAtPress,
          approachNearDistance,
          approachFarDistance,
          note.hit
        );

        const nearDistance = collapseGeo.nearDistance;
        const farDistance = collapseGeo.farDistance;
        const collapseProgress = collapseGeo.collapseProgress;

        if (collapseProgress >= 1.0) {
          return;
        }

        const isSuccessfulHit = note.hit;
        const isHoldReleaseFailure = failures.isHoldReleaseFailure;
        const shouldNotPassJudgement = isSuccessfulHit || isHoldReleaseFailure;

        if (shouldNotPassJudgement && nearDistance > JUDGEMENT_RADIUS) {
          GameErrors.log(
            `GEOMETRY ERROR: Note ${note.id} (${
              isSuccessfulHit ? 'successful hit' : 'holdReleaseFailure'
            }) ` +
              `nearDistance=${nearDistance.toFixed(1)} exceeds JUDGEMENT_RADIUS=${JUDGEMENT_RADIUS}. ` +
              `lockedNearDistance=${lockedNearDistance?.toFixed(1)}, ` +
              `collapseProgress=${collapseProgress.toFixed(2)}, ` +
              `pressHoldTime=${pressHoldTime}, currentTime=${currentTime}`
          );
        }

        const greyscaleState = determineGreyscaleState(failures, pressHoldTime, approachNearDistance);

        const glowCalc = calculateHoldNoteGlow(
          pressHoldTime,
          currentTime,
          collapseDuration,
          approachGeometry.nearDistance > 0
            ? (approachGeometry.nearDistance - 1) / (JUDGEMENT_RADIUS - 1)
            : 0,
          note
        );
        const { finalGlowScale } = glowCalc;

        const baseColor = getColorForLane(note.lane);
        const colors = calculateHoldNoteColors(greyscaleState.isGreyed, note.lane, baseColor);

        const approachProgress = (approachGeometry.nearDistance - 1) / (JUDGEMENT_RADIUS - 1);

        trackHoldNoteAnimationLifecycle(note, failures, currentTime);

        processedNotes.push({
          note,
          rayAngle,
          nearDistance,
          farDistance,
          collapseProgress,
          approachProgress,
          pressHoldTime,
          failures,
          failureTime,
          greyscaleState,
          finalGlowScale,
          colors,
          currentTime,
        });
      } catch (error) {
        console.warn(`Hold note processing error: ${error}`);
      }
    });

  useEffect(() => {
    // Side effects for animation tracking if needed beyond per-note
  }, [currentTime]);

  return processedNotes;
}