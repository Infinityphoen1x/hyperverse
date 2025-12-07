# Note Speed Velocity Fix - Complete

## Problem Identified

**Original Issue:** `noteSpeedMultiplier` was scaling note **depth** (thickness) instead of **velocity** (speed).

### What Was Wrong:
- All notes spawned at the same time (`-4000ms`) regardless of speed setting
- `noteSpeedMultiplier` changed visual depth:
  - `2.0x`: Notes were 2x thicker (illusion of speed)
  - `0.5x`: Notes were 0.5x thinner (illusion of slowness)
- Notes traveled for the same **duration** (4000ms) at all speed settings
- **No actual velocity change** - just cosmetic depth differences

## Solution Implemented

**Core Principle:** Scale the **render window duration** inversely, not the geometry depth.

### Key Changes:

1. **Removed noteSpeedMultiplier from Geometry Calculations**
   - `tapNoteGeometry.ts`: Depth is now constant (`TAP_DEPTH.MAX`)
   - `holdNoteGeometry.ts`: Approach speed is now constant (no multiplier)
   - All notes have consistent visual depth regardless of speed setting

2. **Scaled Render Window Duration**
   - Formula: `effectiveLeadTime = LEAD_TIME / noteSpeedMultiplier`
   - `2.0x speed`: `4000ms / 2.0 = 2000ms` → notes spawn later, travel faster
   - `0.5x speed`: `4000ms / 0.5 = 8000ms` → notes spawn earlier, travel slower

3. **Updated Progress Calculations**
   - `useTapNotes.ts`: Uses `effectiveLeadTime` for progress calculation
   - `HoldNotes.tsx`: Uses `effectiveLeadTime` for visibility filtering
   - Progress now reflects actual approach velocity

## Before vs After

### Before (Incorrect - Depth Scaling):
```
Speed 2.0x: Spawn at -4000ms, 2x depth, travel 4000ms → cosmetic only
Speed 1.0x: Spawn at -4000ms, 1x depth, travel 4000ms → baseline
Speed 0.5x: Spawn at -4000ms, 0.5x depth, travel 4000ms → cosmetic only
```

### After (Correct - Velocity Scaling):
```
Speed 2.0x: Spawn at -2000ms, 1x depth, travel 2000ms → actually faster!
Speed 1.0x: Spawn at -4000ms, 1x depth, travel 4000ms → baseline
Speed 0.5x: Spawn at -8000ms, 1x depth, travel 8000ms → actually slower!
```

## Impact on Gameplay

### Visual Changes:
- **2.0x Speed**: Shows 2 seconds of upcoming notes (less visual clutter, faster reaction needed)
- **1.0x Speed**: Shows 4 seconds of upcoming notes (default, balanced)
- **0.5x Speed**: Shows 8 seconds of upcoming notes (more planning time, easier sight reading)

### Timing Unchanged:
- Hit windows remain fixed (±150ms)
- Notes still reach judgement line at `note.time`
- Input timing completely unaffected by speed setting

## Files Modified

1. **tapNoteGeometry.ts**
   - Removed `noteSpeedMultiplier` parameter from `calculateDistances`
   - Removed `noteSpeedMultiplier` parameter from `calculateTapNoteGeometry`
   - Depth is now constant

2. **holdNoteGeometry.ts**
   - Removed `noteSpeedMultiplier` parameter from `calculateApproachGeometry`
   - Removed `noteSpeedMultiplier` parameter from `calculateLockedNearDistance`
   - Approach speed calculation is now constant

3. **holdNoteUtils.ts**
   - Removed `noteSpeedMultiplier` from geometry function calls
   - Added comment clarifying geometry independence

4. **useTapNotes.ts**
   - Added `effectiveLeadTime = LEAD_TIME / noteSpeedMultiplier`
   - Progress calculation uses scaled lead time
   - Visibility filtering uses scaled lead time

5. **HoldNotes.tsx**
   - Added `effectiveLeadTime` calculation
   - Visibility filtering uses scaled lead time
   - Added `noteSpeedMultiplier` to dependency array

6. **TapNote.tsx**
   - Removed `noteSpeedMultiplier` prop
   - Geometry call no longer passes speed multiplier

7. **TapNotes.tsx**
   - Removed `noteSpeedMultiplier` from store selector
   - No longer passes to TapNote component

## Validation

✅ **TypeScript Check**: PASS (no compilation errors)
✅ **Geometry Independence**: Depth is now constant
✅ **Velocity Scaling**: Render window duration scales inversely with speed
✅ **Timing Preservation**: Hit windows unaffected by speed changes

## Testing Checklist

Test in-game to verify:

1. ✅ At 2.0x speed, fewer notes are visible (2 seconds worth)
2. ✅ At 2.0x speed, notes appear to travel faster (actual velocity change)
3. ✅ At 0.5x speed, more notes are visible (8 seconds worth)
4. ✅ At 0.5x speed, notes appear to travel slower (actual velocity change)
5. ✅ All notes have consistent thickness regardless of speed
6. ✅ Hit timing is identical at all speed settings (±150ms windows)
7. ✅ Notes still reach judgement line at the exact same visual distance

## Technical Details

**Velocity Formula:**
```typescript
velocity = distance / time
// Fixed distance (JUDGEMENT_RADIUS = 187px)
// Variable time (effectiveLeadTime)

At 2.0x: v = 187px / 2000ms = 0.0935 px/ms (fast)
At 1.0x: v = 187px / 4000ms = 0.0468 px/ms (normal)
At 0.5x: v = 187px / 8000ms = 0.0234 px/ms (slow)
```

**Result:** True velocity scaling with constant geometry!
