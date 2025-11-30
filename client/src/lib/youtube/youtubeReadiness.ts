import { getYtPlayer, getYoutubeCurrentTimeMs } from './youtubeSharedState';

/**
 * Wait for YouTube player to be fully ready and reporting valid time
 * If player API unavailable, continues anyway (postMessage fallback will be used)
 * @param timeout Max milliseconds to wait (default 3000ms)
 * @returns YouTube player instance if ready, null if using fallback
 */
export async function waitForYouTubeReady(timeout = 3000): Promise<any> {
  const start = performance.now();
  
  while (performance.now() - start < timeout) {
    const player = getYtPlayer();
    
    // Check if player exists and has getCurrentTime method
    if (player && typeof player.getCurrentTime === 'function') {
      try {
        const time = player.getCurrentTime();
        // Verify we got a valid time
        if (typeof time === 'number' && !isNaN(time) && time >= 0) {
          console.log(`[YOUTUBE-READY] Player ready with valid time: ${time.toFixed(2)}s`);
          return player;
        }
      } catch (err) {
        // Player exists but getCurrentTime failed, try again
      }
    }
    
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Player API not available - that's okay, postMessage fallback will handle it
  console.log(`[YOUTUBE-READY] Player API not available after ${timeout}ms, continuing with postMessage fallback`);
  return null;
}

/**
 * Verify that YouTube has a valid current time
 * @returns true if current time is valid and > 0
 */
export function hasValidYouTubeTime(): boolean {
  const player = getYtPlayer();
  if (!player || typeof player.getCurrentTime !== 'function') {
    return false;
  }
  
  try {
    const time = player.getCurrentTime();
    return typeof time === 'number' && !isNaN(time) && time >= 0;
  } catch {
    return false;
  }
}
