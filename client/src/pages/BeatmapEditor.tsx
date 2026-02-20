import { useCallback, useRef, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';
import { useEditorUIStore } from '@/stores/useEditorUIStore';
import { useEditorGraphicsStore } from '@/stores/useEditorGraphicsStore';
import { useVanishingPointStore } from '@/stores/useVanishingPointStore';
import { useShortcutsStore } from '@/stores/useShortcutsStore';
import { audioManager } from '@/lib/audio/audioManager';
import { useYouTubePlayer } from '@/hooks/audio/useYoutubePlayer';
import { useIdleRotationManager } from '@/hooks/effects/animation/useIdleRotation';
import { useEditorKeyboardHandlers } from '@/hooks/editor/useEditorKeyboardHandlers';
import { NoteProcessor } from '@/lib/notes/processors/noteProcessor';
import { NoteValidator } from '@/lib/notes/processors/noteValidator';
import { RotationManager } from '@/lib/managers/rotationManager';
import { GAME_CONFIG } from '@/lib/config/timing';
import { KEY_LANE_MAP } from '@/lib/config/input';
import { CamelotWheel } from '@/components/game/effects/CamelotWheel';
import { YouTubeSetupModal } from '@/components/editor/YouTubeSetupModal';
import { EditorSidebarManager } from '@/components/editor/EditorSidebarManager';
import { BpmTapperModal } from '@/components/editor/BpmTapperModal';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { DurationInputPopup } from '@/components/editor/DurationInputPopup';
import { ConversionToastContainer } from '@/components/editor/ConversionToast';
import { NotePropertiesDialog } from '@/components/editor/NotePropertiesDialog';
import { useShallow } from 'zustand/react/shallow';
import {
  parseBeatmapTextWithDifficulties,
  parseMetadataFromText,
  generateBeatmapTextWithDifficulties,
  validateBeatmap,
} from '@/lib/editor/beatmapTextUtils';
import { Note } from '@/types/game';
import { useBeatmapStore } from '@/stores/useBeatmapStore';
import { useYoutubeStore } from '@/stores/useYoutubeStore';

interface BeatmapEditorProps {
  onBack?: () => void;
  playerInitializedRef: React.RefObject<boolean>;
}

export default function BeatmapEditor({ onBack, playerInitializedRef }: BeatmapEditorProps) {
  const coreStore = useEditorCoreStore(useShallow((state) => ({
    metadata: state.metadata,
    beatmapText: state.beatmapText,
    parsedNotes: state.parsedNotes,
    difficultyNotes: state.difficultyNotes,
    currentDifficulty: state.currentDifficulty,
      setCurrentDifficulty: state.setCurrentDifficulty,
    setMetadata: state.setMetadata,
    setBeatmapText: state.setBeatmapText,
    setParsedNotes: state.setParsedNotes,
    setDifficultyNotes: state.setDifficultyNotes,
    addToHistory: state.addToHistory,
    selectedNoteId: state.selectedNoteId,
    selectedNoteIds: state.selectedNoteIds,
    clearSelection: state.clearSelection,
    toggleNoteSelection: state.toggleNoteSelection,
    setSelectedNoteId: state.setSelectedNoteId,
    hoveredNote: state.hoveredNote,
    setHoveredNote: state.setHoveredNote,
    isEditMode: state.isEditMode,
    setIsEditMode: state.setIsEditMode,
    isPlaying: state.isPlaying,
    setIsPlaying: state.setIsPlaying,
    loopStart: state.loopStart,
    loopEnd: state.loopEnd,
    setLoopStart: state.setLoopStart,
    setLoopEnd: state.setLoopEnd,
    updateMetadata: state.updateMetadata,
    undo: state.undo,
    redo: state.redo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    simulationMode: state.simulationMode,
    setSimulationMode: state.setSimulationMode,
  })));
  const uiStore = useEditorUIStore(useShallow((state) => ({
      panelWidth: state.panelWidth,
    snapEnabled: state.snapEnabled,
    snapDivision: state.snapDivision,
    isResizing: state.isResizing,
    setPanelWidth: state.setPanelWidth,
    setIsResizing: state.setIsResizing,
    setSnapEnabled: state.setSnapEnabled,
      setSnapDivision: state.setSnapDivision,
    isPanelOpen: state.isPanelOpen,
    setIsPanelOpen: state.setIsPanelOpen,
      leftSideCollapsed: state.leftSideCollapsed,
      rightSideCollapsed: state.rightSideCollapsed,
      setLeftSideCollapsed: state.setLeftSideCollapsed,
      setRightSideCollapsed: state.setRightSideCollapsed,
    isDragging: state.isDragging,
    setIsDragging: state.setIsDragging,
    dragStartTime: state.dragStartTime,
    setDragStartTime: state.setDragStartTime,
    dragStartLane: state.dragStartLane,
    setDragStartLane: state.setDragStartLane,
    draggedNoteId: state.draggedNoteId,
    setDraggedNoteId: state.setDraggedNoteId,
    draggedHandle: state.draggedHandle,
    setDraggedHandle: state.setDraggedHandle,
    showBpmTapper: state.showBpmTapper,
    setShowBpmTapper: state.setShowBpmTapper,
    showShortcutsModal: state.showShortcutsModal,
    setShowShortcutsModal: state.setShowShortcutsModal,
      sections: state.sections,
      toggleSectionCollapse: state.toggleSectionCollapse,
      toggleSectionPopout: state.toggleSectionPopout,
      closeSectionCompletely: state.closeSectionCompletely,
      reopenSection: state.reopenSection,
      setSectionSide: state.setSectionSide,
      setSectionFloatPosition: state.setSectionFloatPosition,
  })));
  const graphicsStore = useEditorGraphicsStore(useShallow((state) => ({
    idleMotionEnabled: state.idleMotionEnabled,
    spinEnabled: state.spinEnabled,
    glowEnabled: state.glowEnabled,
    dynamicVPEnabled: state.dynamicVPEnabled,
    zoomEnabled: state.zoomEnabled,
      judgementLinesEnabled: state.judgementLinesEnabled,
      setIdleMotionEnabled: state.setIdleMotionEnabled,
      setSpinEnabled: state.setSpinEnabled,
      setGlowEnabled: state.setGlowEnabled,
      setDynamicVPEnabled: state.setDynamicVPEnabled,
      setZoomEnabled: state.setZoomEnabled,
      setJudgementLinesEnabled: state.setJudgementLinesEnabled,
  })));
  const shortcuts = useShortcutsStore(state => state.bindings);
  const canvasRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isParsingFromTextRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize idle rotation animation (conditional on idleMotionEnabled)
  useIdleRotationManager(graphicsStore.idleMotionEnabled);
  
  // Force re-renders for animation (requestAnimationFrame loop)
  const [, setAnimationFrame] = useState(0);
  
  const currentTime = useGameStore(state => state.currentTime);
  const setCurrentTime = useGameStore(state => state.setCurrentTime);
  const setNotes = useGameStore(state => state.setNotes);
  const tunnelRotation = useGameStore(state => state.tunnelRotation);
  const setTunnelRotation = useGameStore(state => state.setTunnelRotation);
  const setGameState = useGameStore(state => state.setGameState);
  
  const [validationIssues, setValidationIssues] = useState<ReturnType<typeof validateBeatmap>>([]);
  const [durationInputState, setDurationInputState] = useState<{ visible: boolean; lane: number; time: number } | null>(null);
  const [showPropertiesDialog, setShowPropertiesDialog] = useState(false);
  const videoDurationMs = useYoutubeStore(state => state.videoDurationMs);
  const {
    youtubeVideoId,
    beatmapText: persistedBeatmapText,
    setBeatmapText: setPersistedBeatmapText,
    setBeatmapData: setPersistedBeatmapData,
    setYoutubeVideoId,
  } = useBeatmapStore(useShallow((state) => ({
    youtubeVideoId: state.youtubeVideoId,
    beatmapText: state.beatmapText,
    setBeatmapText: state.setBeatmapText,
    setBeatmapData: state.setBeatmapData,
    setYoutubeVideoId: state.setYoutubeVideoId,
  })));
  const [needsYouTubeSetup, setNeedsYouTubeSetup] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Prevent modal flash during initialization

  // Initialize YouTube player for time sync
  const { getVideoTime, seek, play, pause, isReady } = useYouTubePlayer({
    videoId: youtubeVideoId,
    playerInitializedRef,
  });
  
  // Initialize game engine instances for simulation mode
  const validator = useRef(new NoteValidator(GAME_CONFIG)).current;
  const rotationManager = useRef(new RotationManager()).current;
  const processor = useRef(new NoteProcessor(
    GAME_CONFIG,
    validator,
    // Mock scoring manager - we don't need scores in editor simulation
    {
      recordHit: () => ({ score: 0, combo: 0, health: 100, missCount: 0 }),
      recordMiss: () => ({ score: 0, combo: 0, health: 100, missCount: 0 }),
    } as any
  )).current;
  
  // Initialize keyboard handlers for note placement (Q W E I O P)
  const { createHoldNote } = useEditorKeyboardHandlers({
    currentTime,
    parsedNotes: coreStore.parsedNotes,
    snapEnabled: uiStore.snapEnabled,
    snapDivision: uiStore.snapDivision,
    metadata: coreStore.metadata,
    currentDifficulty: coreStore.currentDifficulty,
    isEditorActive: true, // Always active when editor is open
    isEditMode: coreStore.isEditMode,
    setParsedNotes: coreStore.setParsedNotes,
    setDifficultyNotes: coreStore.setDifficultyNotes,
    addToHistory: coreStore.addToHistory,
    setDurationInputState,
  });

  // Load persisted beatmap text on mount
  useEffect(() => {
    try {
        if (persistedBeatmapText && persistedBeatmapText.trim()) {
        const metadata = parseMetadataFromText(persistedBeatmapText);
          coreStore.updateMetadata(metadata);
        coreStore.setBeatmapText(persistedBeatmapText);

        const hasYouTubeFromMetadata = metadata.youtubeUrl && metadata.youtubeUrl.trim();
        const hasYouTubeFromStore = Boolean(youtubeVideoId);

        if (hasYouTubeFromMetadata || hasYouTubeFromStore) {
          setNeedsYouTubeSetup(false);
        } else {
          setNeedsYouTubeSetup(true);
        }
      } else if (youtubeVideoId) {
        setNeedsYouTubeSetup(false);
      } else {
        setNeedsYouTubeSetup(true);
      }
    } catch (e) {
      console.error('[EDITOR] Failed to load beatmapText from store:', e);
      setNeedsYouTubeSetup(true);
    }

    setTimeout(() => setIsInitializing(false), 100);
  }, []);

  // Set game state to PAUSED so notes render (like paused gameplay)
  useEffect(() => {
    setGameState('PAUSED');
    return () => {
      setGameState('IDLE');
    };
  }, [setGameState]);
  
  // Animation loop for dynamic visuals (zoom, spin, vanishing point, etc.)
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Track editor container size changes
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        if (height < 500) {
          // Container height unexpectedly low - may affect layout
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Track canvas ref size changes for layout validation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      // Canvas resized - updates tracked for layout validation
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Dynamic vanishing point: smooth circular motion for 3D perspective wobble
  const setVPOffset = useVanishingPointStore(state => state.setVPOffset);
  
  useEffect(() => {
    // Only run if idle motion is enabled
    if (!graphicsStore.idleMotionEnabled) {
      // Reset to center when disabled
      setVPOffset({ x: 0, y: 0 });
      return;
    }
    
    const VP_AMPLITUDE = 15; // ±15px offset from center
    const VP_CYCLE_DURATION = 8000; // 8 seconds per full cycle
    const VP_UPDATE_INTERVAL = 16; // ~60fps
    
    const intervalId = setInterval(() => {
      const elapsed = Date.now() % VP_CYCLE_DURATION;
      const progress = elapsed / VP_CYCLE_DURATION; // 0 to 1
      
      // Smooth circular motion using sine/cosine
      const angle = progress * Math.PI * 2; // 0 to 2π
      const x = Math.cos(angle) * VP_AMPLITUDE;
      const y = Math.sin(angle) * VP_AMPLITUDE;
      
      setVPOffset({ x, y });
    }, VP_UPDATE_INTERVAL);
    
    return () => {
      clearInterval(intervalId);
      setVPOffset({ x: 0, y: 0 }); // Reset on unmount
    };
  }, [graphicsStore.idleMotionEnabled, setVPOffset]);

  // Extract YouTube video ID from metadata
  useEffect(() => {
    if (isInitializing) return;

    const rawUrl = coreStore.metadata.youtubeUrl?.trim();

    if (!rawUrl) {
      setNeedsYouTubeSetup(true);
      return;
    }

    let extractedVideoId: string | null = null;
    const match = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);

    if (match) {
      extractedVideoId = match[1];
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(rawUrl)) {
      extractedVideoId = rawUrl;
    }

    if (!extractedVideoId) {
      setNeedsYouTubeSetup(true);
      return;
    }

    if (extractedVideoId !== youtubeVideoId) {
      setYoutubeVideoId(extractedVideoId);
      setPersistedBeatmapData({ youtubeVideoId: extractedVideoId });
    }

    setNeedsYouTubeSetup(false);
  }, [
    coreStore.metadata.youtubeUrl,
    isInitializing,
    setPersistedBeatmapData,
    setYoutubeVideoId,
    youtubeVideoId,
  ]);

  // Handle YouTube setup
  const handleYouTubeSetup = useCallback((videoId: string) => {
    setYoutubeVideoId(videoId);
    coreStore.updateMetadata({ youtubeUrl: `https://youtube.com/watch?v=${videoId}` });
    setNeedsYouTubeSetup(false);
    setPersistedBeatmapData({ youtubeVideoId: videoId });
  }, [coreStore.updateMetadata, setPersistedBeatmapData, setYoutubeVideoId]);

  // Handle play/pause from user gesture (required by YouTube)
  const handlePlay = useCallback(async () => {
    if (!isReady || !play) return;
    try {
      const maxPlaybackTime = videoDurationMs || coreStore.metadata.beatmapEnd;
      let playbackTime = currentTime;
      
      // If we're at or near the end, restart from the beginning
      if (currentTime >= maxPlaybackTime - 100) { // 100ms threshold
        playbackTime = coreStore.metadata.beatmapStart || 0;
        setCurrentTime(playbackTime);
      }
      
      // Set playing state BEFORE seeking/playing
      coreStore.setIsPlaying(true);
      
      // Seek YouTube to current editor time before playing
      if (seek) {
        await seek(playbackTime / 1000); // Convert ms to seconds
      }
      await play();
    } catch (err) {
      console.error('[EDITOR] YouTube play failed:', err);
    }
  }, [isReady, play, seek, currentTime, videoDurationMs, coreStore.metadata.beatmapStart, coreStore.metadata.beatmapEnd, coreStore.setIsPlaying, setCurrentTime]);

  const handlePause = useCallback(async () => {
    if (!isReady || !pause) return;
    try {
      await pause();
    } catch (err) {
      console.error('[EDITOR] YouTube pause failed:', err);
    }
  }, [isReady, pause]);

  // Handle duration input popup
  const handleDurationConfirm = useCallback((duration: number) => {
    if (!durationInputState) return;
    createHoldNote(durationInputState.lane, durationInputState.time, duration);
    setDurationInputState(null);
  }, [durationInputState, createHoldNote]);

  const handleDurationCancel = useCallback(() => {
    // Cancel creates TAP instead - keyboard handler already created TAP on quick release
    setDurationInputState(null);
  }, []);

  // Panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!uiStore.isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        uiStore.setPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => uiStore.setIsResizing(false);

    if (uiStore.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [uiStore.isResizing, uiStore.setPanelWidth, uiStore.setIsResizing]);

  // Parse beatmap text with difficulties
  useEffect(() => {
    isParsingFromTextRef.current = true;
    const allDifficulties = parseBeatmapTextWithDifficulties(coreStore.beatmapText);
    coreStore.setDifficultyNotes('EASY', allDifficulties.EASY);
    coreStore.setDifficultyNotes('MEDIUM', allDifficulties.MEDIUM);
    coreStore.setDifficultyNotes('HARD', allDifficulties.HARD);
    coreStore.setParsedNotes(allDifficulties[coreStore.currentDifficulty]);
    // Reset flag after a brief delay to avoid immediate re-generation
    setTimeout(() => {
      isParsingFromTextRef.current = false;
    }, 100);
  }, [coreStore.beatmapText, coreStore.currentDifficulty, coreStore.setDifficultyNotes, coreStore.setParsedNotes]);

  // Sync difficulty change
  useEffect(() => {
    const currentDiffNotes = coreStore.difficultyNotes[coreStore.currentDifficulty];
    coreStore.setParsedNotes(currentDiffNotes);
  }, [coreStore.currentDifficulty, coreStore.difficultyNotes, coreStore.setParsedNotes]);

  // Regenerate text when notes are edited via UI (not from text parsing)
  useEffect(() => {
    if (isParsingFromTextRef.current) return;
    const newText = generateBeatmapTextWithDifficulties(coreStore.metadata, coreStore.difficultyNotes);
    coreStore.setBeatmapText(newText);
    setPersistedBeatmapText(newText);
  }, [coreStore.difficultyNotes, coreStore.metadata, coreStore.setBeatmapText, setPersistedBeatmapText]);

  // Sync to game store for rendering
  useEffect(() => {
    setNotes(coreStore.parsedNotes);
  }, [coreStore.parsedNotes, setNotes]);

  // Control tunnel rotation based on spinEnabled - continuous rotation like in gameplay
  useEffect(() => {
    if (!graphicsStore.spinEnabled) {
      setTunnelRotation(0);
      return;
    }
    
    // Continuous rotation effect (360 degrees every 8 seconds)
    const ROTATION_SPEED = 360 / 8000; // degrees per ms
    let lastTime = Date.now();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      
      setTunnelRotation((tunnelRotation + (ROTATION_SPEED * delta)) % 360);
    }, 16); // ~60fps
    
    return () => clearInterval(interval);
  }, [graphicsStore.spinEnabled, setTunnelRotation]);

  // Delete selected notes
  const deleteSelectedNote = useCallback(() => {
    if (coreStore.selectedNoteIds.length > 0 || coreStore.selectedNoteId) {
      coreStore.addToHistory(coreStore.parsedNotes);
      const idsToDelete = coreStore.selectedNoteIds.length > 0 
        ? coreStore.selectedNoteIds 
        : [coreStore.selectedNoteId!];
      const newNotes = coreStore.parsedNotes.filter(n => !idsToDelete.includes(n.id));
      coreStore.setParsedNotes(newNotes);
      coreStore.setDifficultyNotes(coreStore.currentDifficulty, newNotes);
      coreStore.clearSelection();
      audioManager.play('difficultySettingsApply');
    }
  }, [
    coreStore.selectedNoteIds,
    coreStore.selectedNoteId,
    coreStore.parsedNotes,
    coreStore.addToHistory,
    coreStore.setParsedNotes,
    coreStore.setDifficultyNotes,
    coreStore.currentDifficulty,
  ]);

  // Toggle note type (TAP <-> HOLD)
  const toggleNoteType = useCallback(() => {
    const selectedIds = coreStore.selectedNoteIds.length > 0 
      ? coreStore.selectedNoteIds 
      : coreStore.selectedNoteId ? [coreStore.selectedNoteId] : [];
    
    if (selectedIds.length === 0) return;
    
    coreStore.addToHistory(coreStore.parsedNotes);
    const newNotes = coreStore.parsedNotes.map(note => {
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
    
    coreStore.setParsedNotes(newNotes);
    coreStore.setDifficultyNotes(coreStore.currentDifficulty, newNotes);
    audioManager.play('tapHit');
  }, [
    coreStore.addToHistory,
    coreStore.parsedNotes,
    coreStore.setParsedNotes,
    coreStore.setDifficultyNotes,
    coreStore.currentDifficulty,
  ]);

  // Handle note properties update
  const handlePropertiesUpdate = useCallback((updates: Array<{ id: string; changes: Partial<Note> }>) => {
    coreStore.addToHistory(coreStore.parsedNotes);
    const newNotes = coreStore.parsedNotes.map(note => {
      const update = updates.find(u => u.id === note.id);
      return update ? { ...note, ...update.changes } : note;
    });
    coreStore.setParsedNotes(newNotes);
    coreStore.setDifficultyNotes(coreStore.currentDifficulty, newNotes);
  }, [
    coreStore.addToHistory,
    coreStore.parsedNotes,
    coreStore.setParsedNotes,
    coreStore.setDifficultyNotes,
    coreStore.currentDifficulty,
  ]);

  // Select nearest note in a specific lane
  const selectNoteInLane = useCallback((lane: number) => {
    const notesInLane = coreStore.parsedNotes.filter(n => n.lane === lane);
    if (notesInLane.length === 0) {
      audioManager.play('noteMiss');
      return;
    }

    const closestNote = notesInLane.reduce((closest, note) => {
      const currentDist = Math.abs(note.time - currentTime);
      const closestDist = Math.abs(closest.time - currentTime);
      return currentDist < closestDist ? note : closest;
    });

    coreStore.clearSelection();
    coreStore.setSelectedNoteId(closestNote.id);
    coreStore.toggleNoteSelection(closestNote.id);

    setCurrentTime(closestNote.time);

    audioManager.play('tapHit');
  }, [
    coreStore.parsedNotes,
    coreStore.clearSelection,
    coreStore.setSelectedNoteId,
    coreStore.toggleNoteSelection,
    currentTime,
    setCurrentTime,
  ]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(coreStore.beatmapText);
    audioManager.play('difficultySettingsApply');
  }, [coreStore.beatmapText]);

  const downloadBeatmap = useCallback(() => {
    const blob = new Blob([coreStore.beatmapText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${coreStore.metadata.title || 'beatmap'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    audioManager.play('difficultySettingsApply');
  }, [coreStore.beatmapText, coreStore.metadata.title]);

  // Check if shortcut matches current key event
  const matchesShortcut = useCallback((e: KeyboardEvent, shortcutId: string): boolean => {
    const binding = shortcuts.find(s => s.id === shortcutId);
    if (!binding) return false;
    
    const keyMatches = e.key.toLowerCase() === binding.currentKey.toLowerCase();
    const ctrlMatches = !!e.ctrlKey === !!binding.ctrlRequired;
    const shiftMatches = !!e.shiftKey === !!binding.shiftRequired;
    const altMatches = !!e.altKey === !!binding.altRequired;
    
    return keyMatches && ctrlMatches && shiftMatches && altMatches;
  }, [shortcuts]);

  // Simulation mode keyboard input handlers
  useEffect(() => {
    if (!coreStore.simulationMode) return;

    const handleSimulationKeyDown = (e: KeyboardEvent) => {
      // Ignore repeat events
      if (e.repeat) return;

      const lane = KEY_LANE_MAP[e.key];
      if (lane === undefined) return;

      e.preventDefault();

      // Get current state
      const notes = coreStore.parsedNotes;
      
      // For decks (Q/P), just play sound - SPIN notes handled by engine
      if (lane === -1 || lane === -2) {
        audioManager.play('spinNote');
        return;
      }

      // For lanes 0-3: Try HOLD first, then TAP
      const holdNote = validator.findPressableHoldNote(notes, lane, currentTime, GAME_CONFIG.LEAD_TIME);
      if (holdNote) {
        // Start holding
        const result = processor.processHoldStart(holdNote, currentTime);
        const updatedNotes = notes.map(n => n.id === holdNote.id ? result.updatedNote : n);
        coreStore.setParsedNotes(updatedNotes);
        coreStore.setDifficultyNotes(coreStore.currentDifficulty, updatedNotes);
        
        if (result.success) {
          audioManager.play('tapHit');
        } else {
          audioManager.play('noteMiss');
        }
        return;
      }

      // Try TAP
      const tapNote = validator.findClosestActiveNote(notes, lane, 'TAP', currentTime);
      if (tapNote) {
        const result = processor.processTapHit(tapNote, currentTime);
        const updatedNotes = notes.map(n => n.id === tapNote.id ? result.updatedNote : n);
        coreStore.setParsedNotes(updatedNotes);
        coreStore.setDifficultyNotes(coreStore.currentDifficulty, updatedNotes);
        
        if (result.success) {
          audioManager.play('tapHit');
        } else {
          audioManager.play('noteMiss');
        }
      }
    };

    const handleSimulationKeyUp = (e: KeyboardEvent) => {
      const lane = KEY_LANE_MAP[e.key];
      if (lane === undefined || lane < 0) return;

      e.preventDefault();

      // Release HOLD note
      const notes = coreStore.parsedNotes;
      const holdNote = validator.findActiveHoldNote(notes, lane, currentTime);
      if (holdNote && holdNote.pressHoldTime) {
        const result = processor.processHoldEnd(holdNote, currentTime);
        const updatedNotes = notes.map(n => n.id === holdNote.id ? result.updatedNote : n);
        coreStore.setParsedNotes(updatedNotes);
        coreStore.setDifficultyNotes(coreStore.currentDifficulty, updatedNotes);
        
        if (result.success) {
          audioManager.play('tapHit');
        } else {
          audioManager.play('noteMiss');
        }
      }
    };

    window.addEventListener('keydown', handleSimulationKeyDown);
    window.addEventListener('keyup', handleSimulationKeyUp);

    return () => {
      window.removeEventListener('keydown', handleSimulationKeyDown);
      window.removeEventListener('keyup', handleSimulationKeyUp);
    };
  }, [coreStore.simulationMode, coreStore.parsedNotes, coreStore.currentDifficulty, currentTime, validator, processor]);

  // Keyboard shortcuts
  useEffect(() => {
    const {
      undo,
      redo,
      selectedNoteId,
      selectedNoteIds,
      setIsPlaying,
      isPlaying,
      setIsEditMode,
      isEditMode,
      clearSelection,
    } = coreStore;
    const { setSnapEnabled, snapEnabled } = uiStore;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // In simulation mode, skip note editing shortcuts but allow playback/UI controls
      const GAMEPLAY_KEYS = ['q', 'Q', 'w', 'W', 'e', 'E', 'i', 'I', 'o', 'O', 'p', 'P'];
      const isGameplayKey = GAMEPLAY_KEYS.includes(e.key);
      
      // Skip lane selection shortcuts during simulation (they conflict with gameplay)
      if (coreStore.simulationMode && (
        matchesShortcut(e, 'selectLane0') ||
        matchesShortcut(e, 'selectLane1') ||
        matchesShortcut(e, 'selectLane2') ||
        matchesShortcut(e, 'selectLane3') ||
        matchesShortcut(e, 'selectLaneNeg1') ||
        matchesShortcut(e, 'selectLaneNeg2')
      )) {
        return; // Block lane selection shortcuts during simulation
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
      if (matchesShortcut(e, 'deleteNote') && selectedNoteId && !isInputField) {
        e.preventDefault();
        deleteSelectedNote();
        return;
      }
      
      // Play/Pause
      if (matchesShortcut(e, 'playPause') && !isInputField) {
        e.preventDefault();
        setIsPlaying(!isPlaying);
        return;
      }
      
      // Toggle Edit Mode
      if (matchesShortcut(e, 'toggleEditor') && !isInputField) {
        e.preventDefault();
        setIsEditMode(!isEditMode);
        audioManager.play('tapHit');
        return;
      }
      
      // Toggle Snap
      if (matchesShortcut(e, 'toggleSnap') && !isInputField && !e.ctrlKey) {
        e.preventDefault();
        setSnapEnabled(!snapEnabled);
        audioManager.play('tapHit');
        return;
      }
      
      // Deselect All
      if (matchesShortcut(e, 'deselectAll') && !isInputField) {
        e.preventDefault();
        clearSelection();
        return;
      }
      
      // Toggle Note Type
      if (matchesShortcut(e, 'toggleNoteType') && !isInputField) {
        e.preventDefault();
        toggleNoteType();
        return;
      }
      
      // Edit Properties
      if (matchesShortcut(e, 'editProperties') && !isInputField) {
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
      
      // Seek shortcuts (only when not in input fields)
      if (!isInputField) {
        if (matchesShortcut(e, 'seekBackward1')) {
          e.preventDefault();
          setCurrentTime(Math.max(0, currentTime - 1000));
          return;
        }
        if (matchesShortcut(e, 'seekForward1')) {
          e.preventDefault();
          setCurrentTime(currentTime + 1000);
          return;
        }
        if (matchesShortcut(e, 'seekBackward5')) {
          e.preventDefault();
          setCurrentTime(Math.max(0, currentTime - 5000));
          return;
        }
        if (matchesShortcut(e, 'seekForward5')) {
          e.preventDefault();
          setCurrentTime(currentTime + 5000);
          return;
        }
      }
      
      // Lane selection shortcuts (only when not in input fields)
      if (!isInputField) {
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
    coreStore.undo,
    coreStore.redo,
    coreStore.selectedNoteId,
    coreStore.selectedNoteIds,
    coreStore.setIsPlaying,
    coreStore.isPlaying,
    coreStore.setIsEditMode,
    coreStore.isEditMode,
    coreStore.clearSelection,
    uiStore.setSnapEnabled,
    uiStore.snapEnabled,
    deleteSelectedNote,
    toggleNoteType,
    matchesShortcut,
    selectNoteInLane,
    copyToClipboard,
    downloadBeatmap,
    currentTime,
    setCurrentTime,
    setShowPropertiesDialog,
  ]);

  // Playhead animation - sync with YouTube when playing
  useEffect(() => {
    if (!coreStore.isPlaying) return;
    
    const interval = setInterval(() => {
      // Get time from YouTube if available, otherwise use manual increment
      const videoTime = isReady ? getVideoTime() : null;
      const next = videoTime !== null ? videoTime : currentTime + 16;
      const maxPlaybackTime = videoDurationMs || coreStore.metadata.beatmapEnd;
      
      if (coreStore.loopEnd && next >= coreStore.loopEnd) {
        const loopStart = coreStore.loopStart || coreStore.metadata.beatmapStart;
        setCurrentTime(loopStart);
        if (isReady && seek) {
          seek(loopStart / 1000); // Convert ms to seconds
        }
      } else if (next >= maxPlaybackTime) {
        // Stop playback when reaching the end of the video
        coreStore.setIsPlaying(false);
        setCurrentTime(maxPlaybackTime);
        if (pause) {
          pause();
        }
      } else {
        setCurrentTime(next);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [
    coreStore.isPlaying,
    coreStore.loopStart,
    coreStore.loopEnd,
    coreStore.metadata,
    coreStore.setIsPlaying,
    currentTime,
    setCurrentTime,
    isReady,
    getVideoTime,
    seek,
    pause,
    videoDurationMs,
  ]);

  // Sync YouTube player when currentTime changes manually (not during playback)
  const lastSyncedTimeRef = useRef(0);
  useEffect(() => {
    if (!coreStore.isPlaying && isReady && seek && Math.abs(currentTime - lastSyncedTimeRef.current) > 100) {
      seek(currentTime / 1000); // Convert ms to seconds
      lastSyncedTimeRef.current = currentTime;
    }
  }, [currentTime, coreStore.isPlaying, isReady, seek]);

  // Update metadata from text
  const updateFromText = useCallback((text: string) => {
    const extractedMetadata = parseMetadataFromText(text);
    coreStore.updateMetadata(extractedMetadata);
  }, [coreStore.updateMetadata]);

  // Validate beatmap
  useEffect(() => {
    const issues = validateBeatmap(coreStore.parsedNotes, coreStore.metadata);
    setValidationIssues(issues);
  }, [coreStore.parsedNotes, coreStore.metadata]);

  return (
    <div className="fixed inset-0">
      {/* Semi-transparent overlay to show YouTube iframe behind */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none z-0" />
      
      {/* YouTube Setup Modal */}
      {needsYouTubeSetup && (
        <YouTubeSetupModal 
          onSubmit={handleYouTubeSetup}
          onSkip={() => setNeedsYouTubeSetup(false)}
        />
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-black/95 backdrop-blur-md border-b border-neon-cyan/30">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded hover:bg-neon-cyan/10 transition-colors font-rajdhani"
        >
          <ChevronLeft className="w-5 h-5" />
          BACK
        </button>
        <button
          onClick={() => {
            coreStore.setSimulationMode(!coreStore.simulationMode);
            if (coreStore.simulationMode) {
              // Exiting simulation mode - stop playing
              coreStore.setIsPlaying(false);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors font-rajdhani font-bold ${
            coreStore.simulationMode
              ? 'bg-neon-pink border border-neon-pink text-black'
              : 'bg-neon-cyan border border-neon-cyan text-black hover:bg-neon-cyan/80'
          }`}
        >
          {coreStore.simulationMode ? 'EXIT' : 'START'} SIMULATION
        </button>
      </div>

      {/* Editor Canvas - Centered layout matching game */}
      <div 
        ref={editorContainerRef} 
        className="absolute inset-0 flex flex-col z-10"
      >
        {/* Spacer for top bar */}
        <div className="h-[72px]" />
        
        {/* Simulation mode warning banner */}
        {coreStore.simulationMode && (
          <div className="absolute top-[72px] left-0 right-0 z-50 bg-yellow-600/90 backdrop-blur-sm border-b-2 border-yellow-500 px-4 py-2">
            <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
              <span className="text-yellow-100 text-sm font-rajdhani font-bold">
                ⚠️ SIMULATION MODE (INCOMPLETE):
              </span>
              <span className="text-yellow-50 text-sm font-rajdhani">
                Missing auto-fail, health depletion, and game-over logic. Use Game page for accurate testing.
              </span>
            </div>
          </div>
        )}
        
        {/* Main editor area - centered */}
        <div className="flex-1 relative flex items-center justify-center">
          {/* Decks - positioned relative to viewport during simulation */}
          {coreStore.simulationMode && (
            <>
              <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50">
                <CamelotWheel side="left" onSpin={() => {}} />
              </div>
              <div className="absolute right-8 top-1/2 -translate-y-1/2 z-50">
                <CamelotWheel side="right" onSpin={() => {}} />
              </div>
            </>
          )}
          
          <EditorCanvas
            canvasRef={canvasRef}
            currentTime={currentTime}
            parsedNotes={coreStore.parsedNotes}
            metadata={coreStore.metadata}
            isEditMode={coreStore.isEditMode}
            snapEnabled={uiStore.snapEnabled}
            snapDivision={uiStore.snapDivision}
            hoveredNote={coreStore.hoveredNote}
            setHoveredNote={coreStore.setHoveredNote}
            selectedNoteId={coreStore.selectedNoteId}
            setSelectedNoteId={coreStore.setSelectedNoteId}
            selectedNoteIds={coreStore.selectedNoteIds}
            toggleNoteSelection={coreStore.toggleNoteSelection}
            clearSelection={coreStore.clearSelection}
            addToHistory={coreStore.addToHistory}
            setParsedNotes={coreStore.setParsedNotes}
            setDifficultyNotes={coreStore.setDifficultyNotes}
            currentDifficulty={coreStore.currentDifficulty}
            isDragging={uiStore.isDragging}
            setIsDragging={uiStore.setIsDragging}
            dragStartTime={uiStore.dragStartTime}
            setDragStartTime={uiStore.setDragStartTime}
            dragStartLane={uiStore.dragStartLane}
            setDragStartLane={uiStore.setDragStartLane}
            draggedNoteId={uiStore.draggedNoteId}
            setDraggedNoteId={uiStore.setDraggedNoteId}
            draggedHandle={uiStore.draggedHandle}
            setDraggedHandle={uiStore.setDraggedHandle}
            glowEnabled={graphicsStore.glowEnabled}
            dynamicVPEnabled={graphicsStore.dynamicVPEnabled}
            zoomEnabled={graphicsStore.zoomEnabled}
            judgementLinesEnabled={graphicsStore.judgementLinesEnabled}
            spinEnabled={graphicsStore.spinEnabled}
            isPlaying={coreStore.isPlaying}
            simulationMode={coreStore.simulationMode}
          />
        </div>
      </div>

      {/* Sidebar - hidden during simulation */}
      {!coreStore.simulationMode && (
        <EditorSidebarManager
        {...coreStore}
        {...uiStore}
        {...graphicsStore}
        canUndo={coreStore.canUndo}
        canRedo={coreStore.canRedo}
        deleteSelectedNote={deleteSelectedNote}
        copyToClipboard={copyToClipboard}
        downloadBeatmap={downloadBeatmap}
        updateFromText={updateFromText}
        validationIssues={validationIssues}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        onPlay={handlePlay}
        onPause={handlePause}
        resizeRef={resizeRef}
        videoDurationMs={videoDurationMs}
      />
      )}

      {/* Modals */}
      <AnimatePresence>
        {uiStore.showBpmTapper && (
          <BpmTapperModal
            onClose={() => uiStore.setShowBpmTapper(false)}
            onBpmDetected={(bpm) => coreStore.updateMetadata({ bpm })}
          />
        )}
        {uiStore.showShortcutsModal && (
          <ShortcutsModal onClose={() => uiStore.setShowShortcutsModal(false)} />
        )}
        {showPropertiesDialog && (
          <NotePropertiesDialog
            notes={coreStore.parsedNotes}
            selectedNoteIds={
              coreStore.selectedNoteIds.length > 0 
                ? coreStore.selectedNoteIds 
                : coreStore.selectedNoteId ? [coreStore.selectedNoteId] : []
            }
            onClose={() => setShowPropertiesDialog(false)}
            onUpdate={handlePropertiesUpdate}
          />
        )}
      </AnimatePresence>

      {/* Duration Input Popup for HOLD note creation */}
      <DurationInputPopup
        visible={durationInputState?.visible || false}
        lane={durationInputState?.lane || 0}
        time={durationInputState?.time || 0}
        onConfirm={handleDurationConfirm}
        onCancel={handleDurationCancel}
      />
      
      {/* Conversion Feedback Toasts */}
      <ConversionToastContainer />
    </div>
  );
}
