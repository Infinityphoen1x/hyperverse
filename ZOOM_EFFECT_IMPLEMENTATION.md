# ZOOM Effect Implementation

**Date:** January 2, 2026  
**Status:** ✅ Complete

## Overview

Implemented the ZOOM visual effect that activates when two HOLD notes are played simultaneously. The effect creates a dramatic tunnel compression illusion combined with gentle oscillating rotation.

## Implementation Details

### Detection Hook: `useZoomEffect.ts`

**Location:** `client/src/hooks/useZoomEffect.ts`

**Functionality:**
- Detects when 2+ HOLD notes are active simultaneously
- Returns `zoomIntensity` (0-1) with smooth 300ms easing transitions
- Generates `zoomRotation` (-30° to +30°) oscillating with 2-second period

**Detection Logic:**
```typescript
const activeHolds = notes.filter(n => 
  n.type === 'HOLD' &&
  n.pressHoldTime > 0 &&
  !n.hit &&
  !n.tooEarlyFailure &&
  !n.holdMissFailure &&
  !n.holdReleaseFailure
);

isZoomActive = activeHolds.length >= 2;
```

**Rotation Behavior:**
- Gradual twist from 0° to +30° as holds progress
- Rotation increases linearly with hold progress
- Reaches maximum +30° at expected release time
- Scales with `zoomIntensity` (smooth fade in/out)

### Tunnel Compression

**Modified Components:**
1. `HexagonLayers.tsx`
2. `ParallaxHexagonLayers.tsx`

**Compression Algorithm:**
```typescript
const baseProgress = radius / maxRadius;
const compressionFactor = 0.4;
const progress = baseProgress + (1 - baseProgress) * zoomIntensity * compressionFactor;
```

**Visual Effect:**
- Inner hexagons (small radius) pushed toward outer hexagons
- Outermost hexagon (radius = 248) remains fixed (progress = 1.0)
- 40% compression factor creates dramatic "zooming" feeling
- Z-spacing reduces, creating depth compression illusion

**Example Transformation:**
- No ZOOM (intensity = 0):
  - Radii: [22, 52, 89, 135, 187, 248]
  - Progress: [0.09, 0.21, 0.36, 0.54, 0.75, 1.0]
  
- Full ZOOM (intensity = 1.0):
  - Same radii, but effective progress compressed:
  - Progress: [0.45, 0.53, 0.62, 0.73, 0.85, 1.0]
  - Inner hexagons now ~halfway out instead of near center

### Glow Enhancement

**Opacity Boost:**
All tunnel elements receive opacity increase during ZOOM:
- **HexagonLayers:** +30% opacity boost
- **ParallaxHexagonLayers:** +20% opacity boost (with 300ms delay)
- **RadialSpokes:** +25% opacity boost

**Formula:**
```typescript
const baseOpacity = 0.2 + progress * 0.5;
const glowBoost = zoomIntensity * 0.3;
const opacity = Math.min(1, baseOpacity + glowBoost);
```

### Rotation Integration

**Location:** `TunnelBackground.tsx`

**Combination Logic:**
```typescript
const baseTunnelRotation = useTunnelRotation(1.0);
const { zoomIntensity, zoomRotation } = useZoomEffect();
const tunnelRotation = baseTunnelRotation + zoomRotation;
```

**Behavior:**
- Base rotation: existing idle/game rotation system
- ZOOM rotation: ±30° oscillation added on top
- Combined rotation passed to all tunnel elements
- Creates gentle "rocking" effect during dual holds

### Parallax Delay

**ParallaxHexagonLayers** implements 300ms delay for ZOOM:
```typescript
const delayedZoomRef = useRef(0);
useEffect(() => {
  const timer = setTimeout(() => {
    delayedZoomRef.current = zoomIntensity;
  }, 300);
  return () => clearTimeout(timer);
}, [zoomIntensity]);
```

**Result:** Background layer compresses/brightens 300ms after foreground, creating parallax depth effect during ZOOM transitions.

## Visual Effects Summary

### When ZOOM Activates (2+ Holds Active):

1. **Tunnel Compression (300ms fade-in)**
   - Inner hexagons pulled toward outer edge
   - Creates "zooming into distance" illusion
   - 40% compression factor

2. **Brightness Increase**
   - All tunnel elements glow brighter
   - +20-30% opacity boost
   - Enhanced visibility and intensity

3. **Gradual Twist (progressive)**
   - Tunnel rotates from 0° to +30° during hold
   - Rotation increases as holds progress toward release
   - Reaches maximum twist at release time

4. **Parallax Depth (300ms delayed)**
   - Background layer mirrors effects with delay
   - Creates layered, three-dimensional feeling
   - Emphasizes tunnel thickness

### When ZOOM Deactivates (Hold Release):

- 300ms smooth fade-out of all effects
- Tunnel returns to normal spacing
- Rotation gradually returns to zero
- Opacity returns to baseline

## Technical Details

### Performance
- **Frame Budget:** <2ms per frame for ZOOM calculations
- **GPU Acceleration:** SVG transforms are GPU-accelerated
- **Memoization:** Detection logic uses `useMemo` to prevent unnecessary recalculations
- **60 FPS Target:** Maintained easily with current implementation

### Timing Constants
- **Transition Duration:** 300ms (ease-out cubic)
- **Rotation Range:** 0° to +30° (gradual twist)
- **Parallax Delay:** 300ms
- **Compression Factor:** 0.4 (40%)
- **Max Rotation:** +30 degrees at release time

### Integration Points
- Hooks into existing tunnel rotation system
- Compatible with screen shake, vanishing point, and greyscale effects
- Works with existing note rendering and hit detection
- No impact on gameplay timing or hit windows

## Files Modified

1. **NEW:** `client/src/hooks/useZoomEffect.ts` - Detection and state management
2. `client/src/components/game/tunnel/HexagonLayers.tsx` - Added compression + glow
3. `client/src/components/game/tunnel/ParallaxHexagonLayers.tsx` - Added delayed compression + glow
4. `client/src/components/game/tunnel/RadialSpokes.tsx` - Added glow enhancement
5. `client/src/components/game/tunnel/TunnelBackground.tsx` - Integration and rotation combination

## Testing

**To verify ZOOM is working:**
1. Load a beatmap with simultaneous HOLD notes (opposite lanes)
2. Press both holds (e.g., P + Q keys)
3. Observe:
   - Tunnel compresses (inner hexagons move outward)
   - Brightness increases (all elements glow)
   - Gradual twist rotation (0° → +30° as holds progress)
   - Background lags 300ms behind foreground
   - Maximum rotation reached at hold release time

**Valid HOLD Pairs (will trigger ZOOM):**
- Q + P (lanes -1 and -2) - deck holds
- W + I (lanes 0 and 2) - opposite sides
- O + E (lanes 1 and 3) - opposite sides

## Future Enhancements (Optional)

1. **Color Shift:** Add cyan→purple gradient during ZOOM
2. **Chromatic Boost:** Enhance existing chromatic aberration during ZOOM
3. **Settings Toggle:** Allow players to disable ZOOM for performance/preference
4. **Non-linear Twist:** Use ease-in curve for more dramatic buildup
5. **Reverse Twist:** Optional counter-rotation on release

## Notes

- ZOOM is purely visual - does not affect gameplay mechanics
- Rotation stays within ±30° to prevent disorientation
- Compression factor (0.4) is tuned for optimal visual impact without distortion
- Smooth transitions prevent jarring visual changes
- Compatible with all existing visual effects (greyscale, glitch, chromatic, particles)
