# YouTube Forwarded Port Fix

## Problem

YouTube iframe was blocked when accessing the app through Codespaces forwarded ports (e.g., `https://*.app.github.dev`).

**Error:** YouTube refuses to load, showing "Video unavailable" or blank iframe.

---

## Root Causes

### 1. Server Binding to localhost Only ❌

**Before:**
```typescript
httpServer.listen({
  port: 5001,
  host: "127.0.0.1",  // ❌ Only accepts local connections
});
```

**Problem:** Codespaces port forwarding requires the server to listen on all interfaces (`0.0.0.0`), not just localhost.

### 2. Missing Origin Parameter (Already Fixed) ✅

YouTube's `enablejsapi=1` requires the `origin` parameter to match the parent page's origin for CORS security.

**Already handled in code:**
```typescript
// youtubeUrlUtils.ts line 63-64
const origin = options.origin || window.location.origin;
params.append('origin', origin);
```

This automatically uses the current origin (e.g., `https://your-codespace.app.github.dev`).

---

## Fixes Applied

### 1. Server Host Binding ✅

**File:** `server/index.ts`

**Changed:**
```typescript
const host = "0.0.0.0";  // ✅ Accept connections from all interfaces
httpServer.listen(
  {
    port,
    host,
  },
  () => {
    log(`serving on ${host}:${port}`);
  },
);
```

**Result:** Server now accepts connections from Codespaces port forwarding.

---

### 2. Enhanced iframe Permissions ✅

**File:** `client/src/App.tsx`

**Added:**
```tsx
<iframe
  // ...
  allow="autoplay; encrypted-media; fullscreen"  // ✅ Added fullscreen
  allowFullScreen  // ✅ Added explicit attribute
  // ...
/>
```

**Result:** YouTube iframe has full permissions for playback and postMessage communication.

---

### 3. Debug Logging ✅

**File:** `client/src/lib/youtube/youtubeUrlUtils.ts`

**Added:**
```typescript
console.log('[YOUTUBE-EMBED] Building URL with origin:', origin);
console.log('[YOUTUBE-EMBED] Full URL:', url);
```

**Result:** Can verify the origin parameter is correct in browser console.

---

## How It Works Now

### Local Development (localhost):
```
1. Browser: http://localhost:5001
2. Server binds: 0.0.0.0:5001 (accepts all)
3. YouTube origin: http://localhost:5001
4. YouTube loads: ✅ (localhost whitelisted)
```

### Codespaces Forwarded Port:
```
1. Browser: https://random-string.app.github.dev
2. Server binds: 0.0.0.0:5001 (accepts forwarded traffic)
3. Codespaces forwards: external → 0.0.0.0:5001
4. YouTube origin: https://random-string.app.github.dev
5. YouTube loads: ✅ (origin matches parent)
```

---

## Testing Steps

### 1. Check Server Binding:
```bash
npm run dev
# Should see: "serving on 0.0.0.0:5001"
```

### 2. Check Browser Console:
Load the game and look for:
```
[YOUTUBE-EMBED] Building URL with origin: https://your-codespace.app.github.dev
[YOUTUBE-EMBED] Full URL: https://www.youtube.com/embed/xfGrN3ZsPLA?...&origin=https://your-codespace.app.github.dev
```

### 3. Verify YouTube Loads:
- Paste beatmap or click "Escaping Gravity"
- YouTube iframe should load (may be faint at 5% opacity)
- Check for video progress in console logs: `[YOUTUBE-TIME-READ]`

### 4. Test with Other Players:
Share the forwarded URL with others to verify they can:
- Access the app
- See YouTube video load
- Play the game with audio/video sync

---

## Why This Matters

### Without These Fixes:
- ❌ Server only responds to localhost
- ❌ Forwarded port shows "connection refused"
- ❌ YouTube blocks iframe due to origin mismatch
- ❌ Cannot share with other players

### With These Fixes:
- ✅ Server accepts external connections
- ✅ Forwarded port works correctly
- ✅ YouTube accepts iframe with matching origin
- ✅ Can share with other players for testing

---

## Security Notes

**Binding to 0.0.0.0:**
- Safe in Codespaces (port is still firewalled, only forwarded traffic allowed)
- Safe in local development (behind your router/firewall)
- Safe in production (behind reverse proxy like nginx/Cloudflare)

**YouTube Origin Parameter:**
- Required for `enablejsapi=1` to work
- Prevents unauthorized sites from controlling your video
- Automatically matches the parent page origin

---

## Troubleshooting

### YouTube Still Blocked?

**Check Console for:**
```
[YOUTUBE-EMBED] Building URL with origin: <what origin?>
```

**If origin is wrong:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check `window.location.origin` in console

**If YouTube shows "Video unavailable":**
- Video might be region-restricted
- Video might be embeds-disabled by uploader
- Try a different video (e.g., official music videos work best)

### Server Not Accepting Connections?

**Check binding:**
```bash
npm run dev
# Look for: "serving on 0.0.0.0:5001" (not 127.0.0.1)
```

**Check port forwarding in Codespaces:**
- Open "Ports" panel
- Verify port 5001 is forwarded
- Visibility should be "Public" for sharing with others

---

## Alternative: YouTube API (Future)

If iframe embedding continues to have issues, consider:

**YouTube Data API v3:**
- Requires API key (free tier available)
- Fetch video metadata
- No iframe restrictions
- Audio-only sync (no video player)

**Implementation:**
```typescript
// Fetch video duration/metadata
const response = await fetch(
  `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${API_KEY}`
);
```

**Trade-offs:**
- ✅ No embed restrictions
- ✅ Reliable metadata
- ❌ Requires API key
- ❌ No video player (audio only)
- ❌ Quota limits (10,000 units/day free)

---

## Summary

✅ **Server now binds to 0.0.0.0** (accepts forwarded connections)
✅ **YouTube origin parameter auto-set** (already working)
✅ **iframe permissions enhanced** (fullscreen support)
✅ **Debug logging added** (verify origin in console)

**Result:** YouTube should now work on Codespaces forwarded ports, allowing you to test with other players.

**Next Steps:** Share the forwarded URL and verify other players can access the game with YouTube sync working.
