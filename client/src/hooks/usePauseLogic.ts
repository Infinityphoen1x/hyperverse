// src/hooks/usePauseLogic.ts
import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { pauseYouTubeVideo } from '@/lib/youtube';
import { playPauseSound } from './useAudioEffects';

interface UsePauseLogicProps {
  getVideoTime?: () => number | null;
  setPauseMenuOpen?: (open: boolean) => void;
}

export function usePauseLogic({
  getVideoTime,
  setPauseMenuOpen,
}: UsePauseLogicProps) {
  const gameState = useGameStore(state => state.gameState);
  const setIsPaused = useGameStore(state => state.setIsPaused);
  const setGameState = useGameStore(state => state.setGameState);
  const setCountdownSeconds = useGameStore(state => state.setCountdownSeconds);

  // Keep track of latest game state for async operations
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Pause handler
  const pauseGame = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;

    setIsPaused(true);
    setGameState('PAUSED');
    setPauseMenuOpen?.(true);
    
    // Play pause sound
    playPauseSound();

    // Async YouTube pause - fire and forget mainly, don't block UI
    // execute immediately to sync with UI as close as possible
    (async () => {
      try {
        await pauseYouTubeVideo();
        
        // Simple verification
        if (gameStateRef.current === 'PAUSED' && getVideoTime) {
            // Just one quick check after a short delay
            setTimeout(() => {
              if (gameStateRef.current === 'PAUSED') getVideoTime();
            }, 100);
        }
      } catch (err) {
        // Pause failed, continue anyway
      }
    })();
  }, [getVideoTime, setIsPaused, setGameState, setPauseMenuOpen]);

  // Resume handler - triggers countdown which leads to YouTube-first resume flow
  // Flow: setCountdownSeconds(3) → countdown expires → onCountdownComplete (RESUMING) 
  //       → useFadeAnimation: fade-in + playYouTubeVideo() → resumeGame() → PLAYING
  const handleResume = useCallback((): void => {
    if (gameState !== 'PAUSED') return;
    setCountdownSeconds(3);
  }, [gameState, setCountdownSeconds]);

  return { pauseGame, handleResume };
}