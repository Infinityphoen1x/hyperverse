import { getYtPlayer, getYoutubeCurrentTimeMs, getLastTimeUpdate, getYoutubeIframeElement, getLastGoodTimeMs } from './youtubeSharedState';

/**
 * Get current video time from YouTube player
 * Returns time in milliseconds to match game engine format
 * Tries official API first (getCurrentTime), falls back to postMessage tracking, then query
 * CRITICAL: Never returns null during normal flow to prevent note desync in rhythm game
 */
export function getYouTubeVideoTime(): number | null {
  const ytPlayer = getYtPlayer();
  const youtubeCurrentTimeMs = getYoutubeCurrentTimeMs();
  const lastTimeUpdate = getLastTimeUpdate();
  const youtubeIframeElement = getYoutubeIframeElement();
  const lastGoodTimeMs = getLastGoodTimeMs();
  
  console.log('[YOUTUBE-TIME-READ] getYouTubeVideoTime() called - ytPlayer:', ytPlayer ? 'valid' : 'null', 'youtubeCurrentTimeMs:', youtubeCurrentTimeMs, 'lastTimeUpdate:', lastTimeUpdate);
  
  // Try official YouTube API method first
  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
    try {
      const timeSeconds = ytPlayer.getCurrentTime();
      console.log('[YOUTUBE-TIME-READ] Official API returned:', timeSeconds);
      if (typeof timeSeconds === 'number' && !isNaN(timeSeconds) && isFinite(timeSeconds) && timeSeconds >= 0) {
        const timeMs = timeSeconds * 1000;
        console.log(`[YOUTUBE-TIME-READ] Official API: ${(timeSeconds).toFixed(2)}s (${timeMs.toFixed(0)}ms)`);
        return timeMs;
      }
      console.warn('[YOUTUBE-TIME-READ] Official API returned invalid value:', timeSeconds);
    } catch (error) {
      console.warn('[YOUTUBE-TIME-READ] Official API call failed:', error);
    }
  } else {
    console.log('[YOUTUBE-TIME-READ] ytPlayer unavailable or getCurrentTime not a function');
  }

  // Fallback: use postMessage-tracked time (throttled)
  const timeSinceUpdate = Date.now() - lastTimeUpdate;
  console.log('[YOUTUBE-TIME-READ] Checking postMessage fallback - youtubeCurrentTimeMs:', youtubeCurrentTimeMs, 'timeSinceUpdate:', timeSinceUpdate, 'threshold: 1000');
  if (youtubeCurrentTimeMs >= 0 && timeSinceUpdate < 1000) {
    console.log(`[YOUTUBE-TIME-READ] Fallback (postMessage): ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s (${youtubeCurrentTimeMs.toFixed(0)}ms)`);
    return youtubeCurrentTimeMs;
  }

  // Tertiary: Query via postMessage (one-shot)
  if (youtubeIframeElement?.contentWindow) {
    console.log('[YOUTUBE-TIME-READ] Querying via postMessage (one-shot)...');
    youtubeIframeElement.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
      '*'
    );
    // Critical: Return last good time instead of null to prevent note desync
    if (lastGoodTimeMs !== null) {
      console.log(`[YOUTUBE-TIME-READ] Holding lastGoodTime: ${(lastGoodTimeMs / 1000).toFixed(2)}s (${lastGoodTimeMs.toFixed(0)}ms)`);
      return lastGoodTimeMs;
    }
  } else {
    console.log('[YOUTUBE-TIME-READ] No iframe element to query');
  }

  console.log(`[YOUTUBE-TIME-READ] No time available (null)`);
  return null;
}