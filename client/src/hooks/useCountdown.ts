// src/hooks/useCountdown.ts
import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { GameState } from '@/lib/engine/gameTypes';

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

  useEffect(() => {
    if (gameState !== 'PAUSED' || countdownSeconds === 0) return;

    const interval = setInterval(() => {
      const current = useGameStore.getState().countdownSeconds;
      setCountdownSeconds(Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, countdownSeconds, setCountdownSeconds]);

  useEffect(() => {
    if (countdownSeconds !== 0 || gameState !== 'PAUSED') return;

    setPauseMenuOpen?.(false);
    onCountdownComplete();
  }, [countdownSeconds, gameState, setPauseMenuOpen, onCountdownComplete]);
}