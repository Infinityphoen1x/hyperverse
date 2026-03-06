import { useYoutubeStore } from '@/stores/useYoutubeStore';

/**
 * Properly destroys the YouTube player and cleans up all references
 * Should be called when unmounting/unloading the YouTube player
 */
export function destroyYouTubePlayer(): void {
  // console.log('[YOUTUBE-CLEANUP] destroyYouTubePlayer called');
  
  const state = useYoutubeStore.getState();
  const ytPlayer = state.ytPlayer;
  const iframeElement = state.youtubeIframeElement;
  
  // Call destroy on the YouTube Player API if it exists
  // The destroy() method automatically removes the iframe from the DOM
  if (ytPlayer && typeof ytPlayer.destroy === 'function') {
    try {
      // console.log('[YOUTUBE-CLEANUP] Calling ytPlayer.destroy()');
      ytPlayer.destroy();
      // console.log('[YOUTUBE-CLEANUP] ytPlayer.destroy() completed');
    } catch (error) {
      // console.warn('[YOUTUBE-CLEANUP] Error destroying YouTube player:', error);
      
      // Fallback: manually remove iframe if destroy() failed
      if (iframeElement && iframeElement.parentNode) {
        try {
          iframeElement.parentNode.removeChild(iframeElement);
        } catch (removeError) {
          // console.warn('[YOUTUBE-CLEANUP] Error manually removing iframe:', removeError);
        }
      }
    }
  } else {
    // console.log('[YOUTUBE-CLEANUP] No ytPlayer to destroy or destroy method not available');
    
    // No player API available, manually remove iframe if it exists
    if (iframeElement && iframeElement.parentNode) {
      try {
        iframeElement.parentNode.removeChild(iframeElement);
      } catch (error) {
        // console.warn('[YOUTUBE-CLEANUP] Error manually removing iframe:', error);
      }
    }
  }
  
  // Clear all store references
  // console.log('[YOUTUBE-CLEANUP] Clearing YouTube store references');
  state.setYtPlayer(null);
  state.setYoutubeIframeElement(null);
  state.setPlayerReady(false);
  state.setUiReady(false);
  state.setYoutubeCurrentTimeMs(0);
  state.setLastTimeUpdate(0);
  state.setLastGoodTimeMs(null);
  state.setVideoId(null);
  state.setVideoDurationMs(0);
  
  // console.log('[YOUTUBE-CLEANUP] Cleanup complete');
}
