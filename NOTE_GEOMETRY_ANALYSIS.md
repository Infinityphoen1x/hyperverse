# Note Geometry Analysis - Inconsistencies Found

## Summary
Analysis of note geometry constants reveals several inconsistencies between configuration values, validation logic, and rendering logic. These inconsistencies could cause notes to behave unexpectedly or fail validation when they should be valid.

---

## 🔴 Critical Inconsistencies

### 1. TAP_RENDER_WINDOW_MS vs LEAD_TIME - BPM Scaling Mismatch

**Location:** `noteProcessor.ts:36` vs `tapNoteHelpers.ts:35`

**Issue:**
- **Validation** (`noteProcessor.ts`): Uses `TAP_RENDER_WINDOW_MS` (4000ms) **without BPM scaling** for "too early" check
- **Rendering** (`tapNoteHelpers.ts`): Uses `effectiveLEAD_TIME` (LEAD_TIME × BPM scaling) for visibility

**Impact:**
- At high BPM (>120): Notes may fail "too early" validation even though they're still visible
- At low BPM (<120): Notes may be visible but not yet valid for "too early" check
- Creates inconsistent player experience where visual feedback doesn't match validation

**Current Code:**
```typescript
// noteProcessor.ts:36 - NOT BPM-scaled
if (timeSinceNote < -TAP_RENDER_WINDOW_MS) { // Fixed 4000ms

// tapNoteHelpers.ts:35 - BPM-scaled  
const effectiveLEAD_TIME = LEAD_TIME * (REFERENCE_BPM / Math.max(1, beatmapBpm));
if (timeUntilHit > effectiveLEAD_TIME || ...) // Scaled with BPM
```

**Recommendation:**
- Use `effectiveLEAD_TIME` (BPM-scaled) in `noteProcessor.ts` for consistency
- OR use fixed `TAP_RENDER_WINDOW_MS` in both places (but this breaks BPM scaling)

---

### 2. TAP_FALLTHROUGH_WINDOW_MS - Multiple Conflicting Values

**Location:** Multiple files with different values

**Issue:**
- `noteGeometry.ts`: `TAP_NOTE_GEOMETRY.fallthroughWindowMs = 200ms` ✅ (used)
- `gameTiming.ts`: `tapFallthroughWindowMs = 1100ms` ❌ (unused, but confusing)
- `useTapNotes.ts`: Hardcoded values:
  - `tapTooEarlyFailure`: 4000ms window
  - `tapMissFailure`: 2000ms window  
  - Hit notes: 500ms window

**Impact:**
- Confusing codebase with multiple "fallthrough" concepts
- `useTapNotes.ts` doesn't use `TAP_FALLTHROUGH_WINDOW_MS` constant at all
- Hardcoded values may drift from intended behavior

**Current Code:**
```typescript
// noteGeometry.ts
fallthroughWindowMs: 200,  // Used in tapNoteHelpers.ts:52

// gameTiming.ts  
tapFallthroughWindowMs: 1100,  // UNUSED, but documented

// useTapNotes.ts:47-49 - Hardcoded, different values
if (n.tapTooEarlyFailure) return n.time <= currentTime + effectiveLEAD_TIME && n.time >= currentTime - 4000;
if (n.tapMissFailure) return n.time <= currentTime + effectiveLEAD_TIME && n.time >= currentTime - 2000;
return n.time <= currentTime + effectiveLEAD_TIME && n.time >= currentTime - 500;
```

**Recommendation:**
- Remove unused `tapFallthroughWindowMs` from `gameTiming.ts`
- Standardize `useTapNotes.ts` to use `TAP_FALLTHROUGH_WINDOW_MS` for normal notes
- Create separate constants for failure animation windows if needed

---

### 3. useGameStore.getVisibleNotes() - Hardcoded leadTime

**Location:** `useGameStore.ts:126`

**Issue:**
- Hardcoded `leadTime = 2000ms` instead of using `LEAD_TIME` constant (4000ms)
- This selector may be used for different purposes, but the value doesn't match game constants

**Current Code:**
```typescript
getVisibleNotes: () => {
  const { notes, currentTime } = get();
  const leadTime = 2000;  // ❌ Should use LEAD_TIME constant
  return notes.filter(n => n.time <= currentTime + leadTime && n.time >= currentTime - 500);
},
```

**Recommendation:**
- Use `LEAD_TIME` constant or clarify if this selector has a different purpose
- Consider if this selector is even used (may be legacy code)

---

## ⚠️ Minor Inconsistencies

### 4. Unused Constants in gameTiming.ts

**Location:** `gameTiming.ts:47-49`

**Issue:**
- `tapRenderWindowMs: 2000` - Comment says "unused - see TAP_NOTE_GEOMETRY"
- `tapFallthroughWindowMs: 1100` - Unused, conflicts with actual value (200ms)
- `holdRenderWindowMs: 4000` - Unused, matches LEAD_TIME but redundant

**Recommendation:**
- Remove unused constants or document why they exist
- If keeping for future use, add clear TODO comments

---

### 5. HOLD Note Validation vs Rendering

**Location:** `noteValidator.ts:75` vs `holdNoteGeometry.ts:30`

**Issue:**
- HOLD notes use `effectiveLEAD_TIME` (BPM-scaled) for validation ✅
- HOLD notes use `effectiveLEAD_TIME` (BPM-scaled) for rendering ✅
- **This is actually CONSISTENT** - good!

**Note:** This is correct, but worth documenting as the "right way" to do it.

---

## 📊 Constants Summary

| Constant | Value | Used For | BPM Scaled? | Status |
|----------|-------|----------|-------------|--------|
| `LEAD_TIME` | 4000ms | Core render window | Yes (via effectiveLEAD_TIME) | ✅ |
| `TAP_RENDER_WINDOW_MS` | 4000ms | TAP "too early" validation | ❌ No | ⚠️ Should be scaled |
| `TAP_FALLTHROUGH_WINDOW_MS` | 200ms | TAP visibility after judgement | ❌ No | ✅ Correct |
| `HOLD_*` render windows | 4000ms | HOLD validation/rendering | ✅ Yes | ✅ Consistent |

---

## 🔧 Recommended Fixes

### Priority 1: Fix TAP Note BPM Scaling
```typescript
// noteProcessor.ts - Change line 36
// FROM:
if (timeSinceNote < -TAP_RENDER_WINDOW_MS) {

// TO:
if (timeSinceNote < -this.effectiveLEAD_TIME) {
```

### Priority 2: Standardize TAP Fallthrough Windows
```typescript
// useTapNotes.ts - Use constants instead of hardcoded values
// Consider creating:
// - TAP_TOO_EARLY_FALLTHROUGH_MS = 4000
// - TAP_MISS_FALLTHROUGH_MS = 2000  
// - TAP_HIT_FALLTHROUGH_MS = 500
```

### Priority 3: Clean Up Unused Constants
- Remove `tapRenderWindowMs` from `gameTiming.ts` (or mark as deprecated)
- Remove `tapFallthroughWindowMs` from `gameTiming.ts` (conflicts with actual value)
- Document `holdRenderWindowMs` if keeping for reference

### Priority 4: Fix useGameStore.getVisibleNotes()
- Either use `LEAD_TIME` constant or document why it uses 2000ms
- Check if this selector is actually used in the codebase

---

## ✅ What's Working Well

1. **HOLD notes** - Consistent use of BPM-scaled `effectiveLEAD_TIME` throughout
2. **Core constants** - `LEAD_TIME` is well-defined and used consistently for rendering
3. **Geometry calculations** - Proper BPM scaling in geometry files

---

## 📝 Notes

- The BPM scaling formula `LEAD_TIME * (REFERENCE_BPM / beatmapBpm)` is correct and consistent
- The main issue is that TAP note validation doesn't use this scaling, creating a mismatch
- Consider creating a shared `getEffectiveLeadTime(beatmapBpm)` helper function to ensure consistency

