import { create } from 'zustand';

export interface YouTubePlayerStoreState {
  videoId: string | null;
  currentTime: number;
  duration: number;
  isReady: boolean;
  lastValidTime: number | null;

  setVideoId: (videoId: string | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsReady: (ready: boolean) => void;
  setLastValidTime: (time: number | null) => void;
  getVideoTime: () => number | null;
}

export const useYouTubePlayerStore = create<YouTubePlayerStoreState>((set, get) => ({
  videoId: null,
  currentTime: 0,
  duration: 0,
  isReady: false,
  lastValidTime: null,

  setVideoId: (videoId) => set({ videoId }),
  setCurrentTime: (currentTime) => {
    set({ currentTime });
    set({ lastValidTime: currentTime });
  },
  setDuration: (duration) => set({ duration }),
  setIsReady: (isReady) => set({ isReady }),
  setLastValidTime: (lastValidTime) => set({ lastValidTime }),

  getVideoTime: () => {
    const { currentTime, lastValidTime } = get();
    return currentTime > 0 ? currentTime : lastValidTime;
  },
}));
