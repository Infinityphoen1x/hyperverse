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
  
  // Never autoplay - game engine controls playback timing
  params.append('autoplay', '0');
  
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

export function initYouTubePlayer(iframeElement: HTMLIFrameElement | null): void {
  if (!iframeElement || !window.YT) return;
  if (ytPlayer) return; // Already initialized
  
  try {
    ytPlayer = new window.YT.Player(iframeElement, {
      events: {
        onReady: () => {
          playerReady = true;
          console.log('YouTube player ready and initialized');
        },
        onError: (e: any) => console.warn('YouTube player error:', e),
      }
    });
  } catch (error) {
    console.warn('Failed to initialize YouTube player:', error);
  }
}

export function isPlayerReady(): boolean {
  return playerReady && ytPlayer !== null;
}

/**
 * Get current video time from YouTube player
 * Returns time in milliseconds to match game engine format
 */
export function getYouTubeVideoTime(iframeElement: HTMLIFrameElement | null): number | null {
  if (!ytPlayer) {
    // Try to initialize if not already done
    if (iframeElement && window.YT && window.YT.Player) {
      initYouTubePlayer(iframeElement);
    } else {
      return null;
    }
  }
  
  try {
    if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      const timeSeconds = ytPlayer.getCurrentTime();
      if (typeof timeSeconds === 'number' && !isNaN(timeSeconds) && isFinite(timeSeconds)) {
        return timeSeconds * 1000; // Convert to milliseconds
      }
    }
    return null;
  } catch (error) {
    console.warn('YouTube getCurrentTime failed:', error);
    return null;
  }
}

/**
 * Seek YouTube video to specific time (in seconds)
 */
export function seekYouTubeVideo(timeSeconds: number): boolean {
  if (!isPlayerReady()) {
    console.warn('YouTube player not ready for seekTo');
    return false;
  }
  
  try {
    ytPlayer.seekTo(Math.max(0, timeSeconds), true);
    console.log('YouTube seekTo:', timeSeconds, 'seconds - success');
    return true;
  } catch (error) {
    console.warn('YouTube seekTo failed:', error);
    return false;
  }
}

/**
 * Play YouTube video
 */
export function playYouTubeVideo(): boolean {
  if (!isPlayerReady()) {
    console.warn('YouTube player not ready for playVideo');
    return false;
  }
  
  try {
    ytPlayer.playVideo();
    console.log('YouTube play - success');
    return true;
  } catch (error) {
    console.warn('YouTube play failed:', error);
    return false;
  }
}

/**
 * Pause YouTube video
 */
export function pauseYouTubeVideo(): boolean {
  if (!isPlayerReady()) {
    console.warn('YouTube player not ready for pauseVideo');
    return false;
  }
  
  try {
    ytPlayer.pauseVideo();
    console.log('YouTube pause - success');
    return true;
  } catch (error) {
    console.warn('YouTube pause failed:', error);
    return false;
  }
}


