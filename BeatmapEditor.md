# Beatmap Editor Implementation Roadmap (Priority Order)
Below is a prioritized list of features to implement for the beatmap editor, ordered from **most essential** to **nice-to-have polish**. Focus on these in sequence to maintain momentum and quickly reach a usable editor.

## Technical Foundation: 2D Polar Coordinate System

**Critical Discovery**: The game uses **2D polar coordinate projection** (not Three.js) to simulate 3D perspective. All rendering is SVG-based with pure math:

```typescript
// Notes positioned using polar coordinates + time-based progress
const angle = getLaneAngle(lane);  // 0°, 60°, 120°, 180°, 240°, 300°
const progress = (currentTime - noteTime) / LEAD_TIME;  // LEAD_TIME = 4000ms
const distance = 1 + (progress * (JUDGEMENT_RADIUS - 1));  // JUDGEMENT_RADIUS = 187

// Final 2D screen position
const x = vpX + Math.cos(angle * π/180) * distance;
const y = vpY + Math.sin(angle * π/180) * distance;
```

**Impact**: Graphical note placement is **significantly simpler** than initially estimated - just inverse polar math, no 3D raycasting needed.

---

## Rotation & Zoom Handling in Editor

### 🔄 Tunnel Rotation (SPIN Effects)
**Current Implementation**: 
- Managed by `useTunnelRotation` hook with `useRotationTriggers` for timing
- Rotations triggered by **SYNC notes** detected in `syncLineUtils.ts`
- 1500ms animated transitions (`ROTATION_DURATION`) + 200ms settle time
- Idle sway ±5° when no rotation is active
- Notes positioned using `getLaneAngle(lane, tunnelRotation)` from `LANE_BASE_ANGLES`
- Base lane angles: W=120°, O=60°, I=300°, E=240°, Q=180°, P=0°

**Editor Strategy**:
- **Placement Mode**: Use `tunnelRotation = 0` (canonical view with no rotation offset)
  - Ensures consistent visual placement regardless of runtime rotation
  - Click-to-lane mapping always produces same results
  - Notes stored as (lane, time), rotation applied at runtime by game engine
- **Preview Mode** (Optional): Toggle to show `tunnelRotation` live for visualization
  - Visual only - doesn't affect placement coordinates
  - Helps visualize how rotation will look during gameplay
  
**Why**: Beatmap stores lane indices, not screen coordinates. Rotation is a **rendering effect** triggered by SYNC notes, not a data property.

### 🔍 Zoom Effects
**Current Implementation**: 
- Zoom scales hexagon radii (`radius * zoomScale`, typically 1.0 to 1.3)
- Also adds viewport compression toward vanishing point (`zoomIntensity`)
- Affects **both** hexagons and note rendering via camera/viewport transforms
- Zoom state persists through hold notes (important for visual consistency)
- Managed by visual effects system in `VisualEffects.tsx`

**Editor Strategy**: **DISABLE ZOOM** (`zoomScale = 1.0`, `zoomIntensity = 0`)
- Zoom affects time-based note positioning AND hexagon sizing simultaneously
- Dynamic zoom would make click-to-place math inconsistent
- **Solution**: Force editor to canonical zoom state (1.0) for accurate alignment

**Implementation**:
```typescript
// In editor mode, override zoom values
const editorZoomScale = 1.0;
const editorZoomIntensity = 0;
<HexagonLayers zoomScale={editorZoomScale} zoomIntensity={editorZoomIntensity} />
```

### 📍 Vanishing Point Wobble
**Current Implementation**: 
- Managed by `useVanishingPointOffset` hook
- VP oscillates ±15px in circular motion (8-second cycle)
- Base position: (350, 300) from `TUNNEL_GEOMETRY.vanishingPointX/Y`
- Applied to all geometry calculations in `holdNoteGeometry.ts`, `tapNoteGeometry.ts`

**Editor Strategy**: Use **fixed VP** at canonical position (350, 300)
- Wobble makes click-to-place math inconsistent
- Fixed VP ensures mouse clicks always map to same note positions
- Optional preview toggle can show live wobble for visualization

**Critical Insight**: Notes positioned in **"time-space"** (lane + timestamp), not **"screen-space"** (x, y). Editor converts mouse → time-space. Game converts time-space → screen-space with dynamic effects.

---

## Priority 1: Core Editor UI Framework (Side Panel)
**Effort**: 2-3 days | **Feasibility**: 95%

- Convert the current "Load Beatmap" modal into a **persistent/toggleable side panel** (left or right side) in new 'Beatmap Editor' page
- Split the panel into two synced sections:
  - **Top**: Editable metadata fields (title, artist, bpm, duration, youtube URL, beatmapStart, beatmapEnd)
  - **Bottom**: Live-updating text area showing full beatmap text (current format)
- Make the panel resizable/collapsible for better visibility
- Add **"Editor Mode" toggle** that pauses gameplay and shows graphical editor overlay

**Dependencies**: None - uses existing Dialog/Sheet components  
**Reuse**: `BeatmapLoader` component, `useBeatmapLoader` hook

**Why first?** Structural foundation without changing data format.

---

## Priority 2: Graphical Note Placement (Primary Input)
**Effort**: 3-4 days | **Feasibility**: 95% ⬆️ (was 85%)

### Core Click-to-Place System

**Mouse/Touch → Lane Mapping** (Simple Trigonometry):
```typescript
function mouseToLane(mouseX: number, mouseY: number, vpX: number, vpY: number): number {
  const dx = mouseX - vpX;
  const dy = mouseY - vpY;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const normalized = ((angle % 360) + 360) % 360;
  
  // Map to nearest lane (6 lanes at 60° intervals)
  const laneAngles = [0, 60, 120, 180, 240, 300];
  return findNearestLane(normalized, laneAngles);
}
```

**Mouse/Touch → Note Time (Depth)** (Linear Interpolation):
```typescript
function mouseToNoteTime(mouseX: number, mouseY: number, vpX: number, vpY: number, currentTime: number): number {
  const distance = Math.sqrt((mouseX - vpX)² + (mouseY - vpY)²);
  const progress = (distance - 1) / (JUDGEMENT_RADIUS - 1);  // JUDGEMENT_RADIUS = 187
  const timeOffset = progress * LEAD_TIME;  // LEAD_TIME = 4000ms
  return currentTime + timeOffset;
}
```

### Implementation Phases
1. **Day 1-2**: Mouse coordinate conversion + click handler
2. **Day 3**: Visual preview on hover + placement feedback
3. **Day 4**: Optional rotation/zoom preview toggle (see "Rotation & Zoom Handling")

### Features
- Click any lane at any depth to place TAP note
- Hover highlights target lane with preview note
- Uses canonical state: rotation = 0°, zoom = 1.0, fixed VP at (350, 300)
- Visual feedback: note appears instantly at click position
- Optional "Preview Effects" toggle shows live rotation/zoom (visual only, doesn't affect placement)

**Hold Note State Tracking** (for preview mode):
- Hold notes track: `hit`, `pressHoldTime`, `releaseTime`, `tooEarlyFailure`
- Completed holds: `hit === true && releaseTime !== null`
- Active holds: `hit === true && releaseTime === null`
- Visibility filtering in `holdNoteUtils.ts` prevents duplicate rendering

**Dependencies**: Basic trigonometry, YouTube player seek API  
**Removed Complexity**: ~~Three.js raycasting~~ → Simple `Math.atan2()`

**Why moved up?** Much simpler than initially estimated. Delivers massive UX value with medium effort.

---

## Priority 3: Real-Time Two-Way Sync (Text ↔ Graphics)
**Effort**: 3-4 days | **Feasibility**: 90%

- Parse text content and render notes graphically as translucent preview in tunnel
- Text edit → instant graphical preview update
- Graphical placement → instant text area update
- Highlight current playhead in both text (scroll) and graphics

**Dependencies**: 
- `beatmapParser.ts` - Parses beatmap text format
- `syncLineUtils.ts` - Sync detection and hold note state validation
- `holdNoteUtils.ts` - Hold note visibility and geometry helpers
- Note rendering components: `TapNotes.tsx`, `HoldNotes.tsx`, `SyncLines.tsx`
- Geometry utilities: `tapNoteGeometry.ts`, `holdNoteGeometry.ts`

**Challenge**: Reverse mapping (notes → text format)

**Why after placement?** Placement system must exist before sync can be bidirectional.

### 4. Basic Editing Tools
- Select and delete notes (click in graphics → remove from text, or delete line in text).
- Undo/Redo stack (critical for fluid editing — use a simple history array or library like zustand/middleware).
- Snap to beat/grid:
  - Auto-snap note times to nearest beat (based on BPM).
  - Optional subdivisions: 1/4, 1/8, 1/16 (toggle buttons).
- Copy/paste selected notes (bonus but very useful).

### 5. HOLD Note Support
- HOLD notes have format: `HOLD lane time duration` (e.g., `HOLD 2 45000 500`)
- Duration determines hold length (typically 250-1000ms)
- Editor must handle:
  - Click + drag to set duration visually
  - Duration shown as strip length in tunnel
  - Validation: duration > 0, within timing windows
- Hit windows: ±150ms press, ±150ms release (from `timing.ts`)

### 6. Playhead & Preview Controls
- Dedicated play/pause/seek controls in the editor panel (mirroring YouTube but with finer control).
- "Play from here" button — starts playback from current playhead.
- Loop section tool (set start/end markers for repeating a phrase).

### 7. Difficulty Tabs & Multiple Charts
- Support multiple difficulties in one file (e.g., [EASY], [MEDIUM], [HARD] sections).
- Tabs in the editor to switch between difficulties.
- Graphical notes update based on active difficulty.

### 8. Export / Save Functionality
- Button to copy full beatmap text to clipboard.
- Download as `.txt` file (with proper filename: `Artist - Title [Difficulty].txt`).
- LocalStorage autosave draft (so users don’t lose work).

### 9. Delete + Selection Tools
- Click note in graphics → remove from text
- Delete line in text → remove from graphics
- Undo/Redo stack (critical for fluid editing)
- Multi-select for batch operations

### 10. Polish & Quality-of-Life
- BPM tapper tool (tap spacebar to detect BPM)
- Auto-fill duration from YouTube API when URL is pasted
- Validation warnings:
  - Notes outside beatmapStart/End range
  - Invalid lane numbers (must be 0-3 or -1/-2)
  - Overlapping notes on same lane
  - HOLD durations too short (< 100ms)
- Keyboard shortcuts:
  - Space = play/pause
  - Del = delete selected
  - 0-3 = quick lane select
  - Z = undo, Y = redo
- Visual timeline waveform (Web Audio API or YouTube thumbnails)
- SYNC note indicators (trigger rotation events)

### Recommended Implementation Order Summary
1. Side panel UI + metadata fields + live text area  
2. Text → Graphical preview parsing (using `beatmapParser.ts`)  
3. Graphical → Text update on placement  
4. Click-to-place TAP + timeline scrubbing + beat snapping  
5. HOLD note support (click + drag for duration)  
6. Delete + Undo/Redo  
7. Difficulty tabs  
8. Export + autosave  
9. Selection tools + validation  
10. Polish (BPM tap, shortcuts, waveform)

Start with 1–4 and you’ll already have a **highly usable editor** that’s more intuitive than pure text editing. This will let you (and early testers) create full songs quickly, giving you content to justify building the backend later.
