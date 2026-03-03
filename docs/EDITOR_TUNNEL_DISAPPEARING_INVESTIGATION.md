# Editor Tunnel Disappearing Bug Investigation

**Date:** February 1, 2026  
**Issue:** Tunnel + parallax + notes all disappear a split second after opening the editor  
**Status:** Root cause identified - DO NOT FIX YET (per user request)

---

## Symptom Description

Upon opening the Beatmap Editor:
1. ✅ **Initial render is fine** - tunnel, parallax, and notes render correctly
2. 🔴 **Within ~100ms** - everything disappears
3. ❌ Only UI elements remain (sidebar, controls, status bar)
4. ❌ EditorCanvas appears empty despite tunnel/notes components being mounted

---

## Investigation Trail

### 1. Component Hierarchy Analysis

```
BeatmapEditor (page)
  └─ EditorCanvas (memo wrapped)
      ├─ EditorTunnelBackground
      │   └─ TunnelBackground (memo wrapped with custom comparison)
      │       ├─ ParallaxHexagonLayers
      │       ├─ HexagonLayers
      │       ├─ RadialSpokes
      │       └─ SyncLineHexagons
      ├─ HoldNotes (conditional: isEditMode && parsedNotes.length > 0)
      └─ TapNotes (conditional: isEditMode && parsedNotes.length > 0)
```

### 2. Conditional Rendering Analysis

**Notes Rendering:**
```tsx
// EditorCanvas.tsx line 280
{isEditMode && parsedNotes.length > 0 && (
  <>
    <HoldNotes vpX={vpX} vpY={vpY} />
    <TapNotes vpX={vpX} vpY={vpY} />
  </>
)}
```

**Conditions for notes to render:**
- ✅ `isEditMode` must be `true` (default: `true` in store)
- ✅ `parsedNotes.length > 0` (loaded from persisted state)

**Tunnel Rendering:**
```tsx
// EditorCanvas.tsx line 236
<EditorTunnelBackground
  vpX={vpX}
  vpY={vpY}
  hexCenterX={VANISHING_POINT_X}
  hexCenterY={VANISHING_POINT_Y}
  health={100}
/>
```

**Tunnel is unconditional** - always rendered, not dependent on isEditMode.

---

## 🔴 ROOT CAUSE #1: EditorCanvas Memo Without Dependencies

### The Problem

```tsx
// EditorCanvas.tsx line 370
export const EditorCanvas = memo(EditorCanvasComponent);
```

**EditorCanvas is wrapped in `memo` WITHOUT a custom comparison function**, which means it uses **shallow prop comparison by default**.

### Why This Causes Disappearing

EditorCanvas receives **40+ props** from BeatmapEditor, including:
- `currentTime` (number)
- `parsedNotes` (array)
- `metadata` (object)
- Various state setters (functions)

**The Issue:**
1. On initial mount, everything renders correctly
2. State updates elsewhere trigger BeatmapEditor re-render
3. EditorCanvas memo comparison runs
4. **If props appear "equal" (shallow comparison), EditorCanvas doesn't re-render**
5. Internal hooks (`useVanishingPointOffset`, `useZoomEffect`) don't run
6. VP coordinates become stale
7. Tunnel renders with stale/invalid coordinates → disappears

### Specific Culprits

**Dynamic VP Offset:**
```tsx
// EditorCanvas.tsx line 96
const vpOffset = useVanishingPointOffset();  // ← Hook needs to run every frame!
const vpX = dynamicVPEnabled ? VANISHING_POINT_X + vpOffsetX : VANISHING_POINT_X;
```

If `useVanishingPointOffset()` doesn't run, VP coordinates stay at initial values, but the hook's internal state changes, causing desync.

**Current Time:**
```tsx
// EditorCanvas receives currentTime as prop
currentTime: number;  // ← Must update for notes to animate
```

If `currentTime` doesn't update, notes don't move, making them appear to "disappear" (they're actually off-screen).

---

## 🔴 ROOT CAUSE #2: TunnelBackground Custom Memo Comparison

### The Problem

```tsx
// TunnelBackground.tsx line 66
export const TunnelBackground = memo(TunnelBackgroundComponent, (prevProps, nextProps) => {
  return (
    prevProps.vpX === nextProps.vpX &&
    prevProps.vpY === nextProps.vpY &&
    prevProps.hexCenterX === nextProps.hexCenterX &&
    prevProps.hexCenterY === nextProps.hexCenterY &&
    prevProps.health === nextProps.health
  );
});
```

### Analysis

This **custom comparison is technically correct**:
- Returns `true` when props are equal → skip re-render (optimization)
- Returns `false` when props changed → do re-render

**However**, combined with EditorCanvas memo, this creates a **double-blocking effect**:

1. EditorCanvas memo blocks re-render → TunnelBackground never receives new props
2. Even if props do change, TunnelBackground only checks 5 specific props
3. **Missing from comparison:** Dynamic hooks like `useTunnelRotation()`, `useZoomEffect()`

### The Timing Issue

```
Frame 1 (initial):
  EditorCanvas renders → vpX=350, vpY=300
  TunnelBackground renders → Tunnel visible ✅

Frame 2 (~16ms later):
  useVanishingPointOffset updates → new offset calculated
  EditorCanvas memo blocks → vpX/vpY props don't change
  TunnelBackground memo comparison → props equal → no re-render
  VP offset hook inside TunnelBackground doesn't run
  Tunnel uses STALE internal state → rendering breaks 🔴
```

---

## 🔴 ROOT CAUSE #3: Conflicting State Sources

### The Architecture Problem

TunnelBackground has **TWO sources of VP coordinates**:

**1. Props (external control):**
```tsx
interface TunnelBackgroundProps {
  vpX?: number;
  vpY?: number;
  hexCenterX?: number;
  hexCenterY?: number;
}
```

**2. Internal hooks (internal control):**
```tsx
const baseTunnelRotation = useTunnelRotation(1.0);
const { zoomIntensity, zoomRotation, zoomScale } = useZoomEffect();
```

### The Conflict

- **Editor passes explicit VP coordinates** via props
- **Gameplay uses internal hooks** for animation
- **TunnelBackground tries to do BOTH simultaneously**

This creates a **state synchronization problem**:
1. Editor calculates VP offset externally (in EditorCanvas)
2. TunnelBackground tries to use internal hooks
3. Props override internal calculations
4. When props become stale, rendering breaks

---

## 🔴 ROOT CAUSE #4: useVanishingPointOffset Hook Timing

### The Hook Implementation

```tsx
// hooks/effects/geometry/useVanishingPointOffset.ts
export function useVanishingPointOffset() {
  const vpOffset = useVanishingPointStore(state => state.vpOffset);
  return vpOffset;
}
```

This is a **Zustand store hook** that subscribes to VP offset changes.

### The Store Update Mechanism

VP offset is updated by `Down3DNoteLane` component (in gameplay):

```tsx
// Down3DNoteLane.tsx line 43
useEffect(() => {
  const intervalId = setInterval(() => {
    const elapsed = Date.now() % VP_CYCLE_DURATION;
    const progress = elapsed / VP_CYCLE_DURATION;
    const angle = progress * Math.PI * 2;
    const x = Math.cos(angle) * VP_AMPLITUDE;
    const y = Math.sin(angle) * VP_AMPLITUDE;
    setVPOffset({ x, y });
  }, VP_UPDATE_INTERVAL);
  
  return () => {
    clearInterval(intervalId);
    setVPOffset({ x: 0, y: 0 });
  };
}, [setVPOffset]);
```

### The Problem in Editor Context

**In gameplay:** Down3DNoteLane mounts → useEffect runs → interval updates VP offset → hook reactivity works ✅

**In editor:** 
- EditorCanvas uses `useVanishingPointOffset()` 
- But **no component is updating the store** if editor doesn't have animation manager
- Store stays at `{ x: 0, y: 0 }`
- **OR** if something else updates it, memo blocks propagation

---

## 🔴 ROOT CAUSE #5: Recent Refactoring Side Effects

### What Changed Recently

**Before refactoring:**
```tsx
// EditorTunnelBackground.tsx (old)
export function EditorTunnelBackground({ vpX, vpY, hexCenterX, hexCenterY, health }) {
  const safeVpX = isNaN(vpX) ? 350 : vpX;
  const safeVpY = isNaN(vpY) ? 300 : vpY;
  // ... manual checks
  
  return (
    <div style={{ width: '100%', height: '100%' }}>  {/* ← Extra wrapper */}
      <TunnelBackground {...safeProps} />
    </div>
  );
}
```

**After refactoring:**
```tsx
// EditorTunnelBackground.tsx (new)
export function EditorTunnelBackground({ vpX, vpY, hexCenterX, hexCenterY, health }) {
  const safeCoords = useSafeVanishingPoint({ vpX, vpY, hexCenterX, hexCenterY });
  
  return <TunnelBackground {...safeCoords} health={health} />;  {/* ← Direct passthrough */}
}
```

### What Broke

1. **Removed wrapper div** - This is actually GOOD, but it changed the DOM structure
2. **Added `useSafeVanishingPoint` hook** - Creates new memoized object every time deps change
3. **Changed TunnelBackground to use `sanitizeCoordinate`** - Now sanitizes props internally
4. **The combination:** Props spread + memo + hook memoization = **stale prop propagation**

### The Specific Failure Mode

```tsx
// useSafeVanishingPoint.ts
export function useSafeVanishingPoint(input: SafeVanishingPointInput): VanishingPointCoordinates {
  return useMemo(() => ({
    vpX: isFinite(input.vpX ?? NaN) ? input.vpX! : VANISHING_POINT_X,
    vpY: isFinite(input.vpY ?? NaN) ? input.vpY! : VANISHING_POINT_Y,
    hexCenterX: isFinite(input.hexCenterX ?? NaN) ? input.hexCenterX! : VANISHING_POINT_X,
    hexCenterY: isFinite(input.hexCenterY ?? NaN) ? input.hexCenterY! : VANISHING_POINT_Y,
  }), [input.vpX, input.vpY, input.hexCenterX, input.hexCenterY]);
}
```

**The Issue:**
1. `useMemo` dependencies are `[input.vpX, input.vpY, ...]`
2. If parent component (EditorTunnelBackground) doesn't re-render, hook doesn't re-run
3. If EditorCanvas memo blocks, EditorTunnelBackground doesn't re-render
4. Hook returns stale memoized object
5. TunnelBackground receives same props → memo blocks → no re-render
6. **Tunnel freezes with initial coordinates**

---

## 🟡 SECONDARY ISSUE: Notes Disappearing (Different Cause)

### Notes Conditional Rendering

```tsx
{isEditMode && parsedNotes.length > 0 && (
  <>
    <HoldNotes vpX={vpX} vpY={vpY} />
    <TapNotes vpX={vpX} vpY={vpY} />
  </>
)}
```

### Why Notes Might Disappear

**Scenario 1: isEditMode toggled accidentally**
```tsx
// BeatmapEditor.tsx line 769
if (matchesShortcut(e, 'toggleEditor') && !isInputField) {
  e.preventDefault();
  setIsEditMode(!isEditMode);  // ← 'E' key toggles edit mode
  audioManager.play('tapHit');
  return;
}
```

**Default shortcut:** `'e'` key toggles editor mode

**Potential issue:** If 'E' key is pressed during editor load/mount, it could toggle `isEditMode` from `true` → `false`, hiding all notes.

**Scenario 2: parsedNotes emptied**
If `parsedNotes` array gets cleared after initial load, notes would disappear.

**Scenario 3: currentTime out of range**
Notes are filtered by `currentTime` in HoldNotes/TapNotes components. If `currentTime` doesn't update, notes move off-screen.

---

## 🎯 COMPREHENSIVE ROOT CAUSE ANALYSIS

### The Perfect Storm (All Issues Combined)

1. **EditorCanvas memo** blocks re-renders when props appear unchanged
2. **TunnelBackground custom memo** double-blocks with specific prop comparison
3. **useSafeVanishingPoint hook** memoizes coordinates but parent doesn't re-render
4. **useVanishingPointOffset** reads from store but store might not be updating in editor
5. **Recent refactoring** removed wrapper div and changed prop flow, exposing latent bugs
6. **Keyboard shortcut** ('E' key) might accidentally toggle `isEditMode`

### The Timeline

```
T=0ms: Editor mounts
  ├─ BeatmapEditor renders
  ├─ EditorCanvas renders (memo: first render always happens)
  ├─ EditorTunnelBackground renders
  ├─ TunnelBackground renders (memo: first render)
  ├─ useSafeVanishingPoint calculates coords
  ├─ useVanishingPointOffset returns { x: 0, y: 0 }
  └─ Tunnel visible ✅

T=16ms: First animation frame
  ├─ VP offset store updates (if animation manager running)
  ├─ useVanishingPointOffset hook notifies subscribers
  ├─ EditorCanvas should re-render with new vpX/vpY
  ├─ BUT: EditorCanvas memo comparison
  │   ├─ Checks if props changed
  │   ├─ currentTime: same (not playing yet)
  │   ├─ parsedNotes: same array reference
  │   ├─ metadata: same object reference
  │   └─ Returns TRUE → BLOCKS re-render 🔴
  └─ EditorCanvas doesn't re-render → tunnel stuck at frame 1

T=50ms: User presses 'E' key (accidentally or testing)
  ├─ toggleEditor shortcut fires
  ├─ setIsEditMode(false)
  └─ Notes disappear (conditional rendering) 🔴

T=100ms: Observed state
  ├─ Tunnel: Frozen at initial frame (may appear dim/wrong)
  ├─ Notes: Hidden (isEditMode = false)
  └─ User sees: Everything disappeared 🔴
```

---

## 🔧 IDENTIFIED FIXES (DO NOT IMPLEMENT YET)

### Fix #1: Remove EditorCanvas Memo
```tsx
// Current
export const EditorCanvas = memo(EditorCanvasComponent);

// Fixed
export const EditorCanvas = EditorCanvasComponent;
```
**Rationale:** Canvas needs to re-render every frame for animations. Memo optimization is inappropriate here.

### Fix #2: Remove TunnelBackground Custom Memo or Fix It
```tsx
// Option A: Remove memo entirely
export const TunnelBackground = TunnelBackgroundComponent;

// Option B: Fix comparison to always re-render
export const TunnelBackground = memo(TunnelBackgroundComponent, () => false);

// Option C: Add all internal state to comparison
export const TunnelBackground = memo(TunnelBackgroundComponent, (prevProps, nextProps) => {
  // This is complex and probably not worth it
});
```

### Fix #3: Ensure VP Animation Manager Runs in Editor
Add animation manager to BeatmapEditor that updates VP offset store:
```tsx
// Add to BeatmapEditor.tsx
useIdleRotationManager();  // This might already handle it?
```

### Fix #4: Prevent Accidental 'E' Key Toggle
```tsx
// Option A: Change shortcut to something less common
defaultKey: 'Ctrl+E'

// Option B: Add confirmation for mode toggle
// Option C: Ignore 'E' during initial mount period
```

### Fix #5: Force EditorCanvas Re-render with Key Prop
```tsx
// BeatmapEditor.tsx
<EditorCanvas
  key={`editor-${isEditMode}-${simulationMode}`}  // Force remount on mode change
  {...props}
/>
```

### Fix #6: Separate VP Calculation from Rendering
Move VP offset calculation outside EditorCanvas so it's not dependent on memo:
```tsx
// BeatmapEditor.tsx (parent)
const vpOffset = useVanishingPointOffset();  // ← Move here
const vpX = dynamicVPEnabled ? VANISHING_POINT_X + vpOffset.x : VANISHING_POINT_X;

<EditorCanvas
  vpX={vpX}  // Pass calculated value
  vpY={vpY}
  {...otherProps}
/>
```

---

## 📊 PRIORITY RANKING

| Fix | Impact | Effort | Risk | Priority |
|-----|--------|--------|------|----------|
| #1: Remove EditorCanvas memo | 🔴 High | 🟢 Low | 🟢 Low | **🔴 CRITICAL** |
| #2: Remove/Fix TunnelBackground memo | 🟠 Med | 🟡 Med | 🟡 Med | **🟠 HIGH** |
| #3: Ensure VP animation in editor | 🟡 Med | 🟡 Med | 🟢 Low | **🟡 MEDIUM** |
| #4: Prevent accidental 'E' toggle | 🟢 Low | 🟢 Low | 🟢 Low | **🟢 LOW** |
| #5: Force remount with key | 🟠 Med | 🟢 Low | 🟡 Med | **🟡 MEDIUM** |
| #6: Separate VP calculation | 🟡 Med | 🟠 High | 🟠 High | **🟢 LOW** |

---

## 🧪 TESTING STRATEGY (When Fixes Are Implemented)

### Test Case 1: Initial Render
1. Open editor
2. Verify tunnel visible immediately
3. Verify notes visible (if loaded)
4. Wait 5 seconds
5. **Expected:** Tunnel + notes remain visible

### Test Case 2: VP Animation
1. Enable dynamic VP (should be default)
2. Observe tunnel center point
3. **Expected:** Small circular wobble motion (15px amplitude, 8s cycle)

### Test Case 3: Mode Toggling
1. Press 'E' key to toggle edit mode
2. **Expected:** Notes hide when isEditMode = false
3. Press 'E' again
4. **Expected:** Notes reappear

### Test Case 4: Playback
1. Load beatmap with notes
2. Click play
3. **Expected:** Notes animate toward judgement line
4. Click pause
5. **Expected:** Notes freeze in place (still visible)

### Test Case 5: Long Session
1. Open editor
2. Leave editor open for 5 minutes
3. Interact with notes, play/pause, toggle modes
4. **Expected:** No gradual degradation, tunnel always visible

---

## 📝 NOTES FOR IMPLEMENTATION

1. **Start with Fix #1** (remove EditorCanvas memo) - lowest risk, highest impact
2. **Test thoroughly** after each fix before proceeding to next
3. **Monitor performance** - memo was added for optimization, removing it might impact frame rate
4. **Consider using React DevTools Profiler** to measure re-render frequency
5. **If performance degrades**, use `useMemo` for expensive calculations inside EditorCanvas instead of `memo` wrapper
6. **Document why memo was removed** to prevent future developers from re-adding it

---

## 🔗 RELATED FILES

- `/client/src/components/editor/EditorCanvas.tsx` - Main canvas component (memoized)
- `/client/src/components/editor/EditorTunnelBackground.tsx` - Wrapper with safety checks
- `/client/src/components/game/tunnel/TunnelBackground.tsx` - Actual tunnel (custom memo)
- `/client/src/hooks/utils/useSafeVanishingPoint.ts` - Coordinate sanitization hook
- `/client/src/hooks/effects/geometry/useVanishingPointOffset.ts` - VP animation hook
- `/client/src/stores/useVanishingPointStore.ts` - VP offset state
- `/client/src/stores/useEditorStore.ts` - Editor state (isEditMode)
- `/client/src/pages/BeatmapEditor.tsx` - Parent page component

---

**Investigation Complete - Awaiting Fix Implementation Approval**
