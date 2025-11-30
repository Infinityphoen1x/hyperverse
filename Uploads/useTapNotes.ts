// src/hooks/useTapNotes.ts
import { useEffect } from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import {
  getTapNoteState,
  shouldRenderTapNote,
  trackTapNoteAnimation,
} from "@/lib/notes/tapNoteHelpers";

export interface ProcessedNote {
  note: Note;
  state: ReturnType<typeof getTapNoteState>;
  progressForGeometry: number;
  clampedProgress: number;
  rawProgress: number;
}

export function useTapNotes(visibleNotes: Note[], currentTime: number): ProcessedNote[] {
  const processedNotes: ProcessedNote[] = [];

  visibleNotes
    .filter((n) => n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT')
    .forEach((note) => {
      const timeUntilHit = note.time - currentTime;
      const rawProgress = 1 - timeUntilHit / 2000;
      const clampedProgress = Math.max(0, Math.min(1, rawProgress));

      const state = getTapNoteState(note, currentTime);

      if (state.isFailed && !state.failureTime) {
        GameErrors.log(`Down3DNoteLane: TAP failure missing failureTime: ${note.id}`);
        return;
      }

      if (!shouldRenderTapNote(state, timeUntilHit)) {
        return;
      }

      trackTapNoteAnimation(note, state, currentTime);

      const progressForGeometry = state.isFailed || state.isHit ? rawProgress : clampedProgress;

      processedNotes.push({
        note,
        state,
        progressForGeometry,
        clampedProgress,
        rawProgress,
      });
    });

  useEffect(() => {
    // Any side effects for animation tracking can be handled here if needed
  }, [currentTime]);

  return processedNotes;
}