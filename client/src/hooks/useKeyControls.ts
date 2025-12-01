// src/hooks/useKeyControls.ts
import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';

interface UseKeyControlsProps {
  setPauseMenuOpen: (open: boolean) => void;
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

export function useKeyControls({ setPauseMenuOpen }: UseKeyControlsProps): void {
  const gameState = useGameStore(state => state.gameState);
  const isPaused = useGameStore(state => state.isPaused);
  const hitNote = useGameStore(state => state.hitNote);
  const pauseGame = useGameStore(state => state.pauseGame);
  const resumeGame = useGameStore(state => state.resumeGame);
  const rewindGame = useGameStore(state => state.rewindGame);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (GAMEPLAY_KEYS.has(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'PAUSED' || isPaused) {
          resumeGame();
          setPauseMenuOpen(false);
        } else if (gameState === 'PLAYING' || gameState === 'RESUMING') {
          pauseGame();
          setPauseMenuOpen(true);
        }
      } else if ((e.key === 'r' || e.key === 'R') && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        e.preventDefault();
        rewindGame();
      }

      if ((gameState === 'PLAYING' || gameState === 'RESUMING') && !isPaused) {
        const lane = KEY_LANE_MAP[e.key];
        if (lane !== undefined) {
          hitNote(lane);
        }
      }
    },
    [gameState, isPaused, hitNote, pauseGame, resumeGame, rewindGame, setPauseMenuOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}