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
} = {}): string {
  const params = new URLSearchParams();
  
  // Allow YouTube to autoplay naturally - game engine will control via pause/resume
  if (options.autoplay === false) {
    params.append('autoplay', '0');
  } else {
    params.append('autoplay', '1');
  }
  
  if (options.muted) params.append('mute', '1');
  if (options.controls === false) params.append('controls', '0');
  if (options.modestBranding) params.append('modestbranding', '1');
  // Always enable JS API for game control
  params.append('enablejsapi', '1');
  if (typeof options.start === 'number' && options.start > 0) {
    params.append('start', Math.floor(options.start).toString());
  }
  
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

export function initYouTubePlayer(iframeElement: HTMLIFrameElement | null, onReady?: () => void): void {
  if (!iframeElement) return;
  
  // Store iframe reference for direct control (postMessage-based seek/play)
  youtubeIframeElement = iframeElement;
  
  if (!window.YT) {
    // YT API not available, fall back to iframe control
    playerReady = true;
    if (onReady) onReady();
    console.log('[YOUTUBE-PLAYER-INIT] Using iframe postMessage control (YT API unavailable)');
    return;
  }
  
  try {
    ytPlayer = new window.YT.Player(iframeElement, {
      events: {
        onReady: () => {
          playerReady = true;
          console.log('[YOUTUBE-PLAYER-INIT] YouTube player ready and initialized');
          if (onReady) onReady();
        },
        onError: (e: any) => console.warn('[YOUTUBE-PLAYER-ERROR] YouTube player error:', e),
      }
    });
  } catch (error) {
    console.warn('[YOUTUBE-PLAYER-INIT] Failed to initialize YouTube player:', error);
    // Fallback: use iframe postMessage control
    playerReady = true;
    if (onReady) onReady();
  }
}

export function isPlayerReady(): boolean {
  return playerReady && ytPlayer !== null;
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
 * Tries official API first (getCurrentTime), falls back to postMessage tracking
 */
export function getYouTubeVideoTime(): number | null {
  // Try official YouTube API method first
  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
    try {
      const timeSeconds = ytPlayer.getCurrentTime();
      if (typeof timeSeconds === 'number' && !isNaN(timeSeconds) && isFinite(timeSeconds) && timeSeconds >= 0) {
        const timeMs = timeSeconds * 1000;
        console.log(`[YOUTUBE-TIME-READ] Official API: ${(timeSeconds).toFixed(2)}s (${timeMs.toFixed(0)}ms)`);
        return timeMs;
      }
    } catch (error) {
      console.warn('[YOUTUBE-TIME-READ] Official API call failed:', error);
    }
  }
  
  // Fallback: use postMessage-tracked time
  if (youtubeCurrentTimeMs >= 0) {
    console.log(`[YOUTUBE-TIME-READ] Fallback (postMessage): ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s (${youtubeCurrentTimeMs.toFixed(0)}ms)`);
    return youtubeCurrentTimeMs;
  }
  
  console.log(`[YOUTUBE-TIME-READ] No time available (null)`);
  return null;
}

/**
 * Initialize YouTube postMessage listener to track time updates
 * YouTube IFrame communicates internally via postMessage - we listen for time changes
 */
export function initYouTubeTimeListener(): void {
  const handleMessage = (event: MessageEvent) => {
    // Only process messages from YouTube's iframe
    if (!event.data || typeof event.data !== 'string') return;
    
    try {
      const data = JSON.parse(event.data);
      
      // YouTube sends currentTime updates in various message formats
      // Check for time-related messages
      if (data.event === 'onStateChange' || data.info?.playerState !== undefined) {
        // Player state changed - might need time update
        // Will be followed by time update messages
      }
      
      // Check for currentTime in the message
      if (typeof data.currentTime === 'number') {
        youtubeCurrentTimeMs = data.currentTime * 1000;
      }
      
      // YouTube also sends progress updates with currentTime
      if (data.info?.currentTime !== undefined) {
        youtubeCurrentTimeMs = data.info.currentTime * 1000;
      }
      
      // Some versions send time in a different format
      if (data.time !== undefined && typeof data.time === 'number') {
        youtubeCurrentTimeMs = data.time * 1000;
      }
      
    } catch (error) {
      // Silently ignore parse errors - not all messages are JSON
    }
  };
  
  window.addEventListener('message', handleMessage);
  console.log('[YOUTUBE-TIME-LISTENER] postMessage listener initialized for time tracking');
}

/**
 * Reset YouTube time tracker (useful for seeks and rewinds)
 */
export function resetYouTubeTimeTracker(timeSeconds: number = 0): void {
  youtubeCurrentTimeMs = timeSeconds * 1000;
  console.log(`[YOUTUBE-TIME-TRACKER] Reset to ${timeSeconds.toFixed(2)}s (${youtubeCurrentTimeMs.toFixed(0)}ms)`);
}

/**
 * Seek YouTube video to specific time (in seconds)
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function seekYouTubeVideo(timeSeconds: number): Promise<boolean> {
  // Set player as ready to proceed with operations
  playerReady = true;
  // Reset time tracker to seek position
  resetYouTubeTimeTracker(timeSeconds);
  
  const clampedTime = Math.max(0, timeSeconds);
  const minutes = Math.floor(clampedTime / 60);
  const seconds = (clampedTime % 60).toFixed(2);
  
  try {
    // Try official YouTube API first
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(clampedTime, true);
      console.log(`[YOUTUBE-SEEK] Official API: Seeking to ${minutes}:${seconds} (${clampedTime.toFixed(2)}s total)`);
      return true;
    }
    
    // Fallback: use iframe postMessage to send seek command
    if (youtubeIframeElement && youtubeIframeElement.contentWindow) {
      youtubeIframeElement.contentWindow.postMessage(
        JSON.stringify({ 
          event: 'command', 
          func: 'seekTo', 
          args: [clampedTime, true] 
        }),
        '*'
      );
      console.log(`[YOUTUBE-SEEK] PostMessage fallback: Seeking to ${minutes}:${seconds} (${clampedTime.toFixed(2)}s total)`);
      return true;
    }
    
    console.warn(`[YOUTUBE-SEEK] No seek method available (ytPlayer=${ytPlayer ? 'exists' : 'null'}, iframe=${youtubeIframeElement ? 'exists' : 'null'})`);
    return false;
  } catch (error) {
    console.warn('[YOUTUBE-SEEK] seekTo failed:', error);
    return false;
  }
}

/**
 * Play YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function playYouTubeVideo(): Promise<boolean> {
  // Set player as ready to proceed with operations
  playerReady = true;
  
  try {
    // Try official YouTube API first
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      const currentTime = ytPlayer.getCurrentTime?.() ?? 0;
      const minutes = Math.floor(currentTime / 60);
      const seconds = (currentTime % 60).toFixed(2);
      ytPlayer.playVideo();
      console.log(`[YOUTUBE-PLAY] Official API: Playing from ${minutes}:${seconds} (${currentTime.toFixed(2)}s total)`);
      return true;
    }
    
    // Fallback: use iframe postMessage to send play command
    if (youtubeIframeElement && youtubeIframeElement.contentWindow) {
      youtubeIframeElement.contentWindow.postMessage(
        JSON.stringify({ 
          event: 'command', 
          func: 'playVideo', 
          args: [] 
        }),
        '*'
      );
      console.log(`[YOUTUBE-PLAY] PostMessage fallback: Playing from tracked time ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s`);
      return true;
    }
    
    console.warn(`[YOUTUBE-PLAY] No play method available (ytPlayer=${ytPlayer ? 'exists' : 'null'}, iframe=${youtubeIframeElement ? 'exists' : 'null'})`);
    return false;
  } catch (error) {
    console.warn('[YOUTUBE-PLAY] playVideo failed:', error);
    return false;
  }
}

/**
 * Pause YouTube video
 * Uses official API if available, falls back to iframe postMessage control
 */
export async function pauseYouTubeVideo(): Promise<boolean> {
  // Set player as ready to proceed with operations
  playerReady = true;
  
  try {
    // Try official YouTube API first
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      const currentTime = ytPlayer.getCurrentTime?.() ?? 0;
      const minutes = Math.floor(currentTime / 60);
      const seconds = (currentTime % 60).toFixed(2);
      ytPlayer.pauseVideo();
      console.log(`[YOUTUBE-PAUSE] Official API: Paused at ${minutes}:${seconds} (${currentTime.toFixed(2)}s total)`);
      return true;
    }
    
    // Fallback: use iframe postMessage to send pause command
    if (youtubeIframeElement && youtubeIframeElement.contentWindow) {
      youtubeIframeElement.contentWindow.postMessage(
        JSON.stringify({ 
          event: 'command', 
          func: 'pauseVideo', 
          args: [] 
        }),
        '*'
      );
      console.log(`[YOUTUBE-PAUSE] PostMessage fallback: Paused at tracked time ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s`);
      return true;
    }
    
    console.warn(`[YOUTUBE-PAUSE] No pause method available (ytPlayer=${ytPlayer ? 'exists' : 'null'}, iframe=${youtubeIframeElement ? 'exists' : 'null'})`);
    return false;
  } catch (error) {
    console.warn('[YOUTUBE-PAUSE] pauseVideo failed:', error);
    return false;
  }
}


