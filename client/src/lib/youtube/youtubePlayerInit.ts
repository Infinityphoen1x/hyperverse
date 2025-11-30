// src/lib/utils/youtube/youtubePlayerInit.ts
import { waitForPlayerReady } from './youtubePlayerState';

let ytPlayer: any = null;
let playerReady = false;
let youtubeIframeElement: HTMLIFrameElement | null = null; // Keep reference to iframe for direct control

export function initYouTubePlayer(iframeElement: HTMLIFrameElement | null, onReady?: () => void): void {
  console.log('[YOUTUBE-PLAYER-INIT] initYouTubePlayer called, iframeElement:', iframeElement ? 'present' : 'null');
  if (!iframeElement) {
    console.warn('[YOUTUBE-PLAYER-INIT] No iframe element provided');
    return;
  }

  // Store iframe reference for direct control (postMessage-based seek/play)
  youtubeIframeElement = iframeElement;
  console.log('[YOUTUBE-PLAYER-INIT] Iframe stored, src:', iframeElement.src?.slice(0, 50) + '...');

  // Dynamic script load if YT API missing
  if (!window.YT) {
    console.log('[YOUTUBE-PLAYER-INIT] YT API missing, loading script dynamically');
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(tag, firstScript);
    console.log('[YOUTUBE-PLAYER-INIT] API script injected, waiting for onYouTubeIframeAPIReady...');

    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('[YOUTUBE-PLAYER-INIT] API ready callback fired');
      initPlayer(onReady);
    };
    return;
  }

  console.log('[YOUTUBE-PLAYER-INIT] YT API already available, initializing player directly');
  initPlayer(onReady);

  function initPlayer(onReadyCb?: () => void) {
    console.log('[YOUTUBE-PLAYER-INIT] initPlayer() called, window.YT:', window.YT ? 'available' : 'undefined');
    try {
      console.log('[YOUTUBE-PLAYER-INIT] Creating new YT.Player instance...');
      ytPlayer = new window.YT.Player(iframeElement, {
        events: {
          onReady: () => {
            playerReady = true;
            console.log('[YOUTUBE-PLAYER-INIT] Player onReady fired - ytPlayer is now:', ytPlayer ? 'valid' : 'null');
            console.log('[YOUTUBE-PLAYER-INIT] ytPlayer methods available:', {
              playVideo: typeof ytPlayer?.playVideo,
              pauseVideo: typeof ytPlayer?.pauseVideo,
              seekTo: typeof ytPlayer?.seekTo,
              getCurrentTime: typeof ytPlayer?.getCurrentTime,
              getPlayerState: typeof ytPlayer?.getPlayerState
            });
            onReadyCb?.();
          },
          onError: (e: any) => console.warn('[YOUTUBE-PLAYER-ERROR] YouTube player error:', e),
          onStateChange: (e: any) => {
            console.log('[YOUTUBE-STATE-CHANGE] State:', e.data); // 1=playing, 2=paused
          }
        }
      });
      console.log('[YOUTUBE-PLAYER-INIT] YT.Player instance created, ytPlayer:', ytPlayer ? 'valid' : 'null');
    } catch (error) {
      console.warn('[YOUTUBE-PLAYER-INIT] Failed to initialize YouTube player:', error);
      console.warn('[YOUTUBE-PLAYER-INIT] ytPlayer state after error:', ytPlayer ? 'has value' : 'null');
      // Fallback ready
      playerReady = true;
      onReadyCb?.();
    }
  }
}

