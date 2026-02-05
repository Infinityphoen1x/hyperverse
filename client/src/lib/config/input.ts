/**
 * Input configuration
 * Keyboard mappings for gameplay and editor
 */

/**
 * Keyboard key to default position mapping for gameplay
 * 
 * IMPORTANT CONCEPT:
 * - Keys (Q, P, W, E, I, O) are visual lane labels that rotate
 * - Positions (-2, -1, 0-3) are absolute coordinates in the tunnel (fixed)
 * - This maps each key to its DEFAULT position (before rotation)
 * - During gameplay, rotation may change which position a key activates
 * 
 * Positions:
 * -2: Right horizontal (0°) - default P key, HOLD completion target
 * -1: Left horizontal (180°) - default Q key, HOLD completion target
 *  0: Top-left (120°) - default W key, rotates for HOLD notes
 *  1: Top-right (60°) - default O key, rotates for HOLD notes
 *  2: Bottom-right (300°) - default I key, rotates for HOLD notes
 *  3: Bottom-left (240°) - default E key, rotates for HOLD notes
 * 
 * IMPORTANT: Must match POSITION_BASE_ANGLES in rotationConstants.ts
 */
export const KEY_POSITION_MAP: Record<string, number> = {
  // Horizontal positions (HOLD completion targets, do NOT rotate)
  'q': -1,  // Q: Left horizontal (180°)
  'Q': -1,
  'p': -2,  // P: Right horizontal (0°)
  'P': -2,
  
  // Diamond positions (rotate during HOLD notes)
  'w': 0,   // W: Top-left (120°)
  'W': 0,
  'o': 1,   // O: Top-right (60°)
  'O': 1,
  'i': 2,   // I: Bottom-right (300°)
  'I': 2,
  'e': 3,   // E: Bottom-left (240°)
  'E': 3,
} as const;

// Legacy export for backward compatibility
export const KEY_LANE_MAP = KEY_POSITION_MAP;

/**
 * Get the position number from a keyboard key
 * @param key Keyboard key (case-insensitive)
 * @returns Position number (-2 to 3), or undefined if key is not mapped
 */
export function getPositionFromKey(key: string): number | undefined {
  return KEY_POSITION_MAP[key];
}

// Legacy function for backward compatibility
export function getLaneFromKey(key: string): number | undefined {
  return getPositionFromKey(key);
}

/**
 * Get the key(s) for a given position
 * @param position Position number (-2 to 3)
 * @returns Array of keys mapped to this position (lowercase and uppercase)
 */
export function getKeysForPosition(position: number): string[] {
  return Object.entries(KEY_POSITION_MAP)
    .filter(([_, pos]) => pos === position)
    .map(([key]) => key);
}

// Legacy function for backward compatibility
export function getKeysForLane(lane: number): string[] {
  return getKeysForPosition(lane);
}

/**
 * Check if a key is a gameplay key
 * @param key Keyboard key
 * @returns true if the key is mapped to a lane
 */
export function isGameplayKey(key: string): boolean {
  return key in KEY_LANE_MAP;
}

/**
 * All gameplay keys (for checking conflicts with shortcuts)
 */
export const GAMEPLAY_KEYS = Object.keys(KEY_POSITION_MAP);

/**
 * Diamond position keys (rotate during HOLD notes)
 */
export const DIAMOND_POSITION_KEYS = ['w', 'W', 'e', 'E', 'i', 'I', 'o', 'O'];

/**
 * Horizontal position keys (HOLD completion targets, fixed at 0°/180°)
 */
export const HORIZONTAL_POSITION_KEYS = ['q', 'Q', 'p', 'P'];

// Legacy exports for backward compatibility
export const TAP_LANE_KEYS = DIAMOND_POSITION_KEYS;
export const SPIN_DECK_KEYS = HORIZONTAL_POSITION_KEYS;

/**
 * Visual key labels for UI display (maps position to key)
 */
export const POSITION_KEY_LABELS: Record<number, string> = {
  [-2]: 'P',  // Right horizontal
  [-1]: 'Q',  // Left horizontal
  0: 'W',     // Top-left
  1: 'O',     // Top-right
  2: 'I',     // Bottom-right
  3: 'E',     // Bottom-left
} as const;

// Legacy export for backward compatibility
export const LANE_KEY_LABELS = POSITION_KEY_LABELS;

/**
 * Get the visual label for a position
 * @param position Position number
 * @returns Visual key label (uppercase)
 */
export function getPositionKeyLabel(position: number): string {
  return POSITION_KEY_LABELS[position] || '?';
}

// Legacy function for backward compatibility
export function getLaneKeyLabel(lane: number): string {
  return getPositionKeyLabel(lane);
}
