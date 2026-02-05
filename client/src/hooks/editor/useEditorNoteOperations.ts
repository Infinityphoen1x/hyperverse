import { useCallback } from 'react';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';
import { useEditorUIStore } from '@/stores/useEditorUIStore';
import { Note } from '@/types/game';
import { audioManager } from '@/lib/audio/audioManager';
import { checkNoteOverlap } from '@/lib/editor/editorUtils';
import { GAME_CONFIG } from '@/lib/config/timing';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;

interface UseEditorNoteOperationsProps {
  currentTime: number;
  setCurrentTime: (time: number) => void;
}

/**
 * Note CRUD operations for the editor
 * Delete, toggle type, update properties, select by position
 */
export function useEditorNoteOperations({
  currentTime,
  setCurrentTime,
}: UseEditorNoteOperationsProps) {
  // Get state from stores
  const parsedNotes = useEditorCoreStore(state => state.parsedNotes);
  const selectedNoteIds = useEditorCoreStore(state => state.selectedNoteIds);
  const selectedNoteId = useEditorCoreStore(state => state.selectedNoteId);
  const currentDifficulty = useEditorCoreStore(state => state.currentDifficulty);
  const metadata = useEditorCoreStore(state => state.metadata);
  const snapDivision = useEditorUIStore(state => state.snapDivision);
  const setParsedNotes = useEditorCoreStore(state => state.setParsedNotes);
  const setDifficultyNotes = useEditorCoreStore(state => state.setDifficultyNotes);
  const addToHistory = useEditorCoreStore(state => state.addToHistory);
  const clearSelection = useEditorCoreStore(state => state.clearSelection);
  const setSelectedNoteId = useEditorCoreStore(state => state.setSelectedNoteId);
  const toggleNoteSelection = useEditorCoreStore(state => state.toggleNoteSelection);
  
  // Delete selected notes
  const deleteSelectedNote = useCallback(() => {
    if (selectedNoteIds.length > 0 || selectedNoteId) {
      addToHistory(parsedNotes);
      const idsToDelete = selectedNoteIds.length > 0 
        ? selectedNoteIds 
        : [selectedNoteId!];
      const newNotes = parsedNotes.filter(n => !idsToDelete.includes(n.id));
      setParsedNotes(newNotes);
      setDifficultyNotes(currentDifficulty, newNotes);
      clearSelection();
      audioManager.play('difficultySettingsApply');
    }
  }, [
    selectedNoteIds,
    selectedNoteId,
    parsedNotes,
    addToHistory,
    setParsedNotes,
    setDifficultyNotes,
    currentDifficulty,
    clearSelection,
  ]);

  // Batch nudge selected notes in time
  const nudgeSelectedNotes = useCallback((direction: 'left' | 'right') => {
    if (selectedNoteIds.length === 0) return;
    
    // Calculate snap interval
    const beatDurationMs = (60 / metadata.bpm) * 1000;
    const snapInterval = beatDurationMs / snapDivision;
    const delta = direction === 'left' ? -snapInterval : snapInterval;
    
    // Calculate new positions
    const newNotes = parsedNotes.map(note => {
      if (selectedNoteIds.includes(note.id)) {
        const newTime = Math.max(0, note.time + delta);
        return { ...note, time: newTime };
      }
      return note;
    });
    
    // Check for overlaps
    const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;
    const hasOverlap = newNotes.some(movedNote => {
      if (!selectedNoteIds.includes(movedNote.id)) return false;
      
      const startTime = movedNote.type === 'TAP' 
        ? movedNote.time - TAP_HIT_WINDOW 
        : movedNote.time;
      const endTime = movedNote.type === 'HOLD' && movedNote.duration
        ? movedNote.time + movedNote.duration
        : movedNote.time + (movedNote.type === 'TAP' ? TAP_HIT_WINDOW : 0);
      
      return checkNoteOverlap(
        newNotes.filter(n => !selectedNoteIds.includes(n.id)),
        movedNote.id,
        movedNote.lane,
        startTime,
        endTime
      );
    });
    
    if (hasOverlap) {
      audioManager.play('noteMiss');
      return;
    }
    
    addToHistory(parsedNotes);
    setParsedNotes(newNotes);
    setDifficultyNotes(currentDifficulty, newNotes);
    audioManager.play('tapHit');
  }, [
    selectedNoteIds,
    parsedNotes,
    metadata.bpm,
    addToHistory,
    setParsedNotes,
    setDifficultyNotes,
    currentDifficulty,
    snapDivision,
  ]);

  // Batch move selected notes to different positions
  const moveSelectedNotesToPosition = useCallback((direction: 'up' | 'down') => {
    if (selectedNoteIds.length === 0) return;
    
    const positions = [-2, -1, 0, 1, 2, 3];
    const delta = direction === 'up' ? -1 : 1;
    
    // Calculate new positions
    const newNotes = parsedNotes.map(note => {
      if (selectedNoteIds.includes(note.id)) {
        const currentIndex = positions.indexOf(note.lane); // DEPRECATED: note.lane field, treat as position
        if (currentIndex === -1) return note;
        
        const newIndex = currentIndex + delta;
        if (newIndex < 0 || newIndex >= positions.length) return note;
        
        return { ...note, lane: positions[newIndex] }; // DEPRECATED: note.lane field update
      }
      return note;
    });
    
    // Check for overlaps
    const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;
    const hasOverlap = newNotes.some(movedNote => {
      if (!selectedNoteIds.includes(movedNote.id)) return false;
      
      const startTime = movedNote.type === 'TAP' 
        ? movedNote.time - TAP_HIT_WINDOW 
        : movedNote.time;
      const endTime = movedNote.type === 'HOLD' && movedNote.duration
        ? movedNote.time + movedNote.duration
        : movedNote.time + (movedNote.type === 'TAP' ? TAP_HIT_WINDOW : 0);
      
      return checkNoteOverlap(
        newNotes.filter(n => !selectedNoteIds.includes(n.id)),
        movedNote.id,
        movedNote.lane,
        startTime,
        endTime
      );
    });
    
    if (hasOverlap) {
      audioManager.play('noteMiss');
      return;
    }
    
    addToHistory(parsedNotes);
    setParsedNotes(newNotes);
    setDifficultyNotes(currentDifficulty, newNotes);
    audioManager.play('tapHit');
  }, [
    selectedNoteIds,
    parsedNotes,
    addToHistory,
    setParsedNotes,
    setDifficultyNotes,
    currentDifficulty,
  ]);

  // Handle note properties update
  const handlePropertiesUpdate = useCallback((updates: Array<{ id: string; changes: Partial<Note> }>) => {
    addToHistory(parsedNotes);
    const newNotes = parsedNotes.map(note => {
      const update = updates.find(u => u.id === note.id);
      return update ? { ...note, ...update.changes } : note;
    });
    setParsedNotes(newNotes);
    setDifficultyNotes(currentDifficulty, newNotes);
  }, [
    addToHistory,
    parsedNotes,
    setParsedNotes,
    setDifficultyNotes,
    currentDifficulty,
  ]);

  // Select nearest note in a specific position
  const selectNoteInPosition = useCallback((position: number) => {
    const TIME_WINDOW = 5000;
    
    const notesInPosition = parsedNotes.filter(n => 
      n.lane === position && Math.abs(n.time - currentTime) <= TIME_WINDOW // DEPRECATED: note.lane field, treat as position
    );
    
    if (notesInPosition.length === 0) {
      audioManager.play('noteMiss');
      return;
    }

    const closestNote = notesInPosition.reduce((closest, note) => {
      const currentDist = Math.abs(note.time - currentTime);
      const closestDist = Math.abs(closest.time - currentTime);
      return currentDist < closestDist ? note : closest;
    });

    clearSelection();
    setSelectedNoteId(closestNote.id);
    
    window.focus();
    audioManager.play('tapHit');
  }, [parsedNotes, clearSelection, setSelectedNoteId, currentTime]);

  // Toggle note type (TAP <-> HOLD)
  const toggleNoteType = useCallback(() => {
    const selectedIds = selectedNoteIds.length > 0 
      ? selectedNoteIds 
      : selectedNoteId ? [selectedNoteId] : [];
    
    if (selectedIds.length === 0) return;
    
    addToHistory(parsedNotes);
    const newNotes = parsedNotes.map(note => {
      if (!selectedIds.includes(note.id)) return note;
      
      if (note.type === 'TAP') {
        // Convert TAP to HOLD with default 500ms duration
        return { ...note, type: 'HOLD' as const, duration: 500 };
      } else {
        // Convert HOLD to TAP
        const { duration, ...rest } = note;
        return { ...rest, type: 'TAP' as const };
      }
    });
    
    setParsedNotes(newNotes);
    setDifficultyNotes(currentDifficulty, newNotes);
  }, [selectedNoteIds, selectedNoteId, addToHistory, parsedNotes, setParsedNotes, setDifficultyNotes, currentDifficulty]);

  return {
    deleteSelectedNote,
    toggleNoteType,
    nudgeSelectedNotes,
    moveSelectedNotesToPosition,
    moveSelectedNotesToLane: moveSelectedNotesToPosition, // Legacy alias
    handlePropertiesUpdate,
    selectNoteInPosition,
    selectNoteInLane: selectNoteInPosition, // Legacy alias
  };
}
