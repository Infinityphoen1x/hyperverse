import { useYouTubePlayerStore } from '@/stores/useYouTubePlayerStore';
import { useEffect, useCallback, useRef, useState } from 'react';
import { getYouTubeVideoTime, seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from '@/lib/youtube';

interface UseYouTubePlayerProps {
  videoId: string | null;
  playerInitializedRef: React.MutableRefObject<boolean>;
  onPlaying?: () => void;
}

interface UseYouTubePlayerReturn {
  getVideoTime: () => number | null;
  resetTime: () => void;
  seek: typeof seekYouTubeVideo;
  play: typeof playYouTubeVideo;
  pause: typeof pauseYouTubeVideo;
  isReady: boolean;
}

export function useYouTubePlayer({ videoId, playerInitializedRef, onPlaying }: UseYouTubePlayerProps): UseYouTubePlayerReturn {
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);
  const lastValidTime = useRef<number | null>(null);

  const getVideoTime = useCallback((): number | null => {
    const t = getYouTubeVideoTime();
    if (t !== null) {
      lastValidTime.current = t;
      return t;
    }
    return lastValidTime.current;
  }, []);

  const resetTime = useCallback(() => {
    lastValidTime.current = 0;
  }, []);

  const seek = useCallback(seekYouTubeVideo, []);
  const play = useCallback(playYouTubeVideo, []);
  const pause = useCallback(pauseYouTubeVideo, []);

  useEffect(() => {
    if (!videoId || !playerInitializedRef.current || initRef.current) return;
    
    // Delay setting isReady to allow YouTube iframe to fully initialize
    // Without this, game starts before YouTube API is ready, causing note desync
    const timeoutId = setTimeout(() => {
      setIsReady(true);
    }, 800); // 800ms buffer for YouTube initialization
    
    initRef.current = true;
    
    return () => clearTimeout(timeoutId);
  }, [videoId]);

  return {
    getVideoTime,
    resetTime,
    seek,
    play,
    pause,
    isReady
  };
}