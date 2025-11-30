// src/lib/utils/youtube/youtubeTimeListener.ts
import { youtubeCurrentTimeMs, lastTimeUpdate } from './youtubeSharedState';

/**
 * Initialize YouTube postMessage listener to track time updates
 * YouTube IFrame communicates internally via postMessage - we listen for time changes
 */
export function initYouTubeTimeListener(): void {
  console.log('[YOUTUBE-TIME-LISTENER] Initializing postMessage listener...');
  let messageCount = 0;
  
  const handleMessage = (event: MessageEvent) => {
    messageCount++;
    const originMatch = event.origin === 'https://www.youtube.com';
    console.log(`[YOUTUBE-MESSAGE] #${messageCount} origin: ${event.origin} (match: ${originMatch}), data type: ${typeof event.data}`);
    
    // Strict origin check for security
    if (event.origin !== 'https://www.youtube.com') {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Ignored: wrong origin`);
      return;
    }

    let data;
    try {
      // YT sends objects or strings; try parse if string
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
      } else {
        data = event.data;
      }
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Parsed data:`, JSON.stringify(data).slice(0, 100));
    } catch (e) {
      // Ignore non-JSON (e.g., plain "YT.ready")
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Failed to parse, ignoring (likely non-JSON)`);
      return;
    }

    // Handle state changes
    if (data.event === 'onStateChange') {
      console.log('[YOUTUBE-MESSAGE] State change:', data.data);
    }

    // Time updates: Primarily from infoDelivery (fires ~1s during play)
    if (data.event === 'infoDelivery' && data.info?.currentTime !== undefined) {
      const newTimeMs = data.info.currentTime * 1000;
      if (Math.abs(newTimeMs - youtubeCurrentTimeMs) > 50) { // Avoid micro-jitters
        youtubeCurrentTimeMs = newTimeMs;
        lastTimeUpdate = Date.now();
        console.log(`[YOUTUBE-MESSAGE] Time update (infoDelivery): ${(data.info.currentTime).toFixed(2)}s (was ${(youtubeCurrentTimeMs / 1000).toFixed(2)}s)`);
      }
      return;
    }

    // Fallback keys for other formats
    if (typeof data.currentTime === 'number') {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Found currentTime in fallback format: ${data.currentTime}`);
      youtubeCurrentTimeMs = data.currentTime * 1000;
      lastTimeUpdate = Date.now();
    } else if (data.info?.currentTime !== undefined) {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Found currentTime in info format: ${data.info.currentTime}`);
      youtubeCurrentTimeMs = data.info.currentTime * 1000;
      lastTimeUpdate = Date.now();
    } else if (data.time !== undefined && typeof data.time === 'number') {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} Found time in legacy format: ${data.time}`);
      youtubeCurrentTimeMs = data.time * 1000;
      lastTimeUpdate = Date.now();
    }

    // Query responses (e.g., getCurrentTime)
    if (data.event === 'onApiChange' && data.data?.currentTime !== undefined) {
      console.log(`[YOUTUBE-MESSAGE] #${messageCount} API change with currentTime: ${data.data.currentTime}`);
      youtubeCurrentTimeMs = data.data.currentTime * 1000;
      lastTimeUpdate = Date.now();
    }
  };

  window.addEventListener('message', handleMessage);
  console.log('[YOUTUBE-TIME-LISTENER] postMessage listener initialized and attached to window');
}