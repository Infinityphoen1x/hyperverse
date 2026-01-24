// src/hooks/useHoldNotes.ts
import { useMemo } from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { processSingleHoldNote, HoldNoteProcessedData } from '@/lib/utils/holdNoteUtils';
import { useGameStore } from '@/stores/useGameStore';
import { useTunnelRotation } from './useTunnelRotation';

export type { HoldNoteProcessedData };

export function useHoldNotes(visibleNotes: Note[], currentTime: number): HoldNoteProcessedData[] {
  const gameState = useGameStore(state => state.gameState);
  const playerSpeed = useGameStore(state => state.playerSpeed) || 20;
  const tunnelRotation = useTunnelRotation();
  
  return useMemo(() => {
    // Don't render notes until game is actually playing (YouTube started)
    if (gameState !== 'PLAYING' && gameState !== 'PAUSED' && gameState !== 'RESUMING') {
      return [];
    }
    
    // Ensure visibleNotes is an array
    if (!visibleNotes || !Array.isArray(visibleNotes)) {
      return [];
    }
    
    return visibleNotes
      .filter((n) => n && n.type === 'HOLD' && n.id)
      .map((note) => processSingleHoldNote(note, currentTime, playerSpeed, tunnelRotation))
      .filter((data): data is HoldNoteProcessedData => data !== null);
  }, [visibleNotes, currentTime, gameState, playerSpeed, tunnelRotation]);
}