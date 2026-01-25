import { useCallback, useRef } from 'react';
import { Note } from '@/types/game';
import { mouseToLane, mouseToTime, snapTimeToGrid, checkNoteOverlap } from '@/lib/editor/editorUtils';
import { audioManager } from '@/lib/audio/audioManager';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
import { LEAD_TIME, GAME_CONFIG } from '@/lib/config/timing';
import { MIN_DRAG_DISTANCE } from '@/lib/config/editor';
import { findCandidateNote } from './useNoteCandidateScoring';
import { detectNearestHandle } from './useHandleDetection';
import { updateNoteFromHandleDrag } from './useNoteHandleDrag';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;

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

  // Track initial mouse position to detect minimum drag distance
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Use candidate scoring to find clicked note
    const clickedNote = findCandidateNote(mouseX, mouseY, {
      parsedNotes,
      currentTime,
      snapEnabled,
      snapDivision,
      bpm: metadata.bpm,
    });
    
    if (clickedNote) {
      // Clicked on a note - prepare for drag or selection
      setDraggedNoteId(clickedNote.id);
      setDragStartTime(clickedNote.time);
      setDragStartLane(clickedNote.lane);
      mouseDownPosRef.current = { x: mouseX, y: mouseY };
      audioManager.play('tapHit');
    } else {
      // Clicked empty space - check if we can create a note here
      const { lane: closestLane } = mouseToLane(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y);
      const noteTime = snapEnabled ? snapTimeToGrid(currentTime, metadata.bpm, snapDivision) : currentTime;
      
      // Check if a note already exists at this time/lane
      if (checkNoteOverlap(parsedNotes, null, closestLane, noteTime - TAP_HIT_WINDOW, noteTime + TAP_HIT_WINDOW)) {
        return; // Position already occupied
      }
      
      setIsDragging(true);
      setDragStartTime(noteTime);
      setDragStartLane(closestLane);
      mouseDownPosRef.current = { x: mouseX, y: mouseY };
      if (!e.ctrlKey && !e.metaKey) clearSelection();
    }
  }, [canvasRef, currentTime, snapEnabled, metadata.bpm, snapDivision, parsedNotes, selectedNoteIds, clearSelection, setIsDragging, setDragStartTime, setDragStartLane, setDraggedNoteId]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { lane: closestLane, distance: mouseDistance } = mouseToLane(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y);
    
    // Check if mouse has moved enough to start dragging
    if (e.buttons === 1 && draggedNoteId && !isDragging) {
      if (mouseDownPosRef.current) {
        const dx = mouseX - mouseDownPosRef.current.x;
        const dy = mouseY - mouseDownPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < MIN_DRAG_DISTANCE) {
          return; // Not enough movement yet
        }
      }
      
      const draggedNote = parsedNotes.find(n => n.id === draggedNoteId);
      if (!draggedNote) return;
      
      const isSelected = selectedNoteIds.includes(draggedNoteId);
      
      if (isSelected) {
        // Note is selected - detect nearest handle to extend/shorten
        const nearestHandle = detectNearestHandle(draggedNote, mouseDistance, currentTime);
        setDraggedHandle(nearestHandle);
        setIsDragging(true);
      } else {
        // Note is NOT selected - slide along z-axis (change time)
        setDraggedHandle(null);
        setIsDragging(true);
      }
    }
    
    // If dragging a handle, update note using handle drag logic
    if (isDragging && draggedNoteId && draggedHandle) {
      const updatedNotes = updateNoteFromHandleDrag({
        mouseX,
        mouseY,
        currentTime,
        snapEnabled,
        snapDivision,
        bpm: metadata.bpm,
        draggedNoteId,
        draggedHandle,
        parsedNotes,
      });
      setParsedNotes(updatedNotes);
      const { time: timeOffset } = mouseToTime(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
      const newTime = snapEnabled ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision) : timeOffset;
      setHoveredNote({ lane: closestLane, time: newTime });
    } else if (isDragging && draggedNoteId && !draggedHandle) {
      // Dragging entire note (sliding) - update position
      const { time: timeOffset } = mouseToTime(mouseX, mouseY, VANISHING_POINT_X, VANISHING_POINT_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
      const newTime = snapEnabled ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision) : timeOffset;
      
      const draggedNote = parsedNotes.find(n => n.id === draggedNoteId);
      if (draggedNote) {
        const duration = draggedNote.type === 'HOLD' && draggedNote.duration ? draggedNote.duration : 0;
        const checkStart = draggedNote.type === 'TAP' ? newTime - TAP_HIT_WINDOW : newTime;
        const checkEnd = draggedNote.type === 'TAP' ? newTime + TAP_HIT_WINDOW : newTime + duration;
        
        if (checkNoteOverlap(parsedNotes, draggedNoteId, draggedNote.lane, checkStart, checkEnd)) {
          return; // Overlap detected
        }
      }
      
      const updatedNotes = parsedNotes.map(note => 
        note.id === draggedNoteId ? { ...note, time: newTime, lane: closestLane } : note
      );
      setParsedNotes(updatedNotes);
      setHoveredNote({ lane: closestLane, time: newTime });
    } else {
      // Hover preview at judgement line
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
        // Check with hit window buffer to prevent overlapping hit windows
        if (checkNoteOverlap(parsedNotes, null, dragStartLane!, dragStartTime! - TAP_HIT_WINDOW, dragStartTime! + TAP_HIT_WINDOW)) {
          // Overlap detected - cannot create note
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
      mouseDownPosRef.current = null;
    } else if (draggedNoteId) {
      // We clicked but didn't drag - toggle selection
      const isAlreadySelected = selectedNoteIds.includes(draggedNoteId);
      
      if (isAlreadySelected) {
        // Deselect
        clearSelection();
        setSelectedNoteId(null);
      } else {
        // Select
        clearSelection();
        setSelectedNoteId(draggedNoteId);
      }
      setDraggedNoteId(null);
      mouseDownPosRef.current = null;
    } else {
      mouseDownPosRef.current = null;
    }
  }, [canvasRef, isDragging, draggedNoteId, dragStartTime, dragStartLane, parsedNotes, currentDifficulty, selectedNoteIds, addToHistory, setParsedNotes, setDifficultyNotes, setIsDragging, setDragStartTime, setDragStartLane, setDraggedNoteId, setDraggedHandle, clearSelection, setSelectedNoteId]);

  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  };
}
