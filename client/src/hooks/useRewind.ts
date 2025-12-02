// src/hooks/useRewind.ts
import { useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from '@/lib/youtube';

interface UseRewindProps {
  setPauseMenuOpen: (open: boolean) => void;
  engineRef?: React.RefObject<any>;
}

export function useRewind({ setPauseMenuOpen, engineRef }: UseRewindProps): { handleRewind: () => Promise<void> } {
  const restartGame = useGameStore(state => state.restartGame);
  const setGameState = useGameStore(state => state.setGameState);
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
    
    // CRITICAL: Reset the cached time in useYouTubePlayer to prevent
    // the engine from seeing old time and failing all notes immediately
    if (engineRef?.current?.resetTime) {
        engineRef.current.resetTime();
    }
    
    try {
      // Fire and forget pause to ensure we don't get weird audio artifacts
      pauseYouTubeVideo().catch(() => {});
      
      // Seek to 0
      await seekYouTubeVideo(0);
      
      // YouTube-first flow: Play immediately, then game starts when onPlaying fires
      await playYouTubeVideo();
    } catch (err) {
      console.warn('[REWIND] Async operation failed', err);
    } finally {
      // Go back to IDLE so auto-start re-triggers the YouTube-first flow
      // This ensures: YouTube plays → onPlaying fires → startGame() called
      setGameState('IDLE');
      // Short delay to clear lock
      setTimeout(() => {
          isRewindingRef.current = false;
      }, 100);
    }
  }, [restartGame, setGameState, setPauseMenuOpen, engineRef]);

  return { handleRewind };
}