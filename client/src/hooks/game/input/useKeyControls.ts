// src/hooks/useKeyControls.ts
import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { KEY_LANE_MAP, GAMEPLAY_KEYS } from '@/lib/config/input';

interface UseKeyControlsProps {
  onPause?: () => void;
  onResume?: () => void;
  onRewind?: () => void;
  onHitNote?: (lane: number) => void;
  onTrackHoldStart?: (lane: number) => boolean;
  onTrackHoldEnd?: (lane: number) => void;
}

export function useKeyControls({ onPause, onResume, onRewind, onHitNote, onTrackHoldStart, onTrackHoldEnd }: UseKeyControlsProps): void {
  const gameState = useGameStore(state => state.gameState);
  const isPaused = useGameStore(state => state.isPaused);
  const storeHitNote = useGameStore(state => state.hitNote);
  const hitNote = onHitNote || storeHitNote;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (GAMEPLAY_KEYS.includes(e.key)) {
        e.preventDefault();
      }
      
      // CRITICAL: Ignore repeat keydown events (key is already held)
      // This prevents held keys from triggering multiple TAP notes
      // or causing "too early" failures on upcoming notes
      if (e.repeat) {
        return;
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
          // Try trackHoldStart first - returns true if hold note found, false otherwise
          const foundHold = onTrackHoldStart?.(lane);
          
          // If no hold note found, treat as tap
          if (!foundHold) {
            hitNote(lane);
          }
        }
      }
    },
    [gameState, isPaused, hitNote, onHitNote, storeHitNote, onPause, onResume, onRewind, onTrackHoldStart]
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