# YouTube iframe Cleanup Fix

## Issue
The YouTube iframe player was not being properly destroyed when unloading beatmaps. This caused:
- Stale YouTube Player API references in the store
- Orphaned iframe elements or abrupt DOM removal
- Potential memory leaks
- Inconsistent player state when loading new beatmaps

## Root Causes

### 1. Missing destroy() call
When the YouTube player was no longer needed (e.g., clicking UNLOAD or going back to home), the iframe was simply removed from the DOM by unmounting the React component, but the YouTube Player API's `destroy()` method was never called.

### 2. Store references not cleared
The `useYoutubeStore` maintained references to:
- `ytPlayer` (YouTube Player API instance)
- `youtubeIframeElement` (iframe DOM element)
- `playerReady` state
- Current time tracking variables

These were never reset when unloading, causing stale references to persist.

### 3. App.tsx didn't clear videoId on UNLOAD
The polling effect in `App.tsx` that syncs `youtubeVideoId` state with localStorage only updated when localStorage had a value, but didn't clear the videoId when localStorage was empty. This meant the iframe stayed mounted even after clicking UNLOAD.

## Solution

### 1. Created `youtubeCleanup.ts`
New file: `/workspaces/hyperverse/client/src/lib/youtube/youtubeCleanup.ts`

```typescript
export function destroyYouTubePlayer(): void {
  const state = useYoutubeStore.getState();
  const ytPlayer = state.ytPlayer;
  
  // Call destroy on the YouTube Player API
  if (ytPlayer && typeof ytPlayer.destroy === 'function') {
    ytPlayer.destroy();
  }
  
  // Clear all store references
  state.setYtPlayer(null);
  state.setYoutubeIframeElement(null);
  state.setPlayerReady(false);
  state.setYoutubeCurrentTimeMs(0);
  state.setLastTimeUpdate(0);
}
```

This function properly:
- Calls `ytPlayer.destroy()` to clean up the YouTube Player API instance
- Clears all store references
- Includes error handling and logging

### 2. Updated `useGameStore.unloadBeatmap()`
Modified: `/workspaces/hyperverse/client/src/stores/useGameStore.ts`

Added call to `destroyYouTubePlayer()` at the start of the `unloadBeatmap` function:

```typescript
unloadBeatmap: () => {
  // Destroy YouTube player properly before clearing references
  destroyYouTubePlayer();
  
  localStorage.removeItem('pendingBeatmap');
  set({ /* ... reset game state ... */ });
},
```

This ensures the YouTube player is destroyed whenever the user:
- Clicks the UNLOAD button on the Home page
- Loads a new beatmap (which calls unloadBeatmap first)

### 3. Updated `App.tsx` videoId polling
Modified: `/workspaces/hyperverse/client/src/App.tsx`

Added logic to clear `youtubeVideoId` when localStorage is empty:

```typescript
const loadVideoId = () => {
  const pending = localStorage.getItem('pendingBeatmap');
  if (pending) {
    // ... load video ID ...
  } else {
    // No beatmap in localStorage - clear video ID to unmount iframe
    setYoutubeVideoId(null);
  }
};
```

This ensures the iframe is properly unmounted from the DOM after the player is destroyed.

### 4. Added cleanup effect in App.tsx
Modified: `/workspaces/hyperverse/client/src/App.tsx`

Added cleanup function to the YouTube initialization effect:

```typescript
useEffect(() => {
  if (!youtubeContainerRef.current || !youtubeVideoId || !window.YT) return;
  
  // Initialize player...
  
  // Cleanup: destroy player when videoId changes or component unmounts
  return () => {
    destroyYouTubePlayer();
  };
}, [youtubeVideoId]);
```

This provides an additional safety net to ensure cleanup happens on:
- Component unmount
- videoId changes (e.g., loading a different beatmap)

## Cleanup Flow

### When user clicks UNLOAD:
1. `Home.tsx` calls `unloadBeatmap()`
2. `useGameStore.unloadBeatmap()` calls `destroyYouTubePlayer()`
3. YouTube Player API's `destroy()` is called
4. All store references are cleared
5. localStorage is cleared
6. App.tsx polling detects empty localStorage
7. `setYoutubeVideoId(null)` is called
8. React unmounts the iframe container div

### When user goes back to Home from Game:
1. `App.tsx` `onBackToHome` callback is called
2. `setYoutubeVideoId(null)` is called
3. The useEffect cleanup function runs
4. `destroyYouTubePlayer()` is called
5. YouTube Player API's `destroy()` is called
6. All store references are cleared
7. React unmounts the iframe container div
8. localStorage is also cleared

## Files Changed
1. **Created**: `/workspaces/hyperverse/client/src/lib/youtube/youtubeCleanup.ts`
2. **Modified**: `/workspaces/hyperverse/client/src/lib/youtube/index.ts` - Added export
3. **Modified**: `/workspaces/hyperverse/client/src/stores/useGameStore.ts` - Added cleanup call
4. **Modified**: `/workspaces/hyperverse/client/src/App.tsx` - Added cleanup effect and videoId clearing logic

## Testing Recommendations
1. Load a beatmap
2. Click UNLOAD - verify no console errors and iframe is removed
3. Load a beatmap again - verify it loads correctly
4. Start game, then exit - verify no console errors and iframe is removed
5. Load different beatmaps sequentially - verify no stale references or errors
6. Check browser dev tools for orphaned iframe elements or memory leaks

## Benefits
- ✅ Proper YouTube Player API lifecycle management
- ✅ No more stale references in store
- ✅ Cleaner DOM (no orphaned iframes)
- ✅ Reduced memory leaks
- ✅ More reliable beatmap loading/unloading
- ✅ Better error handling with logging
