# Safari Blocking YouTube iframe - Debugging

## What to Check in Safari Console

### 1. Check for X-Frame-Options Error

**Look for:**
```
Refused to display 'https://www.youtube.com/' in a frame because it set 'X-Frame-Options' to 'deny' or 'sameorigin'.
```

OR

```
Blocked a frame with origin "https://your-codespace.app.github.dev" from accessing a cross-origin frame.
```

**Meaning:** YouTube is rejecting your domain for embedding.

---

### 2. Check for Content Security Policy Error

**Look for:**
```
Refused to frame 'https://www.youtube.com/' because it violates the following Content Security Policy directive: "frame-ancestors 'self'"
```

**Meaning:** YouTube's CSP is blocking the embed.

---

### 3. Check Network Tab

In Safari: **Develop → Show Web Inspector → Network**

**Filter for:** `youtube`

**Check:**
- Does `iframe_api` script load? (Status 200?)
- Does the iframe embed URL load? (Status 200?)
- Any blocked/failed requests? (Status 0, blocked, or CORS error?)

---

### 4. Check if iframe Element Exists

In Safari Console:
```javascript
// Check if container exists
document.querySelector('[class*="pointer-events-none z-0"]')

// Check if iframe was created
document.querySelector('iframe[src*="youtube"]')

// If null → iframe not created at all
// If exists → check src
document.querySelector('iframe')?.src
```

---

## Possible Causes

### A. YouTube Embed Restrictions
Some videos have **embedding disabled** by uploader.

**Test:** Try a different video (known to allow embedding):
- Example: `dQw4w9WgXcQ` (Rick Astley - Never Gonna Give You Up)

### B. Domain Not Whitelisted
YouTube only allows embedding from:
- `localhost`
- `127.0.0.1`
- Domains in their whitelist
- **NOT** forwarded Codespaces URLs by default

**Why Chrome works:** Chrome might be more permissive with mixed content/forwarded ports.

**Why Safari blocks:** Safari enforces stricter origin policies.

---

### C. Safari's Prevent Cross-Site Tracking
Safari Settings → Privacy → **"Prevent Cross-Site Tracking"** enabled by default.

**Effect:** Blocks 3rd-party iframes in certain contexts.

**Test:** Try disabling in Safari:
1. Safari → Settings → Privacy
2. Uncheck "Prevent Cross-Site Tracking"
3. Reload page

---

### D. iframe Sandbox Restrictions
Safari might be applying stricter sandbox to dynamically created iframes.

**Check in console:**
```javascript
const iframe = document.querySelector('iframe');
console.log('sandbox:', iframe?.sandbox);
```

---

## Quick Tests

### Test 1: Can Safari Load YouTube Embeds at All?

Open Safari and navigate directly to:
```
https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&origin=https://your-codespace-url.app.github.dev
```

**If it loads:** YouTube embeds work, issue is in our code.
**If it's blocked:** YouTube blocks your domain in Safari specifically.

---

### Test 2: Static iframe Test

Add this temporarily to App.tsx:
```tsx
{/* DEBUG: Static iframe test */}
<iframe
  src="https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=1"
  width="300"
  height="200"
  style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 9999 }}
  allow="autoplay; encrypted-media"
/>
```

**If visible in Safari:** iframe can load, issue is with YT.Player API.
**If blank/blocked:** YouTube blocks your domain in Safari.

---

### Test 3: Check for Mixed Content

Safari is strict about HTTPS/HTTP mixing.

**In console:**
```javascript
console.log('Protocol:', window.location.protocol);
// Should be: https:

console.log('Origin:', window.location.origin);
// Should be: https://...app.github.dev
```

If protocol is `http:`, upgrade to HTTPS.

---

## Workarounds

### Workaround 1: Use YouTube Nocookie Domain

Safari might allow `youtube-nocookie.com`:

```typescript
// In youtubePlayerInit.ts
const youtubeHost = isSafari 
  ? 'https://www.youtube-nocookie.com'
  : 'https://www.youtube.com';

playerConfig.host = youtubeHost;
```

Then change embed URL to use `youtube-nocookie.com/embed/...`

---

### Workaround 2: Fallback to Audio-Only Mode

If Safari blocks YouTube embeds entirely:

```tsx
if (isSafari && youtubeBlockedInSafari) {
  return (
    <div>
      Safari blocks YouTube embeds from this domain.
      <br />
      Please test on Chrome or localhost.
    </div>
  );
}
```

---

### Workaround 3: Use Different Video Source

Instead of YouTube, support:
- Direct MP3/audio file upload
- SoundCloud embed (might work better in Safari)
- Audio hosted on same domain

---

## Next Steps

**Tell me:**
1. What does Safari console show? (Any errors?)
2. Does Network tab show iframe_api loading? (Status code?)
3. Does `document.querySelector('iframe')` return null or an element?
4. Does Test 1 (direct embed URL) work in Safari?

This will tell us if:
- A) YouTube blocks your Codespaces domain in Safari specifically
- B) Safari's privacy settings are blocking all 3rd-party iframes
- C) There's a code issue with how we create the iframe
