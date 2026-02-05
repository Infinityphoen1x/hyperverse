// src/hooks/useRewind.ts
import { useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from '@/lib/youtube';
import { resetZoomEffect } from '@/hooks/effects/screen/useZoomEffect';
import { playRewindSound } from '@/hooks/audio/useAudioEffects';

interface UseRewindProps {
  setPauseMenuOpen: (open: boolean) => void;
  engineRef?: React.RefObject<any>;
  startGame?: () => void;
}

export function useRewind({ setPauseMenuOpen, engineRef, startGame }: UseRewindProps): { handleRewind: () => Promise<void> } {
  const restartGame = useGameStore(state => state.restartGame);
  const isRewindingRef = useRef(false);
  const lastRewindTimeRef = useRef(0);

  const handleRewind = useCallback(async (): Promise<void> => {
    // Allow rewind even if currently "rewinding" if it's been > 500ms (break locks)
    const now = Date.now();
    if (isRewindingRef.current && (now - lastRewindTimeRef.current < 500)) return;
    
    isRewindingRef.current = true;
    lastRewindTimeRef.current = now;

    // TODO: CHECKPOINT SYSTEM (Future Practice Mode)
    // Instead of calling restartGame(), this should:
    // 1. Load the last checkpoint (saved game state + time + notes)
    // 2. Preserve score/combo/health from checkpoint
    // 3. Allow practice mode where users can retry sections without penalty
    // For now, reset everything to full restart behavior
    restartGame();
    setPauseMenuOpen(false);
    
    // Play rewind sound
    playRewindSound();
    
    // CRITICAL: Reset the cached time in useYouTubePlayer to prevent
    // the engine from seeing old time and failing all notes immediately
    if (engineRef?.current?.resetTime) {
        engineRef.current.resetTime();
    }
    
    // CRITICAL: Reset the scorer to prevent stale health values
    // console.log('[REWIND] Attempting to reset scorer, engineRef exists:', !!engineRef?.current, 'resetScorer exists:', !!engineRef?.current?.resetScorer);
    if (engineRef?.current?.resetScorer) {
        // console.log('[REWIND] Calling resetScorer');
        engineRef.current.resetScorer();
        // console.log('[REWIND] resetScorer called');
    } else {
        // console.warn('[REWIND] resetScorer not available!');
    }
    
    // CRITICAL: Reset the rotation manager to prevent stale rotation state
    if (engineRef?.current?.resetRotation) {
        engineRef.current.resetRotation();
    }
    
    // CRITICAL: Reset zoom effect to prevent stale zoom state
    resetZoomEffect();
    
    try {
      // Fire and forget pause to ensure we don't get weird audio artifacts
      pauseYouTubeVideo().catch(() => {});
      
      // Seek to 0
      await seekYouTubeVideo(0);
      
      // YouTube-first flow: Play immediately
      await playYouTubeVideo();
      
      // After YouTube plays, call startGame to reset frame timer and set PLAYING state
      if (startGame) {
        startGame();
      }
    } catch (err) {
      // console.warn('[REWIND] Async operation failed', err);
    } finally {
      // Short delay to clear lock
      setTimeout(() => {
          isRewindingRef.current = false;
      }, 100);
    }
  }, [restartGame, setPauseMenuOpen, engineRef, startGame]);

  return { handleRewind };
}