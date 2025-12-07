import { waitForPlayerReady } from './youtubePlayerState';
import { useYoutubeStore } from '@/stores/useYoutubeStore';
import { resetYouTubeTimeTracker } from './youtubeTimeReset';

/**
 * Play YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function playYouTubeVideo(): Promise<void> {
  await waitForPlayerReady(1000);

  try {
    // Get fresh player reference right before using it
    let ytPlayer = useYoutubeStore.getState().ytPlayer;
    let currentState: number | null = null;
    if (ytPlayer?.getPlayerState) {
      currentState = ytPlayer.getPlayerState();
      if (currentState === 1) { // Already playing
        console.log('[YOUTUBE-PLAY] Already playing, skipping');
        return;
      }
    }

    // Get fresh references right before calling methods
    ytPlayer = useYoutubeStore.getState().ytPlayer;
    const youtubeIframeElement = useYoutubeStore.getState().youtubeIframeElement;
    const youtubeCurrentTimeMs = useYoutubeStore.getState().youtubeCurrentTimeMs;

    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      const currentTime = ytPlayer.getCurrentTime?.() ?? 0;
      const minutes = Math.floor(currentTime / 60);
      const seconds = (currentTime % 60).toFixed(2);
      ytPlayer.playVideo();
      console.log(`[YOUTUBE-PLAY] Official API: Playing from ${minutes}:${seconds} (${currentTime.toFixed(2)}s total)`);
    } else if (youtubeIframeElement?.contentWindow) {
      youtubeIframeElement.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: []
        }),
        'https://www.youtube.com'
      );
      console.log(`[YOUTUBE-PLAY] PostMessage fallback: Playing from tracked time ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s`);
    } else {
      console.error('[YOUTUBE-PLAY] No play method available - ytPlayer:', ytPlayer ? 'exists' : 'null', 'iframe:', youtubeIframeElement ? 'exists' : 'null');
      throw new Error('No play method available');
    }

    // Poll for play confirmation (handles buffering stalls)
    await new Promise<void>((resolve) => {
      const maxAttempts = 5; // Reduced to 250ms for responsiveness
      let attempts = 0;
      const poll = () => {
        attempts++;
        let state = -1;
        const ytPlayerCheck = useYoutubeStore.getState().ytPlayer;
        const iframeCheck = useYoutubeStore.getState().youtubeIframeElement;
        if (ytPlayerCheck?.getPlayerState) {
          state = ytPlayerCheck.getPlayerState();
        } else if (iframeCheck?.contentWindow) {
          // Fallback: Query state via postMessage (one-shot, response async but approx)
          iframeCheck.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'getPlayerState', args: [] }),
            'https://www.youtube.com'
          );
          // Note: Actual response handled in listener; use timeout as proxy
          state = 1; // Optimistic for fallback
        }
        if (state === 1) { // Playing confirmed
          console.log(`[YOUTUBE-PLAY] Confirmed playing after ${attempts * 50}ms`);
          // Reset time tracker to mark as "fresh" - restarts 1000ms fallback window
          const currentTimeSeconds = ytPlayerCheck?.getCurrentTime?.() ?? (youtubeCurrentTimeMs / 1000);
          resetYouTubeTimeTracker(currentTimeSeconds);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn(`[YOUTUBE-PLAY] Timeout: state=${state}, proceeding optimistically`);
          resolve(); // Fallback: Assume started
        } else {
          setTimeout(poll, 50);
        }
      };
      setTimeout(poll, 50); // Initial settle
    });
  } catch (error) {
    console.error('[YOUTUBE-PLAY] Failed:', error);
    throw error;
  }
}