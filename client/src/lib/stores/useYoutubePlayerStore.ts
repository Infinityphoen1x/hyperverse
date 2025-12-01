// src/stores/useYouTubePlayerStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import {
  getYouTubeVideoTime,
  seekYouTubeVideo,
  playYouTubeVideo,
  pauseYouTubeVideo
} from '@/lib/youtube';

interface UseYouTubePlayerProps {
  videoId: string | null;
  onPlaying?: () => void;
}

interface YouTubePlayerState {
  videoId: string | null;
  isReady: boolean;
  initRef: boolean;
  lastValidTime: number | null;
  onPlaying: (() => void) | null;

  setVideoId: (id: string | null) => void;
  setOnPlaying: (cb: (() => void) | null) => void;
  initializePlayer: (playerInitializedRef: React.RefObject<boolean>) => void;
  getVideoTime: () => number | null;
  seek: (time: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
}

export const useYouTubePlayerStore = create<YouTubePlayerState>()(
  produce((set, get) => ({
    videoId: null,
    isReady: false,
    initRef: false,
    lastValidTime: null,
    onPlaying: null,

    setVideoId: (id) => set({ videoId: id }),

    setOnPlaying: (cb) => set({ onPlaying: cb }),

    initializePlayer: (playerInitializedRef) => {
      if (!get().videoId || !playerInitializedRef.current || get().initRef) return;
      set({ isReady: true, initRef: true });
      console.log('[YOUTUBE-STORE] Player ready (initialized by App.tsx)');
    },

    getVideoTime: () => {
      const t = getYouTubeVideoTime();
      if (t != null) {
        set({ lastValidTime: t });
        return t;
      }
      return get().lastValidTime;
    },

    seek: async (time: number) => seekYouTubeVideo(time),

    play: async () => {
      await playYouTubeVideo();
      get().onPlaying?.();
      // Sync to game store if playing
      useGameStore.setState({ currentTime: get().getVideoTime() ?? 0 });
    },

    pause: async () => pauseYouTubeVideo(),
  }))
);

// Subscription for readiness (e.g., auto-play if signalled)
useYouTubePlayerStore.subscribe(
  (state) => ({ isReady: state.isReady, videoId: state.videoId }),
  ({ isReady, videoId }, prev) => {
    if (isReady && videoId && !prev.isReady) {
      // Optional: Auto-seek/play here if gameState === 'PLAYING' from gameStore
      const { gameState } = useGameStore.getState();
      if (gameState === 'PLAYING') {
        useYouTubePlayerStore.getState().play();
      }
    }
  }
);