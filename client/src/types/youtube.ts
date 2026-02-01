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

export type { YoutubeStoreState as YouTubeStoreState } from '@/stores/useYoutubeStore';

export {};
