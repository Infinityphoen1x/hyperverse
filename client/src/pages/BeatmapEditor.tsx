import { useCallback, useRef, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { useEditorStore } from '@/stores/useEditorStore';
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
  const store = useEditorStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isParsingFromTextRef = useRef(false);
  const playerInitializedRef = useRef(false);
  
  // Initialize idle rotation animation
  useIdleRotationManager();
  
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
  }, []);

  // Extract YouTube video ID from metadata
  useEffect(() => {
    if (store.metadata.youtubeUrl) {
      const match = store.metadata.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
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
  }, [store.metadata.youtubeUrl]);

  // Handle YouTube setup
  const handleYouTubeSetup = useCallback((videoId: string) => {
    console.log('[EDITOR] YouTube setup - videoId:', videoId);
    setYoutubeVideoId(videoId);
    store.updateMetadata({ youtubeUrl: `https://youtube.com/watch?v=${videoId}` });
    setNeedsYouTubeSetup(false);
    
    // Update localStorage so App.tsx initializes the player
    const beatmapData = { youtubeVideoId: videoId };
    localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
    console.log('[EDITOR] Set pendingBeatmap in localStorage:', beatmapData);
    
    // Trigger a re-render of YouTube player by dispatching event
    window.dispatchEvent(new CustomEvent('beatmapUpdate'));
    console.log('[EDITOR] Dispatched beatmapUpdate event');
  }, [store]);

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
      if (!store.isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        store.setPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => store.setIsResizing(false);

    if (store.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [store.isResizing]);

  // Parse beatmap text with difficulties
  useEffect(() => {
    isParsingFromTextRef.current = true;
    const allDifficulties = parseBeatmapTextWithDifficulties(store.beatmapText);
    store.setDifficultyNotes('EASY', allDifficulties.EASY);
    store.setDifficultyNotes('MEDIUM', allDifficulties.MEDIUM);
    store.setDifficultyNotes('HARD', allDifficulties.HARD);
    store.setParsedNotes(allDifficulties[store.currentDifficulty]);
    // Reset flag after a brief delay to avoid immediate re-generation
    setTimeout(() => {
      isParsingFromTextRef.current = false;
    }, 100);
  }, [store.beatmapText, store.currentDifficulty, store.setDifficultyNotes, store.setParsedNotes]);

  // Sync difficulty change
  useEffect(() => {
    const currentDiffNotes = store.difficultyNotes[store.currentDifficulty];
    store.setParsedNotes(currentDiffNotes);
  }, [store.currentDifficulty]);

  // Regenerate text when notes are edited via UI (not from text parsing)
  useEffect(() => {
    if (isParsingFromTextRef.current) return;
    const newText = generateBeatmapTextWithDifficulties(store.metadata, store.difficultyNotes);
    store.setBeatmapText(newText);
  }, [store.difficultyNotes, store.metadata, store.setBeatmapText]);

  // Sync to game store for rendering
  useEffect(() => {
    setNotes(store.parsedNotes);
  }, [store.parsedNotes, setNotes]);

  // Control tunnel rotation based on spinEnabled
  useEffect(() => {
    if (!store.spinEnabled) {
      setTunnelRotation(0);
    }
  }, [store.spinEnabled, setTunnelRotation]);

  // Delete selected notes
  const deleteSelectedNote = useCallback(() => {
    if (store.selectedNoteIds.length > 0 || store.selectedNoteId) {
      store.addToHistory(store.parsedNotes);
      const idsToDelete = store.selectedNoteIds.length > 0 
        ? store.selectedNoteIds 
        : [store.selectedNoteId!];
      const newNotes = store.parsedNotes.filter(n => !idsToDelete.includes(n.id));
      store.setParsedNotes(newNotes);
      store.setDifficultyNotes(store.currentDifficulty, newNotes);
      store.clearSelection();
      audioManager.play('difficultySettingsApply');
    }
  }, [store]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        store.redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedNoteId && !isInputField) {
        e.preventDefault();
        deleteSelectedNote();
      }
      if (e.key === ' ' && !isInputField) {
        e.preventDefault();
        store.setIsPlaying(!store.isPlaying);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, deleteSelectedNote]);

  // Playhead animation - sync with YouTube when playing
  useEffect(() => {
    if (!store.isPlaying) return;
    
    const interval = setInterval(() => {
      // Get time from YouTube if available, otherwise use manual increment
      const videoTime = isReady ? getVideoTime() : null;
      const next = videoTime !== null ? videoTime : currentTime + 16;
      
      if (store.loopEnd && next >= store.loopEnd) {
        const loopStart = store.loopStart || store.metadata.beatmapStart;
        setCurrentTime(loopStart);
        if (isReady && seek) {
          seek(loopStart / 1000); // Convert ms to seconds
        }
      } else if (next >= store.metadata.beatmapEnd) {
        store.setIsPlaying(false);
        setCurrentTime(store.metadata.beatmapEnd);
      } else {
        setCurrentTime(next);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [store.isPlaying, store.loopStart, store.loopEnd, store.metadata, currentTime, setCurrentTime, store, isReady, getVideoTime, seek]);

  // Sync YouTube player when currentTime changes manually (not during playback)
  const lastSyncedTimeRef = useRef(0);
  useEffect(() => {
    if (!store.isPlaying && isReady && seek && Math.abs(currentTime - lastSyncedTimeRef.current) > 100) {
      seek(currentTime / 1000); // Convert ms to seconds
      lastSyncedTimeRef.current = currentTime;
    }
  }, [currentTime, store.isPlaying, isReady, seek]);

  // Update metadata from text
  const updateFromText = useCallback((text: string) => {
    const extractedMetadata = parseMetadataFromText(text);
    store.updateMetadata(extractedMetadata);
  }, [store.updateMetadata]);

  // Validate beatmap
  useEffect(() => {
    const issues = validateBeatmap(store.parsedNotes, store.metadata);
    setValidationIssues(issues);
  }, [store.parsedNotes, store.metadata]);

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(store.beatmapText);
    audioManager.play('difficultySettingsApply');
  };

  // Download beatmap
  const downloadBeatmap = () => {
    const blob = new Blob([store.beatmapText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.metadata.title || 'beatmap'}.txt`;
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
          onClick={() => store.setIsPanelOpen(!store.isPanelOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-neon-cyan border border-neon-cyan text-black rounded hover:bg-neon-cyan/80 transition-colors font-rajdhani font-bold"
        >
          {store.isPanelOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          {store.isPanelOpen ? 'HIDE' : 'SHOW'} PANEL
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
            parsedNotes={store.parsedNotes}
            metadata={store.metadata}
            editorMode={store.editorMode}
            snapEnabled={store.snapEnabled}
            snapDivision={store.snapDivision}
            hoveredNote={store.hoveredNote}
            setHoveredNote={store.setHoveredNote}
            selectedNoteId={store.selectedNoteId}
            setSelectedNoteId={store.setSelectedNoteId}
            selectedNoteIds={store.selectedNoteIds}
            toggleNoteSelection={store.toggleNoteSelection}
            clearSelection={store.clearSelection}
            addToHistory={store.addToHistory}
            setParsedNotes={store.setParsedNotes}
            setDifficultyNotes={store.setDifficultyNotes}
            currentDifficulty={store.currentDifficulty}
            isDragging={store.isDragging}
            setIsDragging={store.setIsDragging}
            dragStartTime={store.dragStartTime}
            setDragStartTime={store.setDragStartTime}
            dragStartLane={store.dragStartLane}
            setDragStartLane={store.setDragStartLane}
            draggedNoteId={store.draggedNoteId}
            setDraggedNoteId={store.setDraggedNoteId}
            draggedHandle={store.draggedHandle}
            setDraggedHandle={store.setDraggedHandle}
            glowEnabled={store.glowEnabled}
            dynamicVPEnabled={store.dynamicVPEnabled}
            zoomEnabled={store.zoomEnabled}
            judgementLinesEnabled={store.judgementLinesEnabled}
            spinEnabled={store.spinEnabled}
          />
        </div>
      </div>

      {/* Sidebar */}
      <EditorSidebarManager
        {...store}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
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
        {store.showBpmTapper && (
          <BpmTapperModal
            onClose={() => store.setShowBpmTapper(false)}
            onBpmDetected={(bpm) => store.updateMetadata({ bpm })}
          />
        )}
        {store.showShortcutsModal && (
          <ShortcutsModal onClose={() => store.setShowShortcutsModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
