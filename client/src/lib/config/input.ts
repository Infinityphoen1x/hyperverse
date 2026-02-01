/**
 * Input configuration
 * Keyboard mappings for gameplay and editor
 */

/**
 * Keyboard key to lane mapping for gameplay
 * Lanes 0-3 are TAP lanes (WEIO)
 * Lanes -1, -2 are SPIN decks (Q, P)
 */
export const KEY_LANE_MAP: Record<string, number> = {
  // Deck rotations (SPIN notes)
  'q': -1,  // Left deck (Q key)
  'Q': -1,
  'p': -2,  // Right deck (P key)
  'P': -2,
  
  // TAP lanes (WEIO)
  'w': 0,   // Lane 0 (top)
  'W': 0,
  'e': 1,   // Lane 1 (top-right)
  'E': 1,
  'i': 2,   // Lane 2 (bottom-right)
  'I': 2,
  'o': 3,   // Lane 3 (bottom-left)
  'O': 3,
} as const;

/**
 * Get the lane number from a keyboard key
 * @param key Keyboard key (case-insensitive)
 * @returns Lane number (-2 to 3), or undefined if key is not mapped
 */
export function getLaneFromKey(key: string): number | undefined {
  return KEY_LANE_MAP[key];
}

/**
 * Get the key(s) for a given lane
 * @param lane Lane number (-2 to 3)
 * @returns Array of keys mapped to this lane (lowercase and uppercase)
 */
export function getKeysForLane(lane: number): string[] {
  return Object.entries(KEY_LANE_MAP)
    .filter(([_, laneNum]) => laneNum === lane)
    .map(([key]) => key);
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
export const GAMEPLAY_KEYS = Object.keys(KEY_LANE_MAP);

/**
 * TAP lane keys only (excludes deck rotation keys)
 */
export const TAP_LANE_KEYS = ['w', 'W', 'e', 'E', 'i', 'I', 'o', 'O'];

/**
 * SPIN deck keys only
 */
export const SPIN_DECK_KEYS = ['q', 'Q', 'p', 'P'];

/**
 * Visual key labels for UI display
 */
export const LANE_KEY_LABELS: Record<number, string> = {
  [-2]: 'P',  // Right deck
  [-1]: 'Q',  // Left deck
  0: 'W',     // Lane 0
  1: 'E',     // Lane 1
  2: 'I',     // Lane 2
  3: 'O',     // Lane 3
} as const;

/**
 * Get the visual label for a lane
 * @param lane Lane number
 * @returns Visual key label (uppercase)
 */
export function getLaneKeyLabel(lane: number): string {
  return LANE_KEY_LABELS[lane] || '?';
}
