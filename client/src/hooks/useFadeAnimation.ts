// src/hooks/useFadeAnimation.ts
import { useEffect, useRef } from 'react';
import { GameState } from '@/lib/engine/gameTypes';
import { playYouTubeVideo } from '@/lib/youtube';

const FADE_IN_DURATION_MS = 500;
const ANIMATION_DELAY_MS = 100;

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
}: UseFadeAnimationProps): void {
  const animationFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameState !== 'RESUMING') return;

    const animate = (time: number): void => {
      if (!startTimeRef.current) {
        startTimeRef.current = time;
      }

      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / FADE_IN_DURATION_MS, 1.0);
      setResumeFadeOpacity(progress);

      if (progress < 1.0) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        console.log('[RESUME-ANIM] Fade complete, unfreezing engine...');
        // YouTube-first resume: play YouTube, then sync game to it
        playYouTubeVideo()
          .then(() => {
            // YouTube is playing, now resume the game engine
            resumeGame();
            setGameState('PLAYING');
          })
          .catch(err => {
            console.error('[RESUME-ANIM] YouTube play failed:', err);
            // Fallback: resume anyway
            resumeGame();
            setGameState('PLAYING');
          })
          .finally(() => {
            setResumeFadeOpacity(1.0);
            startTimeRef.current = null;
          });
      }
    };

    const timer = setTimeout(() => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
    }, ANIMATION_DELAY_MS);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      clearTimeout(timer);
      startTimeRef.current = null;
    };
  }, [gameState, setGameState, resumeGame, setResumeFadeOpacity]);
}