// src/hooks/useKeyControls.ts
import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { KEY_LANE_MAP, GAMEPLAY_KEYS } from '@/lib/config/input';
import { NoteValidator } from '@/lib/notes/processors/noteValidator';
import { GAME_CONFIG } from '@/lib/config';

interface UseKeyControlsProps {
  onPause?: () => void;
  onResume?: () => void;
  onRewind?: () => void;
  onHitNote?: (lane: number) => void; // lane: Position value (-2 to 3)
  onTrackHoldStart?: (lane: number) => boolean; // lane: Position value (-2 to 3)
  onTrackHoldEnd?: (lane: number) => void; // lane: Position value (-2 to 3)
}

export function useKeyControls({ onPause, onResume, onRewind, onHitNote, onTrackHoldStart, onTrackHoldEnd }: UseKeyControlsProps): void {
  // console.log('[useKeyControls] Hook mounted');
  const gameState = useGameStore(state => state.gameState);
  const isPaused = useGameStore(state => state.isPaused);
  const storeHitNote = useGameStore(state => state.hitNote);
  const hitNote = onHitNote || storeHitNote;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      console.log('[handleKeyDown] Called with key:', e.key);
      
      // Debug logging for all gameplay keys
      if (e.key === 'q' || e.key === 'Q' || e.key === 'p' || e.key === 'P') {
        console.log(`[KEY-DEBUG-QP] Key pressed: ${e.key}, gameState: ${gameState}, isPaused: ${isPaused}`);
        const lane = KEY_LANE_MAP[e.key];
        console.log(`[KEY-DEBUG-QP] Mapped to lane/position:`, lane);
      }
      
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
        const lane = KEY_LANE_MAP[e.key]; // Position value from key mapping
        if (lane !== undefined) {
          const { notes, currentTime, playerSpeed } = useGameStore.getState();
          const noteValidator = new NoteValidator(GAME_CONFIG);
          
          // Calculate effective lead time for dynamic windows
          const effectiveLeadTime = GAME_CONFIG.MAGIC_MS / playerSpeed;
          
          // Try to find any pressable note on this position (gap-based windows prevent overlaps)
          const pressableTapNote = noteValidator.findPressableTapNote(notes, lane, currentTime, effectiveLeadTime);
          const pressableHoldNote = noteValidator.findPressableHoldNote(notes, lane, currentTime, effectiveLeadTime);
          
          // With gap-based windows, only one should be pressable at a time
          // If both somehow are, prefer the closer one
          if (pressableTapNote && pressableHoldNote) {
            const tapDelta = Math.abs(pressableTapNote.time - currentTime);
            const holdDelta = Math.abs(pressableHoldNote.time - currentTime);
            
            if (tapDelta < holdDelta) {
              hitNote(lane);
            } else {
              onTrackHoldStart?.(lane);
            }
          } else if (pressableTapNote) {
            hitNote(lane);
          } else if (pressableHoldNote) {
            onTrackHoldStart?.(lane);
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
    // console.log('[useKeyControls] Attaching event listeners');
    
    // Add a raw listener to test if keys reach the browser at all
    const testListener = (e: KeyboardEvent) => {
      console.log('[RAW-KEY-TEST] Key:', e.key, 'Code:', e.code, 'Target:', e.target);
    };
    
    window.addEventListener('keydown', testListener, { capture: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      // console.log('[useKeyControls] Removing event listeners');
      window.removeEventListener('keydown', testListener, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}