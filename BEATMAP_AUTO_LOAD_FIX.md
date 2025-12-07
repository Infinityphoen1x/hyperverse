# Beatmap Auto-Load Fix

## Problem

`escaping-gravity.txt` was loading automatically on first page load, before user pasted any beatmap.

## Root Cause

**Stale localStorage data from previous sessions**

When the page loads, `Game.tsx` checks localStorage for `pendingBeatmap`:

```typescript
useEffect(() => {
  const pendingBeatmapStr = localStorage.getItem('pendingBeatmap');
  if (pendingBeatmapStr) {
    // Auto-loads from localStorage
  }
}, [difficulty]);
```

If you previously loaded "Escaping Gravity" and closed the browser, localStorage persisted across sessions, causing auto-load on next page visit.

## Solution Implemented

**Clear localStorage on initial app mount**

Modified `App.tsx` to clear stale beatmap data when the app first loads:

```typescript
// Clear stale beatmap data on initial app mount (prevents auto-load from previous sessions)
useEffect(() => {
  localStorage.removeItem('pendingBeatmap');
}, []); // Empty deps = runs once on mount
```

### How It Works:

1. **Page loads** → localStorage cleared immediately
2. User loads beatmap → stored in localStorage
3. User switches difficulty → localStorage persists (allows re-parsing)
4. User returns to Home → localStorage persists (allows re-selection)
5. **Page refresh/reload** → localStorage cleared again

## Benefits

✅ **No Auto-Load on First Visit**: Fresh start every time page loads  
✅ **Difficulty Switching Works**: localStorage persists within session  
✅ **Home Return Works**: Can re-select difficulty without reloading beatmap  
✅ **Clean Sessions**: Each browser session starts fresh

## Files Modified

1. **App.tsx**
   - Added `useEffect` with empty dependency array on mount
   - Clears `localStorage.removeItem('pendingBeatmap')` once on app initialization

## Testing

Verify:
1. ✅ Fresh page load → no beatmap auto-loaded
2. ✅ Load beatmap → works normally
3. ✅ Switch difficulty → beatmap persists and re-parses
4. ✅ Return to Home → can change difficulty and restart
5. ✅ Refresh page → localStorage cleared, no auto-load

## Why This Approach?

**vs Clearing on Home Return:**
- ❌ Would prevent difficulty re-selection after returning to Home
- ❌ Would require reloading beatmap for every difficulty change

**vs Adding Session Flag:**
- ❌ More complex
- ❌ Requires additional state management

**✅ Clearing on Mount:**
- Simple one-line fix
- Preserves all in-session functionality
- Only clears stale cross-session data
