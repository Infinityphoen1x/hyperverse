# Beatmap Editor – Core Mouse Interaction Features

This document summarizes the basic mouse-based editing functionality we want in the beatmap editor.

Current visual style:  
- 3D perspective tunnel / pentagon-shaped playfield  
- Vanishing point (VP) at center  
- Neon/cyberpunk aesthetic  
- Held notes appear as long wedges/tails approaching the judgment line

## Note Data Model
- **All notes** have: `id`, `type: 'TAP' | 'HOLD'`, `lane`, `time` (start)
- **HOLD notes** have: `duration > 0` (end = time + duration)
- **TAP notes**: `duration` is **undefined/null** (instantaneous)
- **Editor treatment of TAPs**: Treated as having **effective duration = `TAP_HIT_WINDOW`** (e.g. 67ms) for:
  - Overlap checks: TAP occupies `[time - window/2, time + window/2]`
  - Visual ghost/previews during drag
- **Dynamic conversion rules** (auto-apply during edits):
  | Scenario | Result |
  |----------|--------|
  | Hold `duration` ≤ `TAP_HIT_WINDOW` | Convert to TAP: `type='TAP'`, `duration=undefined` |
  | (Future?) Custom TAP with duration > `TAP_HIT_WINDOW` | Convert to HOLD: `type='HOLD'`, `duration=explicit` |
- **Constants**:
  - `TAP_HIT_WINDOW`: Default hit window (e.g. from `GAME_CONFIG.TAP_HIT_WINDOW`)
  - Minimum HOLD duration: `TAP_HIT_WINDOW + epsilon` (e.g. +1ms to avoid float issues)

## Supported Note Types (at minimum)
- TAP: single instant hit (small note, no tail)
- HOLD: has start time + duration (shown as long wedge/tail)

## Desired Core Editing Behaviors

### 1. Selecting Notes
- Click a note → selects it (clears previous selection unless modifier key used)
- Shift + click → additive selection (multi-select)
- Clicking empty space → clears selection
- Selected notes get visual highlight (glow, border, etc.)

### 2. Dragging a Non-Selected Note (Move in time + lane)
- Click and drag a **non-selected** note → moves the entire note
- Changes both:
  - Time (forward/backward along Z-axis / tunnel)
  - Lane (side-to-side movement)
- Snaps to grid if snap is enabled
- **Live preview**: Ghost at target (use effective duration for TAPs)
- **Prevent overlap**: Use `checkNoteOverlap` with hit window for TAPs
- Cursor: `grab` → `grabbing`
- On finalize: Apply conversion rules if duration changed

### 3. Dragging the Ends of a Hold Note (Change Duration)
- When mouse hovers near start (**head**) or end (**tail**) of a **HOLD** note:
  - Show small handle (circle/diamond/glow)
  - Cursor: `ns-resize` or `ew-resize`
- Drag **head** handle:
  - Changes note start `time`
  - New duration = original end – new start
- Drag **tail** handle:
  - Changes note `duration` (end time moves)
- **Clamps & conversion**:
  - Cannot make duration ≤ `TAP_HIT_WINDOW`
  - If new duration ≤ `TAP_HIT_WINDOW` → **auto-convert to TAP**
    ```ts
    // Example
    const newDuration = Math.max(proposedDuration, 0);
    if (newDuration <= TAP_HIT_WINDOW) {
      return { type: 'TAP', time: newStartTime, duration: undefined };
    }
    return { type: 'HOLD', time: newStartTime, duration: newDuration };
    Live visual update: wedge/tail grows/shrinks in real-time
Snaps both head and tail to grid if snap enabled
Prevent overlap after resize (use effective durations)

4. Multi-Select + Batch Duration Editing

When multiple HOLD notes are selected:
If dragging a handle (head or tail) of one of them:
Check if all selected holds share the same:
Start time (when dragging head), or
End time (when dragging tail)

If timings match → apply the same delta to all selected holds
Head drag → shift all start times + adjust all durations
Tail drag → adjust all durations equally

Batch conversion: If any resulting duration ≤ TAP_HIT_WINDOW → convert those to TAP
If timings do not match → edit only the dragged note (or show warning)

Batch move (dragging body, not handle) → optional: shift entire group in time

Additional Notes / QoL Ideas

Alt + drag handle → duplicate note instead of moving (apply conversion on dupe)
Double-click hold note → auto-extend duration to next snap division
Visual feedback:
Hover: highlight nearest handle
Drag: ghost/outline at target position (TAPs show as small note + faint window)
Invalid move (overlap/negative duration): red flash or revert
Conversion: brief glow/pulse when TAP ↔ HOLD

History/undo: each mouse-up that changes notes should be one undo step
Audio feedback: soft "click" on successful place/move/resize; "snap" on conversion
Creation: Short drag in empty space → TAP; long drag → HOLD with duration

Current Implementation Hints (from existing code)

findCandidateNote() → good for click detection
detectNearestHandle() → already exists for head/tail detection
updateNoteFromHandleDrag() → extend for head/tail + conversion
checkNoteOverlap() → ensure it uses TAP_HIT_WINDOW for TAPs
snapTimeToGrid() → apply consistently
Use ghost notes or temporary _preview flag for live preview
Add isHold(note: Note): boolean = !!note.duration && note.duration > TAP_HIT_WINDOW

Last updated: January 2026
Feel free to expand with flick notes, slides, multi-lane holds, etc. later.