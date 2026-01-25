/**
 * Editor utility functions for coordinate conversion and grid calculations
 */

import { Note } from '@/types/game';
import { GAME_CONFIG } from '@/lib/config/timing';
import { MS_PER_MINUTE, BEAT_GRID_OFFSET_FACTOR } from '@/lib/config/editor';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;

export interface MouseToLaneResult {
  lane: number;
  angle: number;
  distance: number;
}

export interface MouseToTimeResult {
  time: number;
  distance: number;
  progress: number;
}

/**
 * Check if a note would overlap with existing notes on the same lane
 * @param notes Existing notes
 * @param noteId ID of the note being edited (to exclude it from overlap check)
 * @param lane Lane number
 * @param startTime Start time of the note
 * @param endTime End time of the note (for hold notes)
 * @returns true if there's an overlap
 */
export function checkNoteOverlap(
  notes: Note[],
  noteId: string | null,
  lane: number,
  startTime: number,
  endTime: number
): boolean {
  return notes.some(note => {
    // Skip the note being edited
    if (note.id === noteId) return false;
    
    // Only check notes on the same lane
    if (note.lane !== lane) return false;
    
    // Get the note's time range with hit window buffer for TAP notes
    // TAP notes need ±TAP_HIT_WINDOW buffer to prevent overlapping hit windows
    let noteStart = note.time;
    let noteEnd = note.type === 'HOLD' && note.duration ? note.time + note.duration : note.time;
    
    if (note.type === 'TAP') {
      // Expand TAP note time range by hit window (±150ms)
      noteStart -= TAP_HIT_WINDOW;
      noteEnd += TAP_HIT_WINDOW;
    }
    
    // Check for overlap: (start1 <= end2) AND (start2 <= end1)
    // Use <= to catch exact time matches
    return (startTime <= noteEnd) && (noteStart <= endTime);
  });
}

/**
 * Convert mouse coordinates to lane number
 * @param mouseX Mouse X position relative to canvas
 * @param mouseY Mouse Y position relative to canvas
 * @param vpX Vanishing point X
 * @param vpY Vanishing point Y
 * @returns Lane number and angle
 */
export function mouseToLane(
  mouseX: number,
  mouseY: number,
  vpX: number,
  vpY: number
): MouseToLaneResult {
  const dx = mouseX - vpX;
  const dy = mouseY - vpY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const normalized = ((angle % 360) + 360) % 360;

  // Map to nearest lane (6 lanes at 60° intervals)
  const laneAngles = [0, 60, 120, 180, 240, 300];
  const laneMappings = [-2, 1, 0, -1, 3, 2]; // P, O, W, Q, E, I
  let closestLane = -2;
  let minDiff = 360;

  laneAngles.forEach((laneAngle, index) => {
    const diff = Math.abs(normalized - laneAngle);
    const wrappedDiff = Math.min(diff, 360 - diff);
    if (wrappedDiff < minDiff) {
      minDiff = wrappedDiff;
      closestLane = laneMappings[index];
    }
  });

  return { lane: closestLane, angle: normalized, distance };
}

/**
 * Convert mouse coordinates to note time
 * @param mouseX Mouse X position relative to canvas
 * @param mouseY Mouse Y position relative to canvas
 * @param vpX Vanishing point X
 * @param vpY Vanishing point Y
 * @param currentTime Current playback time
 * @param leadTime Lead time constant (default 4000ms)
 * @param judgementRadius Judgement radius constant (default 187)
 * @returns Note time, distance, and progress
 * @throws Error if judgementRadius is invalid
 */
export function mouseToTime(
  mouseX: number,
  mouseY: number,
  vpX: number,
  vpY: number,
  currentTime: number,
  leadTime: number = 4000,
  judgementRadius: number = 187
): MouseToTimeResult {
  // Validate inputs
  if (judgementRadius <= 1) {
    throw new Error('Invalid judgementRadius: must be > 1');
  }
  if (leadTime <= 0) {
    throw new Error('Invalid leadTime: must be > 0');
  }
  
  const dx = mouseX - vpX;
  const dy = mouseY - vpY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const progress = Math.max(0, Math.min(1, (distance - 1) / (judgementRadius - 1)));
  const timeOffset = progress * leadTime;
  const time = Math.round(currentTime + timeOffset);

  return { time, distance, progress };
}

/**
 * Snap time to beat grid based on BPM and division
 * @param time Time in milliseconds
 * @param bpm Beats per minute
 * @param division Beat division (1, 2, 4, 8, 16)
 * @returns Snapped time
 * @throws Error if BPM or division is invalid
 */
export function snapTimeToGrid(
  time: number,
  bpm: number,
  division: number
): number {
  if (bpm <= 0) {
    throw new Error('Invalid BPM: must be > 0');
  }
  if (division <= 0) {
    throw new Error('Invalid division: must be > 0');
  }
  
  const beatDurationMs = MS_PER_MINUTE / bpm; // 60000ms per minute / BPM
  const snapIntervalMs = beatDurationMs / division;
  return Math.round(time / snapIntervalMs) * snapIntervalMs;
}

/**
 * Generate beat grid circle data for visual overlay
 * @param currentTime Current playback time
 * @param bpm Beats per minute
 * @param division Beat division
 * @param leadTime Lead time constant
 * @param judgementRadius Judgement radius constant
 * @param count Number of circles to generate
 * @returns Array of grid circle data with distance values
 */
export function generateBeatGrid(
  currentTime: number,
  bpm: number,
  division: number,
  leadTime: number = 4000,
  judgementRadius: number = 187,
  count: number = 10
): Array<{ distance: number; time: number }> {
  const beatDurationMs = MS_PER_MINUTE / bpm; // 60000ms per minute / BPM
  const snapIntervalMs = beatDurationMs / division;
  const circles: Array<{ distance: number; time: number }> = [];

  // Generate grid points centered around current time
  // BEAT_GRID_OFFSET_FACTOR (0.75) extends grid backward to show compressed hexagons near VP
  // This creates visual depth by showing past grid lines approaching vanishing point
  for (let i = 0; i < count; i++) {
    const gridTime = currentTime + (i - count * BEAT_GRID_OFFSET_FACTOR) * snapIntervalMs;
    const progress = (gridTime - currentTime) / leadTime;
    const distance = 1 + (progress * (judgementRadius - 1));

    // Only include circles within valid range
    if (distance >= 1 && distance <= judgementRadius) {
      circles.push({ distance, time: gridTime });
    }
  }

  return circles;
}

/**
 * Calculate beat interval in milliseconds
 * @param bpm Beats per minute
 * @param division Beat division (1, 2, 4, 8, 16)
 * @returns Interval in milliseconds
 */
export function getBeatInterval(bpm: number, division: number): number {
  const beatDurationMs = MS_PER_MINUTE / bpm; // 60000ms per minute / BPM
  return beatDurationMs / division;
}
