// src/hooks/useTapNotes.ts
import { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/lib/engine/gameTypes';
import { getTapNoteState, TapNoteState, shouldRenderTapNote } from '@/lib/notes/tap/tapNoteHelpers';
import { LEAD_TIME, REFERENCE_BPM } from '@/lib/config/gameConstants';
import { GameErrors } from '@/lib/errors/errorLog';

export interface TapNoteProcessedData {
  note: Note;
  state: TapNoteState;
  progressForGeometry: number;
  clampedProgress: number;
  rawProgress: number;
}

export function useTapNotes(): TapNoteProcessedData[] {
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);
  const gameState = useGameStore(state => state.gameState);
  const beatmapBpm = useGameStore(state => state.beatmapBpm) || 120;

  return useMemo(() => {
    // Don't render notes until game is actually playing (YouTube started)
    if (gameState !== 'PLAYING' && gameState !== 'PAUSED' && gameState !== 'RESUMING') {
      return [];
    }
    
    // Ensure notes is an array
    if (!notes || !Array.isArray(notes)) {
      return [];
    }

    // effectiveLEAD_TIME scales with BPM to prevent note stacking on fast songs
    const effectiveLEAD_TIME = LEAD_TIME * (REFERENCE_BPM / Math.max(1, beatmapBpm));

    // Filter visibly relevant notes first to reduce map overhead
    // Keep failed notes visible longer to ensure they reach judgement line and greyscale animation completes
    // tapTooEarlyFailure needs very long window (4000ms) to travel from failure point to judgement line
    // tapMissFailure needs moderate window (2000ms) since they already reached judgement line
    const visibleNotes = notes.filter(n => {
      if (n.tapTooEarlyFailure) return n.time <= currentTime + effectiveLEAD_TIME && n.time >= currentTime - 4000;
      if (n.tapMissFailure) return n.time <= currentTime + effectiveLEAD_TIME && n.time >= currentTime - 2000;
      return n.time <= currentTime + effectiveLEAD_TIME && n.time >= currentTime - 500;
    });
    
    const processed = visibleNotes
      .filter(n => n.type === 'TAP')
      .map(note => {
        const state = getTapNoteState(note, currentTime);
        
        // Calculate progress
        // progress 0 = spawn (far away)
        // progress 1 = hit line (near)
        const rawProgress = 1 - ((note.time - currentTime) / effectiveLEAD_TIME);
        const clampedProgress = Math.max(0, Math.min(1, rawProgress));
        
        // For geometry, allow all notes (hit/failed) to go > 1 to show approach through judgement line
        const progressForGeometry = rawProgress;

        if (!shouldRenderTapNote(state, note.time - currentTime, beatmapBpm)) {
            return null;
        }

        return {
          note,
          state,
          progressForGeometry,
          clampedProgress,
          rawProgress
        };
      })
      .filter((n): n is TapNoteProcessedData => n !== null);

      return processed;
  }, [notes, currentTime, gameState, beatmapBpm]);
}