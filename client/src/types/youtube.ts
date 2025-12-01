/**
 * YouTube player and integration types
 * For use in Zustand YouTube store and YouTube utilities
 */

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayerConfig {
  autoplay: number;
  controls: number;
  modestbranding: number;
  rel: number;
  showinfo: number;
}

export interface YouTubePlayerState {
  videoId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isReady: boolean;
  volume: number;
}

/**
 * Zustand Store Types
 */

export interface YouTubeStoreState {
  // State
  videoId: string | null;
  currentTime: number;
  duration: number;
  isReady: boolean;
  lastValidTime: number | null;
  
  // Actions
  setVideoId: (videoId: string | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsReady: (ready: boolean) => void;
  setLastValidTime: (time: number | null) => void;
  
  // Utilities
  getVideoTime: () => number | null;
}

export {};
