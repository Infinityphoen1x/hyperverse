// src/hooks/useAutoStart.ts
import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { Note } from '@/lib/engine/gameTypes';

interface UseAutoStartProps {
  customNotes: Note[];
  startGame: () => void;
  youtubeIsReady?: boolean;
}

export function useAutoStart({ customNotes, startGame, youtubeIsReady = true }: UseAutoStartProps): void {
  const gameState = useGameStore(state => state.gameState);

  useEffect(() => {
    if (gameState !== 'IDLE' || !customNotes || customNotes.length === 0) return;
    
    // Only start if YouTube is ready (if required)
    if (!youtubeIsReady) return;

    startGame();
  }, [customNotes, gameState, startGame, youtubeIsReady]);
}