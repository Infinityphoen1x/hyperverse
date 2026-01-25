import { useCallback, useRef, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';
import { useEditorUIStore } from '@/stores/useEditorUIStore';
import { useEditorGraphicsStore } from '@/stores/useEditorGraphicsStore';
import { useVanishingPointStore } from '@/stores/useVanishingPointStore';
import { audioManager } from '@/lib/audio/audioManager';
import { useYouTubePlayer } from '@/hooks/useYoutubePlayer';
import { useIdleRotationManager } from '@/hooks/useIdleRotation';
import { YouTubeSetupModal } from '@/components/editor/YouTubeSetupModal';
import { EditorSidebarManager } from '@/components/editor/EditorSidebarManager';
import { BpmTapperModal } from '@/components/editor/BpmTapperModal';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import {
  parseBeatmapTextWithDifficulties,
  parseMetadataFromText,
  generateBeatmapTextWithDifficulties,
  validateBeatmap,
} from '@/lib/editor/beatmapTextUtils';

export default function BeatmapEditor({ onBack }: { onBack?: () => void }) {
  const coreStore = useEditorCoreStore();
  const uiStore = useEditorUIStore();
  const graphicsStore = useEditorGraphicsStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isParsingFromTextRef = useRef(false);
  const playerInitializedRef = useRef(false);
  
  // Initialize idle rotation animation (conditional on idleMotionEnabled)
  useIdleRotationManager(graphicsStore.idleMotionEnabled);
  
  // Force re-renders for animation (requestAnimationFrame loop)
  const [, setAnimationFrame] = useState(0);
  
  const currentTime = useGameStore(state => state.currentTime);
  const setCurrentTime = useGameStore(state => state.setCurrentTime);
  const setNotes = useGameStore(state => state.setNotes);
  const setTunnelRotation = useGameStore(state => state.setTunnelRotation);
  const setGameState = useGameStore(state => state.setGameState);
  
  const [validationIssues, setValidationIssues] = useState<ReturnType<typeof validateBeatmap>>([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(() => {
    // Initialize from localStorage on mount
    const pendingBeatmap = localStorage.getItem('pendingBeatmap');
    if (pendingBeatmap) {
      try {
        const data = JSON.parse(pendingBeatmap);
        console.log('[EDITOR] Initial videoId from localStorage:', data.youtubeVideoId);
        return data.youtubeVideoId || null;
      } catch (e) {
        console.error('[EDITOR] Failed to parse pendingBeatmap:', e);
      }
    }
    return null;
  });
  const [needsYouTubeSetup, setNeedsYouTubeSetup] = useState(false);

  // Initialize YouTube player for time sync
  const { getVideoTime, seek, play, pause, isReady } = useYouTubePlayer({
    videoId: youtubeVideoId,
    playerInitializedRef,
  });
  
  console.log('[EDITOR] Current youtubeVideoId state:', youtubeVideoId, 'isReady:', isReady);

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
  
  // Dynamic vanishing point: smooth circular motion for 3D perspective wobble
  useEffect(() => {
    // Only run if idle motion is enabled
    if (!graphicsStore.idleMotionEnabled) {
      // Reset to center when disabled
      const setVPOffset = useVanishingPointStore.getState().setVPOffset;
      setVPOffset({ x: 0, y: 0 });
      return;
    }
    
    const setVPOffset = useVanishingPointStore.getState().setVPOffset;
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
  }, [graphicsStore.idleMotionEnabled]);

  // Extract YouTube video ID from metadata
  useEffect(() => {
    if (coreStore.metadata.youtubeUrl) {
      const match = coreStore.metadata.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);  
      if (match) {
        const videoId = match[1];
        setYoutubeVideoId(videoId);
        setNeedsYouTubeSetup(false);
        
        // Update localStorage so App.tsx initializes the player
        const pendingBeatmap = localStorage.getItem('pendingBeatmap');
        const beatmapData = pendingBeatmap ? JSON.parse(pendingBeatmap) : {};
        beatmapData.youtubeVideoId = videoId;
        localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
        
        // Trigger player update
        window.dispatchEvent(new CustomEvent('beatmapUpdate'));
      } else {
        setNeedsYouTubeSetup(true);
      }
    } else {
      setNeedsYouTubeSetup(true);
    }
  }, [coreStore.metadata.youtubeUrl]);

  // Handle YouTube setup
  const handleYouTubeSetup = useCallback((videoId: string) => {
    console.log('[EDITOR] YouTube setup - videoId:', videoId);
    setYoutubeVideoId(videoId);
    coreStore.updateMetadata({ youtubeUrl: `https://youtube.com/watch?v=${videoId}` });
    setNeedsYouTubeSetup(false);
    
    // Update localStorage so App.tsx initializes the player
    const beatmapData = { youtubeVideoId: videoId };
    localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
    console.log('[EDITOR] Set pendingBeatmap in localStorage:', beatmapData);
    
    // Trigger a re-render of YouTube player by dispatching event
    window.dispatchEvent(new CustomEvent('beatmapUpdate'));
    console.log('[EDITOR] Dispatched beatmapUpdate event');
  }, [coreStore]);

  // Handle play/pause from user gesture (required by YouTube)
  const handlePlay = useCallback(async () => {
    if (!isReady || !play) return;
    try {
      await play();
      console.log('[EDITOR] YouTube play triggered');
    } catch (err) {
      console.error('[EDITOR] YouTube play failed:', err);
    }
  }, [isReady, play]);

  const handlePause = useCallback(async () => {
    if (!isReady || !pause) return;
    try {
      await pause();
      console.log('[EDITOR] YouTube pause triggered');
    } catch (err) {
      console.error('[EDITOR] YouTube pause failed:', err);
    }
  }, [isReady, pause]);

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
  }, [coreStore.difficultyNotes, coreStore.metadata, coreStore.setBeatmapText]);

  // Sync to game store for rendering
  useEffect(() => {
    setNotes(coreStore.parsedNotes);
  }, [coreStore.parsedNotes, setNotes]);

  // Control tunnel rotation based on spinEnabled
  useEffect(() => {
    if (!graphicsStore.spinEnabled) {
      setTunnelRotation(0);
    }
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
  }, [coreStore]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        coreStore.undo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        coreStore.redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && coreStore.selectedNoteId && !isInputField) {
        e.preventDefault();
        deleteSelectedNote();
      }
      if (e.key === ' ' && !isInputField) {
        e.preventDefault();
        coreStore.setIsPlaying(!coreStore.isPlaying);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [coreStore, uiStore, deleteSelectedNote]);

  // Playhead animation - sync with YouTube when playing
  useEffect(() => {
    if (!coreStore.isPlaying) return;
    
    const interval = setInterval(() => {
      // Get time from YouTube if available, otherwise use manual increment
      const videoTime = isReady ? getVideoTime() : null;
      const next = videoTime !== null ? videoTime : currentTime + 16;
      
      if (coreStore.loopEnd && next >= coreStore.loopEnd) {
        const loopStart = coreStore.loopStart || coreStore.metadata.beatmapStart;
        setCurrentTime(loopStart);
        if (isReady && seek) {
          seek(loopStart / 1000); // Convert ms to seconds
        }
      } else if (next >= coreStore.metadata.beatmapEnd) {
        coreStore.setIsPlaying(false);
        setCurrentTime(coreStore.metadata.beatmapEnd);
      } else {
        setCurrentTime(next);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [coreStore.isPlaying, coreStore.loopStart, coreStore.loopEnd, coreStore.metadata, currentTime, setCurrentTime, coreStore, isReady, getVideoTime, seek]);

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

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(coreStore.beatmapText);
    audioManager.play('difficultySettingsApply');
  };

  // Download beatmap
  const downloadBeatmap = () => {
    const blob = new Blob([coreStore.beatmapText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${coreStore.metadata.title || 'beatmap'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    audioManager.play('difficultySettingsApply');
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* YouTube Setup Modal */}
      {needsYouTubeSetup && (
        <YouTubeSetupModal onSubmit={handleYouTubeSetup} />
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm border-b border-neon-cyan/30">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded hover:bg-neon-cyan/10 transition-colors font-rajdhani"
        >
          <ChevronLeft className="w-5 h-5" />
          BACK
        </button>
        <button
          onClick={() => uiStore.setIsPanelOpen(!uiStore.isPanelOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-neon-cyan border border-neon-cyan text-black rounded hover:bg-neon-cyan/80 transition-colors font-rajdhani font-bold"
        >
          {uiStore.isPanelOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          {uiStore.isPanelOpen ? 'HIDE' : 'SHOW'} PANEL
        </button>
      </div>

      {/* Editor Canvas - Centered layout matching game */}
      <div className="absolute inset-0 flex flex-col">
        {/* Spacer for top bar */}
        <div className="h-[72px]" />
        
        {/* Main editor area - centered */}
        <div className="flex-1 relative flex items-center justify-center">
          <EditorCanvas
            canvasRef={canvasRef}
            currentTime={currentTime}
            parsedNotes={coreStore.parsedNotes}
            metadata={coreStore.metadata}
            editorMode={coreStore.editorMode}
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
          />
        </div>
      </div>

      {/* Sidebar */}
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
      />

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
      </AnimatePresence>
    </div>
  );
}
