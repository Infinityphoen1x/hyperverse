/**
 * Position rotation utilities
 * Handles deck position rotation mapping and alignment checks
 * Note: Function uses 'lane' naming but operates on position values
 */

/**
 * Find which original diamond position (0-3) is currently aligned with a horizontal position due to rotation
 * @param deckLane The horizontal position to check (-1 or -2)
 * @param tunnelRotation Current tunnel rotation in degrees
 * @returns The original diamond position number (0-3) aligned with this deck, or null if none
 */
export function findRotatedLaneForDeck(deckLane: number, tunnelRotation: number): number | null { // deckLane: position value
  if (deckLane !== -1 && deckLane !== -2) return null; // Only applies to horizontal positions
  
  // Position angles (before rotation): -2: 0°, -1: 180°, 0: 120°, 1: 60°, 2: 300°, 3: 240°
  const targetAngle = deckLane === -1 ? 180 : 0; // Where the horizontal position is located
  
  // Check which diamond position is rotated to match this angle
  // Normalize rotation to 0-360
  const normalizedRotation = ((tunnelRotation % 360) + 360) % 360;
  
  // Position 0 (W) is at 120°, rotating by 60° puts it at 180° (position -1)
  // Position 1 (O) is at 60°, rotating by 120° puts it at 180° (position -1)
  // etc.
  
  const laneBaseAngles = { 0: 120, 1: 60, 2: 300, 3: 240 }; // Diamond position base angles
  
  for (const [lane, baseAngle] of Object.entries(laneBaseAngles)) { // 'lane' variable represents position
    const rotatedAngle = (baseAngle + normalizedRotation) % 360;
    // Check if this diamond position is now aligned with the target horizontal position (within 5° tolerance)
    if (Math.abs(rotatedAngle - targetAngle) < 5 || Math.abs(rotatedAngle - targetAngle) > 355) {
      return parseInt(lane);
    }
  }
  
  return null;
}
