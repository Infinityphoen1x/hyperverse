// src/hooks/useCountdown.ts
import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { GameState } from '@/lib/engine/gameTypes';
import { playCountdownSound } from './useAudioEffects';

interface UseCountdownProps {
  gameState: GameState;
  onCountdownComplete: () => void;
  setPauseMenuOpen?: (open: boolean) => void;
}

export function useCountdown({
  gameState,
  onCountdownComplete,
  setPauseMenuOpen,
}: UseCountdownProps): void {
  const countdownSeconds = useGameStore(state => state.countdownSeconds);
  const setCountdownSeconds = useGameStore(state => state.setCountdownSeconds);
  const wasCountingDownRef = useRef(false);

  // Track if we are actively counting down
  useEffect(() => {
    if (countdownSeconds > 0) {
      wasCountingDownRef.current = true;
    }
  }, [countdownSeconds]);

  // Ticking logic
  useEffect(() => {
    if (gameState !== 'PAUSED' || countdownSeconds === 0) return;

    // Play countdown sound on each tick (3, 2, 1)
    if (countdownSeconds > 0 && countdownSeconds <= 3) {
      playCountdownSound();
    }

    const interval = setInterval(() => {
      const current = useGameStore.getState().countdownSeconds;
      setCountdownSeconds(Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, countdownSeconds, setCountdownSeconds]);

  // Completion logic
  useEffect(() => {
    // Only trigger completion if we were actually counting down and hit 0
    if (countdownSeconds === 0 && gameState === 'PAUSED' && wasCountingDownRef.current) {
      wasCountingDownRef.current = false;
      setPauseMenuOpen?.(false);
      onCountdownComplete();
    }
  }, [countdownSeconds, gameState, setPauseMenuOpen, onCountdownComplete]);
}