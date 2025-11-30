// src/lib/utils/youtube/youtubeSeek.ts
import { waitForPlayerReady } from './youtubePlayerState';
import { getYouTubeVideoTime, resetYouTubeTimeTracker } from './youtubeTimeTracker';
// Note: ytPlayer and youtubeIframeElement need to be imported or accessed via a shared module
// Assuming they are exported from a shared state file, e.g., import { ytPlayer, youtubeIframeElement } from './youtubeSharedState';

let ytPlayer: any = null; // If not shared, declare locally or import
let youtubeIframeElement: HTMLIFrameElement | null = null; // If not shared

/**
 * Seek YouTube video to specific time (in seconds) with polling confirmation
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function seekYouTubeVideo(timeSeconds: number, signal?: AbortSignal): Promise<void> {
  await waitForPlayerReady(2000);
  if (signal?.aborted) throw new Error('Seek aborted');

  // Reset tracker optimistically, but confirm actual
  resetYouTubeTimeTracker(timeSeconds);

  const clampedTime = Math.max(0, timeSeconds);
  const minutes = Math.floor(clampedTime / 60);
  const seconds = (clampedTime % 60).toFixed(2);

  try {
    // Try official YouTube API first
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.pauseVideo(); // Pause for accurate seek
      ytPlayer.seekTo(clampedTime, true); // allowSeekAhead
      console.log(`[YOUTUBE-SEEK] Official API: Seeking to ${minutes}:${seconds} (${clampedTime.toFixed(2)}s total)`);
    } else if (youtubeIframeElement?.contentWindow) {
      // Fallback postMessage
      youtubeIframeElement.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [clampedTime, true]
        }),
        '*'
      );
      console.log(`[YOUTUBE-SEEK] PostMessage fallback: Seeking to ${minutes}:${seconds} (${clampedTime.toFixed(2)}s total)`);
    } else {
      throw new Error('No seek method available');
    }

    // Poll for confirmation
    await new Promise<void>((resolve) => {
      const maxAttempts = 20; // 1s @ 50ms
      let attempts = 0;
      const poll = () => {
        attempts++;
        const current = getYouTubeVideoTime();
        if (current !== null && Math.abs(current / 1000 - clampedTime) < 0.05) { // ±50ms
          console.log(`[YOUTUBE-SEEK] Confirmed: ${(current / 1000).toFixed(2)}s (target: ${clampedTime.toFixed(2)}s)`);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn(`[YOUTUBE-SEEK] Timeout: ${current ? (current / 1000).toFixed(2) + 's' : 'null'} vs ${clampedTime.toFixed(2)}s`);
          resolve(); // Proceed to avoid deadlock
        } else {
          setTimeout(poll, 50);
        }
      };
      setTimeout(poll, 50); // Settle
    });
  } catch (error) {
    console.error('[YOUTUBE-SEEK] Failed:', error);
    throw error; // Propagate for Game.tsx handling
  }
}