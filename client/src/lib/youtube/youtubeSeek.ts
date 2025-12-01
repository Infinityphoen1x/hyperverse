import { waitForPlayerReady } from './youtubePlayerState';
import { getYouTubeVideoTime } from './youtubeTimeGetter';
import { resetYouTubeTimeTracker } from './youtubeTimeReset';
import { useYoutubeStore } from '@/stores/useYoutubeStore';

/**
 * Seek YouTube video to specific time (in seconds) with polling confirmation
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function seekYouTubeVideo(timeSeconds: number, signal?: AbortSignal): Promise<void> {
  // Reduce wait time for player ready - 2s is too long for gameplay
  await waitForPlayerReady(500);
  if (signal?.aborted) throw new Error('Seek aborted');

  // Reset tracker optimistically
  resetYouTubeTimeTracker(timeSeconds);

  const clampedTime = Math.max(0, timeSeconds);
  const minutes = Math.floor(clampedTime / 60);
  const seconds = (clampedTime % 60).toFixed(2);

  try {
    let ytPlayer = useYoutubeStore.getState().ytPlayer;
    let youtubeIframeElement = useYoutubeStore.getState().youtubeIframeElement;
    
    // Try official YouTube API first
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      // Don't force pause before seek - it slows things down. Just seek.
      ytPlayer.seekTo(clampedTime, true); 
      console.log(`[YOUTUBE-SEEK] Official API: Seeking to ${minutes}:${seconds}`);
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
      console.log(`[YOUTUBE-SEEK] PostMessage fallback: Seeking to ${minutes}:${seconds}`);
    } else {
      // If no player, just return (don't throw/block gameplay)
      console.warn('[YOUTUBE-SEEK] No seek method available');
      return;
    }

    // FAST POLL: Check for confirmation but timeout quickly (250ms)
    // We don't want to block the UI for a slow iframe
    await new Promise<void>((resolve) => {
      const maxAttempts = 5; // 250ms @ 50ms
      let attempts = 0;
      const poll = () => {
        attempts++;
        const current = getYouTubeVideoTime();
        // Looser tolerance (0.5s) for quick seeking
        if (current !== null && Math.abs(current / 1000 - clampedTime) < 0.5) { 
          console.log(`[YOUTUBE-SEEK] Confirmed: ${(current / 1000).toFixed(2)}s`);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.log(`[YOUTUBE-SEEK] Proceeding (timeout or unconfirmed)`);
          resolve(); 
        } else {
          setTimeout(poll, 50);
        }
      };
      setTimeout(poll, 50);
    });
  } catch (error) {
    console.error('[YOUTUBE-SEEK] Failed:', error);
    // Don't throw - let game continue
  }
}