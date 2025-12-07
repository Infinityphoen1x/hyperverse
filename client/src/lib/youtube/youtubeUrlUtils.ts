// src/lib/utils/youtube/youtubeUrlUtils.ts
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
  // Origin for postMessage security (default to current domain)
  const origin = options.origin || window.location.origin;
  params.append('origin', origin);
  
  const url = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  console.log('[YOUTUBE-EMBED] Building URL with origin:', origin);
  console.log('[YOUTUBE-EMBED] Full URL:', url);

  return url;
}