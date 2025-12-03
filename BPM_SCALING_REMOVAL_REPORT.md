# BPM Scaling Removal & Geometry Fixes - Report

## Summary
Removed redundant BPM scaling from note geometry system. Rendering now uses note speed multiplier, and timing uses fixed LEAD_TIME constant. Fixed all inconsistencies identified in the geometry analysis.

---

## ✅ Changes Made

### 1. Removed BPM Scaling from Timing/Validation

**Files Modified:**
- `noteProcessor.ts` - Removed `effectiveLEAD_TIME`, now uses fixed `LEAD_TIME`
- `noteValidator.ts` - Removed `effectiveLEAD_TIME`, now uses fixed `LEAD_TIME`
- `tapNoteHelpers.ts` - Removed BPM scaling from `shouldRenderTapNote()`

**Changes:**
- TAP note "too early" validation: Changed from `TAP_RENDER_WINDOW_MS` to `LEAD_TIME` (consistent with HOLD notes)
- HOLD note validation: Changed from `effectiveLEAD_TIME` to fixed `LEAD_TIME`
- All timing checks now use fixed `LEAD_TIME` (4000ms) regardless of BPM

---

### 2. Updated Rendering to Use Note Speed Multiplier

**Files Modified:**
- `useTapNotes.ts` - Removed BPM dependency, uses `noteSpeedMultiplier` from store
- `useHoldNotes.ts` - Changed from `beatmapBpm` to `noteSpeedMultiplier`
- `tapNoteGeometry.ts` - Removed `beatmapBpm` parameter, uses `noteSpeedMultiplier` only
- `holdNoteGeometry.ts` - Removed `beatmapBpm` parameter, uses `noteSpeedMultiplier` only
- `holdNoteUtils.ts` - Changed parameter from `beatmapBpm` to `noteSpeedMultiplier`
- `TapNote.tsx` - Changed prop from `beatmapBpm` to `noteSpeedMultiplier`
- `TapNotes.tsx` - Passes `noteSpeedMultiplier` instead of `beatmapBpm`
- `HoldNotes.tsx` - Removed BPM scaling from visibility calculations

**Changes:**
- Visual rendering speed controlled by `noteSpeedMultiplier` (0.5x to 2.0x)
- Geometry calculations scale depth/width based on note speed, not BPM
- All rendering functions now accept `noteSpeedMultiplier` instead of `beatmapBpm`

---

### 3. Fixed Timing Inconsistencies

**Fixed Issues:**
1. ✅ TAP note validation now uses `LEAD_TIME` instead of `TAP_RENDER_WINDOW_MS` (was inconsistent)
2. ✅ All "too early" checks use fixed `LEAD_TIME` (was BPM-scaled)
3. ✅ `useGameStore.getVisibleNotes()` now uses `LEAD_TIME` constant (was hardcoded 2000ms)
4. ✅ Removed unused `TAP_RENDER_WINDOW_MS` from validation (now uses `LEAD_TIME`)

---

### 4. Cleaned Up Configuration

**Files Modified:**
- `gameTiming.ts` - Removed unused/redundant constants:
  - ❌ Removed `REFERENCE_BPM` (no longer needed)
  - ❌ Removed `tapRenderWindowMs` (unused, conflicted with actual value)
  - ❌ Removed `tapFallthroughWindowMs` (unused, conflicted with actual value)
  - ❌ Removed `holdRenderWindowMs` (redundant with `LEAD_TIME`)
  - ❌ Removed `leadTime` from `GAME_ENGINE_TIMING` (use `LEAD_TIME` from `gameConfig.ts`)

**Kept:**
- ✅ `DEFAULT_BEATMAP_BPM` - Still used for display/parsing (not scaling)

---

### 5. Updated Component Props

**Before:**
```typescript
<TapNote beatmapBpm={beatmapBpm} />
processSingleHoldNote(note, currentTime, beatmapBpm)
```

**After:**
```typescript
<TapNote noteSpeedMultiplier={noteSpeedMultiplier} />
processSingleHoldNote(note, currentTime, noteSpeedMultiplier)
```

---

## 📊 Constants Summary

| Constant | Value | Usage | Status |
|----------|-------|-------|--------|
| `LEAD_TIME` | 4000ms | Fixed timing window for all notes | ✅ Consistent |
| `TAP_FALLTHROUGH_WINDOW_MS` | 200ms | TAP note visibility after judgement | ✅ Used correctly |
| `noteSpeedMultiplier` | 0.5-2.0 | Visual rendering speed | ✅ Controls rendering |
| `DEFAULT_BEATMAP_BPM` | 120 | Display/parsing only | ✅ Not used for scaling |

---

## 🔧 Architecture Changes

### Before (BPM-Scaled):
```
Timing: LEAD_TIME × (REFERENCE_BPM / beatmapBpm)
Rendering: LEAD_TIME × (REFERENCE_BPM / beatmapBpm)
```

### After (Fixed Timing, Speed-Based Rendering):
```
Timing: LEAD_TIME (fixed 4000ms)
Rendering: LEAD_TIME × noteSpeedMultiplier (visual only)
```

---

## ✅ Benefits

1. **Consistency**: All timing uses fixed `LEAD_TIME` - no more BPM scaling mismatches
2. **Simplicity**: Removed redundant BPM scaling logic
3. **Clarity**: Note speed multiplier clearly controls visual rendering only
4. **Performance**: Fewer calculations per frame (no BPM scaling)
5. **Maintainability**: Single source of truth for timing (`LEAD_TIME`)

---

## 🧪 Testing Recommendations

1. Verify TAP notes fail "too early" at exactly `LEAD_TIME` (4000ms) before note.time
2. Verify HOLD notes fail "too early" at exactly `LEAD_TIME` (4000ms) before note.time
3. Verify note speed multiplier affects visual rendering speed only (not timing)
4. Verify notes appear/disappear at correct times regardless of BPM
5. Verify `getVisibleNotes()` selector uses correct `LEAD_TIME` value

---

## 📝 Notes

- BPM is still stored in `beatmapBpm` for display/parsing purposes
- Note speed multiplier is stored in `defaultNoteSpeedMultiplier` (persisted) and `noteSpeedMultiplier` (temporary)
- All geometry calculations now scale with note speed, not BPM
- Timing windows are fixed and consistent across all note types

---

## Files Changed

**Core Logic:**
- `lib/notes/processors/noteProcessor.ts`
- `lib/notes/processors/noteValidator.ts`
- `lib/notes/tap/tapNoteHelpers.ts`
- `lib/geometry/tapNoteGeometry.ts`
- `lib/geometry/holdNoteGeometry.ts`
- `lib/utils/holdNoteUtils.ts`

**Hooks:**
- `hooks/useGameEngine.ts`
- `hooks/useTapNotes.ts`
- `hooks/useHoldNotes.ts`

**Components:**
- `components/game/notes/TapNote.tsx`
- `components/game/notes/TapNotes.tsx`
- `components/game/notes/HoldNotes.tsx`

**Config:**
- `lib/config/gameTiming.ts`
- `stores/useGameStore.ts`

**Total:** 15 files modified

