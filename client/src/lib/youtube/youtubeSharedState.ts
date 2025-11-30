// src/lib/utils/youtube/youtubeSharedState.ts
// Shared state module to avoid globals and circular imports

let ytPlayer: any = null;
let youtubeIframeElement: HTMLIFrameElement | null = null;
let youtubeCurrentTimeMs: number = 0;
let lastTimeUpdate = 0;
let playerReady = false;

// Getters
export const getYtPlayer = () => ytPlayer;
export const getYoutubeIframeElement = () => youtubeIframeElement;
export const getYoutubeCurrentTimeMs = () => youtubeCurrentTimeMs;
export const getLastTimeUpdate = () => lastTimeUpdate;
export const getPlayerReady = () => playerReady;

// Setters
export const setYtPlayer = (value: any) => { ytPlayer = value; };
export const setYoutubeIframeElement = (value: HTMLIFrameElement | null) => { youtubeIframeElement = value; };
export const setYoutubeCurrentTimeMs = (value: number) => { youtubeCurrentTimeMs = value; };
export const setLastTimeUpdate = (value: number) => { lastTimeUpdate = value; };
export const setPlayerReady = (value: boolean) => { playerReady = value; };