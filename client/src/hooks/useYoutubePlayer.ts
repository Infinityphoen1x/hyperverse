// src/hooks/useYouTubePlayer.ts
import { useYouTubePlayerStore } from '@/stores/useYouTubePlayerStore';
import type { UseYouTubePlayerProps } from '@/lib/youtube'; // If typed

export function useYouTubePlayer({ videoId, onPlaying, playerInitializedRef }: UseYouTubePlayerProps) {
  const store = useYouTubePlayerStore;
  store.setState({ videoId, onPlaying }); // Bind props to store
  store.getState().initializePlayer(playerInitializedRef); // Trigger init

  return {
    getVideoTime: store.getState().getVideoTime.bind(store.getState()),
    seek: store.getState().seek.bind(store.getState()),
    play: store.getState().play.bind(store.getState()),
    pause: store.getState().pause.bind(store.getState()),
    isReady: store((state) => state.isReady),
  };
}