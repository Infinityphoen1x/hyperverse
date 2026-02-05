// src/hooks/useAutoStart.ts
import { useEffect, useRef } from 'react';
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
  const hasAttemptedStart = useRef(false);

  useEffect(() => {
    if (gameState !== 'IDLE' || !customNotes || customNotes.length === 0) {
      hasAttemptedStart.current = false;
      return;
    }
    
    // Prevent multiple start attempts
    if (hasAttemptedStart.current) {
      return;
    }
    
    console.log('[AUTO-START] Checking auto-start conditions...');
    console.log('[AUTO-START] gameState:', gameState);
    console.log('[AUTO-START] customNotes count:', customNotes.length);
    console.log('[AUTO-START] youtubeIsReady:', youtubeIsReady);
    console.log('[AUTO-START] youtubeVideoId:', youtubeVideoId);
    
    // Only start if YouTube is ready (if required)
    if (!youtubeIsReady) {
      console.log('[AUTO-START] Waiting for YouTube to be ready...');
      return;
    }

    hasAttemptedStart.current = true;

    // For YouTube videos: play first, then game starts via onPlaying callback
    if (youtubeVideoId && onPlayYouTube) {
      console.log('[AUTO-START] Attempting to play YouTube video...');
      onPlayYouTube()
        .then(() => console.log('[AUTO-START] YouTube play() succeeded'))
        .catch((err) => {
          console.error('[AUTO-START] YouTube play failed:', err);
          hasAttemptedStart.current = false; // Allow retry on failure
        });
      // Game will start via onPlaying callback after YouTube confirms playback
      return;
    }

    // For non-YouTube: start game immediately
    console.log('[AUTO-START] No YouTube video - starting game immediately');
    startGame();
  }, [customNotes, gameState, startGame, youtubeIsReady, youtubeVideoId, onPlayYouTube]);
}