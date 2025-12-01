// src/hooks/useAutoStart.ts
import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { Note } from '@/lib/engine/gameTypes';

interface UseAutoStartProps {
  customNotes: Note[];
  startGame: () => void;
}

export function useAutoStart({ customNotes, startGame }: UseAutoStartProps): void {
  const gameState = useGameStore(state => state.gameState);

  useEffect(() => {
    if (gameState !== 'IDLE' || !customNotes || customNotes.length === 0) return;

    startGame();
  }, [customNotes, gameState, startGame]);
}