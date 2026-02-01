import { create } from 'zustand';

export interface YoutubeStoreState {
  ytPlayer: any;
  youtubeIframeElement: HTMLIFrameElement | null;
  youtubeCurrentTimeMs: number;
  lastTimeUpdate: number;
  playerReady: boolean;
  lastGoodTimeMs: number | null;
  videoId: string | null;
  videoDurationMs: number;
  uiReady: boolean;

  // Actions
  setYtPlayer: (player: any) => void;
  setYoutubeIframeElement: (element: HTMLIFrameElement | null) => void;
  setYoutubeCurrentTimeMs: (time: number) => void;
  setLastTimeUpdate: (time: number) => void;
  setPlayerReady: (ready: boolean) => void;
  setVideoId: (videoId: string | null) => void;
  setVideoDurationMs: (durationMs: number) => void;
  setUiReady: (ready: boolean) => void;
  setCurrentTimeSeconds: (timeSeconds: number) => void;
  setLastGoodTimeMs: (time: number | null) => void;
  getVideoTimeMs: () => number | null;
}

export const useYoutubeStore = create<YoutubeStoreState>((set, get) => ({
  ytPlayer: null,
  youtubeIframeElement: null,
  youtubeCurrentTimeMs: 0,
  lastTimeUpdate: 0,
  playerReady: false,
  lastGoodTimeMs: null,
  videoId: null,
  videoDurationMs: 0,
  uiReady: false,

  setYtPlayer: (ytPlayer) => set({ ytPlayer }),
  setYoutubeIframeElement: (youtubeIframeElement) => set({ youtubeIframeElement }),
  setYoutubeCurrentTimeMs: (youtubeCurrentTimeMs) => set((state) => ({
    youtubeCurrentTimeMs,
    lastGoodTimeMs: youtubeCurrentTimeMs >= 0 ? youtubeCurrentTimeMs : state.lastGoodTimeMs
  })),
  setLastTimeUpdate: (lastTimeUpdate) => set({ lastTimeUpdate }),
  setPlayerReady: (playerReady) => set({ playerReady }),
  setVideoId: (videoId) => set({ videoId }),
  setVideoDurationMs: (videoDurationMs) => set({ videoDurationMs }),
  setUiReady: (uiReady) => set({ uiReady }),
  setCurrentTimeSeconds: (timeSeconds) => {
    const timeMs = Math.max(0, timeSeconds * 1000);
    set((state) => ({
      youtubeCurrentTimeMs: timeMs,
      lastGoodTimeMs: timeMs || state.lastGoodTimeMs,
    }));
  },
  setLastGoodTimeMs: (lastGoodTimeMs) => set({ lastGoodTimeMs }),
  getVideoTimeMs: () => {
    const { youtubeCurrentTimeMs, lastGoodTimeMs } = get();
    return youtubeCurrentTimeMs > 0 ? youtubeCurrentTimeMs : lastGoodTimeMs;
  },
}));

// Export selectors/getters for non-React usage
export const getYoutubeStore = () => useYoutubeStore.getState();
