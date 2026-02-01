import { useEffect, useRef } from 'react';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';
import { useGameStore } from '@/stores/useGameStore';
import {
  parseBeatmapTextWithDifficulties,
  parseMetadataFromText,
  generateBeatmapTextWithDifficulties,
  type BeatmapMetadata,
} from '@/lib/editor/beatmapTextUtils';

/**
 * Syncs beatmap text with parsed notes and difficulties
 * Handles bidirectional sync between text format and internal data structures
 */
export function useEditorBeatmapSync() {
  const isParsingFromTextRef = useRef(false);
  
  // Get state from stores
  const beatmapText = useEditorCoreStore(state => state.beatmapText);
  const currentDifficulty = useEditorCoreStore(state => state.currentDifficulty);
  const difficultyNotes = useEditorCoreStore(state => state.difficultyNotes);
  const setBeatmapText = useEditorCoreStore(state => state.setBeatmapText);
  const setMetadata = useEditorCoreStore(state => state.setMetadata);
  const setParsedNotes = useEditorCoreStore(state => state.setParsedNotes);
  const setDifficultyNotes = useEditorCoreStore(state => state.setDifficultyNotes);
  const parsedNotes = useEditorCoreStore(state => state.parsedNotes);
  const metadata = useEditorCoreStore(state => state.metadata);
  const setNotes = useGameStore(state => state.setNotes);

  // Parse beatmap text with difficulties
  useEffect(() => {
    isParsingFromTextRef.current = true;
    const allDifficulties = parseBeatmapTextWithDifficulties(beatmapText);
    setDifficultyNotes('EASY', allDifficulties.EASY);
    setDifficultyNotes('MEDIUM', allDifficulties.MEDIUM);
    setDifficultyNotes('HARD', allDifficulties.HARD);
    setParsedNotes(allDifficulties[currentDifficulty]);
    // Reset flag after a brief delay to avoid immediate re-generation
    setTimeout(() => {
      isParsingFromTextRef.current = false;
    }, 100);
  }, [beatmapText, currentDifficulty, setDifficultyNotes, setParsedNotes]);

  // Sync difficulty change
  useEffect(() => {
    const currentDiffNotes = difficultyNotes[currentDifficulty];
    setParsedNotes(currentDiffNotes);
  }, [currentDifficulty, difficultyNotes, setParsedNotes]);

  // Regenerate text when notes are edited via UI (not from text parsing)
  useEffect(() => {
    if (isParsingFromTextRef.current) return;
    const newText = generateBeatmapTextWithDifficulties(metadata, difficultyNotes);
    setBeatmapText(newText);
    
    // Save updated beatmapText to localStorage so iframe can reload correctly
    const existingData = localStorage.getItem('pendingBeatmap');
    const beatmapData = existingData ? JSON.parse(existingData) : {};
    beatmapData.beatmapText = newText;
    localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
  }, [difficultyNotes, metadata, setBeatmapText]);

  // Sync to game store for rendering
  useEffect(() => {
    setNotes(parsedNotes);
  }, [parsedNotes, setNotes]);
}
