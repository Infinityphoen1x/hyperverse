# Dynamic Tunnel Rotation Implementation

**Date:** 2025-12-08  
**Status:** ✅ Complete (Fixed delta application bug)

## Latest Fix (Dec 8, 2025)

**Bug:** `getTargetRotation()` returns a rotation **delta**, but was being applied as an **absolute angle**.

**Symptom:** Rotations accumulated incorrectly, causing misalignment.

**Fix:** 
```typescript
// Before (WRONG)
const targetAngle = getTargetRotation(lane, currentRotation);
setTunnelRotation(targetAngle);

// After (CORRECT)
const rotationDelta = getTargetRotation(lane, currentRotation);
const targetAngle = currentRotation + rotationDelta;
setTunnelRotation(targetAngle);
```

## Overview

Implemented dynamic tunnel rotation that always chooses the **closest deck** for HOLD notes, considering the current tunnel rotation state.

## Previous Implementation (STATIC)

**Problem:** Rotation targets were hardcoded and didn't account for current tunnel state.

```typescript
// Old static mapping
const LANE_ROTATION_MAP = {
  0: 60,   // W always rotates to Q
  1: -60,  // O always rotates to P
  2: 60,   // I always rotates to P
  3: -60,  // E always rotates to Q
};
```

**Issue:**
- After tunnel rotates +60°, lane W is already at Q position
- But next HOLD on O would try to rotate -60° (static mapping)
- This ignores that O is now at 120° (closer to Q than P!)

## New Implementation (DYNAMIC)

**Solution:** Calculate rotation based on **current lane angle** after existing rotation.

```typescript
export function getTargetRotation(lane: number, currentRotation: number = 0): number {
  // Get current angle of the lane after rotation
  const currentLaneAngle = normalizeAngle(laneBaseAngle + currentRotation);
  
  // Calculate shortest rotation to each deck
  const toQ = shortestAngularDistance(currentLaneAngle, 180);
  const toP = shortestAngularDistance(currentLaneAngle, 0);
  
  // Return rotation to closest deck
  return Math.abs(toQ) < Math.abs(toP) ? toQ : toP;
}
```

## Behavior Examples

### Example 1: Sequential HOLD notes (W → O → E)

**Starting:** Tunnel at 0°
1. **HOLD on W (120°):**
   - To Q (180°) = 60°, to P (0°) = 120°
   - ✅ Rotate +60° to Q (closest)

**After +60° rotation:** Tunnel at 60°
2. **HOLD on O (now at 120°):**
   - To Q (180°) = 60°, to P (0°) = 120°
   - ✅ Rotate +60° to Q (closest)
   - **Old system would have rotated -60° to P!**

**After +120° rotation:** Tunnel at 120°
3. **HOLD on E (now at 0°):**
   - Already at P (0°)
   - ✅ No rotation needed (already aligned)

### Example 2: Alternating lanes (W → I → W)

**Starting:** Tunnel at 0°
1. **HOLD on W (120°):**
   - ✅ Rotate +60° to Q

**After +60° rotation:** Tunnel at 60°
2. **HOLD on I (now at 0°):**
   - Already at P
   - ✅ No rotation needed

**After 0° rotation:** Tunnel at 60°
3. **HOLD on W (now at 180°):**
   - Already at Q
   - ✅ No rotation needed

## Benefits

1. **Efficiency:** Minimizes rotation distance
2. **Visual Smoothness:** Less jarring movements during fast sequences
3. **Context-Aware:** Adapts to previous rotations
4. **Predictable:** Always chooses shortest path

## Files Modified

- `lib/config/rotationConstants.ts` - Added dynamic calculation logic
- `hooks/useRotationTrigger.ts` - Pass current rotation to `getTargetRotation()`
- `hooks/useGameEngine.ts` - Pass current rotation to `getTargetRotation()`

## Technical Details

### Helper Functions

**`shortestAngularDistance(from, to)`**
- Calculates shortest rotation between two angles
- Returns value in range -180° to 180°
- Handles wrap-around (e.g., 350° → 10° = 20°, not 340°)

**`normalizeAngle(angle)`**
- Normalizes angle to 0-360° range
- Handles negative angles and values > 360°

**`getTargetRotation(lane, currentRotation)`**
- Takes current rotation into account
- Returns rotation needed to reach closest deck
- Returns 0 for deck lanes (-1, -2)

## Testing Verified

✅ W → O → E sequence rotates to closest deck each time  
✅ Rapid succession notes don't cause excessive spinning  
✅ Already-aligned lanes don't trigger unnecessary rotations  
✅ Builds successfully without errors

## Related Documents

- `TUNNEL_ROTATION_POC.md` - Initial rotation proof of concept
- `FUTURE_IMPLEMENTATIONS.md` - Full rotation feature roadmap
