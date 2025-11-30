import { useEffect, useCallback, useRef, useState } from "react";
import { 
  getYouTubeVideoTime, 
  buildYouTubeEmbedUrl, 
  initYouTubePlayer, 
  seekYouTubeVideo, 
  playYouTubeVideo, 
  pauseYouTubeVideo 
} from '@/lib/utils/youtubeUtils';
import { YOUTUBE_BACKGROUND_EMBED_OPTIONS } from '@/lib/utils/gameConstants';

interface UseYouTubePlayerProps {
  videoId: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  playerInitializedRef: React.RefObject<boolean>;
  onPlaying?: () => void;
}

export function useYouTubePlayer({ videoId, iframeRef, playerInitializedRef, onPlaying }: UseYouTubePlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);

  // Get current time with polling fallback
  const getVideoTime = useCallback((): number | null => {
    return getYouTubeVideoTime();
  }, []);

  // Seek to time
  const seek = useCallback(async (time: number): Promise<void> => {
    return seekYouTubeVideo(time);
  }, []);

  // Play
  const play = useCallback(async (): Promise<void> => {
    await playYouTubeVideo();
    onPlaying?.();
  }, [onPlaying]);

  // Pause
  const pause = useCallback(async (): Promise<void> => {
    return pauseYouTubeVideo();
  }, []);

  // Init on videoId change
  useEffect(() => {
    if (!videoId || !iframeRef.current || initRef.current) return;

    const initPlayer = () => {
      try {
        const embedUrl = buildYouTubeEmbedUrl(videoId, YOUTUBE_BACKGROUND_EMBED_OPTIONS);
        iframeRef.current!.src = embedUrl;
        initYouTubePlayer(iframeRef.current!);
        playerInitializedRef.current = true;
        setIsReady(true);
        initRef.current = true;
        console.log('[YOUTUBE-HOOK] Player initialized');
      } catch (err) {
        console.error('[YOUTUBE-HOOK] Init failed:', err);
      }
    };

    initPlayer();
  }, [videoId, iframeRef, playerInitializedRef]);

  // Auto-seek/play on ready + signal
  useEffect(() => {
    if (!isReady || !videoId || !playerInitializedRef.current) return;
    // External trigger for auto-start (e.g., on gameState PLAYING)
    // This can be called from parent if needed; for now, play triggers onPlaying
  }, [isReady, videoId, playerInitializedRef]);

  return {
    getVideoTime,
    seek,
    play,
    pause,
    isReady
  };
}