// src/hooks/useAutoStart.ts
import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // For game state
import { GameState } from '@/lib/engine/gameTypes';

interface UseAutoStartProps {
  customNotes: Note[];
  startGame: () => void;
}

export function useAutoStart({ customNotes, startGame }: UseAutoStartProps) {
  const { gameState } = useGameStore();

  useEffect(() => {
    if (gameState !== 'IDLE' || !customNotes || customNotes.length === 0) return;

    startGame();
  }, [customNotes, gameState, startGame]);
}