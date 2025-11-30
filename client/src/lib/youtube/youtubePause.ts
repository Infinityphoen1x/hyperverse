import { waitForPlayerReady } from './youtubePlayerState';
import { getYtPlayer, getYoutubeIframeElement, getYoutubeCurrentTimeMs } from './youtubeSharedState';

/**
 * Pause YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function pauseYouTubeVideo(): Promise<void> {
  await waitForPlayerReady(1000);
  const ytPlayer = getYtPlayer();
  const youtubeIframeElement = getYoutubeIframeElement();
  const youtubeCurrentTimeMs = getYoutubeCurrentTimeMs();

  try {
    let currentState: number | null = null;
    if (ytPlayer?.getPlayerState) {
      currentState = ytPlayer.getPlayerState();
      if (currentState === 2) { // Already paused
        console.log('[YOUTUBE-PAUSE] Already paused, skipping');
        return;
      }
    }

    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      const currentTime = ytPlayer.getCurrentTime?.() ?? 0;
      const minutes = Math.floor(currentTime / 60);
      const seconds = (currentTime % 60).toFixed(2);
      ytPlayer.pauseVideo();
      console.log(`[YOUTUBE-PAUSE] Official API: Paused at ${minutes}:${seconds} (${currentTime.toFixed(2)}s total)`);
    } else if (youtubeIframeElement?.contentWindow) {
      youtubeIframeElement.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'pauseVideo',
          args: []
        }),
        'https://www.youtube.com'
      );
      console.log(`[YOUTUBE-PAUSE] PostMessage fallback: Paused at tracked time ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s`);
    } else {
      throw new Error('No pause method available');
    }
  } catch (error) {
    console.error('[YOUTUBE-PAUSE] Failed:', error);
    throw error;
  }
}