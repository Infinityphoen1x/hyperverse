import { useCallback } from 'react';
import { Note } from '@/types/game';
import { mouseToLane, mouseToTime, snapTimeToGrid, checkNoteOverlap } from '@/lib/editor/editorUtils';
import { audioManager } from '@/lib/audio/audioManager';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
import { LEAD_TIME } from '@/lib/config/timing';
import { calculateDistances } from '@/lib/geometry/tapNoteGeometry';

const MIN_HOLD_DURATION = 100;

interface UseEditorMouseHandlersProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  currentTime: number;
  parsedNotes: Note[];
  snapEnabled: boolean;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  metadata: { bpm: number };
  selectedNoteIds: string[];
  isDragging: boolean;
  draggedNoteId: string | null;
  draggedHandle: 'start' | 'end' | 'near' | 'far' | null;
  dragStartTime: number | null;
  dragStartLane: number | null;
  currentDifficulty: string;
  
  // Actions
  toggleNoteSelection: (id: string) => void;
  clearSelection: () => void;
  setSelectedNoteId: (id: string | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStartTime: (time: number | null) => void;
  setDragStartLane: (lane: number | null) => void;
  setDraggedNoteId: (id: string | null) => void;
  setDraggedHandle: (handle: 'start' | 'end' | 'near' | 'far' | null) => void;
  setHoveredNote: (note: any) => void;
  setParsedNotes: (notes: Note[]) => void;
  setDifficultyNotes: (diff: any, notes: Note[]) => void;
  addToHistory: (notes: Note[]) => void;
}

export function useEditorMouseHandlers(props: UseEditorMouseHandlersProps) {
  const {
    canvasRef,
    currentTime,
    parsedNotes,
    snapEnabled,
    snapDivision,
    metadata,
    selectedNoteIds,
    isDragging,
    draggedNoteId,
    draggedHandle,
    dragStartTime,
    dragStartLane,
    currentDifficulty,
    toggleNoteSelection,
    clearSelection,
    setSelectedNoteId,
    setIsDragging,
    setDragStartTime,
    setDragStartLane,
    setDraggedNoteId,
    setDraggedHandle,
    setHoveredNote,
    setParsedNotes,
    setDifficultyNotes,
    addToHistory,
  } = props;

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { lane: closestLane, distance: mouseDistance } = mouseToLane(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y);
    const { time: timeOffset } = mouseToTime(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
    const clickTime = snapEnabled ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision) : timeOffset;
    
    console.log('[EDITOR] Mouse down - closestLane:', closestLane, 'mouseDistance:', mouseDistance);

    // Check if clicking an existing note - use same geometry as rendering
    const clickedNote = parsedNotes.find(note => {
      // Calculate progress using the same formula as note rendering
      const progress = 1 - ((note.time - currentTime) / LEAD_TIME);
      if (progress < 0 || progress > 1) return false;
      
      // Use calculateDistances to get the exact visual distances
      const geometry = calculateDistances(progress);
      
      // Only consider notes on the same lane and within the note's depth range
      if (note.lane !== closestLane) return false;
      
      // Check if mouse is within the note's depth (between far and near edges)
      // Add tolerance for easier clicking
      const tolerance = 30;
      const withinDepth = mouseDistance >= geometry.farDistance - tolerance && 
                          mouseDistance <= geometry.nearDistance + tolerance;
      
      if (!withinDepth) return false;
      
      // Also check time proximity
      return Math.abs(note.time - clickTime) < 100;
    });
    
    if (clickedNote) {
      // Clicked on a note - prepare for drag or selection
      // Don't set isDragging yet - wait for mouse move to determine intent
      setDraggedNoteId(clickedNote.id);
      setDragStartTime(clickedNote.time);
      setDragStartLane(clickedNote.lane);
      audioManager.play('tapHit');
      console.log('[EDITOR] Clicked note:', clickedNote.id, 'selected:', selectedNoteIds.includes(clickedNote.id));
    } else {
      // Clicked empty space - check if we can create a note here
      const noteTime = snapEnabled ? snapTimeToGrid(currentTime, metadata.bpm, snapDivision) : currentTime;
      
      // Check if a note already exists at this time/lane before starting drag
      if (checkNoteOverlap(parsedNotes, null, closestLane, noteTime, noteTime)) {
        console.log('[EDITOR] Cannot start creating note - position already occupied');
        return; // Don't start drag operation
      }
      
      console.log('[EDITOR] Creating new note at:', noteTime);
      setIsDragging(true);
      setDragStartTime(noteTime);
      setDragStartLane(closestLane);
      if (!e.ctrlKey && !e.metaKey) clearSelection();
    }
  }, [canvasRef, currentTime, snapEnabled, metadata.bpm, snapDivision, parsedNotes, selectedNoteIds, clearSelection, setIsDragging, setDragStartTime, setDragStartLane, setDraggedNoteId]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { lane: closestLane, distance: mouseDistance } = mouseToLane(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y);
    
    // If we have a dragged note but haven't started dragging, start now based on whether it's selected
    if (e.buttons === 1 && draggedNoteId && !isDragging) {
      const draggedNote = parsedNotes.find(n => n.id === draggedNoteId);
      if (!draggedNote) return;
      
      const isSelected = selectedNoteIds.includes(draggedNoteId);
      
      if (isSelected) {
        // Note is selected (white lines visible) - find nearest handle to extend/shorten
        // Use the same geometry calculation as the note rendering for accurate handle detection
        const startProgress = 1 - ((draggedNote.time - currentTime) / LEAD_TIME);
        const startGeometry = calculateDistances(startProgress);
        
        let nearestHandle: 'start' | 'end' | 'near' | 'far' = 'start';
        let minDistance = Infinity;
        
        if (draggedNote.type === 'HOLD' && draggedNote.duration) {
          // For HOLD notes, check start and end handles
          const startDist = Math.abs(mouseDistance - startGeometry.nearDistance);
          minDistance = startDist;
          nearestHandle = 'start';
          
          const endTime = draggedNote.time + draggedNote.duration;
          const endProgress = 1 - ((endTime - currentTime) / LEAD_TIME);
          const endGeometry = calculateDistances(endProgress);
          const endDist = Math.abs(mouseDistance - endGeometry.nearDistance);
          
          if (endDist < minDistance) {
            nearestHandle = 'end';
            minDistance = endDist;
          }
        } else {
          // For TAP notes, check near and far edges
          const nearDist = Math.abs(mouseDistance - startGeometry.nearDistance);
          const farDist = Math.abs(mouseDistance - startGeometry.farDistance);
          
          if (nearDist < farDist) {
            nearestHandle = 'near';
            minDistance = nearDist;
          } else {
            nearestHandle = 'far';
            minDistance = farDist;
          }
        }
        
        setDraggedHandle(nearestHandle);
        setIsDragging(true);
        console.log('[EDITOR] Extending/shortening note at', nearestHandle, 'handle');
      } else {
        // Note is NOT selected - slide along z-axis (change time)
        setDraggedHandle(null);
        setIsDragging(true);
        console.log('[EDITOR] Sliding note along z-axis');
      }
    }
    
    // If dragging a handle (selected note), extend/shorten
    if (isDragging && draggedNoteId && draggedHandle) {
      const { time: timeOffset } = mouseToTime(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
      const newTime = snapEnabled ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision) : timeOffset;
      
      const updatedNotes = parsedNotes.map(note => {
        if (note.id === draggedNoteId) {
          let proposedStart = note.time;
          let proposedEnd = note.time;
          
          // Handle TAP/HOLD note near/far handles
          // 'near' handle = front of note (end time, closer to player)
          // 'far' handle = back of note (start time, toward VP)
          
          if (draggedHandle === 'near') {
            // Dragging near handle (front of note) - adjusts end time/duration
            // Moving toward VP = earlier time = shorter duration
            // Moving away from VP = later time = longer duration
            const newDuration = newTime - note.time;
            
            proposedStart = note.time;
            proposedEnd = newTime;
            
            // Check for overlap before applying
            if (checkNoteOverlap(parsedNotes, draggedNoteId, note.lane, proposedStart, proposedEnd)) {
              console.log('[EDITOR] Overlap detected - cannot adjust near handle');
              return note;
            }
            
            if (newDuration > MIN_HOLD_DURATION) {
              // Convert to HOLD or adjust existing HOLD duration
              return { ...note, type: 'HOLD' as const, duration: newDuration };
            } else {
              // Duration too short, convert/stay as TAP
              return { ...note, type: 'TAP' as const, duration: undefined };
            }
          } else if (draggedHandle === 'far') {
            // Dragging far handle (back of note) - adjusts start time
            // Moving toward VP = earlier time = longer duration
            // Moving away from VP = later time = shorter duration
            const oldEndTime = note.type === 'HOLD' && note.duration ? note.time + note.duration : note.time;
            const newDuration = oldEndTime - newTime;
            
            proposedStart = newTime;
            proposedEnd = oldEndTime;
            
            // Check for overlap before applying
            if (checkNoteOverlap(parsedNotes, draggedNoteId, note.lane, proposedStart, proposedEnd)) {
              console.log('[EDITOR] Overlap detected - cannot adjust far handle');
              return note;
            }
            
            if (newDuration > MIN_HOLD_DURATION) {
              // Convert to HOLD or adjust start time
              return { ...note, time: newTime, type: 'HOLD' as const, duration: newDuration };
            } else {
              // Duration too short, convert/stay as TAP at new position
              return { ...note, time: newTime, type: 'TAP' as const, duration: undefined };
            }
          } else if (draggedHandle === 'start') {
            // Dragging start handle - adjust note time
            const oldEndTime = note.type === 'HOLD' && note.duration ? note.time + note.duration : note.time;
            const newDuration = oldEndTime - newTime;
            
            proposedStart = newTime;
            proposedEnd = oldEndTime;
            
            // Check for overlap before applying
            if (checkNoteOverlap(parsedNotes, draggedNoteId, note.lane, proposedStart, proposedEnd)) {
              console.log('[EDITOR] Overlap detected - cannot extend start handle');
              return note; // Don't change the note
            }
            
            if (newDuration > MIN_HOLD_DURATION) {
              // Convert to hold or adjust hold
              return { ...note, time: newTime, type: 'HOLD' as const, duration: newDuration };
            } else {
              // Too short, keep as tap at new time
              return { ...note, time: newTime, type: 'TAP' as const, duration: undefined };
            }
          } else {
            // Dragging end handle - adjust duration
            const newDuration = newTime - note.time;
            
            proposedStart = note.time;
            proposedEnd = newTime;
            
            // Check for overlap before applying
            if (checkNoteOverlap(parsedNotes, draggedNoteId, note.lane, proposedStart, proposedEnd)) {
              console.log('[EDITOR] Overlap detected - cannot extend end handle');
              return note; // Don't change the note
            }
            
            if (newDuration > MIN_HOLD_DURATION) {
              // Convert to hold or adjust hold
              return { ...note, type: 'HOLD' as const, duration: newDuration };
            } else {
              // Too short, convert back to tap
              return { ...note, type: 'TAP' as const, duration: undefined };
            }
          }
        }
        return note;
      });
      setParsedNotes(updatedNotes);
      setHoveredNote({ lane: closestLane, time: newTime });
    } else if (isDragging && draggedNoteId && !draggedHandle) {
      // Dragging entire note (sliding) - update its position
      const { time: timeOffset } = mouseToTime(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
      const newTime = snapEnabled ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision) : timeOffset;
      
      const draggedNote = parsedNotes.find(n => n.id === draggedNoteId);
      if (draggedNote) {
        const duration = draggedNote.type === 'HOLD' && draggedNote.duration ? draggedNote.duration : 0;
        
        // Check for overlap before sliding
        if (checkNoteOverlap(parsedNotes, draggedNoteId, draggedNote.lane, newTime, newTime + duration)) {
          console.log('[EDITOR] Overlap detected - cannot slide note to this position');
          return; // Don't update
        }
      }
      
      const updatedNotes = parsedNotes.map(note => {
        if (note.id === draggedNoteId) {
          return { ...note, time: newTime, lane: closestLane };
        }
        return note;
      });
      setParsedNotes(updatedNotes);
      setHoveredNote({ lane: closestLane, time: newTime });
    } else {
      // Hover preview always shows at current time (judgement line)
      const noteTime = snapEnabled ? snapTimeToGrid(currentTime, metadata.bpm, snapDivision) : currentTime;
      setHoveredNote({ lane: closestLane, time: noteTime });
    }
  }, [canvasRef, currentTime, snapEnabled, metadata.bpm, snapDivision, setHoveredNote, isDragging, draggedNoteId, draggedHandle, parsedNotes, setParsedNotes, selectedNoteIds, setDraggedHandle, setIsDragging]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    if (isDragging) {
      // We were dragging - finalize the change
      if (draggedNoteId) {
        addToHistory(parsedNotes);
        setDifficultyNotes(currentDifficulty, parsedNotes);
        audioManager.play('tapHit');
      } else {
        // Creating new note
        if (checkNoteOverlap(parsedNotes, null, dragStartLane!, dragStartTime!, dragStartTime!)) {
          console.log('[EDITOR] Cannot create note - overlaps');
        } else {
          addToHistory(parsedNotes);
          const newNote: Note = {
            id: `editor-note-${Date.now()}`,
            type: 'TAP',
            lane: dragStartLane!,
            time: dragStartTime!,
            hit: false,
            missed: false,
          };
          const updatedNotes = [...parsedNotes, newNote];
          setParsedNotes(updatedNotes);
          setDifficultyNotes(currentDifficulty, updatedNotes);
          // Don't select the newly created note
          clearSelection();
          setSelectedNoteId(null);
          audioManager.play('tapHit');
        }
      }
      setIsDragging(false);
      setDraggedNoteId(null);
      setDraggedHandle(null);
      setDragStartTime(null);
      setDragStartLane(null);
    } else if (draggedNoteId) {
      // We clicked but didn't drag - toggle selection
      const isAlreadySelected = selectedNoteIds.includes(draggedNoteId);
      
      if (isAlreadySelected) {
        // Deselect
        clearSelection();
        setSelectedNoteId(null);
        console.log('[EDITOR] Deselected note:', draggedNoteId);
      } else {
        // Select
        clearSelection();
        setSelectedNoteId(draggedNoteId);
        console.log('[EDITOR] Selected note:', draggedNoteId);
      }
      setDraggedNoteId(null);
    }
  }, [canvasRef, isDragging, draggedNoteId, dragStartTime, dragStartLane, parsedNotes, currentDifficulty, selectedNoteIds, addToHistory, setParsedNotes, setDifficultyNotes, setIsDragging, setDragStartTime, setDragStartLane, setDraggedNoteId, setDraggedHandle, clearSelection, setSelectedNoteId]);

  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  };
}
