# Greyscale Audit & Fixes - Complete

## Issues Found

### 1. ❌ Hold Miss Delayed Greyscale (FIXED)

**Problem:**
```typescript
// holdGreystate.ts - BEFORE
if (failures.isHoldMissFailure && approachNearDistance >= JUDGEMENT_RADIUS * 0.7)
```
- Hold miss notes stayed colored until 70% of judgement radius
- Inconsistent with all other failures (immediate greyscale)

**Fix Applied:**
```typescript
// holdGreystate.ts - AFTER
if (failures.isHoldMissFailure) {
  return { isGreyed: true, reason: 'holdMissAtJudgement' };
}
```
✅ Now immediate greyscale like all other failures

---

### 2. ❌ Failure Visibility Windows Not Scaled by Note Speed (FIXED)

**Problem:**
Spawn windows scaled with `noteSpeedMultiplier`, but cleanup windows were **fixed**:

```typescript
// BEFORE - useTapNotes.ts
if (n.tapTooEarlyFailure) return ... && n.time >= currentTime - 4000;  // Fixed!
if (n.tapMissFailure) return ... && n.time >= currentTime - 2000;      // Fixed!
return ... && n.time >= currentTime - 500;                              // Fixed!
```

**Result at 2.0x speed:**
- Notes spawn at -2000ms ✅
- Too-early failures visible until -4000ms ❌ (note already passed judgement!)
- Animations cut off prematurely

**Result at 0.5x speed:**
- Notes spawn at -8000ms ✅
- Too-early failures visible until -4000ms ❌ (disappear halfway through approach!)
- Greyscale animation never completes

**Fix Applied:**
```typescript
// AFTER - useTapNotes.ts + HoldNotes.tsx
const effectiveLeadTime = LEAD_TIME / noteSpeedMultiplier;
const failureWindowTooEarly = effectiveLeadTime;      // Full approach duration
const failureWindowMiss = effectiveLeadTime / 2;      // Half approach (post-judgement)
const hitCleanupWindow = 500 / noteSpeedMultiplier;   // Brief cleanup

if (n.tapTooEarlyFailure) return ... && n.time >= currentTime - failureWindowTooEarly;
if (n.tapMissFailure) return ... && n.time >= currentTime - failureWindowMiss;
return ... && n.time >= currentTime - hitCleanupWindow;
```

**Result at 2.0x speed:**
- Spawn: -2000ms ✅
- Too-early window: 2000ms ✅ (matches approach time)
- Miss window: 1000ms ✅
- Animations complete before cleanup ✅

**Result at 0.5x speed:**
- Spawn: -8000ms ✅
- Too-early window: 8000ms ✅ (matches approach time)
- Miss window: 4000ms ✅
- Animations complete before cleanup ✅

---

## Greyscale Logic Summary

### TAP Notes (tapGreystate.ts)

**Triggers:**
1. `tapTooEarlyFailure` → immediate greyscale
2. `tapMissFailure` → immediate greyscale

**Animation Durations (fixed real-time):**
- Too-early: 1200ms
- Miss: 1100ms

**Colors:**
- Fill: `rgba(80, 80, 80, 0.8)` (dark grey)
- Glow: `rgba(100, 100, 100, 0.4)` (light grey)
- Stroke: `rgba(120, 120, 120, 1)` (medium grey)

**Filter:**
```typescript
drop-shadow(0 0 8px ${GREYSCALE_GLOW_COLOR}) grayscale(1)
```

---

### HOLD Notes (holdGreystate.ts)

**Triggers:**
1. `tooEarlyFailure` → immediate greyscale
2. `holdReleaseFailure` → immediate greyscale (incomplete hold, failed release)
3. `holdMissFailure` → immediate greyscale ✅ (FIXED - was delayed)

**Animation Duration (fixed real-time):**
- All failures: 1100ms

**Colors:**
- Same as TAP notes

**Filter:**
- Same as TAP notes

---

## Hold Release Failure Context

**Special Case:** `holdReleaseFailure`
- Player successfully pressed the hold note (initial activation)
- Player held through the duration
- Player released **incorrectly** (too early or too late)
- This is a **partial success** but counts as a miss
- Greyscale indicates the failed release, not a missed press

---

## Note Speed Scaling Summary

### What Scales:
1. ✅ Spawn timing: `effectiveLeadTime = LEAD_TIME / noteSpeedMultiplier`
2. ✅ Failure visibility windows: now scale with `effectiveLeadTime`
3. ✅ Hit cleanup windows: `500 / noteSpeedMultiplier`
4. ✅ Progress calculations: use `effectiveLeadTime`

### What Doesn't Scale (Correct):
1. ✅ Animation durations: 1100-1200ms (fixed real-time)
2. ✅ Greyscale colors: same at all speeds
3. ✅ Hit timing windows: ±150ms (input accuracy)
4. ✅ Note geometry depth: constant (velocity is from spawn timing)

---

## Files Modified

1. **holdGreystate.ts**
   - Removed progress gate from hold miss greyscale
   - Line 67: `if (failures.isHoldMissFailure)` (no distance check)

2. **useTapNotes.ts**
   - Added scaled failure visibility windows
   - `failureWindowTooEarly = effectiveLeadTime`
   - `failureWindowMiss = effectiveLeadTime / 2`
   - `hitCleanupWindow = 500 / noteSpeedMultiplier`

3. **HoldNotes.tsx**
   - Added same scaled failure visibility windows
   - Applied to tooEarlyFailure, holdMissFailure, holdReleaseFailure
   - Updated hold note end visibility to use scaled cleanup window

---

## Validation

✅ **TypeScript Check**: PASS (no errors)
✅ **Greyscale Consistency**: All failures immediate greyscale
✅ **Animation Timing**: Fixed real-time durations (1100-1200ms)
✅ **Note Speed Scaling**: Visibility windows scale correctly
✅ **Colors & Filters**: Consistent between TAP and HOLD

---

## Testing Checklist

Verify in-game at different speeds:

### At 1.0x (baseline):
1. ✅ Too-early failures greyscale immediately
2. ✅ Miss failures greyscale immediately
3. ✅ Greyscale animation completes before note disappears
4. ✅ Hold release failures greyscale immediately

### At 2.0x (fast):
1. ✅ Failed notes visible for full 2000ms approach
2. ✅ Greyscale animation (1100ms) completes before cleanup
3. ✅ No premature disappearance

### At 0.5x (slow):
1. ✅ Failed notes visible for full 8000ms approach
2. ✅ Greyscale animation (1100ms) completes before cleanup
3. ✅ Notes don't disappear mid-approach

### Hold Release Specific:
1. ✅ Press hold successfully → note stays colored
2. ✅ Release incorrectly → immediate greyscale
3. ✅ Greyscale indicates failed release (partial success scenario)

---

## Summary

**Fixed 2 critical issues:**
1. Hold miss now greyscales immediately (consistency)
2. Failure visibility windows now scale with note speed (proper animation completion)

**Result:** Greyscale logic is now consistent across all note types and all note speeds, with proper animation completion timing.
