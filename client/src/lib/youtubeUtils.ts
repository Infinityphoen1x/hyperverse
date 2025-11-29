// Declare YouTube IFrame API on window
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Extract YouTube video ID from URL or ID string
 * Supports: full URLs, shortened URLs, and raw video IDs
 */
export function extractYouTubeId(url: string): string | null {
  // Input validation
  if (!url || typeof url !== 'string') {
    return null;
  }
  // Trim whitespace
  url = url.trim();
  // Validate URL is not empty after trimming
  if (url.length === 0) {
    return null;
  }
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Raw ID: must be exactly 11 chars, nothing more
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Build YouTube embed URL with full audio/video sync support
 * For background playback: game engine controls playback via API
 * For gameplay sync: must use currentTime property via iframe access
 */
export function buildYouTubeEmbedUrl(videoId: string, options: {
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  modestBranding?: boolean;
  enableJsApi?: boolean;
  start?: number; // Start time in seconds
  origin?: string; // Security for postMessage
} = {}): string {
  const params = new URLSearchParams();

  // Default to no autoplay for background control
  params.append('autoplay', '0');
  if (options.autoplay === true) params.append('autoplay', '1');

  // Prevent YouTube from showing related videos (game focus)
  params.append('rel', '0');
  
  if (options.muted) params.append('mute', '1');
  if (options.controls === false) params.append('controls', '0');
  if (options.modestBranding) params.append('modestbranding', '1');
  // Always enable JS API for game control
  params.append('enablejsapi', '1');
  if (typeof options.start === 'number' && options.start > 0) {
    params.append('start', Math.floor(options.start).toString());
  }
  // Origin for postMessage security (default to current domain; set via env in prod)
  const origin = options.origin || window.location.origin;
  params.append('origin', origin);

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * YouTube IFrame API Player wrapper
 * Provides pause/resume/seek functionality using official YouTube API
 */
let ytPlayer: any = null;
let playerReady = false;
let youtubeCurrentTimeMs: number = 0; // Track time from postMessage events
let youtubeIframeElement: HTMLIFrameElement | null = null; // Keep reference to iframe for direct control
let lastTimeUpdate = 0; // Throttle updates to ~1s

export function initYouTubePlayer(iframeElement: HTMLIFrameElement | null, onReady?: () => void): void {
  console.log('[YOUTUBE-PLAYER-INIT] initYouTubePlayer called, iframeElement:', iframeElement ? 'present' : 'null');
  if (!iframeElement) {
    console.warn('[YOUTUBE-PLAYER-INIT] No iframe element provided');
    return;
  }

  // Store iframe reference for direct control (postMessage-based seek/play)
  youtubeIframeElement = iframeElement;
  console.log('[YOUTUBE-PLAYER-INIT] Iframe stored, src:', iframeElement.src?.slice(0, 50) + '...');

  // Dynamic script load if YT API missing
  if (!window.YT) {
    console.log('[YOUTUBE-PLAYER-INIT] YT API missing, loading script dynamically');
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(tag, firstScript);
    console.log('[YOUTUBE-PLAYER-INIT] API script injected, waiting for onYouTubeIframeAPIReady...');

    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('[YOUTUBE-PLAYER-INIT] API ready callback fired');
      initPlayer(onReady);
    };
    return;
  }

  console.log('[YOUTUBE-PLAYER-INIT] YT API already available, initializing player directly');
  initPlayer(onReady);

  function initPlayer(onReadyCb?: () => void) {
    console.log('[YOUTUBE-PLAYER-INIT] initPlayer() called, window.YT:', window.YT ? 'available' : 'undefined');
    try {
      console.log('[YOUTUBE-PLAYER-INIT] Creating new YT.Player instance...');
      ytPlayer = new window.YT.Player(iframeElement, {
        events: {
          onReady: () => {
            playerReady = true;
            console.log('[YOUTUBE-PLAYER-INIT] Player onReady fired - ytPlayer is now:', ytPlayer ? 'valid' : 'null');
            console.log('[YOUTUBE-PLAYER-INIT] ytPlayer methods available:', {
              playVideo: typeof ytPlayer?.playVideo,
              pauseVideo: typeof ytPlayer?.pauseVideo,
              seekTo: typeof ytPlayer?.seekTo,
              getCurrentTime: typeof ytPlayer?.getCurrentTime,
              getPlayerState: typeof ytPlayer?.getPlayerState
            });
            onReadyCb?.();
          },
          onError: (e: any) => console.warn('[YOUTUBE-PLAYER-ERROR] YouTube player error:', e),
          onStateChange: (e: any) => {
            console.log('[YOUTUBE-STATE-CHANGE] State:', e.data); // 1=playing, 2=paused
          }
        }
      });
      console.log('[YOUTUBE-PLAYER-INIT] YT.Player instance created, ytPlayer:', ytPlayer ? 'valid' : 'null');
    } catch (error) {
      console.warn('[YOUTUBE-PLAYER-INIT] Failed to initialize YouTube player:', error);
      console.warn('[YOUTUBE-PLAYER-INIT] ytPlayer state after error:', ytPlayer ? 'has value' : 'null');
      // Fallback ready
      playerReady = true;
      onReadyCb?.();
    }
  }
}

export function isPlayerReady(): boolean {
  return playerReady && (ytPlayer !== null || youtubeIframeElement !== null);
}

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

/**
 * Get current video time from YouTube player
 * Returns time in milliseconds to match game engine format
 * Tries official API first (getCurrentTime), falls back to postMessage tracking, then query
 */
export function getYouTubeVideoTime(): number | null {
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
    // Listen once for response (handled in listener)
  } else {
    console.log('[YOUTUBE-TIME-READ] No iframe element to query');
  }

  console.log(`[YOUTUBE-TIME-READ] No time available (null)`);
  return null;
}

/**
 * Initialize YouTube postMessage listener to track time updates
 * YouTube IFrame communicates internally via postMessage - we listen for time changes
 */
export function initYouTubeTimeListener(): void {
  console.log('[YOUTUBE-TIME-LISTENER] Initializing postMessage listener...');
  let messageCount = 0;
  
  const handleMessage = (event: MessageEvent) => {
    messageCount++;
    const originMatch = event.origin === 'https://www.youtube.com';
    console.log(`[YOUTUBE-MESSAGE] #${messageCount} origin: ${event.origin} (match: ${originMatch}), data type: ${typeof event.data}`);
    
    // Strict origin check for security
    if (event.origin !== 'https://www.youtube.com') {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Ignored: wrong origin`);
      return;
    }

    let data;
    try {
      // YT sends objects or strings; try parse if string
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
      } else {
        data = event.data;
      }
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Parsed data:`, JSON.stringify(data).slice(0, 100));
    } catch (e) {
      // Ignore non-JSON (e.g., plain "YT.ready")
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Failed to parse, ignoring (likely non-JSON)`);
      return;
    }

    // Handle state changes
    if (data.event === 'onStateChange') {
      console.log('[YOUTUBE-MESSAGE] State change:', data.data);
    }

    // Time updates: Primarily from infoDelivery (fires ~1s during play)
    if (data.event === 'infoDelivery' && data.info?.currentTime !== undefined) {
      const newTimeMs = data.info.currentTime * 1000;
      if (Math.abs(newTimeMs - youtubeCurrentTimeMs) > 50) { // Avoid micro-jitters
        youtubeCurrentTimeMs = newTimeMs;
        lastTimeUpdate = Date.now();
        console.log(`[YOUTUBE-MESSAGE] Time update (infoDelivery): ${(data.info.currentTime).toFixed(2)}s (was ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s)`);
      }
      return;
    }

    // Fallback keys for other formats
    if (typeof data.currentTime === 'number') {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Found currentTime in fallback format: ${data.currentTime}`);
      youtubeCurrentTimeMs = data.currentTime * 1000;
      lastTimeUpdate = Date.now();
    } else if (data.info?.currentTime !== undefined) {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Found currentTime in info format: ${data.info.currentTime}`);
      youtubeCurrentTimeMs = data.info.currentTime * 1000;
      lastTimeUpdate = Date.now();
    } else if (data.time !== undefined && typeof data.time === 'number') {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Found time in legacy format: ${data.time}`);
      youtubeCurrentTimeMs = data.time * 1000;
      lastTimeUpdate = Date.now();
    }

    // Query responses (e.g., getCurrentTime)
    if (data.event === 'onApiChange' && data.data?.currentTime !== undefined) {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} API change with currentTime: ${data.data.currentTime}`);
      youtubeCurrentTimeMs = data.data.currentTime * 1000;
      lastTimeUpdate = Date.now();
    }
  };

  window.addEventListener('message', handleMessage);
  console.log('[YOUTUBE-TIME-LISTENER] postMessage listener initialized and attached to window');
}

/**
 * Reset YouTube time tracker (useful for seeks and rewinds)
 */
export function resetYouTubeTimeTracker(timeSeconds: number = 0): void {
  youtubeCurrentTimeMs = timeSeconds * 1000;
  lastTimeUpdate = Date.now();
  console.log(`[YOUTUBE-TIME-TRACKER] Reset to ${timeSeconds.toFixed(2)}s (${youtubeCurrentTimeMs.toFixed(0)}ms)`);
}

/**
 * Seek YouTube video to specific time (in seconds) with polling confirmation
 * Uses official API if available, falls back to iframe postMessage control
 */
/**
 * Seek YouTube video to specific time (in seconds) with polling confirmation
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function seekYouTubeVideo(timeSeconds: number, signal?: AbortSignal): Promise<void> {
  await waitForPlayerReady(2000);
  if (signal?.aborted) throw new Error('Seek aborted');
  playerReady = true;

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

/**
 * Play YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
/**
 * Play YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
/**
 * Play YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function playYouTubeVideo(): Promise<void> {
  await waitForPlayerReady(1000);
  playerReady = true;

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

    // NEW: Poll for play confirmation (handles buffering stalls)
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
          // UNMUTE on gesture success
          if (ytPlayer && typeof ytPlayer.unMute === 'function') {
            try {
              ytPlayer.unMute();
              console.log('[YOUTUBE-PLAY] Unmuted on gesture success');
            } catch (err) {
              console.warn('[YOUTUBE-PLAY] Unmute failed:', err);
            }
          }
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn(`[YOUTUBE-PLAY] Timeout: state=${state}, proceeding`);
          // UNMUTE even on timeout
          if (ytPlayer && typeof ytPlayer.unMute === 'function') {
            try {
              ytPlayer.unMute();
              console.log('[YOUTUBE-PLAY] Unmuted on timeout fallback');
            } catch (err) {
              console.warn('[YOUTUBE-PLAY] Unmute failed:', err);
            }
          }
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
/**
 * Pause YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function pauseYouTubeVideo(): Promise<void> {
  await waitForPlayerReady(1000);
  playerReady = true;

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