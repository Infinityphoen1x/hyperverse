// src/hooks/useKeyControls.ts
import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';

interface UseKeyControlsProps {
  onPause?: () => void;
  onResume?: () => void;
  onRewind?: () => void;
  onHitNote?: (lane: number) => void;
  onTrackHoldStart?: (lane: number) => void;
  onTrackHoldEnd?: (lane: number) => void;
}

const KEY_LANE_MAP: Record<string, number> = {
  'w': 0, 'W': 0,
  'o': 1, 'O': 1,
  'i': 2, 'I': 2,
  'e': 3, 'E': 3,
  'q': -1, 'Q': -1,
  'p': -2, 'P': -2,
};

const GAMEPLAY_KEYS = new Set(['w', 'W', 'o', 'O', 'i', 'I', 'e', 'E', 'q', 'Q', 'p', 'P']);

// Helper to check if there's a HOLD note approaching or active on a lane
function hasApproachingOrActiveHoldNote(lane: number, notes: any[], currentTime: number): boolean {
  const HOLD_DETECTION_WINDOW = 200; // ms - detect holds within 200ms (slightly more lenient than 150ms hit window)
  return notes.some(n => 
    n.lane === lane &&
    n.type === 'HOLD' &&
    !n.hit &&
    !n.holdMissFailure &&
    (
      // Approaching: within detection window
      Math.abs(n.time - currentTime) < HOLD_DETECTION_WINDOW ||
      // Active: pressed and not yet released
      (n.pressHoldTime && n.pressHoldTime > 0 && !n.hit)
    )
  );
}

export function useKeyControls({ onPause, onResume, onRewind, onHitNote, onTrackHoldStart, onTrackHoldEnd }: UseKeyControlsProps): void {
  const gameState = useGameStore(state => state.gameState);
  const isPaused = useGameStore(state => state.isPaused);
  const storeHitNote = useGameStore(state => state.hitNote);
  const hitNote = onHitNote || storeHitNote;
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (GAMEPLAY_KEYS.has(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'PAUSED' || isPaused) {
          onResume?.();
        } else if (gameState === 'PLAYING' || gameState === 'RESUMING') {
          onPause?.();
        } else if (gameState === 'IDLE') {
          // Allow pausing from IDLE state (no beatmap loaded)
          onPause?.();
        }
      } else if ((e.key === 'r' || e.key === 'R') && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        e.preventDefault();
        onRewind?.();
      }

      if ((gameState === 'PLAYING' || gameState === 'RESUMING') && !isPaused) {
        const lane = KEY_LANE_MAP[e.key];
        if (lane !== undefined) {
          // Check if there's a HOLD note approaching or already active on this lane
          const hasHoldNote = hasApproachingOrActiveHoldNote(lane, notes, currentTime);
          console.log('[KEY-DOWN]', e.key, 'lane:', lane, 'hasHoldNote:', hasHoldNote, 'currentTime:', currentTime);
          if (hasHoldNote) {
            console.log('[KEY-DOWN] Calling trackHoldStart for lane:', lane);
            onTrackHoldStart?.(lane);
          } else {
            // Otherwise treat as TAP note
            console.log('[KEY-DOWN] Calling hitNote for lane:', lane);
            hitNote(lane);
          }
        }
      }
    },
    [gameState, isPaused, hitNote, onHitNote, storeHitNote, onPause, onResume, onRewind, onTrackHoldStart, notes, currentTime]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent): void => {
      if ((gameState === 'PLAYING' || gameState === 'RESUMING') && !isPaused) {
        const lane = KEY_LANE_MAP[e.key];
        // Any lane can have HOLD notes now, so check all lanes for hold release
        if (lane !== undefined) {
          onTrackHoldEnd?.(lane);
        }
      }
    },
    [gameState, isPaused, onTrackHoldEnd]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}