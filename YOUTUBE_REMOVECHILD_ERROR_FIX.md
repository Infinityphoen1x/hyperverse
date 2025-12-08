# YouTube iframe removeChild Error Fix

## Issue
Runtime error: `Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node`

This error occurred when destroying the YouTube player iframe, specifically when `ytPlayer.destroy()` was called.

## Root Cause

When the YouTube IFrame API's `destroy()` method is called, it attempts to remove the iframe element from its parent node. However, in our implementation:

1. The YouTube API's `new YT.Player(containerElement, config)` replaces or modifies the container element structure
2. React may unmount the container component before the destroy is called
3. The iframe's parent node relationship may have changed or the parent may no longer exist
4. When `destroy()` tries to call `parentNode.removeChild(iframe)`, the iframe may not be a child of that node anymore

## Solution

Modified `youtubeCleanup.ts` to **manually remove the iframe from the DOM before calling `destroy()`**:

```typescript
// Manually remove the iframe from DOM before calling destroy() to prevent removeChild errors
if (iframeElement && iframeElement.parentNode) {
  try {
    console.log('[YOUTUBE-CLEANUP] Manually removing iframe from DOM');
    iframeElement.parentNode.removeChild(iframeElement);
    console.log('[YOUTUBE-CLEANUP] Iframe removed successfully');
  } catch (error) {
    console.warn('[YOUTUBE-CLEANUP] Error manually removing iframe:', error);
  }
}

// Then call destroy on the YouTube Player API
if (ytPlayer && typeof ytPlayer.destroy === 'function') {
  try {
    ytPlayer.destroy();
  } catch (error) {
    console.warn('[YOUTUBE-CLEANUP] Error destroying YouTube player:', error);
  }
}
```

## Why This Works

1. **Preemptive Cleanup**: By manually removing the iframe before calling `destroy()`, we handle the DOM cleanup ourselves
2. **Parent Check**: We verify `iframeElement.parentNode` exists before attempting removal
3. **Error Handling**: Wrapped in try-catch to gracefully handle any edge cases
4. **API Cleanup**: `destroy()` is still called to clean up YouTube API internal state, but the DOM manipulation is already complete

## Testing

- Build completes successfully
- The error should no longer occur when:
  - Unloading a beatmap
  - Going back to home screen
  - Switching between songs
  - Component unmounting with active YouTube player

## Files Changed

- `client/src/lib/youtube/youtubeCleanup.ts` - Added manual iframe removal before destroy()
- `client/src/App.tsx` - Removed clearing of youtubeVideoId when returning to home (iframe now persists until UNLOAD is pressed)

## Behavior Changes

**Before**: Returning to home screen from game would unmount the YouTube iframe
**After**: YouTube iframe persists when returning to home screen; only unmounts when UNLOAD button is pressed

This allows the video to continue playing in the background when navigating between home and game screens, and only destroys/unmounts when explicitly unloading the beatmap.
