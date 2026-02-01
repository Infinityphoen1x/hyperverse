/**
 * Note candidate scoring and selection hook
 * Finds and scores notes that could be clicked based on mouse position
 */

import { Note } from '@/types/game';
import { mouseToLane, mouseToTime, snapTimeToGrid } from '@/lib/editor/editorUtils';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
import { LEAD_TIME, GAME_CONFIG } from '@/lib/config/timing';
import { CLICK_TOLERANCE_PIXELS } from '@/lib/config/editor';
import { calculateDistances } from '@/lib/geometry/tapNoteGeometry';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;

export interface NoteCandidateResult {
  note: Note;
  totalScore: number;
  progress: number;
}

export interface UseCandidateScoringParams {
  parsedNotes: Note[];
  currentTime: number;
  snapEnabled: boolean;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  bpm: number;
  beatmapStart: number;
}

/**
 * Find and score candidate notes for a mouse click
 * @param mouseX Mouse X coordinate
 * @param mouseY Mouse Y coordinate
 * @param params Scoring parameters
 * @returns Best matching note or null
 */
export function findCandidateNote(
  mouseX: number,
  mouseY: number,
  params: UseCandidateScoringParams
): Note | null {
  const { parsedNotes, currentTime, snapEnabled, snapDivision, bpm, beatmapStart } = params;
  
  const { lane: closestLane, distance: mouseDistance } = mouseToLane(
    mouseX, 
    mouseY, 
    VANISHING_POINT_X, 
    VANISHING_POINT_Y
  );
  
  const { time: timeOffset } = mouseToTime(
    mouseX, 
    mouseY, 
    VANISHING_POINT_X, 
    VANISHING_POINT_Y, 
    currentTime, 
    LEAD_TIME, 
    JUDGEMENT_RADIUS
  );
  
  const clickTime = snapEnabled ? snapTimeToGrid(timeOffset, bpm, snapDivision, beatmapStart) : timeOffset;

  // Find all candidate notes that could be clicked, then pick the best match
  const candidateNotes = parsedNotes
    .map(note => {
      // Only consider notes on the same lane
      if (note.lane !== closestLane) return null;
      
      // For TAP notes, check if click falls within the hit window range
      // For HOLD notes, check if click falls within the note duration
      let noteStartTime: number;
      let noteEndTime: number;
      
      if (note.type === 'HOLD' && note.duration) {
        noteStartTime = note.time;
        noteEndTime = note.time + note.duration;
      } else {
        // TAP notes have effective duration of hit window (±150ms)
        noteStartTime = note.time - TAP_HIT_WINDOW;
        noteEndTime = note.time + TAP_HIT_WINDOW;
      }
      
      // Check if click time falls within the note's time range
      if (clickTime < noteStartTime || clickTime > noteEndTime) return null;
      
      // Calculate progress for the note's center time to check visual depth
      const noteCenterTime = (noteStartTime + noteEndTime) / 2;
      const progress = 1 - ((noteCenterTime - currentTime) / LEAD_TIME);
      if (progress < 0 || progress > 1) return null;
      
      // Use calculateDistances to get the exact visual distances at note center
      const geometry = calculateDistances(progress);
      
      // Check if mouse is within the note's depth (between far and near edges)
      // Tolerance allows clicks slightly outside note bounds for easier interaction
      const tolerance = CLICK_TOLERANCE_PIXELS; // 30px - visual tolerance for click detection
      const withinDepth = mouseDistance >= geometry.farDistance - tolerance && 
                          mouseDistance <= geometry.nearDistance + tolerance;
      
      if (!withinDepth) return null;
      
      // Calculate score based on proximity to click point
      // Scoring weights:
      // - Distance: how close the click is to the note's visual center
      // - Time: how close the click time is to the note's center time
      // - Progress: prefer notes closer to the judgement line (visible/reachable)
      const centerDistance = (geometry.nearDistance + geometry.farDistance) / 2;
      const distanceScore = Math.abs(mouseDistance - centerDistance);
      const timeScore = Math.abs(clickTime - noteCenterTime);
      
      // Prioritize notes closer to judgement line (higher progress = closer to player)
      const progressScore = (1 - progress) * 100; // Lower is better (closer to judgement)
      
      // Combined score - lower is better
      const totalScore = distanceScore + (timeScore / 10) + progressScore;
      
      return { note, totalScore, progress };
    })
    .filter((candidate): candidate is NoteCandidateResult => candidate !== null)
    .sort((a, b) => a.totalScore - b.totalScore);
  
  return candidateNotes.length > 0 ? candidateNotes[0].note : null;
}
