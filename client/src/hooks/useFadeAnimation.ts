// src/hooks/useFadeAnimation.ts
import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // For resume state
import { GameState } from '@/lib/engine/gameTypes';

interface UseFadeAnimationProps {
  gameState: GameState;
  resumeGame: () => void;
  setGameState: (state: GameState) => void;
  setResumeFadeOpacity: (opacity: number) => void;
}

export function useFadeAnimation({
  gameState,
  resumeGame,
  setGameState,
  setResumeFadeOpacity,
}: UseFadeAnimationProps) {
  const animationFrameIdRef = useRef<number | null>(null);
  const justResumedRef = useRef(false);

  useEffect(() => {
    if (gameState !== 'RESUMING') return;

    const fadeInDuration = 500;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (!startTime) {
        startTime = time;
      }

      const elapsed = time - startTime;
      const progress = Math.min(elapsed / fadeInDuration, 1.0);
      setResumeFadeOpacity(progress);

      if (progress < 1.0) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Fade complete - unfreeze engine
        console.log('[RESUME-ANIM] Fade complete, unfreezing engine...');
        resumeGame();
        setGameState('PLAYING');
        setResumeFadeOpacity(1.0);
        justResumedRef.current = false;
        startTime = null;
      }
    };

    // Delay start for sync
    const timer = setTimeout(() => {
      if (gameState === 'RESUMING') {
        justResumedRef.current = true;
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    }, 100);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      clearTimeout(timer);
    };
  }, [gameState, setGameState, resumeGame, setResumeFadeOpacity]);
}