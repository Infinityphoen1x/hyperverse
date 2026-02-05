import { useYoutubeStore } from '@/stores/useYoutubeStore';

/**
 * Reset YouTube time tracker (useful for seeks and rewinds)
 */
export function resetYouTubeTimeTracker(timeSeconds: number = 0): void {
  const timeMs = timeSeconds * 1000;
  const { setYoutubeCurrentTimeMs, setLastTimeUpdate } = useYoutubeStore.getState();
  setYoutubeCurrentTimeMs(timeMs);
  setLastTimeUpdate(Date.now());
  // console.log(`[YOUTUBE-TIME-TRACKER] Reset to ${timeSeconds.toFixed(2)}s (${timeMs.toFixed(0)}ms)`);
}