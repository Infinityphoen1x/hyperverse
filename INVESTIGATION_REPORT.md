# Hyperverse Investigation Report
Generated: 2025-12-07

## Executive Summary

TypeScript compilation succeeds with no errors, but the codebase has significant **logic and design inconsistencies** related to timing, BPM scaling, and geometry calculations.

---

## Critical Issues Found

### 1. BPM Scaling Inconsistency (CRITICAL CONFLICT)

**Problem:** The codebase has conflicting implementations of BPM scaling.

**Evidence:**
- Multiple files calculate `effectiveLEAD_TIME = LEAD_TIME * (REFERENCE_BPM / beatmapBpm)`
  - `noteValidator.ts` (line 13)
  - `noteProcessor.ts` (constructor)
  - `tapNoteHelpers.ts` (line 35)
  - `holdNoteGeometry.ts` (line 30)
  
**Conflict:** The deleted `BPM_SCALING_REMOVAL_REPORT.md` claimed BPM scaling was removed and replaced with `noteSpeedMultiplier`, but the code still scales timing windows based on BPM.

**Impact:**
- Fast BPM songs (240 BPM) get 2000ms visibility window
- Slow BPM songs (60 BPM) get 8000ms visibility window
- This contradicts the intended design of fixed timing with visual speed control

**Expected Behavior:**
- All songs should use fixed 4000ms `LEAD_TIME` 
- Visual speed controlled by `noteSpeedMultiplier` (0.5x to 2.0x)
- BPM should only affect note generation density, not visibility/timing

---

### 2. Timing Constants Duplication & Confusion

**Multiple overlapping constants:**

```typescript
// In GAME_CONFIG
LEAD_TIME: 4000                        // Main timing constant

// In TAP_NOTE_GEOMETRY  
renderWindowMs: 4000                   // Matches LEAD_TIME

// In GAME_ENGINE_TIMING (marked "unused")
tapRenderWindowMs: 2000                // Different value!
holdRenderWindowMs: 4000               // Matches LEAD_TIME
```

**Problem:** 
- `tapRenderWindowMs = 2000ms` is marked as unused but still exported
- Creates confusion about which constant to use
- Inconsistent naming (LEAD_TIME vs renderWindowMs vs tapRenderWindowMs)

**Recommendation:** Consolidate to single source - `GAME_CONFIG.LEAD_TIME`

---

### 3. Geometry Function Parameter Mismatch

**Issue:** Geometry functions receive `beatmapBpm` parameter but should use `noteSpeedMultiplier`

**Affected Functions:**
```typescript
// tapNoteGeometry.ts
calculateTapNoteGeometry(..., beatmapBpm, noteSpeedMultiplier)
  // Uses beatmapBpm in calculations (line 26, 33, 74, 79)

// holdNoteGeometry.ts  
calculateApproachGeometry(..., beatmapBpm, noteSpeedMultiplier)
  // Calculates effectiveLEAD_TIME from beatmapBpm (line 30)
  
// tapNoteHelpers.ts
shouldRenderTapNote(..., beatmapBpm)
  // Scales render window based on BPM (line 35)
```

**Expected:**
- Remove `beatmapBpm` parameter from geometry functions
- Use only `noteSpeedMultiplier` for visual scaling
- BPM should not affect geometry calculations

---

### 4. NoteValidator/NoteProcessor Coupling to BPM

**Problem:** Validators and processors store `effectiveLEAD_TIME` in constructor

```typescript
// noteValidator.ts (line 9-14)
class NoteValidator {
  private effectiveLEAD_TIME: number;
  
  constructor(private config: GameConfig, beatmapBpm: number = 120) {
    this.effectiveLEAD_TIME = LEAD_TIME * (REFERENCE_BPM / Math.max(1, beatmapBpm));
  }
}
```

**Impact:**
- Validator instances are BPM-dependent
- Must recreate validators when BPM changes
- Adds unnecessary coupling between validation logic and song metadata

**Expected:**
- Use fixed `LEAD_TIME` from config
- Remove BPM parameter from constructors
- Validators should be BPM-agnostic

---

### 5. Inconsistent Validation Windows

**TAP notes use two different windows:**

```typescript
// noteValidator.ts - uses TAP_RENDER_WINDOW_MS for "too early" check (line 132)
if (n.tapTooEarlyFailure && currentTime >= n.time - TAP_RENDER_WINDOW_MS)

// noteProcessor.ts - uses effectiveLEAD_TIME for "too early" detection (line 17)
if (timeSinceNote < -this.effectiveLEAD_TIME)
```

**Conflict:** TAP notes checked against two different thresholds
- Validation: `TAP_RENDER_WINDOW_MS` (4000ms fixed)
- Processing: `effectiveLEAD_TIME` (BPM-scaled)

---

## Geometry Calculation Analysis

### TAP Note Depth Scaling

**Current implementation** (tapNoteGeometry.ts line 33):
```typescript
const scaledDepth = (TAP_DEPTH.MAX * noteSpeedMultiplier) * perspectiveScale;
```

**Status:** ✅ Correctly uses `noteSpeedMultiplier` (not BPM)

### HOLD Note Depth Scaling  

**Current implementation** (holdNoteGeometry.ts line 44):
```typescript
const approachSpeed = TUNNEL_DISTANCE / effectiveLEAD_TIME; // Uses BPM-scaled time!
const baseDepthOffset = holdDuration * approachSpeed;
const fixedDepthOffset = baseDepthOffset * noteSpeedMultiplier;
```

**Issue:** Approach speed calculated from `effectiveLEAD_TIME` which varies by BPM
- 120 BPM: 186px / 4000ms = 0.0465 px/ms
- 240 BPM: 186px / 2000ms = 0.0930 px/ms (2x faster!)

**Expected:** Use fixed `LEAD_TIME` instead of `effectiveLEAD_TIME`

---

## Recommendations

### Phase 1: Remove BPM Scaling (Urgent)

1. **Remove `effectiveLEAD_TIME` calculations**
   - Replace with fixed `LEAD_TIME` constant
   - Files: `noteValidator.ts`, `noteProcessor.ts`, `tapNoteHelpers.ts`, `holdNoteGeometry.ts`

2. **Remove BPM parameters from geometry functions**
   - Keep only `noteSpeedMultiplier` parameter
   - Files: `tapNoteGeometry.ts`, `holdNoteGeometry.ts`

3. **Update constructors**
   - Remove `beatmapBpm` parameter from `NoteValidator` and `NoteProcessor`
   - Make validators BPM-agnostic

### Phase 2: Consolidate Constants

1. **Single timing source:** `GAME_CONFIG.LEAD_TIME`
2. **Remove duplicates:**
   - Delete `GAME_ENGINE_TIMING.tapRenderWindowMs` (marked unused)
   - Keep `TAP_NOTE_GEOMETRY.renderWindowMs` but document it references `LEAD_TIME`

### Phase 3: Consistency Verification

1. All "too early" checks use same threshold (`LEAD_TIME`)
2. All rendering windows use same value (`LEAD_TIME`)
3. All geometry scales only with `noteSpeedMultiplier`
4. BPM affects only note generation density (not timing/geometry)

---

## Files Requiring Changes

### High Priority (BPM Scaling Removal)
- `client/src/lib/notes/processors/noteValidator.ts`
- `client/src/lib/notes/processors/noteProcessor.ts`
- `client/src/lib/notes/tap/tapNoteHelpers.ts`
- `client/src/lib/geometry/holdNoteGeometry.ts`
- `client/src/lib/geometry/tapNoteGeometry.ts`

### Medium Priority (Cleanup)
- `client/src/lib/config/gameConstants.ts` (remove unused constants)
- `client/src/hooks/useGameEngine.ts` (remove BPM from validator construction)

### Low Priority (Documentation)
- Add comments explaining fixed timing vs visual speed
- Document `noteSpeedMultiplier` range and purpose

---

## Testing Requirements

After fixes, verify:
1. ✅ Notes appear at same time regardless of BPM (fixed 4000ms before hit)
2. ✅ `noteSpeedMultiplier = 2.0` makes notes travel 2x faster visually
3. ✅ `noteSpeedMultiplier = 0.5` makes notes travel 0.5x speed visually
4. ✅ High BPM (240) and low BPM (60) songs have same visual timing windows
5. ✅ Validators work correctly without recreating on BPM change

---

## Build Status

✅ **TypeScript Compilation:** PASS (no errors)
✅ **Production Build:** SUCCESS
⚠️ **Logic Consistency:** FAIL (issues above)

---

## Conclusion

The codebase is **functionally buildable** but has **design inconsistencies** that violate the intended architecture. The BPM scaling system was supposedly removed but still exists throughout the code, creating conflicting behavior between what documentation claims and what code does.

**Next Step:** Decide whether to:
1. Complete the BPM scaling removal (align code with removed reports)
2. Revert to BPM-scaled system (undo visual speed multiplier)
3. Hybrid approach (use both BPM and speed multiplier)
