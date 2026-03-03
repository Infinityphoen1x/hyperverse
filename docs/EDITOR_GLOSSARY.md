# Beatmap Editor Glossary

**Last Updated:** February 1, 2026  
**Purpose:** Comprehensive terminology reference for Beatmap Editor codebase

---

## Table of Contents

1. [Operational Modes](#operational-modes)
2. [Architecture Components](#architecture-components)
3. [State Management](#state-management)
4. [Editor Features](#editor-features)
5. [Geometry & Rendering](#geometry--rendering)
6. [Input Handling](#input-handling)
7. [Note Types & Properties](#note-types--properties)

---

## Operational Modes

### **isEditMode** (formerly editorMode)
- **Type:** `boolean`
- **Store:** `useEditorCoreStore`
- **Purpose:** Controls whether editing features are enabled
- **When true:** Beat grid visible, interaction layer enabled, note selection/editing active
- **When false:** Read-only view mode, no interaction with notes
- **UI Elements:** Affects beat grid visibility, selection bounding boxes, interaction layer
- **Renamed from:** `editorMode` (changed to reduce confusion - you're always in the editor)

### **simulationMode**
- **Type:** `boolean`
- **Store:** `useEditorCoreStore`
- **Purpose:** Enables gameplay testing mode within the editor
- **When true:** 
  - Gameplay keyboard input (QWEIOP) enabled
  - Soundpad buttons visible
  - Deck hold meters visible
  - Sidebar hidden
  - Beat grid hidden
  - Manual note processing (NoteProcessor)
- **When false:** Standard editor mode
- **Relationship:** Mutually exclusive with `isEditMode` - simulation disables editing features
- **Limitations:** ⚠️ Incomplete implementation - missing auto-fail, health depletion, game over

### **Three States Summary**

| State | isEditMode | simulationMode | Description |
|-------|-----------|----------------|-------------|
| **Editing** | `true` | `false` | Full note editing features |
| **Simulation** | `false` | `true` | Gameplay testing mode |
| **Read-only** | `false` | `false` | Viewing only (rare) |

---

## Architecture Components

### **EditorCanvas**
- **Path:** `components/editor/EditorCanvas.tsx`
- **Purpose:** Main canvas component coordinating all editor rendering
- **Renders:** EditorTunnelBackground, notes, beat grid, selection UI
- **Props:** `isEditMode`, `simulationMode`, `currentTime`, `parsedNotes`
- **Responsibilities:** 
  - Coordinate rendering layers
  - Pass through interaction events
  - Toggle UI elements based on mode

### **EditorTunnelBackground**
- **Path:** `components/editor/EditorTunnelBackground.tsx`
- **Purpose:** Thin wrapper around game's `TunnelBackground` component
- **Design:** Reuses gameplay tunnel without modification
- **Props:** `vpX`, `vpY`, `hexCenterX`, `hexCenterY`, `health`
- **Key Insight:** No code duplication - perfect alignment with game rendering

### **EditorInteractionLayer**
- **Path:** `components/editor/EditorInteractionLayer.tsx`
- **Purpose:** SVG layer handling mouse/touch interactions with notes
- **Active When:** `isEditMode === true`
- **Features:**
  - Note selection (click, drag-box)
  - Note dragging (move in time)
  - HOLD note handle extension (drag front/back)
  - Hover detection
  - Note properties dialog trigger

### **Two-Layer Architecture**
```
┌─────────────────────────────┐
│  EditorInteractionLayer     │  ← Top: Mouse events, selection
│  (SVG overlay)              │
├─────────────────────────────┤
│  TunnelBackground + Notes   │  ← Bottom: Visual rendering
│  (Game components)          │
└─────────────────────────────┘
```

---

## State Management

### **useEditorCoreStore**
- **Path:** `stores/useEditorCoreStore.ts`
- **Purpose:** Core editor state (modes, notes, playback, metadata)
- **Key State:**
  - `isEditMode`: Editing features toggle
  - `simulationMode`: Gameplay testing toggle
  - `parsedNotes`: Array of Note objects
  - `currentTime`: Playback timestamp (ms)
  - `currentDifficulty`: Selected difficulty index
  - `metadata`: Beatmap metadata (artist, title, BPM, etc.)
- **Actions:** `setParsedNotes`, `toggleEditMode`, `toggleSimulationMode`, `updateMetadata`

### **useEditorUIStore**
- **Path:** `stores/useEditorUIStore.ts`
- **Purpose:** UI state (selection, modals, popups, sidebar)
- **Key State:**
  - `selectedNoteIds`: Array of selected note IDs
  - `hoveredNoteId`: Currently hovered note ID
  - `showYouTubeSetup`: YouTube setup modal visibility
  - `showBpmTapper`: BPM tapper modal visibility
  - `sidebarVisible`: Sidebar panel visibility
  - `activeTab`: Active sidebar tab ('notes' | 'settings' | 'shortcuts')
- **Actions:** `toggleSelection`, `setHoveredNote`, `showModal`, `toggleSidebar`

### **useEditorGraphicsStore**
- **Path:** `stores/useEditorGraphicsStore.ts`
- **Purpose:** Visual effects settings (zoom, VP, rotation)
- **Key State:**
  - `zoomEnabled`: Zoom effect toggle
  - `dynamicVPEnabled`: Dynamic vanishing point wobble toggle
  - `rotationEnabled`: Tunnel rotation toggle
- **Actions:** `toggleZoom`, `toggleDynamicVP`, `toggleRotation`

### **useYouTubePlayerStore**
- **Path:** `stores/useYouTubePlayerStore.ts`
- **Purpose:** YouTube player integration state
- **Key State:**
  - `youtubeVideoId`: Current video ID
  - `isReady`: Player ready state
  - `currentTime`: Video playback time
- **Actions:** `setVideoId`, `play`, `pause`, `seekTo`

---

## Editor Features

### **Beat Grid**
- **Visibility:** `isEditMode === true`
- **Purpose:** Visual guide showing beat divisions for note placement
- **Rendering:** SVG lines radiating from vanishing point at calculated time intervals
- **Configuration:** `BEAT_GRID_OFFSET_FACTOR` in `lib/config/editor.ts`
- **Calculation:** Based on BPM and time signature from metadata

### **Selection**
- **Single Selection:** Click note to select (yellow highlight)
- **Multi-Selection:** Ctrl+Click to add/remove from selection
- **Drag Selection:** Click+drag on empty space to create selection box
- **Visual Indicator:** Bounding boxes drawn around selected notes
- **State:** Stored in `useEditorUIStore.selectedNoteIds`

### **Note Handles** (HOLD notes only)
- **Purpose:** Visual indicators for extending/shortening HOLD duration
- **Types:**
  - **Front Handle:** Circle at note start position (green)
  - **Back Handle:** Circle at note end position (red)
- **Interaction:** Drag handle to adjust HOLD duration
- **Constraints:** 
  - Minimum duration: `MIN_HOLD_DURATION` (165ms)
  - Cannot drag past adjacent notes in same lane

### **Duration Input Popup**
- **Trigger:** Keyboard shortcut when note selected
- **Purpose:** Precise numeric input for HOLD duration
- **UI:** Modal popup with text input and OK/Cancel buttons
- **Validation:** Enforces `MIN_HOLD_DURATION` constraint

### **Note Properties Dialog**
- **Trigger:** Double-click note or keyboard shortcut
- **Purpose:** Edit all note properties (time, lane, type, duration)
- **Fields:** 
  - Time (ms)
  - Lane (-2, -1, 0, 1, 2, 3)
  - Type (TAP, HOLD, SPIN)
  - Duration (HOLD notes only, ms)

---

## Geometry & Rendering

### **Vanishing Point (VP)**
- **Definition:** Center point of tunnel perspective rendering
- **Base Position:** `(350, 300)` in viewport coordinates
- **Dynamic Offset:** Circular wobble animation for 3D effect
- **Constants:**
  - `VP_AMPLITUDE`: 15px offset from center
  - `VP_CYCLE_DURATION`: 8000ms per full cycle
  - `VP_UPDATE_INTERVAL`: 16ms (~60fps)
- **Store:** `useVanishingPointStore`

### **Tunnel Geometry**
- **Coordinate System:** 2D polar coordinates (angle, distance)
- **Angles:** 0°, 60°, 120°, 180°, 240°, 300° (6 rays)
- **Lane Mapping:**
  ```
  Lane -2 (P): 0°    (right deck)
  Lane 1 (O):  60°   (top-right)
  Lane 0 (W):  120°  (top)
  Lane -1 (Q): 180°  (left deck)
  Lane 3 (E):  240°  (bottom-left)
  Lane 2 (I):  300°  (bottom-right)
  ```
- **Distance:** Notes travel from far (large distance) to near (small distance)
- **Judgement Radius:** 187px from vanishing point

### **Hexagon Radii**
- **Purpose:** Nested hexagons creating depth perspective
- **Values:** `[22, 52, 89, 135, 187, 248]` pixels from VP
- **Source:** `TUNNEL_GEOMETRY.hexagonRadii` in `lib/config/geometry.ts`

### **Ray Angles**
- **Definition:** 6 angles radiating from vanishing point
- **Values:** `[0, 60, 120, 180, 240, 300]` degrees
- **Source:** `TUNNEL_GEOMETRY.rayAngles` in `lib/config/geometry.ts`
- **Usage:** Calculate note positions along tunnel depth

---

## Input Handling

### **KEY_LANE_MAP**
- **Path:** `lib/config/input.ts`
- **Purpose:** Map keyboard keys to lane indices
- **Mapping:**
  ```typescript
  'q'/'Q' → Lane -1  (left deck)
  'p'/'P' → Lane -2  (right deck)
  'w'/'W' → Lane 0   (top)
  'e'/'E' → Lane 1   (top-right) 
  'i'/'I' → Lane 2   (bottom-right)
  'o'/'O' → Lane 3   (bottom-left)
  ```
- **Used By:** Simulation mode keyboard handlers, game input hooks

### **GAMEPLAY_KEYS**
- **Type:** `string[]`
- **Values:** All keys in KEY_LANE_MAP
- **Purpose:** Detect gameplay key presses (prevent default browser behavior)

### **Editor Keyboard Shortcuts**
- **Store:** `useShortcutsStore`
- **Examples:**
  - `Space`: Toggle play/pause
  - `Ctrl+Z`: Undo
  - `Ctrl+Y`: Redo
  - `Delete`: Delete selected notes
  - `Ctrl+D`: Duplicate selected notes
  - `Escape`: Deselect all

---

## Note Types & Properties

### **TAP Note**
- **Type:** `'TAP'`
- **Duration:** 0ms (instant hit)
- **Input:** Single key press
- **Visual:** Circle at lane position
- **Scoring:** Hit window: ±150ms (TAP_HIT_WINDOW)

### **HOLD Note**
- **Type:** `'HOLD'`
- **Duration:** Variable (minimum 165ms)
- **Input:** Key press → hold → release
- **Visual:** Elongated shape from start to end time
- **Scoring:** 
  - Start hit window: ±150ms
  - Continuous holding required
  - Release hit window: ±150ms
- **Properties:**
  - `startTime`: Note start timestamp (ms)
  - `endTime`: Note end timestamp (ms)
  - `duration`: Calculated as `endTime - startTime`

### **SPIN Note**
- **Type:** `'SPIN'`
- **Duration:** Variable
- **Lanes:** -1 (left deck, Q key) or -2 (right deck, P key)
- **Input:** Key press → hold (rotates deck continuously)
- **Visual:** Deck rotation indicator
- **Scoring:** Points accumulate while held

### **Note State Flags**
```typescript
interface Note {
  id: string;
  type: 'TAP' | 'HOLD' | 'SPIN';
  time: number;          // Start time (ms)
  endTime?: number;      // End time for HOLD/SPIN
  lane: number;          // -2, -1, 0, 1, 2, 3
  hit?: boolean;         // Note was successfully hit
  missed?: boolean;      // Note was missed
  greyedOut?: boolean;   // Note passed judgement window (grey visual)
  heldNotesData?: {      // HOLD note tracking data
    startHitTime?: number;
    isHolding?: boolean;
    releaseTime?: number;
  };
}
```

---

## Utility Functions

### **getLaneAngle(lane, rotationOffset?)**
- **Path:** `lib/utils/laneUtils.ts`
- **Purpose:** Get angle for lane with optional rotation
- **Params:**
  - `lane`: Lane index (-2 to 3)
  - `rotationOffset`: Additional rotation in degrees (default: 0)
- **Returns:** Angle in degrees
- **Example:** `getLaneAngle(0, 45)` → 165° (lane 0 base 120° + 45° rotation)

### **getColorForLane(lane, health?)**
- **Path:** `lib/utils/laneUtils.ts`
- **Purpose:** Get color for lane with health-based desaturation
- **Params:**
  - `lane`: Lane index
  - `health`: Current health (0-100, default: MAX_HEALTH)
- **Returns:** Hex color string
- **Colors:**
  - Lane -1 (Q): Green `#00FF00`
  - Lane -2 (P): Red `#FF0000`
  - Lane 0 (W): Orange `#FF6600`
  - Lane 1 (O): Blue `#0096FF`
  - Lane 2 (I): Purple `#BE00FF`
  - Lane 3 (E): Cyan `#00FFFF`

### **isGameplayKey(key)**
- **Path:** `lib/config/input.ts`
- **Purpose:** Check if key is a gameplay key
- **Params:** `key` - Key string (e.g., 'w', 'Q')
- **Returns:** `boolean`

### **getLaneFromKey(key)**
- **Path:** `lib/config/input.ts`
- **Purpose:** Get lane index from keyboard key
- **Params:** `key` - Key string
- **Returns:** Lane number or `undefined`

### **getKeysForLane(lane)**
- **Path:** `lib/config/input.ts`
- **Purpose:** Get all keys that map to a lane
- **Params:** `lane` - Lane index
- **Returns:** Array of key strings (uppercase and lowercase)
- **Example:** `getKeysForLane(0)` → `['w', 'W']`

---

## Configuration Constants

### **Editor Config** (`lib/config/editor.ts`)
```typescript
MIN_HOLD_DURATION = 165           // Minimum HOLD duration (ms)
MIN_DRAG_DISTANCE = 5             // Minimum drag distance (pixels)
CLICK_TOLERANCE_PIXELS = 10       // Click vs drag threshold
BEAT_GRID_OFFSET_FACTOR = 0.1     // Beat grid spacing factor
MS_PER_MINUTE = 60000             // Milliseconds per minute (BPM conversion)
VALID_LANES = [-2, -1, 0, 1, 2, 3] // All valid lane indices
```

### **Timing Config** (`lib/config/timing.ts`)
```typescript
LEAD_TIME = 2000                  // Note visibility window (ms)
TAP_HIT_WINDOW = 150              // Hit detection window (ms)
HOLD_START_WINDOW = 150           // HOLD start hit window (ms)
HOLD_RELEASE_WINDOW = 150         // HOLD release hit window (ms)
```

### **Geometry Config** (`lib/config/geometry.ts`)
```typescript
VANISHING_POINT_X = 350           // VP X coordinate
VANISHING_POINT_Y = 300           // VP Y coordinate
JUDGEMENT_RADIUS = 187            // Hit zone radius (pixels)
TUNNEL_MAX_DISTANCE = 260         // Max note distance
HEXAGON_RADII = [22, 52, 89, 135, 187, 248]  // Depth layers
```

### **Input Config** (`lib/config/input.ts`)
```typescript
KEY_LANE_MAP                      // Key to lane mapping
GAMEPLAY_KEYS                     // Array of all gameplay keys
TAP_LANE_KEYS                     // TAP lane keys only (WEIO)
SPIN_DECK_KEYS                    // SPIN deck keys only (QP)
LANE_KEY_LABELS                   // Display labels for lanes
```

---

## Common Confusion Points

### **isEditMode vs simulationMode**
- **Confusion:** Names suggest they're independent toggles
- **Reality:** They're mutually exclusive modes
- **Clarification:** 
  - `isEditMode = true` → Editing features on, gameplay off
  - `simulationMode = true` → Gameplay testing on, editing off
  - Both `false` → Read-only view (rare)

### **EditorTunnel vs Simulation**
- **Confusion:** Are these the same thing?
- **Clarification:**
  - **EditorTunnel:** Visual rendering (always present in editor)
  - **Simulation:** Gameplay testing mode (optional, user-activated)
  - EditorTunnel is used by both editing mode AND simulation mode

### **parsedNotes vs difficultyNotes**
- **Confusion:** Two note arrays in `useEditorCoreStore`
- **Clarification:**
  - `parsedNotes`: Currently displayed/edited notes (single difficulty)
  - `difficultyNotes`: All notes across all difficulties (stored in beatmap)
  - When switching difficulty, `parsedNotes` is replaced with notes from `difficultyNotes[index]`

### **currentTime sources**
- **Confusion:** Multiple time sources across stores
- **Sources:**
  1. `useEditorCoreStore.currentTime` - Editor playback time
  2. `useYouTubePlayerStore.currentTime` - YouTube player time
  3. `audioManager.getCurrentTime()` - Audio context time
- **Clarification:** Editor syncs from YouTube player, which is the source of truth

### **Lane indices**
- **Confusion:** Why lanes -2 and -1?
- **Clarification:**
  - Lanes 0-3: TAP lanes (standard notes)
  - Lanes -1, -2: SPIN decks (deck rotation mechanics)
  - Negative indices distinguish deck lanes from TAP lanes

---

## Simulation Mode Limitations (⚠️ Incomplete)

### **What Works (60% feature parity)**
- ✅ Keyboard input detection (QWEIOP keys)
- ✅ TAP note hit detection
- ✅ HOLD note start/end detection
- ✅ Sound effects (tapHit, noteMiss, spinNote)
- ✅ Note state updates (hit, missed, greyedOut flags)
- ✅ Visual rendering matches gameplay

### **What's Missing (40% missing features)**
- ❌ Auto-fail for missed notes (no frame-based processing loop)
- ❌ Health system (no health depletion on misses)
- ❌ Game over state (can't test end-of-beatmap)
- ❌ Combo tracking (no combo counter)
- ❌ Score calculation (no scoring system)
- ❌ Perfect/Great/Good judgement accuracy

### **Architectural Issue**
- **Problem:** Simulation reimplements input handling manually instead of using `useGameEngine` hook
- **Impact:** Code duplication, potential behavior divergence from actual gameplay
- **Recommendation:** Either refactor to use game hooks or deprecate simulation mode

---

## Related Documents

- [BEATMAP_EDITOR_DEEP_INVESTIGATION.md](BEATMAP_EDITOR_DEEP_INVESTIGATION.md) - Full investigation report
- [BEATMAP_EDITOR_CLEANUP_SUMMARY.md](BEATMAP_EDITOR_CLEANUP_SUMMARY.md) - Cleanup progress
- [BeatmapEditor.md](BeatmapEditor.md) - Architecture overview
- [EDITOR_TWO_LAYER_ARCHITECTURE.md](EDITOR_TWO_LAYER_ARCHITECTURE.md) - Layer architecture details

---

**Questions or corrections?** This glossary is maintained as part of the editor codebase. Submit updates via PR or issue.
