// src/hooks/useTapNotes.ts
import { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/lib/engine/gameTypes';
import { getTapNoteState, TapNoteState, shouldRenderTapNote } from '@/lib/notes/tap/tapNoteHelpers';
import { LEAD_TIME, MAGIC_MS } from '@/lib/config';
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
  const playerSpeed = useGameStore(state => state.playerSpeed) || 20;

  return useMemo(() => {
    // Don't render notes until game is actually playing (YouTube started)
    if (gameState !== 'PLAYING' && gameState !== 'PAUSED' && gameState !== 'RESUMING') {
      return [];
    }
    
    // Ensure notes is an array
    if (!notes || !Array.isArray(notes)) {
      return [];
    }

    // MAGIC_MS formula: effectiveLeadTime = MAGIC_MS / playerSpeed
    // Speed 5: 16000ms (very slow, for beginners)
    // Speed 20: 4000ms (default, matches old 1.0x multiplier)
    // Speed 40: 2000ms (very fast, for experts)
    const effectiveLeadTime = MAGIC_MS / playerSpeed;
    
    // Scale failure visibility windows to match note speed
    // These ensure greyscale animations complete before note cleanup
    const failureWindowTooEarly = effectiveLeadTime; // Full approach duration
    const failureWindowMiss = effectiveLeadTime / 2; // Half approach duration (post-judgement)
    const hitCleanupWindow = effectiveLeadTime / 8; // Brief cleanup period (scales with speed)
    
    // Visibility windows are scaled by playerSpeed via effectiveLeadTime to affect note velocity
    // playerSpeed changes WHEN notes spawn (higher = faster/shorter lead time), not their visual depth
    // 
    // Keep failed notes visible longer to ensure they reach judgement line and greyscale animation completes
    // tapTooEarlyFailure: effectiveLeadTime window to travel from failure point to judgement line
    // tapMissFailure: effectiveLeadTime/2 window to show failure animation after reaching judgement line
    // Hit notes: scaled brief buffer after judgement (small tail for visual cleanup)
    const visibleNotes = notes.filter(n => {
      if (n.tapTooEarlyFailure) return n.time <= currentTime + effectiveLeadTime && n.time >= currentTime - failureWindowTooEarly;
      if (n.tapMissFailure) return n.time <= currentTime + effectiveLeadTime && n.time >= currentTime - failureWindowMiss;
      return n.time <= currentTime + effectiveLeadTime && n.time >= currentTime - hitCleanupWindow;
    });
    
    const processed = visibleNotes
      .filter(n => n.type === 'TAP')
      .map(note => {
        const state = getTapNoteState(note, currentTime);
        
        // Calculate progress using scaled lead time (affects velocity)
        // progress 0 = spawn (far away)
        // progress 1 = hit line (near)
        const rawProgress = 1 - ((note.time - currentTime) / effectiveLeadTime);
        const clampedProgress = Math.max(0, Math.min(1, rawProgress));
        
        // For geometry, allow all notes (hit/failed) to go > 1 to show approach through judgement line
        const progressForGeometry = rawProgress;

        if (!shouldRenderTapNote(state, note.time - currentTime, effectiveLeadTime)) {
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
  }, [notes, currentTime, gameState, playerSpeed]);
}