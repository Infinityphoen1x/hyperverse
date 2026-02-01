import { useYoutubeStore } from '@/stores/useYoutubeStore';

export function initYouTubePlayer(containerElement: HTMLDivElement | null, videoId: string, onReady?: () => void): void {
  console.log('[YOUTUBE-PLAYER-INIT] initYouTubePlayer called, containerElement:', containerElement ? 'present' : 'null');
  if (!containerElement) {
    console.warn('[YOUTUBE-PLAYER-INIT] No container element provided');
    return;
  }

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
      initPlayer(videoId, onReady);
    };
    return;
  }

  // Safari: Check if YT.Player is actually ready (not just window.YT exists)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari && window.YT && typeof window.YT.Player !== 'function') {
    console.log('[YOUTUBE-PLAYER-INIT] Safari: YT exists but Player not ready, waiting 500ms...');
    setTimeout(() => initYouTubePlayer(containerElement, videoId, onReady), 500);
    return;
  }

  console.log('[YOUTUBE-PLAYER-INIT] YT API already available, initializing player directly');
  initPlayer(videoId, onReady);

  function initPlayer(vidId: string, onReadyCb?: () => void) {
    if (!containerElement) {
      console.warn('[YOUTUBE-PLAYER-INIT] Container element became null');
      return;
    }
    
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const origin = window.location.origin;
    
    console.log('[YOUTUBE-PLAYER-INIT] initPlayer() called, window.YT:', window.YT ? 'available' : 'undefined');
    console.log('[YOUTUBE-PLAYER-INIT] Browser:', isSafari ? 'Safari' : 'Other', 'Origin:', origin);
    
    try {
      console.log('[YOUTUBE-PLAYER-INIT] Creating new YT.Player instance with videoId:', vidId);
      
      const playerConfig: any = {
        height: '100%',
        width: '100%',
        videoId: vidId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: origin,
          widget_referrer: origin
        },
        events: {
          onReady: () => {
            useYoutubeStore.getState().setPlayerReady(true);
            console.log('[YOUTUBE-PLAYER-INIT] Player onReady fired - ytPlayer is now: valid');
            console.log('[YOUTUBE-PLAYER-INIT] ytPlayer methods available:', {
              playVideo: typeof player?.playVideo,
              pauseVideo: typeof player?.pauseVideo,
              seekTo: typeof player?.seekTo,
              getCurrentTime: typeof player?.getCurrentTime,
              getPlayerState: typeof player?.getPlayerState
            });
            
            // Capture video duration
            try {
              const duration = player?.getDuration();
              if (duration && !isNaN(duration)) {
                const durationMs = Math.floor(duration * 1000);
                useYoutubeStore.getState().setVideoDurationMs(durationMs);
                console.log('[YOUTUBE-PLAYER-INIT] Video duration captured:', durationMs, 'ms');
              }
            } catch (e) {
              console.warn('[YOUTUBE-PLAYER-INIT] Failed to get video duration:', e);
            }
            
            onReadyCb?.();
          },
          onError: (e: any) => console.warn('[YOUTUBE-PLAYER-ERROR] YouTube player error:', e),
          onStateChange: (e: any) => {
            console.log('[YOUTUBE-STATE-CHANGE] State:', e.data); // -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
            
            // Sync isPlaying state with YouTube player state
            // This ensures the play button UI updates when YouTube auto-plays (e.g., after seeking)
            const isPlaying = e.data === 1; // 1 = playing
            const isPaused = e.data === 2; // 2 = paused
            
            if (isPlaying || isPaused) {
              // Get the editor store to update isPlaying state
              // We need to import this dynamically to avoid circular dependencies
              import('@/stores/useEditorCoreStore').then(({ useEditorCoreStore }) => {
                useEditorCoreStore.getState().setIsPlaying(isPlaying);
              });
            }
          }
        }
      };
      
      // Safari workaround: Add host parameter for cross-origin contexts
      if (isSafari) {
        playerConfig.host = 'https://www.youtube.com';
        console.log('[YOUTUBE-PLAYER-INIT] Safari: Added explicit host parameter');
      }
      
      console.log('[YOUTUBE-PLAYER-INIT] Full playerConfig:', JSON.stringify({
        videoId: playerConfig.videoId,
        playerVars: playerConfig.playerVars,
        host: playerConfig.host
      }));
      
      const player = new window.YT.Player(containerElement, playerConfig);
      useYoutubeStore.getState().setYtPlayer(player);
      
      // Store the created iframe element for fallback postMessage control
      // Note: iframe might not exist immediately, use setTimeout
      setTimeout(() => {
        const iframe = containerElement.querySelector('iframe');
        if (iframe) {
          useYoutubeStore.getState().setYoutubeIframeElement(iframe);
          console.log('[YOUTUBE-PLAYER-INIT] Iframe element found');
          console.log('[YOUTUBE-PLAYER-INIT] Iframe src:', iframe.src);
          
          // Check if origin is in the src
          const hasOrigin = iframe.src.includes('origin=');
          const originValue = hasOrigin ? decodeURIComponent(iframe.src.split('origin=')[1]?.split('&')[0] || '') : 'NOT FOUND';
          console.log('[YOUTUBE-PLAYER-INIT] Origin in src:', hasOrigin ? originValue : 'MISSING!');
          console.log('[YOUTUBE-PLAYER-INIT] Expected origin:', window.location.origin);
          
          // Set iframe attributes for cross-origin compatibility (Safari/Firefox)
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
          iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
          // Prevent iframe from receiving keyboard events (fixes keys 1-6 triggering YouTube seek)
          iframe.setAttribute('tabindex', '-1');
          // Prevent iframe from stealing focus
          iframe.addEventListener('focus', () => iframe.blur());
          console.log('[YOUTUBE-PLAYER-INIT] Set allow, referrerpolicy, and tabindex attributes');
        } else {
          console.warn('[YOUTUBE-PLAYER-INIT] Iframe not found in container after 100ms, trying 500ms...');
          setTimeout(() => {
            const iframe2 = containerElement.querySelector('iframe');
            if (iframe2) {
              useYoutubeStore.getState().setYoutubeIframeElement(iframe2);
              iframe2.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
              iframe2.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
              // Prevent iframe from receiving keyboard events (fixes keys 1-6 triggering YouTube seek)
              iframe2.setAttribute('tabindex', '-1');
              // Prevent iframe from stealing focus
              iframe2.addEventListener('focus', () => iframe2.blur());
              console.log('[YOUTUBE-PLAYER-INIT] Iframe found after 500ms, src:', iframe2.src);
            }
          }, 400);
        }
      }, 100);
      console.log('[YOUTUBE-PLAYER-INIT] YT.Player instance created, ytPlayer: valid');
    } catch (error) {
      console.warn('[YOUTUBE-PLAYER-INIT] Failed to initialize YouTube player:', error);
      // Fallback ready
      useYoutubeStore.getState().setPlayerReady(true);
      onReadyCb?.();
    }
  }
}

