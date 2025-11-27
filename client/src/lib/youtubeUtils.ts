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
