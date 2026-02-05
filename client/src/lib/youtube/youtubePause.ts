import { waitForPlayerReady, isPlayerReady } from './youtubePlayerState';
import { useYoutubeStore } from '@/stores/useYoutubeStore';

/**
 * Pause YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function pauseYouTubeVideo(): Promise<void> {
  // Optimization: If player is already ready (which is 99% of the time during gameplay),
  // don't wait. Just execute immediately to minimize latency.
  if (!isPlayerReady()) {
    await waitForPlayerReady(1000);
  }

  try {
    // Get fresh player reference right before using it
    let ytPlayer = useYoutubeStore.getState().ytPlayer;
    let currentState: number | null = null;
    if (ytPlayer?.getPlayerState) {
      currentState = ytPlayer.getPlayerState();
      if (currentState === 2) { // Already paused
        // console.log('[YOUTUBE-PAUSE] Already paused, skipping');
        return;
      }
    }

    // Get fresh references right before calling methods
    ytPlayer = useYoutubeStore.getState().ytPlayer;
    const youtubeIframeElement = useYoutubeStore.getState().youtubeIframeElement;
    const youtubeCurrentTimeMs = useYoutubeStore.getState().youtubeCurrentTimeMs;

    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      const currentTime = ytPlayer.getCurrentTime?.() ?? 0;
      const minutes = Math.floor(currentTime / 60);
      const seconds = (currentTime % 60).toFixed(2);
      
      // Execute synchronously if possible
      ytPlayer.pauseVideo();
      
      // console.log(`[YOUTUBE-PAUSE] Official API: Paused at ${minutes}:${seconds} (${currentTime.toFixed(2)}s total)`);
    } else if (youtubeIframeElement?.contentWindow) {
      youtubeIframeElement.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'pauseVideo',
          args: []
        }),
        'https://www.youtube.com'
      );
      // console.log(`[YOUTUBE-PAUSE] PostMessage fallback: Paused at tracked time ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s`);
    } else {
      // console.error('[YOUTUBE-PAUSE] No pause method available - ytPlayer:', ytPlayer ? 'exists' : 'null', 'iframe:', youtubeIframeElement ? 'exists' : 'null');
      throw new Error('No pause method available');
    }
  } catch (error) {
    // console.error('[YOUTUBE-PAUSE] Failed:', error);
    throw error;
  }
}