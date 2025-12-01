// src/hooks/usePauseLogic.ts
import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // For pause/resume state/actions
import { seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo, waitForPlayerReady } from '@/lib/youtube';
import { GameState } from '@/lib/engine/gameTypes';

interface UsePauseLogicProps {
  gameState: GameState;
  currentTime: number;
  getVideoTime?: () => number | null;
  engineRef?: React.RefObject<any>;
  setCurrentTime: (time: number) => void;
  setGameState: (state: GameState) => void;
  setPauseMenuOpen?: (open: boolean) => void;
}

export function usePauseLogic({
  gameState,
  currentTime,
  getVideoTime,
  engineRef,
  setCurrentTime,
  setGameState,
  setPauseMenuOpen,
}: UsePauseLogicProps) {
  const { isPaused, setIsPaused } = useGameStore();

  // Pause handler
  const pauseGame = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    const pauseTime = getVideoTime?.() ?? currentTime;
    setIsPaused(true);
    setGameState('PAUSED');
    setPauseMenuOpen?.(true);

    // Async YouTube pause
    (async () => {
      try {
        await pauseYouTubeVideo();
        await new Promise(resolve => setTimeout(resolve, 150));
        let youtubeTimeAtPause = null;
        for (let i = 0; i < 5; i++) {
          youtubeTimeAtPause = getVideoTime?.();
          if (youtubeTimeAtPause !== null) break;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        // Store pause time in store if needed
      } catch (err) {
        // Pause failed, continue anyway
      }
    })();
  }, [gameState, currentTime, getVideoTime, setIsPaused, setGameState, setPauseMenuOpen]);

  // Resume handler - triggers countdown
  const handleResume = useCallback(() => {
    if (gameState !== 'PAUSED') return;

    // Set countdown in store
    useGameStore.setState({ countdownSeconds: 3 });
  }, [gameState]);

  return { pauseGame, handleResume };
}