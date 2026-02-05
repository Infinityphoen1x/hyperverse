import { useEffect, useRef } from 'react';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';
import { useGameStore } from '@/stores/useGameStore';
import { useBeatmapStore } from '@/stores/useBeatmapStore';
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
  const updateMetadata = useEditorCoreStore(state => state.updateMetadata);
  const setParsedNotes = useEditorCoreStore(state => state.setParsedNotes);
  const setDifficultyNotes = useEditorCoreStore(state => state.setDifficultyNotes);
  const parsedNotes = useEditorCoreStore(state => state.parsedNotes);
  const metadata = useEditorCoreStore(state => state.metadata);
  const setNotes = useGameStore(state => state.setNotes);
  
  // Get the persisted beatmap store setter
  const setBeatmapTextPersisted = useBeatmapStore(state => state.setBeatmapText);

  // Parse beatmap text with difficulties and metadata
  useEffect(() => {
    if (!beatmapText || beatmapText.trim() === '') return;
    
    // console.log('[useEditorBeatmapSync] Parsing beatmap text, length:', beatmapText.length);
    isParsingFromTextRef.current = true;
    
    // Parse metadata from text
    const extractedMetadata = parseMetadataFromText(beatmapText);
    // console.log('[useEditorBeatmapSync] Extracted metadata:', extractedMetadata);
    updateMetadata(extractedMetadata);
    
    // Parse notes
    const allDifficulties = parseBeatmapTextWithDifficulties(beatmapText);
    setDifficultyNotes('EASY', allDifficulties.EASY);
    setDifficultyNotes('MEDIUM', allDifficulties.MEDIUM);
    setDifficultyNotes('HARD', allDifficulties.HARD);
    setParsedNotes(allDifficulties[currentDifficulty]);
    // console.log('[useEditorBeatmapSync] Parsed notes for', currentDifficulty, ':', allDifficulties[currentDifficulty].length, 'notes');
    
    // Reset flag after a brief delay to avoid immediate re-generation
    setTimeout(() => {
      isParsingFromTextRef.current = false;
    }, 100);
  }, [beatmapText, currentDifficulty, updateMetadata, setDifficultyNotes, setParsedNotes]);

  // Sync difficulty change
  useEffect(() => {
    const currentDiffNotes = difficultyNotes[currentDifficulty];
    setParsedNotes(currentDiffNotes);
  }, [currentDifficulty, difficultyNotes, setParsedNotes]);

  // Regenerate text when notes are edited via UI (not from text parsing)
  useEffect(() => {
    if (isParsingFromTextRef.current) return;
    
    // Don't regenerate if we have no actual data (empty metadata + no notes)
    // This prevents overwriting localStorage on mount before it loads
    const hasNoData = 
      !metadata.title && 
      !metadata.artist && 
      !metadata.youtubeUrl &&
      difficultyNotes.EASY.length === 0 &&
      difficultyNotes.MEDIUM.length === 0 &&
      difficultyNotes.HARD.length === 0;
    
    if (hasNoData) return;
    
    const newText = generateBeatmapTextWithDifficulties(metadata, difficultyNotes);
    setBeatmapText(newText);
  }, [difficultyNotes, metadata, setBeatmapText]);

  // Save beatmapText to localStorage via useBeatmapStore (which uses Zustand persist)
  useEffect(() => {
    if (!beatmapText || beatmapText.trim() === '') return;
    
    // console.log('[useEditorBeatmapSync] Saving beatmapText to useBeatmapStore, length:', beatmapText.length);
    setBeatmapTextPersisted(beatmapText);
  }, [beatmapText, setBeatmapTextPersisted]);

  // Sync to game store for rendering
  useEffect(() => {
    setNotes(parsedNotes);
  }, [parsedNotes, setNotes]);
}
