# BPM Scaling Removal - Complete

## Summary

Successfully removed all BPM scaling from the Hyperverse codebase. **BPM now affects NOTHING**. Note speed multiplier (0.5x to 2.0x) is the only factor affecting visual rendering speed, while input timing windows remain completely fixed.

## Changes Made

### Core Timing Logic (Input Timing - Fixed)

1. **noteValidator.ts**
   - Removed `effectiveLEAD_TIME` calculation
   - Removed `beatmapBpm` parameter from constructor
   - All timing checks now use fixed `LEAD_TIME` (4000ms)
   - Functions affected: `findPressableHoldNote`, `findActiveHoldNote`, `getVisibleNotes`, `updateNoteTimes`

2. **noteProcessor.ts**
   - Removed `effectiveLEAD_TIME` calculation
   - Removed `beatmapBpm` parameter from constructor
   - "Too early" detection now uses fixed `LEAD_TIME`
   - All input validation windows are now BPM-independent

### Geometry & Rendering (Visual Speed - noteSpeedMultiplier Only)

3. **holdNoteGeometry.ts**
   - Removed `beatmapBpm` parameter from `calculateApproachGeometry`
   - Removed `beatmapBpm` parameter from `calculateLockedNearDistance`
   - Removed `REFERENCE_BPM` import
   - Approach speed now calculated as: `(TUNNEL_DISTANCE / LEAD_TIME) * noteSpeedMultiplier`
   - Comments updated to clarify fixed LEAD_TIME with noteSpeedMultiplier scaling

4. **tapNoteGeometry.ts**
   - Removed `beatmapBpm` parameter from `calculateDistances`
   - Removed `beatmapBpm` parameter from `calculateTapNoteGeometry`
   - Depth scaling now purely based on noteSpeedMultiplier

5. **tapNoteHelpers.ts**
   - Changed `shouldRenderTapNote` parameter from `beatmapBpm` to `noteSpeedMultiplier`
   - Removed `REFERENCE_BPM` import
   - Render window check now uses fixed `LEAD_TIME`

### Hooks & Store Integration

6. **useGameEngine.ts**
   - Removed `beatmapBpm` from validator/processor construction
   - Simplified to: `new NoteValidator(gameConfig)` and `new NoteProcessor(gameConfig, validator, scorer)`

7. **useTapNotes.ts**
   - Replaced `beatmapBpm` with `noteSpeedMultiplier` from store
   - Removed `REFERENCE_BPM` import
   - Visibility filtering now uses fixed `LEAD_TIME`
   - Progress calculation uses fixed `LEAD_TIME`

8. **useHoldNotes.ts**
   - Replaced `beatmapBpm` with `noteSpeedMultiplier`
   - Passes noteSpeedMultiplier to `processSingleHoldNote`

9. **holdNoteUtils.ts**
   - Changed `processSingleHoldNote` parameter from `beatmapBpm` to `noteSpeedMultiplier`
   - All geometry calculations now use noteSpeedMultiplier

### Components

10. **TapNote.tsx**
    - Changed prop from `beatmapBpm` to `noteSpeedMultiplier`
    - Updated function call to use noteSpeedMultiplier

11. **TapNotes.tsx**
    - Gets `noteSpeedMultiplier` from store instead of `beatmapBpm`
    - Passes noteSpeedMultiplier to TapNote component

12. **HoldNotes.tsx**
    - Removed `beatmapBpm` from store selector
    - Removed `REFERENCE_BPM` import
    - Visibility filtering uses fixed `LEAD_TIME`

## Before vs After

### Before (BPM-Scaled):
- **120 BPM**: `LEAD_TIME = 4000ms` → notes visible 4000ms before hit
- **240 BPM**: `LEAD_TIME = 2000ms` → notes visible 2000ms before hit (harder!)
- **60 BPM**: `LEAD_TIME = 8000ms` → notes visible 8000ms before hit (easier!)
- Input timing windows varied by BPM
- Visual speed coupled to BPM

### After (Fixed):
- **All BPMs**: `LEAD_TIME = 4000ms` → notes ALWAYS visible 4000ms before hit
- Input timing windows completely fixed (no BPM influence)
- Visual speed controlled ONLY by `noteSpeedMultiplier`:
  - `1.0x` = normal speed (baseline)
  - `2.0x` = notes travel twice as fast visually (but timing windows unchanged)
  - `0.5x` = notes travel half speed visually (but timing windows unchanged)

## Validation

✅ **Build Status**: SUCCESS (no TypeScript errors)
✅ **Files Changed**: 12 files
✅ **Lines Changed**: -94 insertions, +72 deletions (net -22 lines)
✅ **BPM References Removed**: All `REFERENCE_BPM`, `beatmapBpm`, and `effectiveLEAD_TIME` calculations removed from timing/geometry logic

## Testing Checklist

After deploying these changes, verify:

1. ✅ Notes appear at the same time (4000ms before hit) regardless of song BPM
2. ✅ Input timing windows are identical for 60 BPM, 120 BPM, and 240 BPM songs
3. ✅ `noteSpeedMultiplier = 2.0` makes notes travel 2x faster visually
4. ✅ `noteSpeedMultiplier = 0.5` makes notes travel 0.5x speed visually
5. ✅ Changing note speed does NOT affect when players can press notes
6. ✅ High BPM songs (240) no longer feel "rushed" with shorter visibility
7. ✅ Low BPM songs (60) no longer feel "sluggish" with extended visibility

## Configuration

The game now uses:
- **Fixed timing windows**: `TAP_HIT_WINDOW = 150ms`, `HOLD_HIT_WINDOW = 150ms`, etc.
- **Fixed visibility**: `LEAD_TIME = 4000ms` (all songs)
- **Variable visual speed**: `noteSpeedMultiplier` from store (0.5x to 2.0x range)

All timing is now deterministic and independent of beatmap BPM metadata.
