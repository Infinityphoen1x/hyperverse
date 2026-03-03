# Editor Two-Layer Architecture

## Overview

The beatmap editor now uses a proper two-layer architecture where the interaction layer is on top and feeds data to the rendering layer below.

## Architecture

```
┌─────────────────────────────────────────────┐
│  LAYER 2: Interaction Layer (Top)          │
│  - EditorInteractionLayer.tsx               │
│  - Invisible polygons matching note geometry│
│  - Handles all mouse events                 │
│  - Updates editor state (selection, drag)   │
│  - z-index: 10, opacity: 0                  │
└─────────────────────────────────────────────┘
                    ↓ (state flows down)
┌─────────────────────────────────────────────┐
│  LAYER 1: Rendering Layer (Bottom)         │
│  - HoldNotes.tsx / TapNotes.tsx             │
│  - Visible game note rendering              │
│  - Reads editor state for visual feedback   │
│  - Shows selection, handles, white lines    │
│  - pointerEvents: 'none'                    │
└─────────────────────────────────────────────┘
```

## Key Components

### EditorInteractionLayer.tsx
**Location:** `client/src/components/editor/EditorInteractionLayer.tsx`

**Purpose:** Provides invisible clickable overlay for note selection

**Features:**
- Renders invisible `<polygon>` elements matching exact note geometry
- Uses same geometry calculations as game rendering (calculateTapNoteGeometry, getTrapezoidCorners)
- Handles onClick and onMouseDown events
- Filters visible notes using same logic as game (LEAD_TIME, playerSpeed)
- Cursor changes: 'pointer' for unselected, 'move' for selected

**Props:**
```typescript
{
  vpX: number;                    // Vanishing point X
  vpY: number;                    // Vanishing point Y
  selectedNoteId: string | null;  // Currently selected note
  onNoteClick: (note, event) => void;    // Click handler
  onNoteMouseDown: (note, event) => void; // Mouse down handler
}
```

### EditorCanvas.tsx
**Location:** `client/src/components/editor/EditorCanvas.tsx`

**Changes:**
1. Added `EditorInteractionLayer` import
2. Added `handleNoteClick` callback:
   - If note not selected: selects it
   - Respects Ctrl/Cmd for multi-select
3. Added `handleNoteMouseDown` callback:
   - Sets up drag state (draggedNoteId, dragStartTime, dragStartLane)
   - Prevents editing during playback
4. Renders `<EditorInteractionLayer>` on top of all other components

**Rendering Order (top to bottom):**
```tsx
<EditorInteractionLayer />        // z-index: 10, invisible, clickable
<NoteExtensionIndicators />       // White lines
<NoteHandles />                   // Handle dots
<TapNotes />                      // pointerEvents: 'none'
<HoldNotes />                     // pointerEvents: 'none'
<JudgementLines />
<SoundpadButtons />
<TunnelBackground />
```

## Data Flow

### Selection Flow
```
1. User clicks on note polygon
   ↓
2. EditorInteractionLayer detects click
   ↓
3. onNoteClick(note, event) called
   ↓
4. EditorCanvas.handleNoteClick updates state
   ↓
5. coreStore.setSelectedNoteId(note.id)
   ↓
6. Rendering layer reads selectedNoteId
   ↓
7. NoteExtensionIndicators shows white lines
8. NoteHandles shows handle dots
```

### Drag Flow
```
1. User mousedown on note polygon
   ↓
2. EditorInteractionLayer detects mousedown
   ↓
3. onNoteMouseDown(note, event) called
   ↓
4. EditorCanvas.handleNoteMouseDown sets:
   - draggedNoteId = note.id
   - dragStartTime = note.time
   - dragStartLane = note.lane
   ↓
5. Mouse move triggers existing drag logic
   ↓
6. Note position/duration updated in store
   ↓
7. Rendering layer automatically re-renders
```

## Why This Architecture?

### Benefits
1. **Clean Separation**: Game rendering unaffected by editor logic
2. **Reusability**: Same HoldNotes/TapNotes components work in game and editor
3. **Maintainability**: Interaction logic in one place (EditorInteractionLayer)
4. **Performance**: Rendering layer stays pure, no event handler overhead
5. **Correctness**: Click detection uses exact geometry from game rendering

### Previous Issues (Now Fixed)
❌ **Old:** Mouse events on container div, geometry calculated twice  
✅ **New:** Geometry calculated once, interaction matches perfectly

❌ **Old:** Selection logic guessed which note was clicked  
✅ **New:** Direct polygon click - no guessing

❌ **Old:** NoteHandles/NoteExtensionIndicators as separate overlay  
✅ **New:** Proper layering - interaction on top, visuals below

## Geometry Matching

The interaction layer uses **identical geometry calculations** as the rendering layer:

### TAP Notes
```typescript
// Both layers use:
const progress = 1 - ((note.time - currentTime) / LEAD_TIME);
const geometry = calculateTapNoteGeometry(
  progress, rayAngle, vpX, vpY,
  false, currentTime, false, note.time, undefined, false
);
```

### HOLD Notes
```typescript
// Both layers use:
const timeUntilHit = note.time - currentTime;
const holdGeometry = calculateApproachGeometry(
  timeUntilHit, 0, false, note.duration,
  false, false, LEAD_TIME
);
const corners = getTrapezoidCorners(
  rayAngle, holdGeometry.nearDistance,
  holdGeometry.farDistance, vpX, vpY, note.id
);
```

## Implementation Details

### Visibility Filtering
Uses same MAGIC_MS formula as game rendering:
```typescript
const MAGIC_MS = 80000;
const effectiveLeadTime = MAGIC_MS / playerSpeed;
```

This ensures interaction layer only shows polygons for visible notes.

### Event Handling
- **onClick**: Selects/deselects notes
- **onMouseDown**: Initiates drag operation
- **Cursor**: Changes based on selection state
- **stopPropagation**: Prevents canvas events from firing

### Z-Index Layering
- EditorInteractionLayer: `z-index: 10`
- Other components: default stacking (rendered order)
- Canvas container: catches clicks on empty space

## Future Enhancements

### Potential Improvements
1. **Handle detection in interaction layer**: Move handle detection logic here
2. **Hover states**: Show highlight when hovering over notes
3. **Multi-select box**: Add drag-select box for multiple notes
4. **Visual feedback**: Show cursor hints for different drag modes

### Notes
- Keep `pointerEvents: 'none'` on rendering layer
- Always match geometry calculations exactly
- Test at different player speeds (5, 20, 40)
- Verify tunnel rotation works correctly

## Testing Checklist

- [ ] Click TAP note to select
- [ ] Click HOLD note to select
- [ ] Click selected note to deselect
- [ ] Ctrl+Click for multi-select
- [ ] Drag note to move
- [ ] Drag handles to resize
- [ ] Cursor changes on hover
- [ ] Works at different zoom levels
- [ ] Works with tunnel rotation
- [ ] Works at different player speeds
- [ ] Cannot edit during playback
- [ ] Click empty space deselects

## Related Files

**Core Implementation:**
- `client/src/components/editor/EditorInteractionLayer.tsx` (NEW)
- `client/src/components/editor/EditorCanvas.tsx` (MODIFIED)

**Rendering Layer (unchanged):**
- `client/src/components/game/notes/HoldNotes.tsx`
- `client/src/components/game/notes/TapNotes.tsx`
- `client/src/components/game/notes/HoldNote.tsx`
- `client/src/components/game/notes/TapNote.tsx`

**Visual Feedback (reads state):**
- `client/src/components/editor/NoteExtensionIndicators.tsx`
- `client/src/components/editor/NoteHandles.tsx`

**State Management:**
- `client/src/stores/useEditorCoreStore.ts`
- `client/src/hooks/editor/useEditorMouseHandlers.ts`
