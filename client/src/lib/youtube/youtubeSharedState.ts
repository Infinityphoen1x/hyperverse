// src/lib/utils/youtube/youtubeSharedState.ts
// Optional: Shared state module to avoid globals and circular imports
// Export shared variables here if needed for the controls

export let ytPlayer: any = null;
export let youtubeIframeElement: HTMLIFrameElement | null = null;
export let youtubeCurrentTimeMs: number = 0;
export let lastTimeUpdate = 0;
export let playerReady = false;

// Update other files to import from here instead of declaring locally