// src/hooks/useKeyControls.ts
import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';

interface UseKeyControlsProps {
  onPause?: () => void;
  onResume?: () => void;
  onRewind?: () => void;
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

export function useKeyControls({ onPause, onResume, onRewind }: UseKeyControlsProps): void {
  const gameState = useGameStore(state => state.gameState);
  const isPaused = useGameStore(state => state.isPaused);
  const hitNote = useGameStore(state => state.hitNote);

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
        }
      } else if ((e.key === 'r' || e.key === 'R') && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        e.preventDefault();
        onRewind?.();
      }

      if ((gameState === 'PLAYING' || gameState === 'RESUMING') && !isPaused) {
        const lane = KEY_LANE_MAP[e.key];
        if (lane !== undefined) {
          hitNote(lane);
        }
      }
    },
    [gameState, isPaused, hitNote, onPause, onResume, onRewind]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}