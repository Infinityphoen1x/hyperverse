import { useEffect, useCallback } from 'react';
import { audioManager } from '@/lib/audio/audioManager';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';
import { useEditorUIStore } from '@/stores/useEditorUIStore';
import { useShortcutsStore } from '@/stores/useShortcutsStore';

interface UseEditorKeyboardShortcutsProps {
  deleteSelectedNote: () => void;
  toggleNoteType: () => void;
  nudgeSelectedNotes: (direction: 'left' | 'right') => void;
  moveSelectedNotesToLane: (direction: 'up' | 'down') => void; // Legacy name, moves between positions
  selectNoteInLane: (lane: number) => void; // Legacy name, selects by position
  setShowPropertiesDialog: (show: boolean) => void;
  copyToClipboard: () => void;
  downloadBeatmap: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
}

/**
 * Keyboard shortcuts for the beatmap editor
 * Handles undo/redo, delete, play/pause, seek, position selection, etc.
 */
export function useEditorKeyboardShortcuts({
  deleteSelectedNote,
  toggleNoteType,
  nudgeSelectedNotes,
  moveSelectedNotesToLane,
  selectNoteInLane,
  setShowPropertiesDialog,
  copyToClipboard,
  downloadBeatmap,
  handlePlay,
  handlePause,
  currentTime,
  setCurrentTime,
}: UseEditorKeyboardShortcutsProps) {
  // Get state from stores
  const shortcuts = useShortcutsStore(state => state.bindings);
  const selectedNoteIds = useEditorUIStore(state => state.selectedNoteIds);
  const selectedNoteId = useEditorUIStore(state => state.selectedNoteId);
  const isPlaying = useEditorCoreStore(state => state.isPlaying);
  const isEditMode = useEditorUIStore(state => state.isEditMode);
  const snapEnabled = useEditorUIStore(state => state.snapEnabled);
  const simulationMode = useEditorUIStore(state => state.simulationMode);
  const undo = useEditorCoreStore(state => state.undo);
  const redo = useEditorCoreStore(state => state.redo);
  const clearSelection = useEditorUIStore(state => state.clearSelection);
  const setIsEditMode = useEditorUIStore(state => state.setIsEditMode);
  const setSnapEnabled = useEditorUIStore(state => state.setSnapEnabled);
  const setIsPlaying = useEditorCoreStore(state => state.setIsPlaying);

  // Helper to check if target is an input field
  const isInputField = useCallback((target: HTMLElement): boolean => {
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  }, []);
  
  // Check if shortcut matches current key event
  const matchesShortcut = useCallback((e: KeyboardEvent, shortcutId: string): boolean => {
    const binding = shortcuts.find(s => s.id === shortcutId);
    if (!binding) return false;
    
    const keyMatches = e.key === binding.currentKey;
    const ctrlMatches = binding.ctrlRequired ? (e.ctrlKey || e.metaKey) : true;
    const shiftMatches = binding.shiftRequired ? e.shiftKey : true;
    const altMatches = binding.altRequired ? e.altKey : true;
    
    return keyMatches && ctrlMatches && shiftMatches && altMatches;
  }, [shortcuts]);

  // Main keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInputField = isInputField(target);

      // Skip position selection shortcuts during simulation
      if (simulationMode && (
        matchesShortcut(e, 'selectLane0') ||
        matchesShortcut(e, 'selectLane1') ||
        matchesShortcut(e, 'selectLane2') ||
        matchesShortcut(e, 'selectLane3') ||
        matchesShortcut(e, 'selectLaneNeg1') ||
        matchesShortcut(e, 'selectLaneNeg2')
      )) {
        return;
      }

      // Undo
      if (matchesShortcut(e, 'undo')) {
        e.preventDefault();
        undo();
        return;
      }
      
      // Redo
      if (matchesShortcut(e, 'redo')) {
        e.preventDefault();
        redo();
        return;
      }
      
      // Delete
      if (matchesShortcut(e, 'deleteNote') && selectedNoteId && !inInputField) {
        e.preventDefault();
        deleteSelectedNote();
        return;
      }
      
      // Play/Pause
      if (matchesShortcut(e, 'playPause') && !inInputField) {
        e.preventDefault();
        if (isPlaying) {
          handlePause();
          setIsPlaying(false);
        } else {
          handlePlay();
        }
        return;
      }
      
      // Toggle Edit Mode
      if (matchesShortcut(e, 'toggleEditor') && !inInputField) {
        e.preventDefault();
        setIsEditMode(!isEditMode);
        audioManager.play('tapHit');
        return;
      }
      
      // Toggle Snap
      if (matchesShortcut(e, 'toggleSnap') && !inInputField && !e.ctrlKey) {
        e.preventDefault();
        setSnapEnabled(!snapEnabled);
        audioManager.play('tapHit');
        return;
      }
      
      // Deselect All
      if (matchesShortcut(e, 'deselectAll') && !inInputField) {
        e.preventDefault();
        clearSelection();
        return;
      }
      
      // Edit Properties
      if (matchesShortcut(e, 'editProperties') && !inInputField) {
        if (selectedNoteId || selectedNoteIds.length > 0) {
          e.preventDefault();
          setShowPropertiesDialog(true);
        }
        return;
      }
      
      // Copy to Clipboard
      if (matchesShortcut(e, 'copyClipboard')) {
        e.preventDefault();
        copyToClipboard();
        return;
      }
      
      // Download Beatmap
      if (matchesShortcut(e, 'downloadBeatmap')) {
        e.preventDefault();
        downloadBeatmap();
        return;
      }
      
      // Batch operations and seek shortcuts
      if (!inInputField) {
        // Batch operations for selected notes - PRIORITY
        if (selectedNoteIds.length > 0) {
          if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            nudgeSelectedNotes('left');
            return;
          }
          if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            nudgeSelectedNotes('right');
            return;
          }
          
          if (e.key === 'ArrowUp' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            moveSelectedNotesToLane('up');
            return;
          }
          if (e.key === 'ArrowDown' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            moveSelectedNotesToLane('down');
            return;
          }
        }
        
        // Timeline seek shortcuts (only when no notes selected)
        if (selectedNoteIds.length === 0 && matchesShortcut(e, 'seekBackward1')) {
          e.preventDefault();
          clearSelection();
          setCurrentTime(Math.max(0, currentTime - 1000));
          return;
        }
        if (selectedNoteIds.length === 0 && matchesShortcut(e, 'seekForward1')) {
          e.preventDefault();
          clearSelection();
          setCurrentTime(currentTime + 1000);
          return;
        }
        if (selectedNoteIds.length === 0 && matchesShortcut(e, 'seekBackward5')) {
          e.preventDefault();
          clearSelection();
          setCurrentTime(Math.max(0, currentTime - 5000));
          return;
        }
        if (selectedNoteIds.length === 0 && matchesShortcut(e, 'seekForward5')) {
          e.preventDefault();
          clearSelection();
          setCurrentTime(currentTime + 5000);
          return;
        }
      }
      
      // Position selection shortcuts (1-6 keys for positions 0-3, -1, -2)
      if (!inInputField) {
        if (matchesShortcut(e, 'selectLane0')) {
          e.preventDefault();
          selectNoteInLane(0);
          return;
        }
        if (matchesShortcut(e, 'selectLane1')) {
          e.preventDefault();
          selectNoteInLane(1);
          return;
        }
        if (matchesShortcut(e, 'selectLane2')) {
          e.preventDefault();
          selectNoteInLane(2);
          return;
        }
        if (matchesShortcut(e, 'selectLane3')) {
          e.preventDefault();
          selectNoteInLane(3);
          return;
        }
        if (matchesShortcut(e, 'selectLaneNeg1')) {
          e.preventDefault();
          selectNoteInLane(-1);
          return;
        }
        if (matchesShortcut(e, 'selectLaneNeg2')) {
          e.preventDefault();
          selectNoteInLane(-2);
          return;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    selectedNoteId,
    selectedNoteIds,
    setIsPlaying,
    isPlaying,
    setIsEditMode,
    isEditMode,
    clearSelection,
    setSnapEnabled,
    snapEnabled,
    deleteSelectedNote,
    nudgeSelectedNotes,
    moveSelectedNotesToLane,
    handlePlay,
    handlePause,
    matchesShortcut,
    selectNoteInLane,
    copyToClipboard,
    downloadBeatmap,
    currentTime,
    setCurrentTime,
    setShowPropertiesDialog,
    simulationMode,
    isInputField,
  ]);

  return { matchesShortcut };
}
