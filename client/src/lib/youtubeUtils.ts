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

export function initYouTubePlayer(iframeElement: HTMLIFrameElement | null, onReady?: () => void): void {
  if (!iframeElement || !window.YT) return;
  
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
    // Fallback: assume ready and use native iframe methods
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
 */
export function getYouTubeVideoTime(): number | null {
  if (!ytPlayer) {
    // Player not initialized yet - return null and let Game.tsx handle initialization
    return null;
  }
  
  try {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const timeSeconds = ytPlayer.getCurrentTime();
      if (typeof timeSeconds === 'number' && !isNaN(timeSeconds) && isFinite(timeSeconds)) {
        const timeMs = timeSeconds * 1000;
        const minutes = Math.floor(timeSeconds / 60);
        const seconds = (timeSeconds % 60).toFixed(2);
        console.log(`[YOUTUBE-GET-TIME] Current time: ${minutes}:${seconds} (${timeSeconds.toFixed(2)}s total, ${timeMs.toFixed(0)}ms)`);
        return timeMs; // Convert to milliseconds
      }
    }
    return null;
  } catch (error) {
    console.warn('[YOUTUBE-GET-TIME] YouTube getCurrentTime failed:', error);
    return null;
  }
}

/**
 * Seek YouTube video to specific time (in seconds)
 * Waits for player to be ready before attempting seek
 */
export async function seekYouTubeVideo(timeSeconds: number): Promise<boolean> {
  // Set player as ready to proceed with operations
  playerReady = true;
  
  try {
    const clampedTime = Math.max(0, timeSeconds);
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      ytPlayer.seekTo(clampedTime, true);
    }
    const minutes = Math.floor(clampedTime / 60);
    const seconds = (clampedTime % 60).toFixed(2);
    console.log(`[YOUTUBE-SEEK] Seeking to ${minutes}:${seconds} (${clampedTime.toFixed(2)}s total)`);
    return true;
  } catch (error) {
    console.warn('[YOUTUBE-SEEK] seekTo failed:', error);
    return false;
  }
}

/**
 * Play YouTube video
 * Waits for player to be ready before attempting play
 */
export async function playYouTubeVideo(): Promise<boolean> {
  // Set player as ready to proceed with operations
  playerReady = true;
  
  try {
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      const currentTime = ytPlayer.getCurrentTime?.() ?? 0;
      const minutes = Math.floor(currentTime / 60);
      const seconds = (currentTime % 60).toFixed(2);
      ytPlayer.playVideo();
      console.log(`[YOUTUBE-PLAY] Playing from ${minutes}:${seconds} (${currentTime.toFixed(2)}s total)`);
    }
    return true;
  } catch (error) {
    console.warn('[YOUTUBE-PLAY] playVideo failed:', error);
    return false;
  }
}

/**
 * Pause YouTube video
 * Waits for player to be ready before attempting pause
 */
export async function pauseYouTubeVideo(): Promise<boolean> {
  // Set player as ready to proceed with operations
  playerReady = true;
  
  try {
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      const currentTime = ytPlayer.getCurrentTime?.() ?? 0;
      const minutes = Math.floor(currentTime / 60);
      const seconds = (currentTime % 60).toFixed(2);
      ytPlayer.pauseVideo();
      console.log(`[YOUTUBE-PAUSE] Paused at ${minutes}:${seconds} (${currentTime.toFixed(2)}s total)`);
    }
    return true;
  } catch (error) {
    console.warn('[YOUTUBE-PAUSE] pauseVideo failed:', error);
    return false;
  }
}


