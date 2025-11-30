// src/lib/utils/youtube/index.ts
export * from './youtubeTypes';
export * from './youtubeUrlUtils';
export * from './youtubePlayerInit';
export * from './youtubePlayerState';
export { getYouTubeVideoTime } from './youtubeTimeGetter';
export { initYouTubeTimeListener } from './youtubeTimeListener';
export { resetYouTubeTimeTracker } from './youtubeTimeReset';
export { seekYouTubeVideo } from './youtubeSeek';
export { playYouTubeVideo } from './youtubePlay';
export { pauseYouTubeVideo } from './youtubePause';
export * from './youtubeSharedState';
// Note: Global variables like ytPlayer, youtubeIframeElement, youtubeCurrentTimeMs, etc., need to be managed.
// Consider using a singleton class or context for shared state to avoid globals in split files.
// For now, assuming they are declared in a shared scope or exported appropriately.