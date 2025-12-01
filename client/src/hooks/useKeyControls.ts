// src/hooks/useKeyControls.ts
import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Zustand store for game actions/state
import type { GameState } from '@/lib/engine/gameTypes'; // e.g., 'PLAYING' | 'PAUSED' | 'RESUMING'

interface UseKeyControlsProps {
  setPauseMenuOpen: (open: boolean) => void; // Only prop needed now (UI concern)
}

export function useKeyControls({ setPauseMenuOpen }: UseKeyControlsProps) {
  const { gameState, isPaused, hitNote, pauseGame, resumeGame, rewindGame } = useGameStore(
    (state) => ({
      gameState: state.gameState, // Assumes store has this
      isPaused: state.isPaused,   // Assumes store has this
      hitNote: state.hitNote,     // (lane: number) => void
      pauseGame: state.pauseGame, // () => void
      resumeGame: state.resumeGame, // () => void
      rewindGame: state.rewindGame, // () => void (renamed from handleRewind for consistency)
    })
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Prevent default for gameplay keys to avoid browser shortcuts
      const gameplayKeys = ['w', 'W', 'o', 'O', 'i', 'I', 'e', 'E', 'q', 'Q', 'p', 'P'];
      if (gameplayKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'PAUSED' || isPaused) {
          // Resume if paused
          resumeGame();
          setPauseMenuOpen(false);
        } else if (gameState === 'PLAYING' || gameState === 'RESUMING') {
          // Pause if playing
          pauseGame();
          setPauseMenuOpen(true);
        }
      } else if ((e.key === 'r' || e.key === 'R') && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        e.preventDefault();
        rewindGame();
      }

      // Note hit keys (only during active play)
      if ((gameState === 'PLAYING' || gameState === 'RESUMING') && !isPaused) {
        if (e.key === 'w' || e.key === 'W') hitNote(0);
        if (e.key === 'o' || e.key === 'O') hitNote(1);
        if (e.key === 'i' || e.key === 'I') hitNote(2);
        if (e.key === 'e' || e.key === 'E') hitNote(3);
        if (e.key === 'q' || e.key === 'Q') hitNote(-1);
        if (e.key === 'p' || e.key === 'P') hitNote(-2);
      }
    },
    [gameState, isPaused, hitNote, pauseGame, resumeGame, rewindGame, setPauseMenuOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}