/**
 * Handle detection for note editing
 * Determines which handle (near/far for TAP, start/end for HOLD) is nearest to mouse
 */

import { Note } from '@/types/game';
import { LEAD_TIME } from '@/lib/config/timing';
import { calculateDistances } from '@/lib/geometry/tapNoteGeometry';

export type HandleType = 'start' | 'end' | 'near' | 'far';

/**
 * Detect which handle of a note is nearest to the mouse cursor
 * @param note The note being interacted with
 * @param mouseDistance Distance from mouse to vanishing point
 * @param currentTime Current playback time
 * @returns Handle type ('near'/'far' for TAP, 'start'/'end' for HOLD)
 */
export function detectNearestHandle(
  note: Note,
  mouseDistance: number,
  currentTime: number
): HandleType {
  if (note.type === 'HOLD' && note.duration) {
    // For HOLD notes, check start and end handles
    const startProgress = 1 - ((note.time - currentTime) / LEAD_TIME);
    const startGeometry = calculateDistances(startProgress);
    
    const startDist = Math.abs(mouseDistance - startGeometry.nearDistance);
    let minDistance = startDist;
    let nearestHandle: HandleType = 'start';
    
    const endTime = note.time + note.duration;
    const endProgress = 1 - ((endTime - currentTime) / LEAD_TIME);
    const endGeometry = calculateDistances(endProgress);
    const endDist = Math.abs(mouseDistance - endGeometry.nearDistance);
    
    if (endDist < minDistance) {
      nearestHandle = 'end';
    }
    
    return nearestHandle;
  } else {
    // For TAP notes, check near and far edges
    const startProgress = 1 - ((note.time - currentTime) / LEAD_TIME);
    const startGeometry = calculateDistances(startProgress);
    
    const nearDist = Math.abs(mouseDistance - startGeometry.nearDistance);
    const farDist = Math.abs(mouseDistance - startGeometry.farDistance);
    
    return nearDist < farDist ? 'near' : 'far';
  }
}
