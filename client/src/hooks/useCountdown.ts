// src/hooks/useCountdown.ts
import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // For countdown state
import { GameState } from '@/lib/engine/gameTypes';

interface UseCountdownProps {
  gameState: GameState;
  onCountdownComplete: () => void; // Triggers resume
  setPauseMenuOpen?: (open: boolean) => void;
}

export function useCountdown({
  gameState,
  onCountdownComplete,
  setPauseMenuOpen,
}: UseCountdownProps) {
  const { countdownSeconds, setCountdownSeconds } = useGameStore();

  useEffect(() => {
    if (gameState !== 'PAUSED' || countdownSeconds === 0) return;

    const interval = setInterval(() => {
      setCountdownSeconds(prev => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, countdownSeconds, setCountdownSeconds]);

  // Execute resume when countdown reaches 0
  useEffect(() => {
    if (countdownSeconds !== 0 || gameState !== 'PAUSED') return;

    (async () => {
      setPauseMenuOpen?.(false);

      try {
        // Wait for player readiness
        console.log('[RESUME] Waiting for YouTube player to be ready...');
        await waitForPlayerReady(2000);

        // Seek to correct time (from store pauseTime)
        const { pauseTime } = useGameStore.getState();
        const targetTime = pauseTime / 1000; // seconds
        console.log(`[RESUME] Seeking to ${targetTime.toFixed(2)}s`);
        await seekYouTubeVideo(targetTime);

        // Play video
        console.log('[RESUME] Playing video...');
        await playYouTubeVideo();

        // Sync engine currentTime
        const videoTimeMs = await getVideoTime?.() ?? pauseTime ?? 0;
        console.log(`[RESUME] Syncing engine to ${videoTimeMs.toFixed(0)}ms`);
        engineRef?.current?.setCurrentTime?.(videoTimeMs);
        setCurrentTime(videoTimeMs);
        setGameState('RESUMING');
        console.log('[RESUME-ANIM] Starting fade animation...');
      } catch (err) {
        console.error('[RESUME DEBUG] Resume error:', err);
        // Fallback continue
        const { pauseTime } = useGameStore.getState();
        const videoTimeMs = pauseTime ?? 0;
        console.log(`[RESUME DEBUG] Continuing with fallback time: ${videoTimeMs.toFixed(0)}ms`);
        engineRef?.current?.setCurrentTime?.(videoTimeMs);
        setCurrentTime(videoTimeMs);
        setGameState('RESUMING');
        console.log('[RESUME-ANIM] Starting fade animation (fallback)...');
      }
    })();
  }, [countdownSeconds, gameState]);
}