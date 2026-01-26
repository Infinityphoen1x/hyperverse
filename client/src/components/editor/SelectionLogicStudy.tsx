/**
 * ============================================================================
 * BEATMAP EDITOR - COMPLETE SELECTION LOGIC (Study Reference)
 * ============================================================================
 * 
 * This file consolidates ALL selection logic from the editor for study purposes.
 * It shows the complete flow from mouse click to note selection and handle detection.
 * 
 * NOT USED IN PRODUCTION - for documentation/learning only
 * 
 * Actual implementation is split across:
 * - hooks/editor/useNoteCandidateScoring.ts
 * - hooks/editor/useHandleDetection.ts
 * - hooks/editor/useEditorMouseHandlers.ts
 * ============================================================================
 */

import { useCallback, useRef } from 'react';
import { Note } from '@/types/game';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
import { LEAD_TIME, GAME_CONFIG } from '@/lib/config/timing';
import { CLICK_TOLERANCE_PIXELS, MIN_DRAG_DISTANCE } from '@/lib/config/editor';
import { calculateDistances } from '@/lib/geometry/tapNoteGeometry';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW; // 150ms

// ============================================================================
// PART 1: GEOMETRY UTILITIES
// ============================================================================

/**
 * Convert mouse coordinates to polar coordinates (lane + distance)
 * Returns the lane angle and distance from vanishing point
 */
function mouseToLane(
  mouseX: number,
  mouseY: number,
  vpX: number,
  vpY: number
): { lane: number; distance: number } {
  const dx = mouseX - vpX;
  const dy = mouseY - vpY;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const normalized = ((angle % 360) + 360) % 360;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Map angle to nearest lane (0, 60, 120, 180, 240, 300 degrees)
  const laneAngles = [120, 60, 300, 240, 180, 0]; // Lanes 0-3, -1, -2
  const lanes = [0, 1, 2, 3, -1, -2];
  
  let closestLane = 0;
  let minDiff = 999;
  
  for (let i = 0; i < laneAngles.length; i++) {
    const diff = Math.abs(normalized - laneAngles[i]);
    const wrappedDiff = Math.min(diff, 360 - diff); // Handle angle wrapping
    if (wrappedDiff < minDiff) {
      minDiff = wrappedDiff;
      closestLane = lanes[i];
    }
  }
  
  return { lane: closestLane, distance };
}

/**
 * Convert mouse coordinates to note time (depth in tunnel)
 * Uses linear interpolation based on distance from VP
 */
function mouseToTime(
  mouseX: number,
  mouseY: number,
  vpX: number,
  vpY: number,
  currentTime: number,
  leadTime: number,
  judgementRadius: number
): { time: number } {
  const { distance } = mouseToLane(mouseX, mouseY, vpX, vpY);
  
  // Distance to progress: 0 at VP, 1 at judgment line
  // progress = distance / judgementRadius
  const progress = Math.min(1, distance / judgementRadius);
  
  // Progress to time offset from current
  // progress 0 → leadTime ahead, progress 1 → at currentTime
  const timeOffset = currentTime + (leadTime * (1 - progress));
  
  return { time: timeOffset };
}

/**
 * Snap time to nearest beat grid division
 */
function snapTimeToGrid(
  time: number,
  bpm: number,
  division: 1 | 2 | 4 | 8 | 16
): number {
  const msPerBeat = 60000 / bpm;
  const snapInterval = msPerBeat / division;
  return Math.round(time / snapInterval) * snapInterval;
}

// ============================================================================
// PART 2: NOTE CANDIDATE SCORING
// ============================================================================

/**
 * STEP 1: Find which note the user clicked on
 * 
 * Algorithm:
 * 1. Convert mouse position to lane + time
 * 2. Filter notes to same lane
 * 3. Check if click falls within note's time range
 * 4. Check if click falls within note's visual depth
 * 5. Score each candidate by proximity
 * 6. Return best match
 * 
 * Key insight: TAP notes have EFFECTIVE DURATION = TAP_HIT_WINDOW (±150ms)
 * This is NOT stored in data, but used for click detection
 */
function findCandidateNote(
  mouseX: number,
  mouseY: number,
  params: {
    parsedNotes: Note[];
    currentTime: number;
    snapEnabled: boolean;
    snapDivision: 1 | 2 | 4 | 8 | 16;
    bpm: number;
  }
): Note | null {
  const { parsedNotes, currentTime, snapEnabled, snapDivision, bpm } = params;
  
  // Step 1: Get lane and distance from mouse position
  const { lane: closestLane, distance: mouseDistance } = mouseToLane(
    mouseX, 
    mouseY, 
    VANISHING_POINT_X, 
    VANISHING_POINT_Y
  );
  
  // Step 2: Get time from mouse position
  const { time: timeOffset } = mouseToTime(
    mouseX, 
    mouseY, 
    VANISHING_POINT_X, 
    VANISHING_POINT_Y, 
    currentTime, 
    LEAD_TIME, 
    JUDGEMENT_RADIUS
  );
  
  const clickTime = snapEnabled ? snapTimeToGrid(timeOffset, bpm, snapDivision) : timeOffset;

  // Step 3: Find all candidate notes and score them
  const candidateNotes = parsedNotes
    .map(note => {
      // FILTER 1: Only consider notes on the same lane
      if (note.lane !== closestLane) return null;
      
      // FILTER 2: Calculate note's time range
      let noteStartTime: number;
      let noteEndTime: number;
      
      if (note.type === 'HOLD' && note.duration) {
        // HOLD: Explicit start and end
        noteStartTime = note.time;
        noteEndTime = note.time + note.duration;
      } else {
        // TAP: Effective duration = hit window (±150ms)
        // This is the KEY difference - TAP notes clickable in ±150ms range
        noteStartTime = note.time - TAP_HIT_WINDOW;
        noteEndTime = note.time + TAP_HIT_WINDOW;
      }
      
      // Check if click time falls within note's time range
      if (clickTime < noteStartTime || clickTime > noteEndTime) return null;
      
      // FILTER 3: Calculate note's visual progress/depth
      const noteCenterTime = (noteStartTime + noteEndTime) / 2;
      const progress = 1 - ((noteCenterTime - currentTime) / LEAD_TIME);
      
      // Progress < 0: Note hasn't appeared yet (too far in future)
      // Progress > 1: Note has passed judgment line (too far in past)
      if (progress < 0 || progress > 1) return null;
      
      // FILTER 4: Get note's visual geometry at its progress
      // nearDistance = closer to player (higher radius)
      // farDistance = closer to VP (lower radius)
      const geometry = calculateDistances(progress);
      
      // Check if mouse is within the note's depth (between far and near edges)
      // CLICK_TOLERANCE_PIXELS = 100px generous tolerance
      const tolerance = CLICK_TOLERANCE_PIXELS;
      const withinDepth = mouseDistance >= geometry.farDistance - tolerance && 
                          mouseDistance <= geometry.nearDistance + tolerance;
      
      if (!withinDepth) return null;
      
      // SCORING: Calculate how close this note is to the click
      const centerDistance = (geometry.nearDistance + geometry.farDistance) / 2;
      const distanceScore = Math.abs(mouseDistance - centerDistance); // Closer = better
      const timeScore = Math.abs(clickTime - noteCenterTime); // Closer in time = better
      
      // Prioritize notes closer to judgment line (higher progress)
      const progressScore = (1 - progress) * 100; // Lower is better
      
      // Combined score - lower is better
      const totalScore = distanceScore + (timeScore / 10) + progressScore;
      
      return { note, totalScore, progress };
    })
    .filter((candidate): candidate is { note: Note; totalScore: number; progress: number } => 
      candidate !== null
    )
    .sort((a, b) => a.totalScore - b.totalScore); // Sort by best match
  
  // Return best match or null
  return candidateNotes.length > 0 ? candidateNotes[0].note : null;
}

// ============================================================================
// PART 3: HANDLE DETECTION
// ============================================================================

type HandleType = 'start' | 'end' | 'near' | 'far';

/**
 * STEP 2: Detect which handle of a selected note the user is clicking
 * 
 * Called ONLY when:
 * - Note is already selected
 * - User clicks on the selected note again
 * 
 * Purpose: Determine if user wants to drag the START or END handle
 * 
 * Key insight: HOLD and TAP use different handle systems:
 * - HOLD: 'start'/'end' based on note.time and note.time+duration
 * - TAP: 'near'/'far' based on note.time ± TAP_HIT_WINDOW
 */
function detectNearestHandle(
  note: Note,
  mouseDistance: number,
  currentTime: number
): HandleType {
  
  if (note.type === 'HOLD' && note.duration) {
    // ========================================================================
    // HOLD NOTES: Check start and end handles
    // ========================================================================
    
    // Start handle: at note.time (beginning of hold)
    const startProgress = 1 - ((note.time - currentTime) / LEAD_TIME);
    const startGeometry = calculateDistances(startProgress);
    const startDist = Math.abs(mouseDistance - startGeometry.nearDistance);
    
    // End handle: at note.time + duration (end of hold)
    const endTime = note.time + note.duration;
    const endProgress = 1 - ((endTime - currentTime) / LEAD_TIME);
    const endGeometry = calculateDistances(endProgress);
    const endDist = Math.abs(mouseDistance - endGeometry.nearDistance);
    
    // Return whichever is closer
    return startDist < endDist ? 'start' : 'end';
    
  } else {
    // ========================================================================
    // TAP NOTES: Check near and far edges based on hit window
    // ========================================================================
    
    // This MUST match how white lines are displayed!
    // Near handle: at note.time - TAP_HIT_WINDOW (-150ms)
    // Far handle: at note.time + TAP_HIT_WINDOW (+150ms)
    
    const nearHandleTime = note.time - TAP_HIT_WINDOW;
    const farHandleTime = note.time + TAP_HIT_WINDOW;
    
    // Calculate progress for each handle position
    const nearProgress = 1 - ((nearHandleTime - currentTime) / LEAD_TIME);
    const farProgress = 1 - ((farHandleTime - currentTime) / LEAD_TIME);
    
    // Get geometry at each handle's time
    const nearGeometry = calculateDistances(nearProgress);
    const farGeometry = calculateDistances(farProgress);
    
    // Calculate which handle is closer to mouse
    const nearDist = Math.abs(mouseDistance - nearGeometry.nearDistance);
    const farDist = Math.abs(mouseDistance - farGeometry.nearDistance);
    
    return nearDist < farDist ? 'near' : 'far';
  }
}

// ============================================================================
// PART 4: MOUSE EVENT HANDLERS
// ============================================================================

interface SelectionState {
  selectedNoteIds: string[];
  selectedNoteId: string | null;
  isDragging: boolean;
  draggedNoteId: string | null;
  draggedHandle: HandleType | null;
  dragStartTime: number | null;
  dragStartLane: number | null;
}

/**
 * COMPLETE MOUSE EVENT FLOW
 * 
 * 1. MOUSE DOWN:
 *    - Find clicked note using candidate scoring
 *    - If note already selected: detect handle for potential drag
 *    - If note not selected: prepare for body drag or selection
 *    - Store initial click position
 * 
 * 2. MOUSE MOVE:
 *    - Check if moved MIN_DRAG_DISTANCE (5px)
 *    - If yes: Start dragging
 *    - If handle set: drag handle (resize note)
 *    - If no handle: drag body (move note)
 * 
 * 3. MOUSE UP:
 *    - If dragging: finalize changes
 *    - If not dragging: toggle selection
 */
export function useSelectionLogic(
  canvasRef: React.RefObject<HTMLDivElement | null>,
  currentTime: number,
  parsedNotes: Note[],
  snapEnabled: boolean,
  snapDivision: 1 | 2 | 4 | 8 | 16,
  bpm: number,
  isPlaying: boolean,
  state: SelectionState,
  actions: {
    setSelectedNoteId: (id: string | null) => void;
    clearSelection: () => void;
    setIsDragging: (dragging: boolean) => void;
    setDraggedNoteId: (id: string | null) => void;
    setDraggedHandle: (handle: HandleType | null) => void;
    setDragStartTime: (time: number | null) => void;
    setDragStartLane: (lane: number | null) => void;
  }
) {
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // ========================================================================
  // MOUSE DOWN: Find note, detect handle
  // ========================================================================
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    // CRITICAL: Prevent editing during playback
    if (isPlaying) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // STEP 1: Find which note was clicked (if any)
    const clickedNote = findCandidateNote(mouseX, mouseY, {
      parsedNotes,
      currentTime,
      snapEnabled,
      snapDivision,
      bpm,
    });
    
    if (clickedNote) {
      // STEP 2: Check if note is already selected
      const isAlreadySelected = state.selectedNoteIds.includes(clickedNote.id);
      
      if (isAlreadySelected) {
        // ====================================================================
        // CASE A: Note already selected - detect handle for dragging
        // ====================================================================
        const { distance: mouseDistance } = mouseToLane(
          mouseX, 
          mouseY, 
          VANISHING_POINT_X, 
          VANISHING_POINT_Y
        );
        
        // Detect which handle (start/end or near/far) is closest
        const nearestHandle = detectNearestHandle(clickedNote, mouseDistance, currentTime);
        
        // Store info for potential drag
        actions.setDraggedNoteId(clickedNote.id);
        actions.setDragStartTime(clickedNote.time);
        actions.setDragStartLane(clickedNote.lane);
        actions.setDraggedHandle(nearestHandle); // Pre-set handle
        mouseDownPosRef.current = { x: mouseX, y: mouseY };
        
      } else {
        // ====================================================================
        // CASE B: Note not selected - prepare for selection or body drag
        // ====================================================================
        actions.setDraggedNoteId(clickedNote.id);
        actions.setDragStartTime(clickedNote.time);
        actions.setDragStartLane(clickedNote.lane);
        actions.setDraggedHandle(null); // Body drag by default
        mouseDownPosRef.current = { x: mouseX, y: mouseY };
      }
      
    } else {
      // ====================================================================
      // CASE C: Clicked empty space - clear selection or create note
      // ====================================================================
      const { lane: closestLane } = mouseToLane(
        mouseX, 
        mouseY, 
        VANISHING_POINT_X, 
        VANISHING_POINT_Y
      );
      const noteTime = snapEnabled 
        ? snapTimeToGrid(currentTime, bpm, snapDivision) 
        : currentTime;
      
      actions.setIsDragging(true);
      actions.setDragStartTime(noteTime);
      actions.setDragStartLane(closestLane);
      mouseDownPosRef.current = { x: mouseX, y: mouseY };
      
      if (!e.ctrlKey && !e.metaKey) {
        actions.clearSelection();
      }
    }
  }, [canvasRef, currentTime, parsedNotes, snapEnabled, snapDivision, bpm, isPlaying, state, actions]);

  // ========================================================================
  // MOUSE MOVE: Check if dragging started
  // ========================================================================
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Only start dragging if mouse moved MIN_DRAG_DISTANCE (5px)
    if (e.buttons === 1 && state.draggedNoteId && !state.isDragging) {
      if (mouseDownPosRef.current) {
        const dx = mouseX - mouseDownPosRef.current.x;
        const dy = mouseY - mouseDownPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < MIN_DRAG_DISTANCE) {
          return; // Not enough movement yet - still a potential click
        }
      }
      
      // Movement threshold passed - start dragging
      actions.setIsDragging(true);
    }
    
    // If dragging: update note position/duration (not shown here)
    // This would call updateNoteFromHandleDrag() logic
    
  }, [canvasRef, state, actions]);

  // ========================================================================
  // MOUSE UP: Finalize drag or toggle selection
  // ========================================================================
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    if (state.isDragging) {
      // ====================================================================
      // CASE A: Was dragging - finalize changes
      // ====================================================================
      // Would save to history and update notes here
      
      actions.setIsDragging(false);
      actions.setDraggedNoteId(null);
      actions.setDraggedHandle(null);
      actions.setDragStartTime(null);
      actions.setDragStartLane(null);
      mouseDownPosRef.current = null;
      
    } else if (state.draggedNoteId) {
      // ====================================================================
      // CASE B: Clicked but didn't drag - toggle selection
      // ====================================================================
      const isAlreadySelected = state.selectedNoteIds.includes(state.draggedNoteId);
      
      if (isAlreadySelected) {
        // Deselect
        actions.clearSelection();
        actions.setSelectedNoteId(null);
      } else {
        // Select
        actions.clearSelection();
        actions.setSelectedNoteId(state.draggedNoteId);
      }
      
      actions.setDraggedNoteId(null);
      mouseDownPosRef.current = null;
      
    } else {
      // ====================================================================
      // CASE C: Clicked empty space - cleanup
      // ====================================================================
      mouseDownPosRef.current = null;
    }
  }, [canvasRef, state, actions]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}

// ============================================================================
// VISUAL EXAMPLE: TAP Note at 0ms
// ============================================================================

/**
 * SCENARIO: User clicks TAP note at time=0ms, currentTime=0ms
 * 
 * Step 1: findCandidateNote()
 * ---------------------------
 * noteStartTime = 0 - 150 = -150ms
 * noteEndTime = 0 + 150 = 150ms
 * noteCenterTime = 0ms
 * clickTime = 0ms (user clicked at currentTime)
 * 
 * Time check: 0 >= -150 && 0 <= 150 ✅ PASS
 * 
 * progress = 1 - ((0 - 0) / 4000) = 1.0 (AT judgment line)
 * 
 * Geometry at progress=1.0:
 *   nearDistance = 1 + (1.0 × (187 - 1)) = 187px
 *   scaledDepth = 30 × 1.0 = 30px
 *   farDistance = max(1, 187 - 30) = 157px
 * 
 * Depth check:
 *   withinDepth = mouseDistance >= (157 - 100) && mouseDistance <= (187 + 100)
 *               = mouseDistance >= 57 && mouseDistance <= 287 ✅
 *   
 *   RESULT: 230px wide click zone! Very generous.
 * 
 * Score calculation:
 *   centerDistance = (187 + 157) / 2 = 172px
 *   If mouseDistance = 170:
 *     distanceScore = |170 - 172| = 2
 *     timeScore = |0 - 0| / 10 = 0
 *     progressScore = (1 - 1.0) × 100 = 0
 *     totalScore = 2 + 0 + 0 = 2 (excellent!)
 * 
 * RESULT: Note found! ✅
 * 
 * 
 * Step 2: User clicks again (note already selected)
 * --------------------------------------------------
 * detectNearestHandle() called:
 * 
 * nearHandleTime = 0 - 150 = -150ms
 * farHandleTime = 0 + 150 = 150ms
 * 
 * nearProgress = 1 - ((-150 - 0) / 4000) = 1.0375 (past judgment)
 * farProgress = 1 - ((150 - 0) / 4000) = 0.9625 (before judgment)
 * 
 * nearGeometry at 1.0375:
 *   nearDistance = 1 + (1.0375 × 186) ≈ 194px
 * 
 * farGeometry at 0.9625:
 *   nearDistance = 1 + (0.9625 × 186) ≈ 180px
 * 
 * If mouseDistance = 190:
 *   nearDist = |190 - 194| = 4
 *   farDist = |190 - 180| = 10
 *   RESULT: Returns 'near' ✅
 * 
 * This matches the white indicator lines exactly!
 */

// ============================================================================
// END OF STUDY REFERENCE
// ============================================================================

export default function SelectionLogicStudy() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Selection Logic Study Reference</h1>
      <p>This component is for documentation only - check the source code.</p>
      <p>See comments in SelectionLogicStudy.tsx for complete algorithm walkthrough.</p>
    </div>
  );
}
