/**
 * Beatmap Editor Configuration
 * Constants specific to the editor (not used in gameplay)
 */

/**
 * Editor interaction constants
 */
export interface EditorConfig {
  /** Minimum hold note duration in milliseconds */
  MIN_HOLD_DURATION: number;
  /** Minimum pixel distance before treating mouse movement as drag (not click) */
  MIN_DRAG_DISTANCE: number;
  /** Click tolerance for note selection (pixels from note center) */
  CLICK_TOLERANCE_PIXELS: number;
  /** Maximum time difference for candidate scoring (milliseconds) */
  CANDIDATE_TIME_THRESHOLD_MS: number;
  /** Milliseconds per minute (for BPM calculations) */
  MS_PER_MINUTE: number;
  /** Beat grid offset factor (controls how far back grid extends) */
  BEAT_GRID_OFFSET_FACTOR: number;
  /** Default number of beat grid circles to generate */
  DEFAULT_BEAT_GRID_COUNT: number;
  /** Extension indicator maximum progress (allows slight off-screen rendering) */
  EXTENSION_INDICATOR_MAX_PROGRESS: number;
  /** Distance epsilon for single-line detection */
  DISTANCE_EPSILON: number;
  /** Visual constant: white line stroke width */
  EXTENSION_INDICATOR_STROKE_WIDTH: number;
  /** Visual constant: white line opacity */
  EXTENSION_INDICATOR_OPACITY: number;
  /** Minimum tunnel distance (baseline for distance calculations) */
  MIN_TUNNEL_DISTANCE: number;
}

export const EDITOR_CONFIG: EditorConfig = {
  MIN_HOLD_DURATION: 100,
  MIN_DRAG_DISTANCE: 5,
  CLICK_TOLERANCE_PIXELS: 30,
  CANDIDATE_TIME_THRESHOLD_MS: 500,
  MS_PER_MINUTE: 60000,
  BEAT_GRID_OFFSET_FACTOR: 0.75,
  DEFAULT_BEAT_GRID_COUNT: 10,
  EXTENSION_INDICATOR_MAX_PROGRESS: 1.2,
  DISTANCE_EPSILON: 0.1,
  EXTENSION_INDICATOR_STROKE_WIDTH: 3,
  EXTENSION_INDICATOR_OPACITY: 0.8,
  MIN_TUNNEL_DISTANCE: 1,
};

// Export individual constants for convenience
export const MIN_HOLD_DURATION = EDITOR_CONFIG.MIN_HOLD_DURATION;
export const MIN_DRAG_DISTANCE = EDITOR_CONFIG.MIN_DRAG_DISTANCE;
export const CLICK_TOLERANCE_PIXELS = EDITOR_CONFIG.CLICK_TOLERANCE_PIXELS;
export const CANDIDATE_TIME_THRESHOLD_MS = EDITOR_CONFIG.CANDIDATE_TIME_THRESHOLD_MS;
export const MS_PER_MINUTE = EDITOR_CONFIG.MS_PER_MINUTE;
export const BEAT_GRID_OFFSET_FACTOR = EDITOR_CONFIG.BEAT_GRID_OFFSET_FACTOR;
export const DEFAULT_BEAT_GRID_COUNT = EDITOR_CONFIG.DEFAULT_BEAT_GRID_COUNT;
export const EXTENSION_INDICATOR_MAX_PROGRESS = EDITOR_CONFIG.EXTENSION_INDICATOR_MAX_PROGRESS;
export const DISTANCE_EPSILON = EDITOR_CONFIG.DISTANCE_EPSILON;
export const EXTENSION_INDICATOR_STROKE_WIDTH = EDITOR_CONFIG.EXTENSION_INDICATOR_STROKE_WIDTH;
export const EXTENSION_INDICATOR_OPACITY = EDITOR_CONFIG.EXTENSION_INDICATOR_OPACITY;
export const MIN_TUNNEL_DISTANCE = EDITOR_CONFIG.MIN_TUNNEL_DISTANCE;

/**
 * Valid lane indices for note placement
 * Lanes 0-3 are standard lanes, -1 and -2 are special lanes
 */
export const VALID_LANES = [0, 1, 2, 3, -1, -2] as const;
export type ValidLane = typeof VALID_LANES[number];

/**
 * Check if a lane number is valid
 * @param lane Lane number to check
 * @returns true if lane is valid
 */
export function isValidLane(lane: number): lane is ValidLane {
  return (VALID_LANES as readonly number[]).includes(lane);
}

/**
 * Lane to angle mapping (degrees)
 * Maps lane index to its angle in the tunnel
 */
export const LANE_ANGLE_MAP: Record<number, number> = {
  0: 120,   // Top
  1: 60,    // Top-right
  2: 300,   // Bottom-right
  3: 240,   // Bottom-left
  [-1]: 180, // Left
  [-2]: 0,   // Right (actually maps to -2 lane)
} as const;

/**
 * Get the angle for a specific lane
 * @param lane Lane index
 * @returns Angle in degrees
 */
export function getLaneAngle(lane: number): number {
  return LANE_ANGLE_MAP[lane] ?? 0;
}
