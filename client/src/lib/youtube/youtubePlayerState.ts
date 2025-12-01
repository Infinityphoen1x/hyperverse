import { useYoutubeStore } from '@/stores/useYoutubeStore';

/**
 * SINGLE SOURCE OF TRUTH: Check if YouTube player is ready
 * ytPlayer exists AND playerReady flag is set AND has either API player or iframe element
 */
export function isPlayerReady(): boolean {
  const { ytPlayer, playerReady, youtubeIframeElement } = useYoutubeStore.getState();
  return playerReady && (ytPlayer !== null || youtubeIframeElement !== null);
}

/**
 * SINGLE SOURCE OF TRUTH: Wait for YouTube player to be ready with exponential backoff
 * Checks both YT.Player API and iframe element availability
 * @param maxWaitMs Maximum milliseconds to wait (default 5000ms)
 * @returns true if player becomes ready, false if timeout (continues anyway with postMessage fallback)
 */
export async function waitForPlayerReady(maxWaitMs: number = 5000): Promise<boolean> {
  const startTime = performance.now();
  let waitTime = 50; // Start with 50ms

  while (performance.now() - startTime < maxWaitMs) {
    if (isPlayerReady()) {
      console.log(`[YOUTUBE-READY] Player ready after ${(performance.now() - startTime).toFixed(0)}ms`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, waitTime));
    waitTime = Math.min(waitTime * 1.5, 200); // Cap at 200ms between checks
  }

  // Player not ready but continue anyway - postMessage fallback will handle it
  console.log(`[YOUTUBE-READY] Player API not available after ${maxWaitMs}ms, continuing with postMessage fallback`);
  return false;
}

/**
 * SINGLE SOURCE OF TRUTH: Check if YouTube has a valid current time
 * @returns true if current time is valid and >= 0
 */
export function hasValidYouTubeTime(): boolean {
  const ytPlayer = useYoutubeStore.getState().ytPlayer;
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') {
    return false;
  }
  
  try {
    const time = ytPlayer.getCurrentTime();
    return typeof time === 'number' && !isNaN(time) && time >= 0;
  } catch {
    return false;
  }
}