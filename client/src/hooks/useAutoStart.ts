// src/hooks/useAutoStart.ts
import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { Note } from '@/lib/engine/gameTypes';

interface UseAutoStartProps {
  customNotes: Note[];
  startGame: () => void;
  youtubeIsReady?: boolean;
  youtubeVideoId?: string | null;
  onPlayYouTube?: () => Promise<void>;
}

export function useAutoStart({ 
  customNotes, 
  startGame, 
  youtubeIsReady = true,
  youtubeVideoId,
  onPlayYouTube
}: UseAutoStartProps): void {
  const gameState = useGameStore(state => state.gameState);

  useEffect(() => {
    if (gameState !== 'IDLE' || !customNotes || customNotes.length === 0) return;
    
    // Only start if YouTube is ready (if required)
    if (!youtubeIsReady) return;

    // For YouTube videos: play first, then game starts via onPlaying callback
    if (youtubeVideoId && onPlayYouTube) {
      console.log('[AUTO-START] YouTube video detected - initiating playback');
      onPlayYouTube().catch(err => console.error('[AUTO-START] YouTube play failed:', err));
      // Game will start via onPlaying callback after YouTube confirms playback
      return;
    }

    // For non-YouTube: start game immediately
    console.log('[AUTO-START] No YouTube video - starting game directly');
    startGame();
  }, [customNotes, gameState, startGame, youtubeIsReady, youtubeVideoId, onPlayYouTube]);
}