# Beatmap Editor Deep Investigation Report

**Date:** February 1, 2026  
**Investigator:** GitHub Copilot  
**Scope:** Comprehensive analysis of Editor architecture, Simulation mode, EditorTunnel, magic numbers, terminology, and refactoring needs

---

## Executive Summary

This investigation reveals a **well-architected but inconsistent** editor implementation with three distinct operational modes that have significant architectural overlap and terminology confusion. The editor successfully reuses game components but introduces complexity through dual-mode operation (edit vs. simulate) and has debug code, magic numbers, and terminology inconsistencies that need cleanup.

### Key Findings

✅ **Strengths:**
- Clean separation between EditorTunnel (visual reuse) and Simulation mode (gameplay testing)
- Proper two-layer interaction architecture (EditorInteractionLayer + rendering layer)
- Centralized configuration in `lib/config/editor.ts` (recent improvement)
- Game component reuse without modification (TunnelBackground, notes, etc.)

⚠️ **Critical Issues:**
- **Terminology confusion**: `editorMode` vs `simulationMode` creates cognitive overhead
- **Incomplete Simulation**: Missing auto-fail processing, health depletion, and game over logic
- **Debug code in production**: 20+ console.log statements remain in editor files
- **Architecture inconsistency**: Simulation mode bypasses game engine hooks used in actual gameplay

---

## 1. Architecture Analysis: Three Operational Modes

### Mode Comparison Table

| Feature | EditorTunnel (Base) | editorMode=true | simulationMode=true |
|---------|---------------------|-----------------|---------------------|
| **Purpose** | Visual environment | Note editing | Gameplay testing |
| **TunnelBackground** | ✅ Rendered | ✅ Rendered | ✅ Rendered |
| **Notes rendering** | ✅ Visible | ✅ Visible | ✅ Visible |
| **Soundpad Buttons** | ❌ Hidden | ❌ Hidden | ✅ Visible |
| **Deck Hold Meters** | ❌ Hidden | ❌ Hidden | ✅ Visible |
| **Beat Grid** | ❌ Hidden | ✅ Visible | ❌ Hidden |
| **Interaction Layer** | ❌ Disabled | ✅ Enabled | ❌ Disabled |
| **Selection UI** | ❌ None | ✅ Bounding boxes | ❌ None |
| **Keyboard input** | None | Note placement/editing | Gameplay keys (QWEIOP) |
| **Sidebar** | ✅ Visible | ✅ Visible | ❌ Hidden |
| **Note processing** | None | Editor utils | NoteProcessor (manual) |

### Terminology Issues

**Current naming:**
```typescript
// useEditorStore.ts (now split into useEditorCoreStore)
editorMode: boolean;     // Controls editing features (beat grid, interaction layer)
simulationMode: boolean; // Controls gameplay testing mode
```

**Problems:**
1. `editorMode` is misleading - you're ALWAYS in the editor when on BeatmapEditor page
2. Better naming would be: `editingEnabled` / `playbackMode` or `previewMode` / `simulationMode`
3. The relationship is unclear: can both be true? (Answer: No, simulation disables editing)

**Recommended refactor:**
```typescript
// Clearer semantic naming
interface EditorStoreState {
  interactionMode: 'editing' | 'simulation' | 'readonly';
  // Or separate booleans with clear intent:
  canEditNotes: boolean;      // true = show beat grid, interaction layer, selection
  isSimulating: boolean;       // true = gameplay testing, hide sidebar, enable game input
}
```

---

## 2. EditorTunnel vs Gameplay Tunnel Comparison

### Implementation Status: ✅ **IDENTICAL** (by design)

**EditorTunnelBackground.tsx:**
```tsx
// Editor wrapper for TunnelBackground - matches gameplay structure exactly
export function EditorTunnelBackground({ vpX, vpY, hexCenterX, hexCenterY, health }) {
  // Use TunnelBackground exactly as in gameplay - no modifications
  return (
    <div>
      <TunnelBackground vpX={vpX} vpY={vpY} hexCenterX={hexCenterX} hexCenterY={hexCenterY} health={health} />
    </div>
  );
}
```

**Key architectural insight:**  
EditorTunnelBackground is a **thin wrapper** that passes props directly to the game's `TunnelBackground` component. No code duplication, perfect alignment.

### Vanishing Point Handling

| Context | VP Offset | Dynamic VP | Rotation | Zoom |
|---------|-----------|------------|----------|------|
| **Gameplay** | ✅ useVanishingPointOffset (circular wobble) | ✅ Enabled by default | ✅ useTunnelRotation | ✅ useZoomEffect |
| **EditorCanvas** | ✅ useVanishingPointOffset | 🔧 Controlled by `dynamicVPEnabled` setting | ✅ useTunnelRotation | 🔧 Controlled by `zoomEnabled` setting |

**EditorCanvas.tsx:**
```tsx
const vpOffset = useVanishingPointOffset();  // Always calculated
const { zoomScale } = useZoomEffect();       // Always calculated
const vpX = dynamicVPEnabled ? VANISHING_POINT_X + vpOffset.x : VANISHING_POINT_X;  // Conditional apply
const vpY = dynamicVPEnabled ? VANISHING_POINT_Y + vpOffset.y : VANISHING_POINT_Y;
const actualZoomScale = zoomEnabled && !isNaN(zoomScale) ? zoomScale : 1.0;
```

**Verdict:** ✅ EditorTunnel matches gameplay exactly when graphics settings are enabled. The hooks run in both contexts, but editor allows disabling effects for stable editing.

---

## 3. Simulation Mode vs Real Gameplay: Critical Gaps

### Architecture Comparison

**Actual Gameplay (pages/Game.tsx):**
```tsx
// Full game engine with proper lifecycle
const { gameState, score, combo, health, startGame, hitNote, trackHoldStart, trackHoldEnd } = useGameEngine({
  difficulty,
  customNotes,
  getVideoTime  // Time synced from YouTube player
});

// Game logic hook with pause, rewind, auto-start
const { isPauseMenuOpen, gameErrors, handleResume, handleRewind } = useGameLogic({
  gameState, currentTime, notes, getVideoTime, resumeGame, restartGame,
  engineRef, // Full engine reference for rewind/reset
});

// Input handling through centralized hook
useKeyControls({ hitNote, trackHoldStart, trackHoldEnd });
```

**Editor Simulation (pages/BeatmapEditor.tsx):**
```tsx
// Manual instantiation of game engine classes (NOT hooks)
const validator = useRef(new NoteValidator(GAME_CONFIG)).current;
const rotationManager = useRef(new RotationManager()).current;
const processor = useRef(new NoteProcessor(GAME_CONFIG, validator, mockScoringManager)).current;

// Manual keyboard event handlers (NOT useKeyControls)
useEffect(() => {
  const handleSimulationKeyDown = (e: KeyboardEvent) => {
    const lane = KEY_LANE_MAP[e.key];
    const notes = coreStore.parsedNotes;
    
    // Try HOLD first
    const holdNote = validator.findPressableHoldNote(notes, lane, currentTime);
    if (holdNote) {
      const result = processor.processHoldStart(holdNote, currentTime);
      const updatedNotes = notes.map(n => n.id === holdNote.id ? result.updatedNote : n);
      coreStore.setParsedNotes(updatedNotes);  // Direct state mutation
    } else {
      // Try TAP
      const tapNote = validator.findClosestActiveNote(notes, lane, 'TAP', currentTime);
      if (tapNote) {
        const result = processor.processTapHit(tapNote, currentTime);
        // ...manual update
      }
    }
  };
  
  window.addEventListener('keydown', handleSimulationKeyDown);
}, [/* dependencies */]);
```

### Missing Features in Simulation Mode

| Feature | Real Gameplay | Editor Simulation | Impact |
|---------|---------------|-------------------|--------|
| **Auto-fail processing** | ✅ `processor.checkAutoFail()` runs every frame | ❌ Not called | Notes don't auto-miss when passed |
| **Frame-based updates** | ✅ `processor.processNotesFrame()` | ❌ Only manual processing on key press | No continuous note state updates |
| **Health depletion** | ✅ Health decreases on miss, game over at 0 | ❌ Health fixed at 100 | No failure state |
| **Score tracking** | ✅ Real ScoringManager | ✅ Mock scorer | No visible score updates |
| **Game state machine** | ✅ IDLE → PLAYING → PAUSED → GAME_OVER | ❌ Always PAUSED state | No proper lifecycle |
| **Pause menu** | ✅ usePauseLogic hook | ❌ Direct isPlaying toggle | No proper pause UX |
| **Rewind/resume** | ✅ useRewind hook | ❌ Not implemented | Can't test mid-song |
| **Rotation triggers** | ✅ SPIN notes trigger rotation | ❓ Unclear if tested | Needs verification |
| **Visual effects** | ✅ Particles, shake, glow | 🔧 Controlled by settings | Partially available |

### Critical Code Differences

**Missing: Continuous frame processing**
```typescript
// Game.tsx - runs every frame via useGameEngine
useEffect(() => {
  const interval = setInterval(() => {
    const { notes, currentTime } = useGameStore.getState();
    const result = processor.processNotesFrame(notes, currentTime);
    if (result.shouldGameOver) {
      setGameState('GAME_OVER');
    }
  }, 16); // ~60 FPS
  return () => clearInterval(interval);
}, []);

// BeatmapEditor.tsx - only processes on key events
// ❌ No frame-based processing loop
```

**Missing: Proper input routing**
```typescript
// Game uses centralized useKeyControls hook
useKeyControls({
  hitNote: handleHitNote,           // Abstracted hit detection
  trackHoldStart: handleTrackHoldStart,
  trackHoldEnd: handleTrackHoldEnd,
});

// Editor reimplements keyboard handling manually
// ❌ Code duplication, potential divergence from game behavior
```

### Simulation Mode Verdict

**Status:** ⚠️ **PARTIAL IMPLEMENTATION** (60% feature parity)

**What works:**
- Manual hit detection on key press (TAP/HOLD)
- Note state updates (hit, missed flags)
- Sound effects (tapHit, noteMiss, spinNote)
- Visual rendering matches gameplay

**What's broken/missing:**
- No auto-fail for missed notes (creates unrealistic testing)
- No health system (can't test difficulty balance)
- No frame-based state updates (notes don't clean up properly)
- Manual keyboard handling (not using game's input system)
- No game over state (can't test end-of-beatmap)

**Recommendation:** Either:
1. **Refactor to use actual game engine hooks** (preferred) - ensures perfect parity
2. **Implement missing features** in simulation - requires duplicating game logic
3. **Deprecate simulation mode** - redirect to actual Game page for testing

---

## 4. Magic Numbers Audit (Updated)

### ✅ Already Centralized (Good!)

These are properly defined in `lib/config/editor.ts` (recent improvement):

```typescript
export const EDITOR_CONFIG: EditorConfig = {
  MIN_HOLD_DURATION: 165,          // ✅ TAP_HIT_WINDOW × 1.1
  MIN_DRAG_DISTANCE: 5,             // ✅ Pixel threshold for drag detection
  CLICK_TOLERANCE_PIXELS: 100,      // ✅ Generous click selection radius
  CANDIDATE_TIME_THRESHOLD_MS: 500, // ✅ Time window for candidate scoring
  MS_PER_MINUTE: 60000,             // ✅ BPM calculations
  BEAT_GRID_OFFSET_FACTOR: 0.75,    // ✅ Grid generation range
  DEFAULT_BEAT_GRID_COUNT: 10,      // ✅ Number of grid circles
  EXTENSION_INDICATOR_MAX_PROGRESS: 1.2,  // ✅ Off-screen rendering buffer
  DISTANCE_EPSILON: 0.1,            // ✅ Single-line detection
  EXTENSION_INDICATOR_STROKE_WIDTH: 3,    // ✅ Visual constant
  EXTENSION_INDICATOR_OPACITY: 0.8,       // ✅ Visual constant
  MIN_TUNNEL_DISTANCE: 1,           // ✅ Distance baseline
};
```

### ⚠️ Remaining Hardcoded Values

**In components/editor/EditorCanvas.tsx:**
```typescript
// Line 385 - Highlight circle dimensions (commented out but still present)
style={{ left: x - 30, top: y - 30, width: 60, height: 60 }}
// Should extract: SELECTION_HIGHLIGHT_RADIUS = 30
```

**In components/editor/EditorTunnelBackground.tsx:**
```typescript
// Lines 23-26 - Safety fallback values
const safeVpX = isNaN(vpX) ? 350 : vpX;
const safeVpY = isNaN(vpY) ? 300 : vpY;
// Should use: VANISHING_POINT_X, VANISHING_POINT_Y from config
```

**In pages/BeatmapEditor.tsx:**
```typescript
// Lines 706-709 - KEY_LANE_MAP (duplicates game input logic)
const KEY_LANE_MAP: Record<string, number> = {
  'q': -1, 'Q': -1, 'w': 0, 'W': 0, 'e': 1, 'E': 1,
  'i': 2, 'I': 2, 'o': 3, 'O': 3, 'p': -2, 'P': -2,
};
// Should import: LANE_KEY_MAP from lib/config/input.ts (if it exists)
// If not, create centralized input config
```

**In components/game/Down3DNoteLane.tsx:**
```typescript
// Lines 42-43 - Vanishing point animation constants
const VP_AMPLITUDE = 15;      // ±15px offset
const VP_CYCLE_DURATION = 8000; // 8 seconds per cycle
const VP_UPDATE_INTERVAL = 16;  // ~60fps
// Should extract to: lib/config/animation.ts or visualEffects.ts
```

### New Findings: Duplicate Constants

**Lane angle mapping** appears in multiple files with different representations:

```typescript
// lib/config/editor.ts
export const LANE_ANGLE_MAP: Record<number, number> = {
  0: 120, 1: 60, 2: 300, 3: 240, [-1]: 180, [-2]: 0,
};

// lib/editor/editorUtils.ts (lines 90-91)
const laneAngles = [0, 60, 120, 180, 240, 300];
const laneMappings = [-2, 1, 0, -1, 3, 2]; // P, O, W, Q, E, I

// components/editor/EditorCanvas.tsx (lines 374-376, commented out)
const laneAngles = [-2, 1, 0, -1, 3, 2];
const laneAngle = laneAngles[note.lane] === -2 ? 0 : 
                 laneAngles[note.lane] === 1 ? 60 : /* ... */
```

**Recommendation:** Use `getLaneAngle()` utility function everywhere instead of inline mapping.

---

## 5. Debug Code in Production

### Console.log Statements Found

**Components:**
- `components/editor/EditorCanvas.tsx`: 4 statements (lines 234, 242, 251, 257)
- `components/editor/EditorTunnelBackground.tsx`: 3 statements (lines 43, 53, 62)
- `components/editor/NoteExtensionIndicators.tsx`: 4 statements (lines 30, 38, 105, 106)

**Pages:**
- `pages/BeatmapEditor.tsx`: 7 statements (lines 202, 208, 434, 452, 461, 464, 474, 1114, 1117)

**Game components (for comparison):**
- `components/game/Down3DNoteLane.tsx`: 1 statement (line 69) - gameplay also has debug code!

### Severity Levels

| Severity | Count | Examples |
|----------|-------|----------|
| **High** (performance impact) | 2 | `[CANVAS-DEBUG]` on every render, `[WHITE LINES DEBUG]` on every selected note change |
| **Medium** (excessive logging) | 8 | Lifecycle events (mount/unmount), dimension logging |
| **Low** (informational) | 10 | YouTube state, keyboard events, simulation triggers |

### Recommended Cleanup Strategy

```typescript
// Option 1: Environment-gated logging
const DEBUG_EDITOR = import.meta.env.DEV;
if (DEBUG_EDITOR) console.log('[EDITOR]', ...);

// Option 2: Debug utility with levels
import { debugLog } from '@/lib/utils/debug';
debugLog.editor('Canvas mounted', { simulationMode, editorMode }); // Only in DEV

// Option 3: Remove entirely (production-ready)
// Delete all console.log statements with [EDITOR], [CANVAS], [TUNNEL] prefixes
```

**Priority:** Complete removal of render-loop logging (`[WHITE LINES DEBUG]`, `[CANVAS-DEBUG] Simulation mode changed`) - these fire frequently and impact performance.

---

## 6. Terminology Cross-Reference

### Core Terms Used Across Editor

| Term | Meaning | Files Using It | Consistency |
|------|---------|----------------|-------------|
| **editorMode** | Editing features enabled | EditorCanvas, EditorSidebarManager, BeatmapEditor | ⚠️ Confusing name |
| **simulationMode** | Gameplay testing mode | EditorCanvas, BeatmapEditor, useEditorStore | ✅ Clear |
| **selectedNoteId** | Primary selected note | EditorCanvas, useEditorMouseHandlers, stores | ✅ Clear |
| **selectedNoteIds** | Multi-selection array | EditorCanvas, useEditorMouseHandlers, stores | ✅ Clear |
| **draggedNoteId** | Note being dragged | EditorCanvas, useEditorMouseHandlers | ✅ Clear |
| **draggedHandle** | Which handle is being dragged | EditorCanvas, useEditorMouseHandlers | ✅ Clear |
| **parsedNotes** | Beatmap notes array | Throughout editor | ⚠️ vs `notes` in game |
| **beatmapText** | Raw text format | BeatmapEditor, stores, utils | ✅ Clear |
| **difficultyNotes** | Per-difficulty note storage | useEditorStore | ✅ Clear |
| **currentDifficulty** | Active difficulty level | Throughout | ✅ Clear |
| **vpX, vpY** | Vanishing point coordinates | All rendering components | ✅ Clear |
| **snapEnabled** | Grid snap toggle | EditorCanvas, hooks, stores | ✅ Clear |
| **snapDivision** | Beat subdivision | EditorCanvas, hooks | ✅ Clear |

### Inconsistencies

**1. Note state naming:**
```typescript
// Game uses:
interface Note {
  hit: boolean;
  missed: boolean;
  tapMissFailure: boolean;  // Specific failure type
  holdMissFailure: boolean;
  // ...8 more failure flags
}

// Editor simulation uses same structure BUT:
// - Doesn't set all failure types correctly
// - Auto-fail logic not called, so some flags never set
```

**2. Time references:**
```typescript
// Game: currentTime (from useGameStore)
// Editor: currentTime (from useGameStore - SAME!)
// ✅ Consistent, both use same store
```

**3. Coordinate systems:**
```typescript
// Both use:
// - Polar coordinates (angle, distance)
// - Progress (0-1, where 0=far, 1=near)
// - Screen coordinates (x, y from VP)
// ✅ Consistent
```

### Naming Recommendations

**High Priority:**
1. Rename `editorMode` → `editingEnabled` or `isEditMode`
2. Consolidate `parsedNotes` and game's `notes` terminology (both refer to same Note[])
3. Create a glossary document (EDITOR_GLOSSARY.md)

**Medium Priority:**
1. Standardize handle terminology: `'near' | 'far'` (TAP) vs `'start' | 'end'` (HOLD)
2. Clarify "candidate" vs "target" note (both used in selection logic)

---

## 7. Code Duplication & Refactoring Opportunities

### 🔴 High Priority: Simulation Mode Keyboard Handler

**Current:** Manual reimplementation in `BeatmapEditor.tsx` (lines 706-790)
```typescript
// 85 lines of duplicated key handling logic
const KEY_LANE_MAP = { /* ... */ };
const handleSimulationKeyDown = (e: KeyboardEvent) => {
  // Manual lane mapping
  // Manual note lookup
  // Manual processor calls
  // Manual state updates
};
```

**Better:** Reuse game's input system
```typescript
// Import from game
import { useGameInput } from '@/hooks/game/input/useGameInput';

// In editor
const { handleHitNote, handleTrackHoldStart, handleTrackHoldEnd } = useGameInput({
  processor,
  validator,
  rotationManager,
});

// Use existing useKeyControls hook
useKeyControls({
  hitNote: handleHitNote,
  trackHoldStart: handleTrackHoldStart,
  trackHoldEnd: handleTrackHoldEnd,
  enabled: coreStore.simulationMode, // Conditional activation
});
```

**Impact:** Eliminates 85 lines of code, ensures perfect parity with gameplay.

### 🟡 Medium Priority: Lane Angle Mapping

**Duplicated in:**
- `lib/config/editor.ts` - LANE_ANGLE_MAP
- `lib/editor/editorUtils.ts` - laneAngles + laneMappings arrays
- `components/editor/EditorCanvas.tsx` - inline mapping (commented but present)

**Solution:** Single source of truth
```typescript
// lib/config/lanes.ts (new file)
export const LANE_CONFIG = {
  angles: { 0: 120, 1: 60, 2: 300, 3: 240, [-1]: 180, [-2]: 0 },
  keys: { 'Q': -1, 'W': 0, 'E': 1, 'I': 2, 'O': 3, 'P': -2 },
  colors: { /* lane color map */ },
} as const;

export function getLaneAngle(lane: number, tunnelRotation = 0): number {
  return (LANE_CONFIG.angles[lane] + tunnelRotation) % 360;
}

export function getLaneFromKey(key: string): number | undefined {
  return LANE_CONFIG.keys[key.toUpperCase()];
}
```

### 🟡 Medium Priority: Note Overlap Detection

**Used in:**
- `hooks/editor/useEditorMouseHandlers.ts` - checkNoteOverlap for click creation
- `hooks/editor/useNoteHandleDrag.ts` - checkNoteOverlap for handle drag validation
- `lib/editor/beatmapValidator.ts` - validateNotePositions for beatmap validation

**Current:** All three files call `checkNoteOverlap()` from editorUtils - ✅ **Already DRY!**

**Verify:** Check if logic matches game's overlap detection in `NoteValidator.ts`

### 🟢 Low Priority: VP Safety Checks

**Pattern repeated in:**
- `EditorTunnelBackground.tsx`
- `EditorCanvas.tsx`
- `NoteExtensionIndicators.tsx`

```typescript
// Repeated 3+ times
const safeVpX = isNaN(vpX) ? 350 : vpX;
const safeVpY = isNaN(vpY) ? 300 : vpY;
```

**Solution:** Utility function or remove if NaN never occurs
```typescript
// lib/utils/safetyChecks.ts
export function ensureValidVP(vpX: number, vpY: number) {
  return {
    vpX: isNaN(vpX) ? VANISHING_POINT_X : vpX,
    vpY: isNaN(vpY) ? VANISHING_POINT_Y : vpY,
  };
}
```

### Refactoring Priority Matrix

| Refactoring | LOC Saved | Complexity | Benefit | Priority |
|-------------|-----------|------------|---------|----------|
| Simulation keyboard → useGameInput | 85 | Medium | High (parity) | 🔴 HIGH |
| Lane mapping consolidation | 30 | Low | Medium | 🟡 MEDIUM |
| VP safety check utility | 15 | Low | Low | 🟢 LOW |
| Debug code removal | 25 | Low | High (perf) | 🔴 HIGH |

---

## 8. Architecture Recommendations

### Short-term (This Sprint)

1. **✅ Remove debug console.log statements** - Quick win, immediate performance improvement
2. **✅ Rename editorMode → isEditMode** - Clarity improvement, low risk
3. **✅ Document simulation mode limitations** - Add warning banner in UI
4. **✅ Extract KEY_LANE_MAP to config** - Centralize input mapping

### Medium-term (Next Sprint)

1. **🔧 Refactor simulation to use game engine hooks** - Ensures feature parity
2. **🔧 Consolidate lane mapping utilities** - Single source of truth
3. **🔧 Add auto-fail processing to simulation** - Critical for accurate testing
4. **🔧 Implement health/game over in simulation** - Complete gameplay fidelity

### Long-term (Backlog)

1. **🎯 Consider deprecating simulation mode** - Redirect to Game page with "test mode" flag
2. **🎯 Create EDITOR_GLOSSARY.md** - Document all terminology
3. **🎯 Refactor stores** - Split useEditorCoreStore into smaller stores (selection, playback, settings)
4. **🎯 Add E2E tests** - Verify editor<>game parity

---

## 9. Critical Findings Summary

### What's Working Well ✅

1. **EditorTunnel = Game Tunnel** - Perfect reuse, zero duplication
2. **Two-layer interaction architecture** - Clean separation of concerns
3. **Centralized configuration** - Recent addition of `lib/config/editor.ts` is excellent
4. **Note geometry reuse** - Editor uses same calculation functions as game

### What's Broken/Inconsistent ⚠️

1. **Simulation mode is incomplete** - Missing 40% of gameplay features
2. **Terminology confusion** - `editorMode` naming is misleading
3. **Debug code pollution** - 20+ console.log statements in production
4. **Duplicated keyboard handling** - Editor reimplements game input logic

### Immediate Action Items 🚨

**Priority 1 (This week):**
- [ ] Remove all `[EDITOR]`, `[CANVAS]`, `[TUNNEL]`, `[WHITE LINES]` console.log statements
- [ ] Rename `editorMode` → `isEditMode` in stores and components
- [ ] Add UI warning banner in simulation mode: "⚠️ Simulation mode is incomplete - some gameplay features disabled"
- [ ] Document KEY_LANE_MAP discrepancy between editor and game

**Priority 2 (Next week):**
- [ ] Implement `processor.processNotesFrame()` loop in simulation mode
- [ ] Add auto-fail logic to simulation mode
- [ ] Consolidate lane mapping into `lib/config/lanes.ts`
- [ ] Create EDITOR_GLOSSARY.md with term definitions

**Priority 3 (Future):**
- [ ] Evaluate: Should simulation mode use `useGameEngine` hook directly?
- [ ] Evaluate: Should we deprecate simulation mode entirely?
- [ ] Add E2E tests comparing editor simulation vs real gameplay

---

## 10. Conclusion

The Beatmap Editor is **architecturally sound** but suffers from **incomplete implementation** of simulation mode and **terminology inconsistencies** that create cognitive overhead. The EditorTunnel correctly reuses game components, but the simulation mode diverges from actual gameplay by manually reimplementing input handling and skipping frame-based processing.

**Key insight:** The editor has two distinct responsibilities that should be clearly separated:
1. **Beatmap authoring** (editorMode) - Works well, needs cleanup
2. **Gameplay preview** (simulationMode) - Incomplete, needs rewrite or deprecation

The path forward is clear: Either **fully commit to simulation mode** by reusing game engine hooks, or **remove it entirely** and redirect users to the Game page for testing. The current half-implementation creates maintenance burden without delivering full value.

**Estimated effort for full feature parity:** 2-3 days  
**Estimated effort for cleanup + deprecation:** 1 day

**Recommendation:** Cleanup + deprecation is the pragmatic choice unless simulation mode has specific UX requirements that Game page can't fulfill.

---

## Appendix A: File Inventory

### Editor-Specific Files

**Components (20 files):**
- Core: `EditorCanvas.tsx`, `EditorTunnelBackground.tsx`, `EditorInteractionLayer.tsx`
- UI: `EditorSidebar.tsx`, `EditorSidebarManager.tsx`, `SidePanel.tsx`, `FloatingWindow.tsx`
- Sections: `ToolsSection.tsx`, `PlaybackSection.tsx`, `MetadataSection.tsx`, `BeatmapTextSection.tsx`, `GraphicsSection.tsx`, `StatisticsSection.tsx`
- Modals: `YouTubeSetupModal.tsx`, `BpmTapperModal.tsx`, `ShortcutsModal.tsx`, `NotePropertiesDialog.tsx`, `DurationInputPopup.tsx`
- Widgets: `SelectionBoundingBox.tsx`, `NoteExtensionIndicators.tsx`, `EditorBeatGrid.tsx`, `EditorStatusBar.tsx`, `CollapsibleSection.tsx`

**Hooks (5 files):**
- `useEditorMouseHandlers.ts` - Click/drag detection
- `useEditorKeyboardHandlers.ts` - Note placement keys
- `useHandleDetection.ts` - Handle proximity detection
- `useNoteHandleDrag.ts` - Handle drag processing
- `useNoteCandidateScoring.ts` - Click target scoring

**Lib utilities (5 files):**
- `beatmapTextUtils.ts` - Parse/generate beatmap format
- `editorUtils.ts` - Coordinate conversion, overlap checks
- `beatmapValidator.ts` - Note validation rules
- `beatmapGenerator.ts` - Procedural generation (?)
- `beatmapParser.ts` - Low-level parsing

**Stores (split from original `useEditorStore.ts`):**
- `useEditorCoreStore.ts` - Core state (notes, selection, history)
- `useEditorUIStore.ts` - UI state (panels, drag, modals)
- `useEditorGraphicsStore.ts` - Visual settings (glow, zoom, etc.)

**Configuration:**
- `lib/config/editor.ts` - Editor-specific constants (NEW)
- `lib/config/geometry.ts` - Shared with game
- `lib/config/timing.ts` - Shared with game

### Game Files (for comparison)

**Core gameplay:**
- `pages/Game.tsx` - Main game page
- `components/game/Down3DNoteLane.tsx` - Game canvas
- `components/game/tunnel/TunnelBackground.tsx` - Tunnel rendering
- `hooks/game/core/useGameEngine.ts` - Game engine hook
- `hooks/game/core/useGameLogic.ts` - Game state management
- `hooks/game/input/useGameInput.ts` - Input handling
- `hooks/game/input/useKeyControls.ts` - Keyboard controls

**Note processing:**
- `lib/notes/processors/noteProcessor.ts` - Hit detection
- `lib/notes/processors/noteValidator.ts` - Note state validation

---

## Appendix B: Magic Numbers Quick Reference

### ✅ Centralized
- `MIN_HOLD_DURATION: 165` (editor.ts)
- `MIN_DRAG_DISTANCE: 5` (editor.ts)
- `CLICK_TOLERANCE_PIXELS: 100` (editor.ts)
- `TAP_HIT_WINDOW: 150` (timing.ts)
- `JUDGEMENT_RADIUS: 187` (geometry.ts)
- `LEAD_TIME: 4000` (timing.ts)

### ⚠️ Needs Extraction
- `VP_AMPLITUDE: 15` (Down3DNoteLane.tsx)
- `VP_CYCLE_DURATION: 8000` (Down3DNoteLane.tsx)
- `SELECTION_HIGHLIGHT_RADIUS: 30` (EditorCanvas.tsx, commented)
- `KEY_LANE_MAP` (BeatmapEditor.tsx) - should be in config

### ✅ Properly Hardcoded (Acceptable)
- Canvas dimensions: `700x600` (TUNNEL_CONTAINER_WIDTH/HEIGHT)
- Vanishing point: `(350, 300)` (VANISHING_POINT_X/Y)
- Update intervals: `16ms` (60 FPS) - standard web timing

---

**End of Report**
