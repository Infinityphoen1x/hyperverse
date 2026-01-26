/**
 * Handle detection for note editing
 * Determines which handle (near/far for TAP, start/end for HOLD) is nearest to mouse
 */

import { Note } from '@/types/game';
import { LEAD_TIME, GAME_CONFIG } from '@/lib/config/timing';
import { calculateDistances } from '@/lib/geometry/tapNoteGeometry';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;

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
    // For TAP notes, check near and far edges based on hit window
    // This matches how white lines are displayed in NoteExtensionIndicators
    // Near handle: at note.time - TAP_HIT_WINDOW
    // Far handle: at note.time + TAP_HIT_WINDOW
    
    const nearHandleTime = note.time - TAP_HIT_WINDOW;
    const farHandleTime = note.time + TAP_HIT_WINDOW;
    
    const nearProgress = 1 - ((nearHandleTime - currentTime) / LEAD_TIME);
    const farProgress = 1 - ((farHandleTime - currentTime) / LEAD_TIME);
    
    const nearGeometry = calculateDistances(nearProgress);
    const farGeometry = calculateDistances(farProgress);
    
    const nearDist = Math.abs(mouseDistance - nearGeometry.nearDistance);
    const farDist = Math.abs(mouseDistance - farGeometry.nearDistance);
    
    return nearDist < farDist ? 'near' : 'far';
  }
}
