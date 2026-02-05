import { useCallback, useRef, useEffect, useState } from 'react';
import { AnimatePresence } from "@/lib/motion/MotionProvider";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';
import { useBeatmapStore } from '@/stores/useBeatmapStore';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';
import { useEditorUIStore } from '@/stores/useEditorUIStore';
import { useEditorGraphicsStore } from '@/stores/useEditorGraphicsStore';
import { audioManager } from '@/lib/audio/audioManager';
import { useIdleRotationManager } from '@/hooks/effects/animation/useIdleRotation';
import { useEditorKeyboardHandlers } from '@/hooks/editor/useEditorKeyboardHandlers';
import { useEditorYouTube } from '@/hooks/editor/useEditorYouTube';
import { useEditorAnimation } from '@/hooks/editor/useEditorAnimation';
import { useEditorBeatmapSync } from '@/hooks/editor/useEditorBeatmapSync';
import { useEditorNoteOperations } from '@/hooks/editor/useEditorNoteOperations';
import { useEditorKeyboardShortcuts } from '@/hooks/editor/useEditorKeyboardShortcuts';
import { useEditorVisualEffects } from '@/hooks/editor/useEditorVisualEffects';
import { YouTubeSetupModal } from '@/components/editor/YouTubeSetupModal';
import { EditorSidebarManager } from '@/components/editor/EditorSidebarManager';
import { BpmTapperModal } from '@/components/editor/BpmTapperModal';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { DurationInputPopup } from '@/components/editor/DurationInputPopup';
import { ConversionToastContainer } from '@/components/editor/ConversionToast';
import { NotePropertiesDialog } from '@/components/editor/NotePropertiesDialog';
import {
  parseBeatmapTextWithDifficulties,
  parseMetadataFromText,
  generateBeatmapTextWithDifficulties,
  validateBeatmap,
} from '@/lib/editor/beatmapTextUtils';
import { Note } from '@/types/game';

interface BeatmapEditorProps {
  onBack?: () => void;
  playerInitializedRef: React.RefObject<boolean>;
}

export default function BeatmapEditor({ onBack, playerInitializedRef }: BeatmapEditorProps) {
  const coreStore = useEditorCoreStore();
  const uiStore = useEditorUIStore();
  const graphicsStore = useEditorGraphicsStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  
  // Initialize idle rotation animation (conditional on idleMotionEnabled)
  useIdleRotationManager(graphicsStore.idleMotionEnabled);
  
  const currentTime = useGameStore(state => state.currentTime);
  const setCurrentTime = useGameStore(state => state.setCurrentTime);
  const setNotes = useGameStore(state => state.setNotes);
  const setTunnelRotation = useGameStore(state => state.setTunnelRotation);
  const setGameState = useGameStore(state => state.setGameState);
  
  const [validationIssues, setValidationIssues] = useState<ReturnType<typeof validateBeatmap>>([]);
  const [durationInputState, setDurationInputState] = useState<{ visible: boolean; lane: number; time: number } | null>(null);
  const [showPropertiesDialog, setShowPropertiesDialog] = useState(false);

  // YouTube integration
  const { youtubeVideoId, needsYouTubeSetup, handleYouTubeSetup, handlePlay, handlePause } = useEditorYouTube({
    playerInitializedRef,
    currentTime,
  });
  
  // Initialize keyboard handlers for note placement (Q W E I O P)
  const { createHoldNote } = useEditorKeyboardHandlers({
    currentTime,
    parsedNotes: coreStore.parsedNotes,
    snapEnabled: uiStore.snapEnabled,
    snapDivision: uiStore.snapDivision,
    metadata: coreStore.metadata,
    currentDifficulty: coreStore.currentDifficulty,
    isEditorActive: true, // Always active when editor is open
    setParsedNotes: coreStore.setParsedNotes,
    setDifficultyNotes: coreStore.setDifficultyNotes,
    addToHistory: coreStore.addToHistory,
    setDurationInputState,
  });

  // Load beatmapText from useBeatmapStore on mount (if exists)
  useEffect(() => {
    const storedBeatmapText = useBeatmapStore.getState().beatmapText;
    if (storedBeatmapText && storedBeatmapText.trim()) {
      // console.log('[EDITOR] Loading existing beatmapText from useBeatmapStore, length:', storedBeatmapText.length);
      // Set beatmap text - the sync hook will parse metadata and notes
      coreStore.setBeatmapText(storedBeatmapText);
    }
  }, []); // Only run once on mount

  // Set game state to PAUSED so notes render (like paused gameplay)
  useEffect(() => {
    setGameState('PAUSED');
    return () => {
      setGameState('IDLE');
    };
  }, [setGameState]);
  
  // Animation loops for visuals
  useEditorAnimation();

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

  // Beatmap sync (parsing and regeneration)
  useEditorBeatmapSync();

  // Sync to game store for rendering
  useEffect(() => {
    setNotes(coreStore.parsedNotes);
  }, [coreStore.parsedNotes, setNotes]);

  // Visual effects (SPIN/ZOOM) based on active hold notes during playback
  useEditorVisualEffects({
    notes: coreStore.parsedNotes,
    currentTime,
    isPlaying: coreStore.isPlaying,
    spinEnabled: graphicsStore.spinEnabled,
    zoomEnabled: graphicsStore.zoomEnabled,
  });

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

  // Note operations
  const { 
    deleteSelectedNote, 
    toggleNoteType, 
    nudgeSelectedNotes, 
    moveSelectedNotesToLane, 
    handlePropertiesUpdate, 
    selectNoteInLane 
  } = useEditorNoteOperations({
    currentTime,
    setCurrentTime,
  });

  // Keyboard shortcuts
  useEditorKeyboardShortcuts({
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
  });

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
        <YouTubeSetupModal onSubmit={handleYouTubeSetup} />
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
