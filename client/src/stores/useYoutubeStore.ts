import { create } from 'zustand';

interface YoutubeStoreState {
  ytPlayer: any;
  youtubeIframeElement: HTMLIFrameElement | null;
  youtubeCurrentTimeMs: number;
  lastTimeUpdate: number;
  playerReady: boolean;
  lastGoodTimeMs: number | null;

  // Actions
  setYtPlayer: (player: any) => void;
  setYoutubeIframeElement: (element: HTMLIFrameElement | null) => void;
  setYoutubeCurrentTimeMs: (time: number) => void;
  setLastTimeUpdate: (time: number) => void;
  setPlayerReady: (ready: boolean) => void;
}

export const useYoutubeStore = create<YoutubeStoreState>((set) => ({
  ytPlayer: null,
  youtubeIframeElement: null,
  youtubeCurrentTimeMs: 0,
  lastTimeUpdate: 0,
  playerReady: false,
  lastGoodTimeMs: null,

  setYtPlayer: (ytPlayer) => set({ ytPlayer }),
  setYoutubeIframeElement: (youtubeIframeElement) => set({ youtubeIframeElement }),
  setYoutubeCurrentTimeMs: (youtubeCurrentTimeMs) => set((state) => ({
    youtubeCurrentTimeMs,
    lastGoodTimeMs: youtubeCurrentTimeMs >= 0 ? youtubeCurrentTimeMs : state.lastGoodTimeMs
  })),
  setLastTimeUpdate: (lastTimeUpdate) => set({ lastTimeUpdate }),
  setPlayerReady: (playerReady) => set({ playerReady }),
}));

// Export selectors/getters for non-React usage
export const getYoutubeStore = () => useYoutubeStore.getState();
