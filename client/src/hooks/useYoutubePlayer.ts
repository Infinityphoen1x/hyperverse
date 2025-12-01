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
    setIsReady(true);
    initRef.current = true;
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