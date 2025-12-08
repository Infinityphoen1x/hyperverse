import { useYoutubeStore } from '@/stores/useYoutubeStore';

/**
 * Properly destroys the YouTube player and cleans up all references
 * Should be called when unmounting/unloading the YouTube player
 */
export function destroyYouTubePlayer(): void {
  console.log('[YOUTUBE-CLEANUP] destroyYouTubePlayer called');
  
  const state = useYoutubeStore.getState();
  const ytPlayer = state.ytPlayer;
  const iframeElement = state.youtubeIframeElement;
  
  // Manually remove the iframe from DOM before calling destroy() to prevent removeChild errors
  if (iframeElement && iframeElement.parentNode) {
    try {
      console.log('[YOUTUBE-CLEANUP] Manually removing iframe from DOM');
      iframeElement.parentNode.removeChild(iframeElement);
      console.log('[YOUTUBE-CLEANUP] Iframe removed successfully');
    } catch (error) {
      console.warn('[YOUTUBE-CLEANUP] Error manually removing iframe:', error);
    }
  }
  
  // Call destroy on the YouTube Player API if it exists
  if (ytPlayer && typeof ytPlayer.destroy === 'function') {
    try {
      console.log('[YOUTUBE-CLEANUP] Calling ytPlayer.destroy()');
      ytPlayer.destroy();
      console.log('[YOUTUBE-CLEANUP] ytPlayer.destroy() completed');
    } catch (error) {
      console.warn('[YOUTUBE-CLEANUP] Error destroying YouTube player:', error);
    }
  } else {
    console.log('[YOUTUBE-CLEANUP] No ytPlayer to destroy or destroy method not available');
  }
  
  // Clear all store references
  console.log('[YOUTUBE-CLEANUP] Clearing YouTube store references');
  state.setYtPlayer(null);
  state.setYoutubeIframeElement(null);
  state.setPlayerReady(false);
  state.setYoutubeCurrentTimeMs(0);
  state.setLastTimeUpdate(0);
  
  console.log('[YOUTUBE-CLEANUP] Cleanup complete');
}
