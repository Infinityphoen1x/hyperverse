import { useYouTubePlayerStore } from '@/stores/useYouTubePlayerStore';
import { useEffect, useCallback, useRef, useState } from 'react';
import { getYouTubeVideoTime, seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from '@/lib/youtube';

interface UseYouTubePlayerProps {
  videoId: string | null;
  playerInitializedRef: React.MutableRefObject<boolean>;
  onPlaying?: () => void;
}

export function useYouTubePlayer({ videoId, playerInitializedRef, onPlaying }: UseYouTubePlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);
  const lastValidTime = useRef<number | null>(null);

  const getVideoTime = useCallback((): number | null => {
    const t = getYouTubeVideoTime();
    if (t != null) {
      lastValidTime.current = t;
      return t;
    }
    return lastValidTime.current;
  }, []);

  useEffect(() => {
    if (!videoId || !playerInitializedRef.current || initRef.current) return;
    setIsReady(true);
    initRef.current = true;
  }, [videoId, playerInitializedRef]);

  return {
    getVideoTime,
    seek: seekYouTubeVideo,
    play: playYouTubeVideo,
    pause: pauseYouTubeVideo,
    isReady
  };
}