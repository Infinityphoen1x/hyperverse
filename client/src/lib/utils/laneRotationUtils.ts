/**
 * Lane rotation utilities
 * Handles deck lane rotation mapping and alignment checks
 */

/**
 * Find which original lane (0-3) is currently aligned with a deck lane due to rotation
 * @param deckLane The deck lane to check (-1 for left deck, -2 for right deck)
 * @param tunnelRotation Current tunnel rotation in degrees
 * @returns The original lane number (0-3) aligned with this deck, or null if none
 */
export function findRotatedLaneForDeck(deckLane: number, tunnelRotation: number): number | null {
  if (deckLane !== -1 && deckLane !== -2) return null; // Only applies to deck lanes
  
  // Lane angles (before rotation): -2: 0°, -1: 180°, 0: 120°, 1: 60°, 2: 300°, 3: 240°
  const targetAngle = deckLane === -1 ? 180 : 0; // Where the deck lane is positioned
  
  // Check which lane is rotated to match this angle
  // Normalize rotation to 0-360
  const normalizedRotation = ((tunnelRotation % 360) + 360) % 360;
  
  // Lane 0 (W) is at 120°, rotating by 60° puts it at 180° (lane -1 position)
  // Lane 1 (O) is at 60°, rotating by 120° puts it at 180° (lane -1 position)
  // etc.
  
  const laneBaseAngles = { 0: 120, 1: 60, 2: 300, 3: 240 };
  
  for (const [lane, baseAngle] of Object.entries(laneBaseAngles)) {
    const rotatedAngle = (baseAngle + normalizedRotation) % 360;
    // Check if this lane is now aligned with the target deck position (within 5° tolerance)
    if (Math.abs(rotatedAngle - targetAngle) < 5 || Math.abs(rotatedAngle - targetAngle) > 355) {
      return parseInt(lane);
    }
  }
  
  return null;
}
