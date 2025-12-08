# Parallax Effect Implementation

**Date:** December 8, 2025  
**Status:** ✅ Complete

## Overview

Implemented a parallax depth effect by adding a secondary hexagon tunnel layer that renders behind the main gameplay tunnel with a 300ms transformation delay.

## Implementation Details

### Component Architecture

**ParallaxHexagonLayers.tsx**
- New component that renders a duplicate hexagon tunnel layer
- Uses React state and `useEffect` with `setTimeout` to delay all transformations by 300ms
- Renders behind the main `HexagonLayers` component in the render order

### Delayed Properties

All visual transformations are delayed by 300ms:
- Vanishing point X/Y position (screen shake, vanishing point shifts)
- Hexagon center X/Y (vanishing point movements)
- Tunnel rotation offset (rotating tunnel effect)

### Visual Styling Differences

To create depth perception, the parallax layer has:
- **Dimmer opacity:** 0.05-0.15 (vs 0.08-0.22 for foreground)
- **Slightly thicker strokes:** 0.4 + progress * 4.0 (vs 0.3 + progress * 3.5)
- **CSS transitions:** Smooth 300ms ease-out for interpolation

### Integration

Updated `TunnelBackground.tsx` to render layers in this order:
1. Vanishing point circle
2. **ParallaxHexagonLayers** (background, delayed)
3. HexagonLayers (foreground, immediate)
4. RadialSpokes
5. SyncLineHexagons

## Visual Effects Created

### Depth Illusion
The 300ms lag creates a perceivable depth between the background and foreground tunnel walls, making the tunnel feel three-dimensional and thick rather than flat.

### Enhanced Screen Shake
During screen shake effects, the parallax layer moves slightly behind the foreground, creating a more dramatic and cinematic shake effect.

### Smoother Vanishing Point Transitions
When the vanishing point shifts (during note patterns), the parallax layer follows smoothly behind, creating a flowing depth effect rather than a sudden jump.

### Rotation Depth
During tunnel rotations for HOLD notes, the background layer rotates slightly behind the foreground, emphasizing the rotational movement and creating a stronger sense of momentum.

## Performance Considerations

- Uses React memoization to prevent unnecessary re-renders
- CSS transitions handle interpolation, reducing JavaScript overhead
- No impact on gameplay hitboxes or note positioning
- Purely cosmetic effect that can be toggled if needed

## Technical Implementation

```typescript
// Delay mechanism using React hooks
useEffect(() => {
  const timer = setTimeout(() => {
    setDelayedVpX(vpX);
    setDelayedVpY(vpY);
    setDelayedHexCenterX(hexCenterX);
    setDelayedHexCenterY(hexCenterY);
    setDelayedRotation(rotationOffset);
  }, PARALLAX_DELAY_MS);

  return () => clearTimeout(timer);
}, [vpX, vpY, hexCenterX, hexCenterY, rotationOffset]);
```

## Files Added

- `client/src/components/game/tunnel/ParallaxHexagonLayers.tsx`

## Files Modified

- `client/src/components/game/tunnel/TunnelBackground.tsx` - Added parallax layer import and rendering

## Testing

✅ Build successful  
✅ No TypeScript errors  
✅ Integrated with existing tunnel rendering system  
✅ Compatible with all existing effects (rotation, vanishing point, screen shake, greyscale)

## Future Enhancements (Optional)

- Add settings toggle to enable/disable parallax for performance/accessibility
- Adjust delay duration based on user preference
- Experiment with multiple parallax layers at different delays for deeper tunnel effect
