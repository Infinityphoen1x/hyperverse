// src/lib/utils/youtube/youtubePlayerState.ts
/**
 * Wait for YouTube player to be ready with exponential backoff
 * Returns true if player becomes ready within timeout
 */
export async function waitForPlayerReady(maxWaitMs: number = 5000): Promise<boolean> {
  const startTime = performance.now();
  let waitTime = 50; // Start with 50ms

  while (performance.now() - startTime < maxWaitMs) {
    if (isPlayerReady()) {
      console.log(`[YOUTUBE-INIT] Player ready after ${(performance.now() - startTime).toFixed(0)}ms`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, waitTime));
    waitTime = Math.min(waitTime * 1.5, 200); // Cap at 200ms between checks
  }

  console.warn(`[YOUTUBE-INIT] Player not ready after ${maxWaitMs}ms timeout`);
  return false;
}

// Import isPlayerReady from youtubePlayerInit.ts if needed, but for circularity, re-export or inline if necessary
// Assuming isPlayerReady is available via import