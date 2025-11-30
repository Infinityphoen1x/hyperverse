import { useEffect, useCallback, useRef, useState } from "react";
import { 
  getYouTubeVideoTime, 
  seekYouTubeVideo, 
  playYouTubeVideo, 
  pauseYouTubeVideo 
} from '@/lib/youtube';
import { YOUTUBE_BACKGROUND_EMBED_OPTIONS } from '@/lib/config/gameConstants';

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

  // Wait for player to be ready (App.tsx handles initialization)
  useEffect(() => {
    if (!videoId || !playerInitializedRef.current || initRef.current) return;
    
    setIsReady(true);
    initRef.current = true;
    console.log('[YOUTUBE-HOOK] Player ready (initialized by App.tsx)');
  }, [videoId, playerInitializedRef]);

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