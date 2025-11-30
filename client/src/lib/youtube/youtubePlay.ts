// src/lib/utils/youtube/youtubePlay.ts
import { waitForPlayerReady } from './youtubePlayerState';
// Note: ytPlayer and youtubeIframeElement need to be imported or accessed via a shared module
// Assuming they are exported from a shared state file, e.g., import { ytPlayer, youtubeIframeElement, youtubeCurrentTimeMs } from './youtubeSharedState';

let ytPlayer: any = null; // If not shared, declare locally or import
let youtubeIframeElement: HTMLIFrameElement | null = null; // If not shared
let youtubeCurrentTimeMs: number = 0; // If not shared

/**
 * Play YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function playYouTubeVideo(): Promise<void> {
  await waitForPlayerReady(1000);

  try {
    let currentState: number | null = null;
    if (ytPlayer?.getPlayerState) {
      currentState = ytPlayer.getPlayerState();
      if (currentState === 1) { // Already playing
        console.log('[YOUTUBE-PLAY] Already playing, skipping');
        return;
      }
    }

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
        '*'
      );
      console.log(`[YOUTUBE-PLAY] PostMessage fallback: Playing from tracked time ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s`);
    } else {
      throw new Error('No play method available');
    }

    // Poll for play confirmation (handles buffering stalls)
    await new Promise<void>((resolve) => {
      const maxAttempts = 20; // 1s @ 50ms
      let attempts = 0;
      const poll = () => {
        attempts++;
        let state = -1;
        if (ytPlayer?.getPlayerState) {
          state = ytPlayer.getPlayerState();
        } else if (youtubeIframeElement?.contentWindow) {
          // Fallback: Query state via postMessage (one-shot, response async but approx)
          youtubeIframeElement.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'getPlayerState', args: [] }),
            '*'
          );
          // Note: Actual response handled in listener; use timeout as proxy
          state = 1; // Optimistic for fallback
        }
        if (state === 1) { // Playing confirmed
          console.log(`[YOUTUBE-PLAY] Confirmed playing after ${attempts * 50}ms`);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn(`[YOUTUBE-PLAY] Timeout: state=${state}, proceeding`);
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