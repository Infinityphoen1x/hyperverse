// src/lib/utils/youtube/youtubeSharedState.ts
// Shared state module - MIGRATED TO ZUSTAND
// Proxies calls to the centralized store
import { useYoutubeStore } from '@/stores/useYoutubeStore';

// Getters - read directly from store state
export const getYtPlayer = () => useYoutubeStore.getState().ytPlayer;
export const getYoutubeIframeElement = () => useYoutubeStore.getState().youtubeIframeElement;
export const getYoutubeCurrentTimeMs = () => useYoutubeStore.getState().youtubeCurrentTimeMs;
export const getLastTimeUpdate = () => useYoutubeStore.getState().lastTimeUpdate;
export const getPlayerReady = () => useYoutubeStore.getState().playerReady;
export const getLastGoodTimeMs = () => useYoutubeStore.getState().lastGoodTimeMs;

// Setters - dispatch actions to store
export const setYtPlayer = (value: any) => { 
  useYoutubeStore.getState().setYtPlayer(value); 
};
export const setYoutubeIframeElement = (value: HTMLIFrameElement | null) => { 
  useYoutubeStore.getState().setYoutubeIframeElement(value); 
};
export const setYoutubeCurrentTimeMs = (value: number) => { 
  useYoutubeStore.getState().setYoutubeCurrentTimeMs(value);
};
export const setLastTimeUpdate = (value: number) => { 
  useYoutubeStore.getState().setLastTimeUpdate(value); 
};
export const setPlayerReady = (value: boolean) => { 
  useYoutubeStore.getState().setPlayerReady(value); 
};
