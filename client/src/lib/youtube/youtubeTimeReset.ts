// src/lib/utils/youtube/youtubeTimeReset.ts
import { youtubeCurrentTimeMs, lastTimeUpdate } from './youtubeSharedState';

/**
 * Reset YouTube time tracker (useful for seeks and rewinds)
 */
export function resetYouTubeTimeTracker(timeSeconds: number = 0): void {
  youtubeCurrentTimeMs = timeSeconds * 1000;
  lastTimeUpdate = Date.now();
  console.log(`[YOUTUBE-TIME-TRACKER] Reset to ${timeSeconds.toFixed(2)}s (${youtubeCurrentTimeMs.toFixed(0)}ms)`);
}