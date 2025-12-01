import { waitForPlayerReady } from './youtubePlayerState';
import { getYouTubeVideoTime } from './youtubeTimeGetter';
import { resetYouTubeTimeTracker } from './youtubeTimeReset';
import { useYoutubeStore } from '@/stores/useYoutubeStore';

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
    // Get fresh player reference right before using it
    let ytPlayer = useYoutubeStore.getState().ytPlayer;
    let youtubeIframeElement = useYoutubeStore.getState().youtubeIframeElement;
    
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
      console.error('[YOUTUBE-SEEK] No seek method available - ytPlayer:', ytPlayer ? 'exists' : 'null', 'iframe:', youtubeIframeElement ? 'exists' : 'null');
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