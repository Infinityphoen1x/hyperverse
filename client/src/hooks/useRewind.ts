// src/hooks/useRewind.ts
import { useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from '@/lib/youtube';

interface UseRewindProps {
  setPauseMenuOpen: (open: boolean) => void;
}

export function useRewind({ setPauseMenuOpen }: UseRewindProps): { handleRewind: () => Promise<void> } {
  const restartGame = useGameStore(state => state.restartGame);
  const setGameState = useGameStore(state => state.setGameState);
  const isRewindingRef = useRef(false);

  const handleRewind = useCallback(async (): Promise<void> => {
    if (isRewindingRef.current) return;
    isRewindingRef.current = true;

    restartGame();
    setPauseMenuOpen(false);
    try {
      await pauseYouTubeVideo();
      await seekYouTubeVideo(0);
      await playYouTubeVideo();
    } catch (err) {
      // Rewind failed, continue anyway
      console.warn('[REWIND] Async operation failed', err);
    } finally {
      setGameState('PLAYING');
      isRewindingRef.current = false;
    }
  }, [restartGame, setGameState, setPauseMenuOpen]);

  return { handleRewind };
}