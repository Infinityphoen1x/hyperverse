# Future Implementations

This document outlines planned features for the Hyperverse rhythm game engine.

## Visual Effects

### Parallax Effect
**Status:** Planned  
**Priority:** Medium

Add a second hexagon tunnel that serves as a pure background visual effect, creating depth and thickness to the tunnel walls.

**Implementation Details:**
- Render a secondary hexagon tunnel behind the main gameplay tunnel
- Apply 300ms delay to all transformations (vanishing point shifts, rotations, etc.)
- Creates a parallax depth effect where background lags slightly behind foreground
- Purely cosmetic - does not affect gameplay hitboxes or note positioning

**Benefits:**
- Enhanced visual depth and immersion
- More cinematic feel during vanishing point transitions
- Creates "thickness" illusion for tunnel walls

---

### Sync Lines
**Status:** Planned  
**Priority:** High

Visual indicator for notes that must be hit simultaneously, using glowing hexagons that follow note rays.

**Implementation Details:**
- Hexagon glow effect that connects synchronized notes
- Must support multiple sync combinations:
  - Hold note + Tap note
  - Hold note + Hold note
  - Tap note + Tap note
- Indicates that the **NEAR ENDS** of notes are in sync (tap point for TAP, start point for HOLD)
- Hexagon visual scales larger as notes approach judgment line (perspective-correct z-axis scaling)
- Follows the rays between synchronized notes

**Technical Requirements:**
- Note pairing detection algorithm
- Dynamic hexagon sizing based on z-distance from judgment line
- Shader/glow effects for hexagon appearance

---

### ZOOM Effect
**Status:** Planned  
**Priority:** Medium

Visual magnification effect triggered when two hold notes are played simultaneously.

**Implementation Details:**
- Activates when two HOLD notes are active at the same time
- Visual changes during ZOOM:
  - Distance between hexagons decreases (compressed z-spacing)
  - All elements gain enhanced glow effects
  - Creates "tunnel compression" illusion
- Smoothly transitions in/out as hold notes start/end

**Technical Requirements:**
- Detect simultaneous hold note states
- Animate hexagon z-spacing dynamically
- Apply glow shaders to all tunnel elements during effect

---

## Gameplay Mechanics

### Rotating Tunnel
**Status:** Planned  
**Priority:** High  
**Dependency:** Required for HOLD notes on all lanes

Enable dynamic tunnel rotation to align outer lanes with deck positions for hold notes.

**Implementation Details:**
- **Background Rotation (Cosmetic):** Fixed outer hexagon rotates back and forth naturally during gameplay
- **Pre-Rotation for HOLD Notes:** Tunnel rotates BEFORE hold note reaches judgment line
  - Rotation starts early based on lead time and rotation duration
  - By the time note arrives, lane is already aligned with deck position
  - Player simply holds the key while note is at the deck

**Rotation Timing:**
```
LEAD_TIME = 2000ms (notes visible 2s before hit)
ROTATION_DURATION = 500-800ms (tune for smoothness)
SETTLE_TIME = 200ms (buffer after rotation)

rotationStart = noteTime - LEAD_TIME - ROTATION_DURATION - SETTLE_TIME
```

**Example Timeline:**
- 7,200ms: Tunnel starts rotating (HOLD note at 10,000ms)
- 7,700-8,000ms: Rotation completes
- 8,000-10,000ms: Note travels down now-aligned lane
- 10,000ms: Player hits note at deck position

**Technical Requirements:**
- Rotation transformation matrix applied to all hexagons, notes, and rays
- Smooth easing curves (ease-in-out) to prevent disorientation
- Preserve lane-to-key mappings during rotation (W key always triggers lane W)
- Calculate rotation angle based on target lane:
  - Lane W (120°) → rotate to 180° or 0° (60° or 240° rotation)
  - Lane O (60°) → rotate to 180° or 0° (120° or 300° rotation)
  - Lane I (300°) → rotate to 0° or 180° (60° or 240° rotation)
  - Lane E (240°) → rotate to 0° or 180° (120° or 300° rotation)

**Rotation Reset:**
- After HOLD release, rotate back to neutral (0°)
- If another HOLD is queued soon, stay rotated to minimize motion
- Optimize to skip unnecessary rotations

---

### Upgrade All Lanes for Hold Notes
**Status:** Planned  
**Priority:** High  
**Dependency:** Required for tunnel rotation mechanic

Expand hold note functionality from decks (P/Q lanes) to all standard lanes (W, E, I, O).

**Current State:**
- Hold notes only work on lanes -1 and -2 (DJ decks, P/Q keys)
- Deck lanes are on x-axis (0° and 180°), which is required for hold mechanics

**New Behavior:**
- All lanes (W, E, I, O, -1, -2) support HOLD notes
- HOLD notes on lanes W, E, I, O trigger automatic tunnel rotation to align with deck positions
- HOLD notes on lanes -1, -2 behave as current deck holds (no rotation needed)

**Lane Geometry:**
```
W (lane 0):  120°
O (lane 1):   60°
I (lane 2):  300°
E (lane 3):  240°
Q (lane -1): 180° (left deck)
P (lane -2):   0° (right deck)
```

**Rotation Behavior:**
- When HOLD note appears on outer lane, tunnel pre-rotates to align lane with x-axis (deck position)
- Rotation completes before note reaches judgment line
- Player holds original key (e.g., W key for lane W, even when rotated to deck position)
- After release, tunnel rotates back to neutral

**Technical Requirements:**
- Extend hold note detection to all 6 lanes
- Update beatmap parser to support HOLD on lanes 0, 1, 2, 3
- Implement rotation trigger logic based on note lead time
- Add beatmap validation for HOLD note pairing constraints (see below)

---

### HOLD Note Pairing Constraint
**Status:** Design Rule  
**Priority:** Critical for Hold Notes on All Lanes

Geometric constraint for simultaneous HOLD notes based on hexagon lane layout.

**Constraint:**
- Simultaneous HOLD notes **must be on opposite lanes** (180° apart)
- This ensures both holds can align with deck positions after tunnel rotation

**Valid HOLD Pairs:**
- **Q + P** (lanes -1 and -2): 180° and 0° - already on x-axis ✅
- **W + I** (lanes 0 and 2): 120° and 300° - opposite sides ✅
- **O + E** (lanes 1 and 3): 60° and 240° - opposite sides ✅

**Invalid HOLD Pairs:**
- W + O (120° and 60°) - only 60° apart ❌
- W + E (120° and 240°) - only 120° apart ❌
- O + I (60° and 300°) - only 120° apart ❌
- Any other non-opposite pairing ❌

**Why This Constraint Exists:**
- Deck mechanics require notes on the **x-axis** (horizontal, 0° and 180°)
- When tunnel rotates to align one HOLD with a deck, the opposite lane automatically aligns with the other deck
- Non-opposite pairs would require different rotation angles, making simultaneous holds geometrically impossible

**Implementation:**
- Beatmap parser must validate HOLD note pairings
- Reject or warn if overlapping HOLD notes exist on non-opposite lanes
- Example validation:
```
OPPOSITE_PAIRS = [Q+P, W+I, O+E]
if (hasOverlappingHolds && !areOpposite) → Error
```

**Rotation Mapping for Valid Pairs:**
- **W + I Hold:** Rotate 60° clockwise → W to left deck (180°), I to right deck (0°)
- **O + E Hold:** Rotate 120° clockwise → O to left deck (180°), E to right deck (0°)
- **Q + P Hold:** No rotation needed, already at deck positions

---

## Implementation Priority

### Phase 1 - Visual Enhancements ✅ COMPLETE
1. ✅ **Parallax Effect** - Background hexagon layer with 300ms transformation delay
2. ✅ **Sync Lines** - Glowing hexagons connecting synchronized notes

**Completion Date:** December 8, 2025  
**See:** `PARALLAX_EFFECT_IMPLEMENTATION.md` for parallax details

### Phase 2 - Core Rotation System ✅ COMPLETE
3. ✅ **Rotating Tunnel (cosmetic)** - Dynamic rotation infrastructure implemented
4. ✅ **Upgrade All Lanes for Hold Notes** - All 6 lanes support HOLD notes
5. ✅ **HOLD Pairing Validation** - Opposite-lane constraint validated in parser
6. ✅ **Pre-Rotation for HOLD Notes** - Dynamic rotation chooses closest deck

**Completion Date:** December 8, 2025  
**See:** `TUNNEL_ROTATION_DYNAMIC.md` for full implementation details

### Phase 3 - Visual Polish ⏳
7. **ZOOM Effect** - Add after rotation system is stable

---

## Notes

- All visual effects must maintain 60 FPS minimum
- Features should be toggleable in settings for performance/accessibility
- Tunnel rotation is the most complex feature and requires careful testing
- Ensure all effects are compatible with existing systems (screen shake, vanishing point, greyscale)
- Pre-rotation design removes most disorientation concerns - rotation happens before player needs to act
- HOLD pairing constraint is a **design rule**, not a limitation - it creates intentional geometric patterns
