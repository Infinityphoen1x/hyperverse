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
 * For background playback: muted with autoplay enabled
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
  
  if (options.autoplay) params.append('autoplay', '1');
  if (options.muted) params.append('mute', '1');
  if (options.controls === false) params.append('controls', '0');
  if (options.modestBranding) params.append('modestbranding', '1');
  if (options.enableJsApi) params.append('enablejsapi', '1');
  if (typeof options.start === 'number' && options.start > 0) {
    params.append('start', Math.floor(options.start).toString());
  }
  
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Check if YouTube video element is accessible and ready for time tracking
 * Returns currentTime in seconds, or null if video is not accessible
 */
export function getYouTubeVideoTime(iframeElement: HTMLIFrameElement | null): number | null {
  if (!iframeElement) return null;
  
  try {
    const videoElement = iframeElement.contentWindow?.document.querySelector('video');
    if (!videoElement) return null;
    
    const currentTime = videoElement.currentTime;
    // Validate currentTime is a valid number
    if (typeof currentTime === 'number' && !isNaN(currentTime) && isFinite(currentTime)) {
      return currentTime;
    }
    return null;
  } catch (error) {
    // Cross-origin or other access errors are silent - video may not be ready yet
    return null;
  }
}

/**
 * Seek to a specific time in the YouTube video
 * Uses the video element's currentTime property directly
 */
export function seekYouTubeVideo(iframeElement: HTMLIFrameElement | null, timeSeconds: number): boolean {
  if (!iframeElement) return false;
  
  try {
    const videoElement = iframeElement.contentWindow?.document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return false;
    
    videoElement.currentTime = timeSeconds;
    console.log('YouTube seekTo:', timeSeconds, '- success');
    return true;
  } catch (error) {
    console.warn('YouTube seekTo failed:', error);
    return false;
  }
}

/**
 * Pause the YouTube video
 */
export function pauseYouTubeVideo(iframeElement: HTMLIFrameElement | null): boolean {
  if (!iframeElement) return false;
  
  try {
    const videoElement = iframeElement.contentWindow?.document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return false;
    
    videoElement.pause();
    console.log('YouTube pause - success');
    return true;
  } catch (error) {
    console.warn('YouTube pause failed:', error);
    return false;
  }
}

/**
 * Play the YouTube video
 */
export function playYouTubeVideo(iframeElement: HTMLIFrameElement | null): boolean {
  if (!iframeElement) return false;
  
  try {
    const videoElement = iframeElement.contentWindow?.document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) return false;
    
    videoElement.play();
    console.log('YouTube play - success');
    return true;
  } catch (error) {
    console.warn('YouTube play failed:', error);
    return false;
  }
}

