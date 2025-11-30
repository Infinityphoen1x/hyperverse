import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { HOLD_ANIMATION_DURATION, HOLD_RENDER_WINDOW_MS, LEAD_TIME } from '@/lib/utils/gameConstants';
import { getHoldNoteFailureStates } from "@/lib/notes/holdNoteHelpers";

export function useVisibleNotes(notes: Note[], currentTime: number) {
  return Array.isArray(notes)
    ? (() => {
        const result: Note[] = [];
        const holdNotesByLane: Record<number, Note | null> = { [-1]: null, [-2]: null };

        for (let i = 0; i < notes.length; i++) {
          const n = notes[i];
          try {
            if (!n || !Number.isFinite(n.time) || !Number.isFinite(currentTime)) {
              if (n && !Number.isFinite(n.time)) {
                GameErrors.log(`Note ${i} has invalid time ${n.time}`);
              }
              continue;
            }

            if (n.beatmapStart !== undefined && currentTime < n.beatmapStart) continue;
            if (n.beatmapEnd !== undefined && currentTime > n.beatmapEnd) continue;

            const timeUntilHit = n.time - currentTime;

            if (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') {
              let visibilityEnd = currentTime + HOLD_ANIMATION_DURATION;
              const failures = getHoldNoteFailureStates(n);

              if (failures.hasAnyFailure) {
                visibilityEnd = (n.failureTime || currentTime) + HOLD_ANIMATION_DURATION;
              } else if (n.pressReleaseTime || n.releaseTime) {
                visibilityEnd = (n.pressReleaseTime || n.releaseTime || currentTime) + HOLD_ANIMATION_DURATION;
              } else if (n.pressHoldTime && n.pressHoldTime > 0) {
                visibilityEnd = n.pressHoldTime + (n.duration || 1000) + HOLD_ANIMATION_DURATION;
              }

              if (currentTime <= visibilityEnd && timeUntilHit <= HOLD_RENDER_WINDOW_MS) {
                if (!holdNotesByLane[n.lane]) {
                  holdNotesByLane[n.lane] = n;
                } else {
                  const stored = holdNotesByLane[n.lane];
                  if (stored) {
                    const storedIsExpired = currentTime > (stored.failureTime ? stored.failureTime + HOLD_ANIMATION_DURATION : stored.time + LEAD_TIME + 2000);
                    if (n.time < stored.time || storedIsExpired) {
                      holdNotesByLane[n.lane] = n;
                    }
                  }
                }
              }
            } else if (!n.hit && !n.missed) {
              result.push(n);
            }
          } catch (error) {
            GameErrors.log(`Visibility filter error for note ${i}: ${error instanceof Error ? error.message : 'Unknown'}`);
          }
        }

        if (holdNotesByLane[-1]) result.push(holdNotesByLane[-1]!);
        if (holdNotesByLane[-2]) result.push(holdNotesByLane[-2]!);
        return result;
      })()
    : [];
}
