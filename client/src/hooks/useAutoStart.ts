// src/hooks/useAutoStart.ts
import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { Note } from '@/lib/engine/gameTypes';

interface UseAutoStartProps {
  customNotes: Note[];
  startGame: () => void;
  youtubeIsReady?: boolean;
  youtubeVideoId?: string | null; // If YouTube video is loaded, skip auto-start
}

export function useAutoStart({ customNotes, startGame, youtubeIsReady = true, youtubeVideoId }: UseAutoStartProps): void {
  const gameState = useGameStore(state => state.gameState);

  useEffect(() => {
    if (gameState !== 'IDLE' || !customNotes || customNotes.length === 0) return;
    
    // If YouTube video is loaded, skip auto-start
    // Game will start via onPlaying callback after playYouTubeVideo() confirms player ready
    if (youtubeVideoId) {
      console.log('[AUTO-START] Skipping auto-start - YouTube video will trigger start via onPlaying callback');
      return;
    }
    
    // Only start if YouTube is ready (if required)
    if (!youtubeIsReady) return;

    startGame();
  }, [customNotes, gameState, startGame, youtubeIsReady, youtubeVideoId]);
}