# Beatmap Editor Code Audit Report

**Date:** January 25, 2026  
**Auditor:** GitHub Copilot  
**Scope:** Complete investigation of Beatmap Editor codebase

---

## Executive Summary

After conducting a comprehensive investigation of the Beatmap Editor codebase, I found a generally well-structured implementation with proper separation of concerns across stores, hooks, and components. The editor successfully handles dual-format beatmap parsing, implements sophisticated mouse interaction logic with candidate-based selection scoring, and prevents note overlap using hit window buffers.

However, several areas require attention: magic numbers are scattered throughout the code without centralized documentation, console.log debugging statements remain in production code, validation logic has hardcoded values that duplicate constants defined elsewhere, and there are minor inconsistencies in how constants are imported and used across different modules.

The codebase demonstrates good architectural patterns including Zustand state management with three specialized stores (Core, UI, Graphics), a custom mouse handler hook that properly uses refs for drag detection, and dual-format parsing for backward compatibility. Key strengths include the MIN_DRAG_DISTANCE threshold (5px) that elegantly distinguishes clicks from drags, the candidate scoring system that weighs distance, time, and progress for note selection, and the TAP_HIT_WINDOW buffer system that prevents overlapping notes.

---

## 1. Magic Numbers

### Critical Constants Identified

| Value | Location | Issue | Recommendation |
|-------|----------|-------|----------------|
| **30** | `useEditorMouseHandlers.ts` line ~100-130 | Click tolerance/candidate scoring - unclear what this represents | Extract as `EDITOR_CLICK_TOLERANCE_PIXELS` |
| **5** | `useEditorMouseHandlers.ts` line 12 | MIN_DRAG_DISTANCE - defined locally | Move to centralized config as `EDITOR_MIN_DRAG_PIXELS` |
| **100** | Multiple files (handlers, validators, canvas) | MIN_HOLD_DURATION - duplicated in 3+ locations | Centralize in `timing.ts` as `MIN_HOLD_DURATION` |
| **500** | `useEditorMouseHandlers.ts` | Time diff threshold in candidate scoring | Extract as `EDITOR_CANDIDATE_TIME_THRESHOLD_MS` |
| **60000** | `editorUtils.ts` line 145 | BPM calculation (ms per minute) | Extract as `MS_PER_MINUTE` |
| **0.75** | `editorUtils.ts` line 163 | Beat grid generation offset | Document purpose or extract as `BEAT_GRID_OFFSET_FACTOR` |
| **10** | `editorUtils.ts` | Default beat grid circle count | Extract as `DEFAULT_BEAT_GRID_COUNT` |
| **1** | Multiple locations | Distance baseline in tunnel calculations | Extract as `MIN_TUNNEL_DISTANCE` or document inline |
| **1.2** | `NoteExtensionIndicators.tsx` lines 88, 96 | Progress bounds check (why not 1.0?) | Document or extract as `EXTENSION_INDICATOR_MAX_PROGRESS` |
| **0.1** | `NoteExtensionIndicators.tsx` line 125 | Distance epsilon for single-line detection | Extract as `DISTANCE_EPSILON` |
| **3** | `NoteExtensionIndicators.tsx` | White line stroke width | Extract as `EXTENSION_INDICATOR_STROKE_WIDTH` |
| **0.8** | `NoteExtensionIndicators.tsx` | White line opacity | Extract as `EXTENSION_INDICATOR_OPACITY` |

### Currently Well-Centralized

✅ **150** - TAP_HIT_WINDOW (properly in `timing.ts`)  
✅ **187** - JUDGEMENT_RADIUS (properly in `geometry.ts`)  
✅ **4000** - LEAD_TIME (properly in `timing.ts`)

---

## 2. Inconsistencies

### Import Pattern Issues

**Current State:**
```typescript
// useEditorMouseHandlers.ts
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
import { LEAD_TIME, GAME_CONFIG } from '@/lib/config/timing';

const MIN_HOLD_DURATION = 100;  // ❌ Should be imported
const MIN_DRAG_DISTANCE = 5;     // ❌ Should be imported
```

### Constant Duplication

**MIN_HOLD_DURATION** appears in 3 places:
1. `useEditorMouseHandlers.ts` (line 10) - Local constant
2. `EditorCanvas.tsx` (line 20) - Local constant  
3. `beatmapValidator.ts` (lines 38, 115) - Hardcoded `100` values

**Recommendation:** Create centralized `client/src/lib/config/editor.ts`

### Lane Mapping Duplication

Lane-to-angle mapping appears in multiple files with inline arrays:
```typescript
const laneAngles = [0, 1, 2, 3, 4, 5];
const angles = [-2, 1, 0, -1, 3, 2];
```

**Recommendation:** Centralize as utility function in `editorUtils.ts`

---

## 3. Console Logging (Debug Code in Production)

### Editor Files

1. **`useEditorMouseHandlers.ts`** (7+ instances):
   - Line 164: `'[EDITOR] Drag candidate...'`
   - Line 200: `'[EDITOR] MouseDown - note clicked...'`
   - Line 235: `'[EDITOR] Handle detected...'`
   - Line 285: `'[EDITOR] Overlap detected - cannot extend near handle'`
   - Line 307: `'[EDITOR] Overlap detected - cannot extend start handle'`
   - Line 328: `'[EDITOR] Overlap detected - cannot extend end handle'`
   - Line 364: `'[EDITOR] Overlap detected - cannot slide note...'`
   - Lines 409-415: Multiple selection logging statements

2. **`NoteExtensionIndicators.tsx`** (1 instance):
   - Line 27: `'[WHITE LINES] Rendering, selectedNote...'`

### Recommendation

```typescript
// Option 1: Remove completely (production)
// console.log('[EDITOR] ...');

// Option 2: Gate behind dev mode
if (import.meta.env.DEV) {
  console.log('[EDITOR] ...');
}

// Option 3: Use dedicated debug utility
import { debugLog } from '@/lib/debug';
debugLog('EDITOR', '...');
```

---

## 4. Architectural Concerns

### Store Architecture (✅ GOOD)

- Well-separated stores: `useEditorCoreStore`, `useEditorUIStore`, `useEditorGraphicsStore`
- Clear responsibility boundaries
- Proper use of Zustand's `get()` for complex state logic

### Mouse Handler Complexity (⚠️ NEEDS REFACTORING)

**Current:** `useEditorMouseHandlers.ts` is 490 lines - largest file in editor

**Contains:**
- Candidate scoring logic
- Drag detection
- Handle identification
- Overlap validation
- Selection management

**Recommendation:** Consider extracting sub-hooks:
```typescript
// Proposed structure
useNoteCandidateScoring()     // Scoring logic
useHandleDetection()          // Handle type detection  
useNoteOverlapValidation()    // Overlap checking
useEditorDragState()          // Drag state management
```

### Dual-Format Parser (✅ GOOD but needs docs)

- Supports both pipe-delimited and space-delimited formats
- Auto-detects format: `trimmed.includes('|')`
- **Issue:** No clear documentation of why both formats exist

**Recommendation:** Add file header comment explaining:
- Legacy space-delimited format (backwards compatibility)
- New pipe-delimited format (current standard)
- Migration path

---

## 5. Missing/Incorrect Imports

### Files Needing Import Fixes

1. **`beatmapValidator.ts`**
   ```typescript
   // ❌ Current
   if (!note.duration || note.duration < 100)
   
   // ✅ Should be
   import { MIN_HOLD_DURATION } from '@/lib/config/editor';
   if (!note.duration || note.duration < MIN_HOLD_DURATION)
   ```

2. **`EditorCanvas.tsx`**
   ```typescript
   // ❌ Current
   const MIN_HOLD_DURATION = 100;
   
   // ✅ Should be
   import { MIN_HOLD_DURATION } from '@/lib/config/editor';
   ```

3. **`useEditorMouseHandlers.ts`**
   ```typescript
   // ❌ Current
   const MIN_HOLD_DURATION = 100;
   const MIN_DRAG_DISTANCE = 5;
   
   // ✅ Should be
   import { 
     MIN_HOLD_DURATION, 
     MIN_DRAG_DISTANCE,
     EDITOR_CLICK_TOLERANCE_PIXELS 
   } from '@/lib/config/editor';
   ```

### Path Alias Consistency (✅ GOOD)

- Consistent use of `@/` path alias
- Clean import organization

---

## 6. Error Handling

### Missing Try-Catch Blocks

1. **`beatmapParser.ts`**
   - No error handling for malformed input
   - `parseInt()` calls without comprehensive NaN checks
   - Could throw on unexpected format

2. **`editorUtils.ts`**
   - `mouseToTime()` - No validation for invalid VP coordinates
   - No bounds checking for negative distances

3. **`beatmapGenerator.ts`**
   - No validation that notes array is not empty
   - No handling for undefined metadata fields

### Good Practices Found (✅)

- `checkNoteOverlap()` returns boolean (safe failure mode)
- Validation functions return error arrays rather than throwing
- Type guards in parser for format detection

### Recommendations

```typescript
// Add parser error handling
export function parseBeatmapText(text: string): Note[] {
  try {
    // ... existing logic
  } catch (error) {
    console.error('[PARSER] Failed to parse beatmap:', error);
    return []; // Safe fallback
  }
}

// Add bounds validation
export function mouseToTime(...args) {
  if (judgementRadius <= 1) {
    throw new Error('Invalid judgementRadius: must be > 1');
  }
  // ... existing logic
}
```

---

## 7. Other Issues

### NoteExtensionIndicators.tsx

**Issue:** Progress bounds check uses `1.2` instead of `1.0`
```typescript
// Line 88, 96
if (nearProgress >= 0 && nearProgress <= 1.2) {
```

**Question:** Why 1.2? Allows off-screen rendering? Needs documentation.

### editorUtils.ts

**Issue:** Beat grid offset unclear
```typescript
// Line 163
const gridTime = currentTime + (i - count * 0.75) * snapIntervalMs;
```

**Question:** Why 0.75? Should be documented or extracted as named constant.

### Candidate Scoring Logic

**Issue:** Complex weighted scoring without documentation
```typescript
const score = (1 / (distance + 1)) * 
              (1 / (Math.abs(timeDiff) + 1)) * 
              (1 - Math.abs(progress - 0.5));
```

**Recommendation:** Add inline comments:
```typescript
// Scoring weights:
// - Distance: closer = higher score (inverse relationship)
// - Time diff: closer to current time = higher score
// - Progress: middle of tunnel = higher score (0.5 = center)
const score = ...
```

### Lane Validation

**Issue:** Lane validation repeated in multiple files
```typescript
if (![0, 1, 2, 3, -1, -2].includes(note.lane))
```

**Recommendation:** Extract constant
```typescript
// config/editor.ts
export const VALID_LANES = [0, 1, 2, 3, -1, -2] as const;
```

---

## 8. Positive Observations

✅ **Excellent separation of concerns** - stores, hooks, and components well-organized

✅ **Smart drag threshold** - MIN_DRAG_DISTANCE prevents accidental drags during clicks

✅ **Candidate-based selection** - Scoring system works well for ambiguous clicks

✅ **Proper use of refs** - `mouseDownPosRef` tracks initial mouse position correctly

✅ **Overlap prevention** - TAP_HIT_WINDOW buffer system is well-implemented

✅ **Backward compatibility** - Dual-format parser supports legacy beatmaps

✅ **Type safety** - Good use of TypeScript interfaces and types throughout

✅ **Geometry calculation reuse** - NoteExtensionIndicators uses same corner calc as notes

✅ **Consistent naming** - Clear prefixes (`EDITOR_`, `TAP_`, `HOLD_`)

---

## Recommendations Priority List

### 🔴 HIGH PRIORITY

1. **Remove/gate all console.log statements** (security/performance)
   - 7+ instances in `useEditorMouseHandlers.ts`
   - 1 instance in `NoteExtensionIndicators.tsx`
   - Gate behind `import.meta.env.DEV` or remove completely

2. **Centralize MIN_HOLD_DURATION** (eliminate duplication)
   - Create `client/src/lib/config/editor.ts`
   - Export `MIN_HOLD_DURATION = 100`
   - Update 3 files: handlers, validator, canvas

3. **Document the "30" magic number** (code clarity)
   - Add inline comment or extract as `EDITOR_CLICK_TOLERANCE_PIXELS`
   - Explain what this value represents

4. **Add try-catch to beatmap parser** (error resilience)
   - Wrap `parseBeatmapText()` and `parseBeatmapTextWithDifficulties()`
   - Return empty array or default values on error

### 🟡 MEDIUM PRIORITY

5. **Extract MIN_DRAG_DISTANCE to config** (consistency)
   - Add to `config/editor.ts` as `MIN_DRAG_DISTANCE = 5`
   - Update import in `useEditorMouseHandlers.ts`

6. **Document dual-format parser** (maintainability)
   - Add file header comment explaining both formats
   - Document migration path and compatibility strategy

7. **Add error handling to utilities** (robustness)
   - `mouseToTime()` - validate inputs
   - `snapTimeToGrid()` - handle edge cases
   - `generateBeatGrid()` - bounds checking

8. **Extract lane mapping utility** (DRY principle)
   - Create `getLaneAngleMapping()` function
   - Centralize lane-to-angle conversions

### 🟢 LOW PRIORITY

9. **~~Split useEditorMouseHandlers~~** ✅ **COMPLETED** 
   - ~~490 lines - consider extracting sub-hooks~~
   - **Refactored into 4 focused modules:**
     - `useEditorMouseHandlers.ts` (263 lines) - Orchestration
     - `useNoteCandidateScoring.ts` (123 lines) - Selection logic
     - `useHandleDetection.ts` (53 lines) - Handle detection
     - `useNoteHandleDrag.ts` (158 lines) - Drag updates
   - **Result:** 46% reduction in main file, improved testability

10. **Document candidate scoring formula** ✅ **COMPLETED**
    - Added inline comments explaining each term
    - Documented why specific weights are used

11. **Extract visual constants** ✅ **COMPLETED**
    - Stroke width, opacity from NoteExtensionIndicators
    - Moved to `config/editor.ts`

12. **Add VALID_LANES constant** ✅ **COMPLETED**
    - Extracted `[0, 1, 2, 3, -1, -2]` to config
    - Created type-safe `isValidLane()` guard
    - Used in all lane validation logic

---

## Files Requiring Changes

### High Priority
- ✏️ `client/src/hooks/useEditorMouseHandlers.ts`
- ✏️ `client/src/components/editor/NoteExtensionIndicators.tsx`
- ✏️ `client/src/lib/config/editor.ts` (CREATE NEW)
- ✏️ `client/src/lib/editor/beatmapValidator.ts`
- ✏️ `client/src/components/editor/EditorCanvas.tsx`
- ✏️ `client/src/lib/editor/beatmapParser.ts`

### Medium Priority
- ✏️ `client/src/lib/editor/editorUtils.ts`
- ✏️ `client/src/lib/editor/beatmapParser.ts` (add docs)

### Low Priority
- ✏️ Various files for visual constant extraction

---

## Estimated Impact

| Priority | Changes | Files Affected | Risk Level | Time Estimate |
|----------|---------|----------------|------------|---------------|
| High | 15-20 edits | 6 files | Low | 30-45 min |
| Medium | 10-15 edits | 3 files | Low | 20-30 min |
| Low | 20+ edits | 5+ files | Medium | 1-2 hours |

**Total Time Estimate:** 2-3 hours for all priorities

---

## Testing Recommendations

After implementing changes:

1. ✅ Verify note selection still works (click vs drag)
2. ✅ Verify handle dragging (near/far for TAP, start/end for HOLD)
3. ✅ Verify overlap prevention with TAP_HIT_WINDOW
4. ✅ Verify dual-format parsing (pipe and space-delimited)
5. ✅ Verify white line indicators render correctly
6. ✅ Verify beat grid snapping works
7. ✅ Test error cases (malformed beatmap text)
8. ✅ Check console for remaining debug logs

---

## Conclusion

The Beatmap Editor is well-architected with good separation of concerns and solid feature implementation. The primary issues are code hygiene (console logs, magic numbers) rather than functional bugs. Implementing the high-priority fixes will significantly improve code maintainability and production readiness while preserving all existing functionality.

**Next Steps:** Begin implementing high-priority fixes, starting with creating centralized editor config and removing console logging.
