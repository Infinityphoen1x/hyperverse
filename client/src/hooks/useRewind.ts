// src/hooks/useRewind.ts
import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // For restart/pause actions
import { seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from '@/lib/youtube';
import { startGame } from './useGameStart'; // Assume separate if needed

interface UseRewindProps {
  restartGame: () => void;
  startGame: () => void;
  setPauseMenuOpen: (open: boolean) => void;
}

export function useRewind({ restartGame, startGame, setPauseMenuOpen }: UseRewindProps) {
  const handleRewind = useCallback(async () => {
    restartGame();
    setPauseMenuOpen(false);
    try {
      await pauseYouTubeVideo();
      await seekYouTubeVideo(0);
      await playYouTubeVideo();
    } catch (err) {
      // Rewind failed, continue anyway
    }
    startGame();
  }, [restartGame, startGame, setPauseMenuOpen]);

  return handleRewind;
}