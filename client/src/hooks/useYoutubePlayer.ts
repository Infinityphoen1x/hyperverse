import { useEffect, useCallback, useRef, useState } from "react";
import { 
  getYouTubeVideoTime, 
  seekYouTubeVideo, 
  playYouTubeVideo, 
  pauseYouTubeVideo 
} from '@/lib/youtube';

interface UseYouTubePlayerProps {
  videoId: string | null;
  playerInitializedRef: React.RefObject<boolean>;
  onPlaying?: () => void;
}

export function useYouTubePlayer({ videoId, playerInitializedRef, onPlaying }: UseYouTubePlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);
  const lastValidTime = useRef<number | null>(null);

  // Get current time with fallback to last valid time (prevents null gaps during transitions)
  const getVideoTime = useCallback((): number | null => {
    const t = getYouTubeVideoTime();
    if (t != null) {
      lastValidTime.current = t;
      return t;
    }
    return lastValidTime.current;
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