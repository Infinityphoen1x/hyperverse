# Too-Early Failure Issue - Analysis

## Problem

**Too-early failures are impossible to trigger** in normal gameplay.

---

## Current Logic (BROKEN)

### TAP Notes (noteProcessor.ts line 33):
```typescript
const timeSinceNote = currentTime - note.time;

// Too early check
if (timeSinceNote < -TAP_RENDER_WINDOW_MS) {  // -4000ms
  // Mark as too early failure
}

// Valid hit window
if (timeSinceNote >= -TAP_HIT_WINDOW && timeSinceNote <= TAP_HIT_WINDOW) {  // ±150ms
  // Successful hit
}
```

**Constants:**
- `TAP_RENDER_WINDOW_MS = 4000ms` (when note spawns visually)
- `TAP_HIT_WINDOW = 150ms` (valid hit window)

**Problem:** 
To trigger too-early failure, you must press **4000ms before** note.time.
But notes only spawn **4000ms before**, and hit window is ±150ms.

**Gap:** 4000ms - 150ms = **3850ms of no detection!**

---

### HOLD Notes (noteProcessor.ts line 70):
```typescript
const timeSinceNote = currentTime - note.time;

// Too early check
if (timeSinceNote < -LEAD_TIME) {  // -4000ms
  // Mark as too early failure
}

// Valid hit window
if (timeSinceNote >= -HOLD_HIT_WINDOW && timeSinceNote <= HOLD_HIT_WINDOW) {  // ±150ms
  // Successful hit
}
```

**Constants:**
- `LEAD_TIME = 4000ms` (when note spawns visually)
- `HOLD_HIT_WINDOW = 150ms` (valid hit window)

**Same problem:** 3850ms gap of no detection.

---

## What Should Happen

### Expected Behavior:

```
Timeline:
|--------------------|====|====|--------------------|
-4000ms            -150ms  0  +150ms             (time relative to note.time)
  ^                  ^          ^
  Note spawns        |          |
                 Too early    Valid hit

Region:
- Before -4000ms: Note doesn't exist yet (can't press)
- -4000ms to -151ms: TOO EARLY (should fail immediately)
- -150ms to +150ms: VALID HIT WINDOW (success)
- After +150ms: TOO LATE (auto-miss)
```

### Current (Broken) Behavior:

```
Timeline:
|----|-----------------|====|====|--------------------|
-4000ms            -150ms  0  +150ms
  ^                     ^          ^
  Too early threshold   |          |
  (impossible)      Valid hit   Too late

Region:
- Before -4000ms: TOO EARLY (but note hasn't spawned yet!)
- -4000ms to -151ms: NOTHING (no detection - button press ignored!)
- -150ms to +150ms: VALID HIT WINDOW
- After +150ms: TOO LATE (auto-miss)
```

**The 3850ms gap means pressing early has no effect - button presses are silently ignored.**

---

## Correct Fix

### Option A: Too-Early = Just Outside Hit Window (Recommended)

```typescript
// TAP Notes
const timeSinceNote = currentTime - note.time;

// Too early - pressed before hit window but after note spawned
if (timeSinceNote < -TAP_HIT_WINDOW && timeSinceNote >= -TAP_RENDER_WINDOW_MS) {
  // Too early failure (between -4000ms and -151ms)
}

// Valid hit window
if (timeSinceNote >= -TAP_HIT_WINDOW && timeSinceNote <= TAP_HIT_WINDOW) {
  // Successful hit (between -150ms and +150ms)
}
```

**Result:**
- Press between -4000ms to -151ms → Too early failure
- Press between -150ms to +150ms → Success
- Press after +150ms → Too late (auto-miss)

---

### Option B: Smaller Too-Early Window (More Forgiving)

```typescript
// Define a specific too-early threshold
const TOO_EARLY_THRESHOLD = 500; // 500ms before hit window

if (timeSinceNote < -(TAP_HIT_WINDOW + TOO_EARLY_THRESHOLD)) {
  // Ignore (note not close enough yet)
}
else if (timeSinceNote < -TAP_HIT_WINDOW) {
  // Too early failure (within 500ms before hit window)
}
else if (timeSinceNote >= -TAP_HIT_WINDOW && timeSinceNote <= TAP_HIT_WINDOW) {
  // Successful hit
}
```

**Result:**
- Press before -650ms → Ignored (no effect)
- Press between -650ms to -151ms → Too early failure
- Press between -150ms to +150ms → Success

---

## Why Current Logic Exists

Likely **legacy code** from when:
1. Notes spawned closer to judgement time
2. Or render window was much smaller
3. Or too-early was meant to catch "spam clicking" way before note appears

But with current constants:
- Notes spawn 4000ms early (visual lead time)
- Hit window is ±150ms (tight timing)
- Too-early threshold = render window = **nonsensical**

---

## Recommendation

**Implement Option A** - Too-early = just outside hit window.

**Why:**
1. **Punishes impatience:** Press before ±150ms window → failure
2. **Full coverage:** No gap between too-early and valid hit
3. **Matches expectations:** Early press = early failure (not ignored)
4. **Consistent with other rhythm games:** DDR, osu!, etc. work this way

**Change required:**

```typescript
// noteProcessor.ts line 33 (TAP)
if (timeSinceNote < -TAP_HIT_WINDOW && timeSinceNote >= -TAP_RENDER_WINDOW_MS) {
  // Too early failure
}

// noteProcessor.ts line 70 (HOLD)
if (timeSinceNote < -HOLD_HIT_WINDOW && timeSinceNote >= -LEAD_TIME) {
  // Too early failure
}
```

---

## Edge Case: What About Spam Clicking?

If player spams buttons before notes appear (before -4000ms), nothing happens:
- Note doesn't exist in hit detection yet
- Input is ignored (not processed)
- No failure, no effect

This is **correct behavior** - you can't fail a note that hasn't spawned yet.

---

## Testing After Fix

### How to Trigger Too-Early:

1. Load beatmap
2. Wait for note to spawn (visible in tunnel)
3. Press button **immediately** (don't wait for judgement line)
4. **Expected:** Note turns grey (too-early failure)

### Current (Before Fix):

1. Load beatmap
2. Wait for note to spawn
3. Press button immediately
4. **Actual:** Nothing happens (input ignored)
5. Wait until ±150ms window
6. Press again → successful hit (first press was silently dropped)

---

## Summary

**Root Cause:** Too-early threshold uses render window (4000ms) instead of hit window (150ms)

**Result:** 3850ms gap where button presses are ignored

**Fix:** Check too-early as `< -HIT_WINDOW` instead of `< -RENDER_WINDOW`

**Impact:** Players can now actually trigger too-early failures by pressing impatient
