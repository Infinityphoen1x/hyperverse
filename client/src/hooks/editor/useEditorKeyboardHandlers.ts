/**
 * Keyboard note placement handlers for beatmap editor
 * Handles Q W E I O P keys for quick TAP placement and HOLD creation
 */

import { useCallback, useEffect, useRef } from 'react';
import { Note } from '@/types/game';
import { snapTimeToGrid, checkNoteOverlap } from '@/lib/editor/editorUtils';
import { audioManager } from '@/lib/audio/audioManager';
import { GAME_CONFIG } from '@/lib/config/timing';
import { MIN_HOLD_DURATION } from '@/lib/config/editor';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;
const HOLD_KEY_THRESHOLD_MS = 150; // Hold key this long to trigger duration input

// Position mapping matching gameplay: W O I E Q P → Positions 0 1 2 3 -1 -2
// Matches useKeyControls.ts in gameplay
const KEY_TO_LANE: Record<string, number> = {
  'w': 0,  // Position 0 (diamond)
  'o': 1,  // Position 1 (diamond)
  'i': 2,  // Position 2 (diamond)
  'e': 3,  // Position 3 (diamond)
  'q': -1, // Position -1 (horizontal)
  'p': -2, // Position -2 (horizontal)
};

interface UseEditorKeyboardHandlersProps {
  currentTime: number;
  parsedNotes: Note[];
  snapEnabled: boolean;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  metadata: { bpm: number };
  currentDifficulty: string;
  isEditorActive: boolean; // Only handle keys when editor is active
  isEditMode: boolean; // Only place notes when edit mode is enabled
  
  // Actions
  setParsedNotes: (notes: Note[]) => void;
  setDifficultyNotes: (diff: any, notes: Note[]) => void;
  addToHistory: (notes: Note[]) => void;
  setDurationInputState: (state: { visible: boolean; lane: number; time: number } | null) => void; // lane represents position value
}

export function useEditorKeyboardHandlers(props: UseEditorKeyboardHandlersProps) {
  const {
    currentTime,
    parsedNotes,
    snapEnabled,
    snapDivision,
    metadata,
    currentDifficulty,
    isEditorActive,
    isEditMode,
    setParsedNotes,
    setDifficultyNotes,
    addToHistory,
    setDurationInputState,
  } = props;

  // Track key press timing for hold detection
  const keyDownTimestamps = useRef<Map<string, number>>(new Map());
  const keyHoldTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const createTapNote = useCallback((lane: number, time: number) => { // lane parameter represents position value
    // Check for overlap
    if (checkNoteOverlap(parsedNotes, null, lane, time - TAP_HIT_WINDOW, time + TAP_HIT_WINDOW)) {
      // Position already occupied - skip with subtle feedback
      return;
    }

    addToHistory(parsedNotes);
    const newNote: Note = {
      id: `editor-note-${Date.now()}`,
      type: 'TAP',
      lane, // DEPRECATED: note.lane field, assigning position value
      time,
      hit: false,
      missed: false,
    };
    const updatedNotes = [...parsedNotes, newNote];
    setParsedNotes(updatedNotes);
    setDifficultyNotes(currentDifficulty, updatedNotes);
    audioManager.play('tapHit');
  }, [parsedNotes, currentDifficulty, setParsedNotes, setDifficultyNotes, addToHistory]);

  const createHoldNote = useCallback((lane: number, time: number, duration: number) => { // lane parameter represents position value
    // Validate duration
    if (duration < MIN_HOLD_DURATION) {
      // Too short - create TAP instead
      createTapNote(lane, time);
      return;
    }

    // Check for overlap
    if (checkNoteOverlap(parsedNotes, null, lane, time, time + duration)) {
      // Position already occupied - skip
      return;
    }

    addToHistory(parsedNotes);
    const newNote: Note = {
      id: `editor-note-${Date.now()}`,
      type: 'HOLD',
      lane, // DEPRECATED: note.lane field, assigning position value
      time,
      duration,
      hit: false,
      missed: false,
    };
    const updatedNotes = [...parsedNotes, newNote];
    setParsedNotes(updatedNotes);
    setDifficultyNotes(currentDifficulty, updatedNotes);
    audioManager.play('tapHit');
  }, [parsedNotes, currentDifficulty, setParsedNotes, setDifficultyNotes, addToHistory, createTapNote]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only place notes when editor is active AND edit mode is enabled
    if (!isEditorActive || !isEditMode) return;
    
    // Don't place notes when typing in input fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    
    const key = e.key.toLowerCase();
    const lane = KEY_TO_LANE[key]; // Position value (-2 to 3)
    
    // Ignore if not a valid note placement key
    if (lane === undefined) return;
    
    // Prevent repeat keydown events
    if (keyDownTimestamps.current.has(key)) return;
    
    // Record key press time
    keyDownTimestamps.current.set(key, Date.now());
    
    // Set timeout to show duration input if key held
    const timeout = setTimeout(() => {
      // Key held for HOLD_KEY_THRESHOLD_MS - show duration input
      const noteTime = snapEnabled ? snapTimeToGrid(currentTime, metadata.bpm, snapDivision, metadata.beatmapStart) : currentTime;
      setDurationInputState({
        visible: true,
        lane,
        time: noteTime,
      });
    }, HOLD_KEY_THRESHOLD_MS);
    
    keyHoldTimeouts.current.set(key, timeout);
  }, [isEditorActive, isEditMode, currentTime, snapEnabled, snapDivision, metadata.bpm, metadata.beatmapStart, setDurationInputState]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Only place notes when editor is active AND edit mode is enabled
    if (!isEditorActive || !isEditMode) return;
    
    // Don't place notes when typing in input fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    
    const key = e.key.toLowerCase();
    const lane = KEY_TO_LANE[key]; // Position value (-2 to 3)
    
    // Ignore if not a valid note placement key
    if (lane === undefined) return;
    
    // Clear timeout if exists
    const timeout = keyHoldTimeouts.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      keyHoldTimeouts.current.delete(key);
    }
    
    // Calculate press duration
    const pressStartTime = keyDownTimestamps.current.get(key);
    if (!pressStartTime) return;
    
    const pressDuration = Date.now() - pressStartTime;
    keyDownTimestamps.current.delete(key);
    
    // If released quickly (before threshold), create TAP note
    if (pressDuration < HOLD_KEY_THRESHOLD_MS) {
      const noteTime = snapEnabled ? snapTimeToGrid(currentTime, metadata.bpm, snapDivision, metadata.beatmapStart) : currentTime;
      createTapNote(lane, noteTime);
    }
    // If released after threshold, duration input is already shown - do nothing
  }, [isEditorActive, isEditMode, currentTime, snapEnabled, snapDivision, metadata.bpm, metadata.beatmapStart, createTapNote]);

  // Attach keyboard listeners
  useEffect(() => {
    if (!isEditorActive) {
      // Clean up any pending timeouts when editor becomes inactive
      keyHoldTimeouts.current.forEach(timeout => clearTimeout(timeout));
      keyHoldTimeouts.current.clear();
      keyDownTimestamps.current.clear();
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      // Clean up timeouts on unmount
      keyHoldTimeouts.current.forEach(timeout => clearTimeout(timeout));
      keyHoldTimeouts.current.clear();
    };
  }, [isEditorActive, handleKeyDown, handleKeyUp]);

  return {
    createHoldNote, // Expose for duration input component
  };
}
