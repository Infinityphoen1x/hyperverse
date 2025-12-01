// src/hooks/useRewind.ts
import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from '@/lib/youtube';

interface UseRewindProps {
  setPauseMenuOpen: (open: boolean) => void;
}

export function useRewind({ setPauseMenuOpen }: UseRewindProps): { handleRewind: () => Promise<void> } {
  const restartGame = useGameStore(state => state.restartGame);
  const setGameState = useGameStore(state => state.setGameState);

  const handleRewind = useCallback(async (): Promise<void> => {
    restartGame();
    setPauseMenuOpen(false);
    try {
      await pauseYouTubeVideo();
      await seekYouTubeVideo(0);
      await playYouTubeVideo();
    } catch (err) {
      // Rewind failed, continue anyway
    }
    setGameState('PLAYING');
  }, [restartGame, setGameState, setPauseMenuOpen]);

  return { handleRewind };
}