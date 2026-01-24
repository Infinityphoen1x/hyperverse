import { useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/useGameStore';
import { useEditorStore } from '@/stores/useEditorStore';
import { audioManager } from '@/lib/audio/audioManager';
import { 
  ChevronLeft, ChevronRight, Play, Pause, Save, ArrowLeft, Download, Copy, 
  Music, Keyboard, AlertTriangle, ChevronDown, ChevronUp, Maximize2, X, 
  ArrowLeftRight, Settings, Clock, FileText, Wrench 
} from 'lucide-react';
import { HexagonLayers } from '@/components/game/tunnel/HexagonLayers';
import { TapNotes } from '@/components/game/notes/TapNotes';
import { HoldNotes } from '@/components/game/notes/HoldNotes';
import { Note } from '@/types/game';
import {
  mouseToLane,
  mouseToTime,
  snapTimeToGrid,
  generateBeatGrid,
} from '@/lib/editor/editorUtils';
import {
  parseBeatmapText,
  parseBeatmapTextWithDifficulties,
  parseMetadataFromText,
  generateBeatmapText,
  generateBeatmapTextWithDifficulties,
  validateBeatmap,
  type Difficulty,
} from '@/lib/editor/beatmapTextUtils';

export default function BeatmapEditor({ onBack }: { onBack?: () => void }) {
  // Use editor store for all state
  const {
    isPanelOpen,
    setIsPanelOpen,
    panelWidth,
    setPanelWidth,
    isResizing,
    setIsResizing,
    panelSide,
    setPanelSide,
    sections,
    toggleSectionCollapse,
    toggleSectionPopout,
    closeSectionCompletely,
    reopenSection,
    isPlaying,
    setIsPlaying,
    editorMode,
    setEditorMode,
    metadata,
    setMetadata,
    updateMetadata,
    beatmapText,
    setBeatmapText,
    parsedNotes,
    setParsedNotes,
    hoveredNote,
    setHoveredNote,
    selectedNoteId,
    setSelectedNoteId,
    selectedNoteIds,
    setSelectedNoteIds,
    toggleNoteSelection,
    clearSelection,
    currentDifficulty,
    setCurrentDifficulty,
    difficultyNotes,
    setDifficultyNotes,
    snapEnabled,
    setSnapEnabled,
    snapDivision,
    setSnapDivision,
    bpmTapTimestamps,
    addBpmTap,
    resetBpmTapper,
    setShowBpmTapper,
    showBpmTapper,
    calculateBpmFromTaps,
    showShortcutsModal,
    setShowShortcutsModal,
    isDragging,
    setIsDragging,
    dragStartTime,
    setDragStartTime,
    dragStartLane,
    setDragStartLane,
    loopStart,
    setLoopStart,
    loopEnd,
    setLoopEnd,
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  
  const currentTime = useGameStore(state => state.currentTime);
  const setCurrentTime = useGameStore(state => state.setCurrentTime);
  const setNotes = useGameStore(state => state.setNotes);
  
  // Local state for validation
  const [validationIssues, setValidationIssues] = useState<ReturnType<typeof validateBeatmap>>([]);

  // Constants for editor (canonical state)
  const EDITOR_ZOOM_SCALE = 1.0;
  const EDITOR_ZOOM_INTENSITY = 0;
  const EDITOR_ROTATION = 0;
  const EDITOR_VP_X = 350;
  const EDITOR_VP_Y = 300;
  const JUDGEMENT_RADIUS = 187;
  const LEAD_TIME = 4000;
  const MIN_HOLD_DURATION = 100;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setPanelWidth, setIsResizing]);

  // Update parsed notes when text changes - parse with difficulties
  useEffect(() => {
    const allDifficulties = parseBeatmapTextWithDifficulties(beatmapText);
    setDifficultyNotes('EASY', allDifficulties.EASY);
    setDifficultyNotes('MEDIUM', allDifficulties.MEDIUM);
    setDifficultyNotes('HARD', allDifficulties.HARD);
    
    // Set parsedNotes to current difficulty
    setParsedNotes(allDifficulties[currentDifficulty]);
  }, [beatmapText, currentDifficulty, setParsedNotes, setDifficultyNotes]);

  // Update parsedNotes when difficulty changes
  useEffect(() => {
    setParsedNotes(difficultyNotes[currentDifficulty]);
  }, [currentDifficulty, difficultyNotes, setParsedNotes]);

  // Sync parsed notes to game store for rendering
  useEffect(() => {
    setNotes(parsedNotes);
  }, [parsedNotes, setNotes]);
  
  // Delete selected note(s)
  const deleteSelectedNote = useCallback(() => {
    if (selectedNoteIds.length > 0) {
      // Multi-select delete
      addToHistory(parsedNotes);
      const newNotes = parsedNotes.filter(n => !selectedNoteIds.includes(n.id));
      setParsedNotes(newNotes);
      setDifficultyNotes(currentDifficulty, newNotes);
      clearSelection();
      audioManager.play('difficultySettingsApply');
    } else if (selectedNoteId) {
      // Single select delete
      addToHistory(parsedNotes);
      const newNotes = parsedNotes.filter(n => n.id !== selectedNoteId);
      setParsedNotes(newNotes);
      setDifficultyNotes(currentDifficulty, newNotes);
      setSelectedNoteId(null);
      audioManager.play('difficultySettingsApply');
    }
  }, [selectedNoteId, selectedNoteIds, parsedNotes, currentDifficulty, addToHistory, setParsedNotes, setDifficultyNotes, setSelectedNoteId, clearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }
      // Delete: Del or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId && !isInputField) {
        e.preventDefault();
        deleteSelectedNote();
      }
      // Space: Play/Pause
      if (e.key === ' ' && !isInputField) {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelectedNote, selectedNoteId]);

  // Playhead animation
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const next = currentTime + 16;
      // Loop if enabled
      if (loopEnd && next >= loopEnd) {
        setCurrentTime(loopStart || metadata.beatmapStart);
      }
      // Stop at end
      else if (next >= metadata.beatmapEnd) {
        setIsPlaying(false);
        setCurrentTime(metadata.beatmapEnd);
      } else {
        setCurrentTime(next);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, loopStart, loopEnd, metadata.beatmapStart, metadata.beatmapEnd, currentTime, setCurrentTime, setIsPlaying]);

  // Convert beatmap text to metadata + notes
  const updateFromText = useCallback((text: string) => {
    const extractedMetadata = parseMetadataFromText(text);
    updateMetadata(extractedMetadata);
  }, [updateMetadata]);

  // Auto-update text when notes or metadata change - generate with all difficulties
  useEffect(() => {
    const newText = generateBeatmapTextWithDifficulties(metadata, difficultyNotes);
    setBeatmapText(newText);
  }, [difficultyNotes, metadata, setBeatmapText]);
  
  // Export/Save functions
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(beatmapText);
    audioManager.play('difficultySettingsApply');
  }, [beatmapText]);
  
  const downloadBeatmap = useCallback(() => {
    const blob = new Blob([beatmapText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.title || 'beatmap'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    audioManager.play('difficultySettingsApply');
  }, [beatmapText, metadata.title]);
  
  // Autosave to localStorage
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      if (beatmapText) {
        localStorage.setItem('beatmapEditor_autosave', beatmapText);
        localStorage.setItem('beatmapEditor_autosave_timestamp', Date.now().toString());
      }
    }, 5000); // Autosave every 5 seconds

    return () => clearInterval(autosaveInterval);
  }, [beatmapText]);
  
  // Validate notes whenever they change
  useEffect(() => {
    const issues = validateBeatmap(parsedNotes, metadata);
    setValidationIssues(issues);
  }, [parsedNotes, metadata]);
  
  // BPM Tapper keyboard handler
  useEffect(() => {
    if (!showBpmTapper) return;
    
    const handleTap = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        addBpmTap();
        audioManager.play('tapHit');
      }
    };
    
    window.addEventListener('keydown', handleTap);
    return () => window.removeEventListener('keydown', handleTap);
  }, [showBpmTapper, addBpmTap]);

  // Mouse down to start drag for HOLD notes or select existing note
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to lane and time
    const { lane: closestLane } = mouseToLane(mouseX, mouseY, EDITOR_VP_X, EDITOR_VP_Y);
    const { time: timeOffset } = mouseToTime(mouseX, mouseY, EDITOR_VP_X, EDITOR_VP_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
    
    // Apply snap to grid
    const noteTime = snapEnabled 
      ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision)
      : timeOffset;

    // Check if clicking on existing note (within 100ms and same lane)
    const clickedNote = parsedNotes.find(note => 
      note.lane === closestLane && 
      Math.abs(note.time - noteTime) < 100
    );
    
    if (clickedNote) {
      // Select existing note
      if (e.ctrlKey || e.metaKey) {
        // Multi-select with Ctrl/Cmd
        toggleNoteSelection(clickedNote.id);
      } else {
        // Single select
        if (!selectedNoteIds.includes(clickedNote.id)) {
          clearSelection();
        }
        setSelectedNoteId(clickedNote.id);
        setSelectedNoteIds([clickedNote.id]);
      }
      audioManager.play('tapHit');
    } else {
      // Start drag for new note
      setIsDragging(true);
      setDragStartTime(noteTime);
      setDragStartLane(closestLane);
      if (!e.ctrlKey && !e.metaKey) {
        clearSelection();
      }
    }
  }, [currentTime, snapEnabled, metadata.bpm, snapDivision, parsedNotes, selectedNoteIds, setIsDragging, setDragStartTime, setDragStartLane, setSelectedNoteId, setSelectedNoteIds, toggleNoteSelection, clearSelection]);

  // Mouse move during drag
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { lane: closestLane } = mouseToLane(mouseX, mouseY, EDITOR_VP_X, EDITOR_VP_Y);
    const { time: timeOffset } = mouseToTime(mouseX, mouseY, EDITOR_VP_X, EDITOR_VP_Y, currentTime, LEAD_TIME, JUDGEMENT_RADIUS);
    
    const noteTime = snapEnabled 
      ? snapTimeToGrid(timeOffset, metadata.bpm, snapDivision)
      : timeOffset;

    setHoveredNote({ lane: closestLane, time: noteTime });
  }, [currentTime, snapEnabled, metadata.bpm, snapDivision, setHoveredNote]);

  // Mouse up to finish drag
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !isDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - EDITOR_VP_X;
    const dy = mouseY - EDITOR_VP_Y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const progress = Math.max(0, Math.min(1, (distance - 1) / (JUDGEMENT_RADIUS - 1)));
    const timeOffset = progress * LEAD_TIME;
    let endTime = Math.round(currentTime + timeOffset);
    endTime = snapEnabled 
      ? snapTimeToGrid(endTime, metadata.bpm, snapDivision)
      : endTime;

    const duration = endTime - (dragStartTime || 0);

    addToHistory(parsedNotes);

    // Create TAP or HOLD based on duration
    if (duration < MIN_HOLD_DURATION) {
      // TAP note
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
      audioManager.play('tapHit');
    } else {
      // HOLD note
      const newNote: Note = {
        id: `editor-note-${Date.now()}`,
        type: 'HOLD',
        lane: dragStartLane!,
        time: dragStartTime!,
        duration: duration,
        hit: false,
        missed: false,
      };
      const updatedNotes = [...parsedNotes, newNote];
      setParsedNotes(updatedNotes);
      setDifficultyNotes(currentDifficulty, updatedNotes);
      audioManager.play('holdRelease');
    }

    setIsDragging(false);
    setDragStartTime(null);
    setDragStartLane(null);
  }, [isDragging, dragStartTime, dragStartLane, currentTime, parsedNotes, currentDifficulty, snapEnabled, metadata.bpm, snapDivision, addToHistory, setParsedNotes, setDifficultyNotes, setIsDragging, setDragStartTime, setDragStartLane]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 right-4 z-50 bg-black/80 border border-neon-cyan/50 rounded px-4 py-2 hover:bg-neon-cyan/10 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-neon-cyan" />
          <span className="text-neon-cyan font-rajdhani">BACK</span>
        </button>
      )}

      {/* Side Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: panelSide === 'left' ? -panelWidth : panelWidth }}
            animate={{ x: 0 }}
            exit={{ x: panelSide === 'left' ? -panelWidth : panelWidth }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`absolute ${panelSide === 'left' ? 'left-0 border-r' : 'right-0 border-l'} top-0 h-full bg-gray-900 border-neon-cyan shadow-[0_0_30px_rgba(0,255,255,0.3)] z-50 flex flex-col`}
            style={{ width: panelWidth }}
          >
            {/* Header */}
            <div className="p-4 border-b border-neon-cyan/30 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-orbitron text-neon-cyan">BEATMAP EDITOR</h1>
                <button
                  onClick={() => setPanelSide(panelSide === 'left' ? 'right' : 'left')}
                  className="p-1 text-neon-cyan hover:text-neon-pink transition-colors"
                  title="Switch panel side"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
              </div>
              
              {/* Closed Sections Toolbar */}
              {(!sections.tools.visible || !sections.playback.visible || !sections.metadata.visible || !sections.beatmapText.visible) && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {!sections.tools.visible && (
                    <button
                      onClick={() => reopenSection('tools')}
                      className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded hover:border-neon-cyan hover:text-neon-cyan transition-colors flex items-center gap-1"
                      title="Reopen Tools"
                    >
                      <Wrench className="w-3 h-3" />
                      TOOLS
                    </button>
                  )}
                  {!sections.playback.visible && (
                    <button
                      onClick={() => reopenSection('playback')}
                      className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded hover:border-neon-cyan hover:text-neon-cyan transition-colors flex items-center gap-1"
                      title="Reopen Playback"
                    >
                      <Clock className="w-3 h-3" />
                      PLAYBACK
                    </button>
                  )}
                  {!sections.metadata.visible && (
                    <button
                      onClick={() => reopenSection('metadata')}
                      className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded hover:border-neon-cyan hover:text-neon-cyan transition-colors flex items-center gap-1"
                      title="Reopen Metadata"
                    >
                      <Settings className="w-3 h-3" />
                      METADATA
                    </button>
                  )}
                  {!sections.beatmapText.visible && (
                    <button
                      onClick={() => reopenSection('beatmapText')}
                      className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded hover:border-neon-cyan hover:text-neon-cyan transition-colors flex items-center gap-1"
                      title="Reopen Beatmap Text"
                    >
                      <FileText className="w-3 h-3" />
                      TEXT
                    </button>
                  )}
                </div>
              )}
              
              {/* Difficulty Tabs */}
              <div className="flex gap-1 mb-3">
                {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setCurrentDifficulty(diff)}
                    className={`flex-1 px-3 py-2 text-sm font-rajdhani rounded border transition-colors ${
                      currentDifficulty === diff
                        ? 'bg-neon-pink border-neon-pink text-black'
                        : 'bg-transparent border-gray-600 text-gray-400 hover:border-neon-cyan/50'
                    }`}
                  >
                    {diff}
                    <span className="text-xs ml-1">({difficultyNotes[diff].length})</span>
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setEditorMode(!editorMode)}
                  className={`px-3 py-1 text-sm font-rajdhani rounded border transition-colors ${
                    editorMode
                      ? 'bg-neon-pink border-neon-pink text-black'
                      : 'bg-transparent border-gray-600 text-gray-400'
                  }`}
                >
                  EDITOR MODE
                </button>
                <button
                  onClick={() => setSnapEnabled(!snapEnabled)}
                  className={`px-3 py-1 text-sm font-rajdhani rounded border transition-colors ${
                    snapEnabled
                      ? 'bg-neon-cyan border-neon-cyan text-black'
                      : 'bg-transparent border-gray-600 text-gray-400'
                  }`}
                  title="Snap to beat grid"
                >
                  SNAP
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Tools Section */}
              {sections.tools.visible && !sections.tools.poppedOut && (
                <CollapsibleSection
                  title="TOOLS"
                  icon={<Wrench className="w-4 h-4" />}
                  collapsed={sections.tools.collapsed}
                  onToggleCollapse={() => toggleSectionCollapse('tools')}
                  onPopout={() => toggleSectionPopout('tools')}
                  onClose={() => closeSectionCompletely('tools')}
                >
                  <div className="space-y-3">
                    {/* Snap Division */}
                    {snapEnabled && (
                      <div>
                        <label className="text-xs text-gray-400 font-rajdhani mb-1 block">SNAP DIVISION</label>
                        <div className="flex gap-2">
                          {[1, 2, 4, 8, 16].map((div) => (
                            <button
                              key={div}
                              onClick={() => setSnapDivision(div as any)}
                              className={`flex-1 px-2 py-1 text-xs font-rajdhani rounded border transition-colors ${
                                snapDivision === div
                                  ? 'bg-neon-cyan border-neon-cyan text-black'
                                  : 'bg-transparent border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10'
                              }`}
                            >
                              1/{div}
                            </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Undo/Redo */}
                <div className="flex gap-2">
                  <button
                    onClick={undo}
                    disabled={!canUndo()}
                    className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ↶ UNDO
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo()}
                    className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ↷ REDO
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={deleteSelectedNote}
                  disabled={!selectedNoteId && selectedNoteIds.length === 0}
                  className="w-full px-3 py-2 bg-transparent border border-red-500/30 text-red-500 rounded text-sm font-rajdhani hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  🗑 DELETE{selectedNoteIds.length > 1 ? ` (${selectedNoteIds.length})` : ' SELECTED'}
                </button>
                
                {/* Export/Save */}
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 transition-colors flex items-center justify-center gap-2"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                    COPY
                  </button>
                  <button
                    onClick={downloadBeatmap}
                    className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 transition-colors flex items-center justify-center gap-2"
                    title="Download .txt file"
                  >
                    <Download className="w-4 h-4" />
                    SAVE
                  </button>
                </div>
                
                {/* BPM Tapper & Shortcuts */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBpmTapper(!showBpmTapper)}
                    className={`flex-1 px-3 py-2 border rounded text-sm font-rajdhani transition-colors flex items-center justify-center gap-2 ${
                      showBpmTapper
                        ? 'bg-neon-cyan border-neon-cyan text-black'
                        : 'bg-transparent border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/10'
                    }`}
                    title="BPM Tapper"
                  >
                    <Music className="w-4 h-4" />
                    BPM
                  </button>
                  <button
                    onClick={() => setShowShortcutsModal(true)}
                    className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 transition-colors flex items-center justify-center gap-2"
                    title="Keyboard shortcuts"
                  >
                    <Keyboard className="w-4 h-4" />
                    KEYS
                  </button>
                </div>
                
                {/* Validation Warnings */}
                {validationIssues.length > 0 && (
                  <div className="border border-yellow-500/50 rounded p-3 bg-yellow-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-500 font-rajdhani text-sm font-bold">
                        {validationIssues.length} ISSUE{validationIssues.length > 1 ? 'S' : ''}
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {validationIssues.slice(0, 5).map((issue, idx) => (
                        <div key={idx} className="text-xs text-yellow-400 font-rajdhani">
                          • {issue.message}
                        </div>
                      ))}
                      {validationIssues.length > 5 && (
                        <div className="text-xs text-yellow-400/70 font-rajdhani italic">
                          ...and {validationIssues.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
                </CollapsibleSection>
              )}
              
              {/* Playback Section */}
              {sections.playback.visible && !sections.playback.poppedOut && (
                <CollapsibleSection
                  title="PLAYBACK"
                  icon={<Clock className="w-4 h-4" />}
                  collapsed={sections.playback.collapsed}
                  onToggleCollapse={() => toggleSectionCollapse('playback')}
                  onPopout={() => toggleSectionPopout('playback')}
                  onClose={() => closeSectionCompletely('playback')}
                >
                  <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex-1 px-3 py-2 bg-neon-pink border border-neon-pink text-black rounded text-sm font-rajdhani hover:bg-neon-pink/80 transition-colors flex items-center justify-center gap-2"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentTime(Math.max(metadata.beatmapStart, currentTime - 1000))}
                    className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 transition-colors"
                  >
                    ←1s
                  </button>
                  <button
                    onClick={() => setCurrentTime(Math.min(metadata.beatmapEnd, currentTime + 1000))}
                    className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 transition-colors"
                  >
                    1s→
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-rajdhani mb-1 block">SEEK TIME (ms)</label>
                  <input
                    type="range"
                    min={metadata.beatmapStart}
                    max={metadata.beatmapEnd}
                    value={currentTime}
                    onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-neon-cyan font-mono text-center mt-1">
                    {currentTime.toFixed(0)}ms
                  </div>
                </div>

                {/* Loop Controls */}
                <div>
                  <label className="text-xs text-gray-400 font-rajdhani mb-1 block">LOOP SECTION</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLoopStart(currentTime)}
                      className="flex-1 px-2 py-1 bg-transparent border border-neon-cyan/30 text-xs text-neon-cyan rounded font-rajdhani hover:bg-neon-cyan/10 transition-colors"
                    >
                      SET START
                    </button>
                    <button
                      onClick={() => setLoopEnd(currentTime)}
                      className="flex-1 px-2 py-1 bg-transparent border border-neon-cyan/30 text-xs text-neon-cyan rounded font-rajdhani hover:bg-neon-cyan/10 transition-colors"
                    >
                      SET END
                    </button>
                    <button
                      onClick={() => { setLoopStart(null); setLoopEnd(null); }}
                      className="flex-1 px-2 py-1 bg-transparent border border-red-500/30 text-xs text-red-500 rounded font-rajdhani hover:bg-red-500/10 transition-colors"
                    >
                      CLEAR
                    </button>
                  </div>
                  {loopStart !== null && loopEnd !== null && (
                    <div className="text-xs text-neon-cyan/70 font-mono text-center mt-1">
                      {loopStart}ms → {loopEnd}ms
                    </div>
                  )}
                </div>
                  </div>
                </CollapsibleSection>
              )}
              
              {/* Metadata Section */}
              {sections.metadata.visible && !sections.metadata.poppedOut && (
                <CollapsibleSection
                  title="METADATA"
                  icon={<Settings className="w-4 h-4" />}
                  collapsed={sections.metadata.collapsed}
                  onToggleCollapse={() => toggleSectionCollapse('metadata')}
                  onPopout={() => toggleSectionPopout('metadata')}
                  onClose={() => closeSectionCompletely('metadata')}
                >
                  <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 font-rajdhani">TITLE</label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => updateMetadata({ title: e.target.value })}
                    className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-rajdhani">ARTIST</label>
                  <input
                    type="text"
                    value={metadata.artist}
                    onChange={(e) => updateMetadata({ artist: e.target.value })}
                    className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 font-rajdhani">BPM</label>
                    <input
                      type="number"
                      value={metadata.bpm}
                      onChange={(e) => updateMetadata({ bpm: parseFloat(e.target.value) || 120 })}
                      className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-rajdhani">DURATION (s)</label>
                    <input
                      type="number"
                      value={metadata.duration}
                      onChange={(e) => updateMetadata({ duration: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-rajdhani">YOUTUBE URL</label>
                  <input
                    type="text"
                    value={metadata.youtubeUrl}
                    onChange={(e) => updateMetadata({ youtubeUrl: e.target.value })}
                    className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 font-rajdhani">START (ms)</label>
                    <input
                      type="number"
                      value={metadata.beatmapStart}
                      onChange={(e) => updateMetadata({ beatmapStart: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-rajdhani">END (ms)</label>
                    <input
                      type="number"
                      value={metadata.beatmapEnd}
                      onChange={(e) => updateMetadata({ beatmapEnd: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
                    />
                  </div>
                </div>
                  </div>
                </CollapsibleSection>
              )}
              
              {/* Beatmap Text Section */}
              {sections.beatmapText.visible && !sections.beatmapText.poppedOut && (
                <CollapsibleSection
                  title="BEATMAP TEXT"
                  icon={<FileText className="w-4 h-4" />}
                  collapsed={sections.beatmapText.collapsed}
                  onToggleCollapse={() => toggleSectionCollapse('beatmapText')}
                  onPopout={() => toggleSectionPopout('beatmapText')}
                  onClose={() => closeSectionCompletely('beatmapText')}
                >
                  <textarea
                    value={beatmapText}
                    onChange={(e) => {
                      setBeatmapText(e.target.value);
                      updateFromText(e.target.value);
                    }}
                    className="w-full h-64 bg-black border border-neon-cyan/30 text-white px-3 py-2 text-xs font-mono rounded resize-y"
                    placeholder="Beatmap text will appear here..."
                  />
                </CollapsibleSection>
              )}
            </div>

            {/* Resize Handle */}
            <div
              ref={resizeRef}
              onMouseDown={() => setIsResizing(true)}
              className="absolute right-0 top-0 w-1 h-full cursor-ew-resize hover:bg-neon-cyan/50 transition-colors"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Panel Button */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-neon-cyan/20 border border-neon-cyan/50 rounded-r-lg p-2 hover:bg-neon-cyan/30 transition-colors"
        style={{ left: isPanelOpen ? panelWidth : 0 }}
      >
        {isPanelOpen ? (
          <ChevronLeft className="w-5 h-5 text-neon-cyan" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neon-cyan" />
        )}
      </button>

      {/* Main Canvas Area */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={() => { setHoveredNote(null); setIsDragging(false); }}
        className="absolute inset-0 cursor-crosshair"
        style={{ left: isPanelOpen ? panelWidth : 0 }}
      >
        {/* Tunnel Visualization */}
        <div className="absolute inset-0 flex items-center justify-center">
          <HexagonLayers
            rayColor="#00FFFF"
            vpX={EDITOR_VP_X}
            vpY={EDITOR_VP_Y}
            hexCenterX={EDITOR_VP_X}
            hexCenterY={EDITOR_VP_Y}
            rotationOffset={EDITOR_ROTATION}
            zoomScale={EDITOR_ZOOM_SCALE}
            zoomIntensity={EDITOR_ZOOM_INTENSITY}
          />
        </div>

        {/* Notes Rendering */}
        {editorMode && parsedNotes.length > 0 && (
          <>
            <TapNotes vpX={EDITOR_VP_X} vpY={EDITOR_VP_Y} />
            <HoldNotes vpX={EDITOR_VP_X} vpY={EDITOR_VP_Y} />
            
            {/* Selected Note Highlight */}
            {(selectedNoteId || selectedNoteIds.length > 0) && parsedNotes.map(note => {
              const isSelected = note.id === selectedNoteId || selectedNoteIds.includes(note.id);
              if (!isSelected) return null;
              
              const progress = (note.time - currentTime) / LEAD_TIME;
              const distance = 1 + (progress * (JUDGEMENT_RADIUS - 1));
              
              if (distance < 1 || distance > JUDGEMENT_RADIUS) return null;
              
              const laneAngle = note.lane === -2 ? 0 : note.lane === 1 ? 60 : note.lane === 0 ? 120 : note.lane === -1 ? 180 : note.lane === 3 ? 240 : 300;
              const angleRad = (laneAngle * Math.PI) / 180;
              const x = EDITOR_VP_X + distance * Math.cos(angleRad);
              const y = EDITOR_VP_Y + distance * Math.sin(angleRad);
              
              return (
                <div
                  key={`highlight-${note.id}`}
                  className="absolute rounded-full border-4 border-yellow-400 animate-pulse pointer-events-none"
                  style={{
                    left: x - 30,
                    top: y - 30,
                    width: 60,
                    height: 60,
                  }}
                />
              );
            })}
          </>
        )}

        {/* Status Bar */}
        <div className="absolute top-4 right-4 space-y-2">
          <div className="bg-black/80 border border-neon-cyan/50 px-4 py-2 rounded font-rajdhani text-neon-cyan">
            TIME: {currentTime.toFixed(0)}ms | NOTES: {parsedNotes.length}
          </div>
          {selectedNoteIds.length > 1 && (
            <div className="bg-black/80 border border-yellow-500/50 px-4 py-2 rounded font-rajdhani text-yellow-500 text-sm">
              {selectedNoteIds.length} NOTES SELECTED (Del to delete)
            </div>
          )}
          {selectedNoteId && selectedNoteIds.length <= 1 && (
            <div className="bg-black/80 border border-neon-pink/50 px-4 py-2 rounded font-rajdhani text-neon-pink text-sm">
              NOTE SELECTED (Del to delete)
            </div>
          )}
          {isDragging && (
            <div className="bg-black/80 border border-yellow-500/50 px-4 py-2 rounded font-rajdhani text-yellow-500 text-sm">
              DRAG TO CREATE HOLD
            </div>
          )}
          {snapEnabled && (
            <div className="bg-black/80 border border-neon-cyan/50 px-4 py-2 rounded font-rajdhani text-neon-cyan text-sm">
              SNAP: 1/{snapDivision} @ {metadata.bpm} BPM
            </div>
          )}
          {loopStart !== null && loopEnd !== null && (
            <div className="bg-black/80 border border-green-500/50 px-4 py-2 rounded font-rajdhani text-green-500 text-sm">
              LOOP: {loopStart}ms → {loopEnd}ms
            </div>
          )}
        </div>

        {/* Beat Grid Guidelines */}
        {snapEnabled && editorMode && (
          <div className="absolute inset-0 pointer-events-none">
            {generateBeatGrid(currentTime, metadata.bpm, snapDivision, LEAD_TIME, JUDGEMENT_RADIUS).map((circle, i) => (
              <div
                key={i}
                className="absolute rounded-full border border-neon-cyan/20"
                style={{
                  left: EDITOR_VP_X - circle.distance,
                  top: EDITOR_VP_Y - circle.distance,
                  width: circle.distance * 2,
                  height: circle.distance * 2,
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* BPM Tapper Modal */}
      <AnimatePresence>
        {showBpmTapper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowBpmTapper(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border-2 border-neon-cyan rounded-lg p-8 shadow-[0_0_50px_rgba(0,255,255,0.5)] max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-orbitron text-neon-cyan mb-6 text-center">BPM TAPPER</h2>
              
              <div className="text-center mb-6">
                <div className="text-6xl font-orbitron text-neon-pink mb-2">
                  {calculateBpmFromTaps() || '---'}
                </div>
                <div className="text-sm text-gray-400 font-rajdhani">
                  {bpmTapTimestamps.length > 0 ? `${bpmTapTimestamps.length} taps` : 'Press SPACE or tap button'}
                </div>
              </div>
              
              <button
                onClick={() => {
                  addBpmTap();
                  audioManager.play('tapHit');
                }}
                className="w-full py-4 bg-neon-cyan border-2 border-neon-cyan text-black rounded text-xl font-rajdhani hover:bg-neon-cyan/80 transition-colors mb-4"
              >
                TAP
              </button>
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    const bpm = calculateBpmFromTaps();
                    if (bpm) {
                      updateMetadata({ bpm });
                      audioManager.play('difficultySettingsApply');
                    }
                  }}
                  disabled={!calculateBpmFromTaps()}
                  className="flex-1 py-2 bg-neon-pink border border-neon-pink text-black rounded text-sm font-rajdhani hover:bg-neon-pink/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  APPLY BPM
                </button>
                <button
                  onClick={() => {
                    resetBpmTapper();
                    audioManager.play('difficultySettingsApply');
                  }}
                  className="flex-1 py-2 bg-transparent border border-red-500/30 text-red-500 rounded text-sm font-rajdhani hover:bg-red-500/10 transition-colors"
                >
                  RESET
                </button>
              </div>
              
              <button
                onClick={() => setShowBpmTapper(false)}
                className="w-full py-2 bg-transparent border border-gray-600 text-gray-400 rounded text-sm font-rajdhani hover:bg-gray-800 transition-colors"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowShortcutsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border-2 border-neon-cyan rounded-lg p-8 shadow-[0_0_50px_rgba(0,255,255,0.5)] max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-orbitron text-neon-cyan mb-6 text-center">KEYBOARD SHORTCUTS</h2>
              
              <div className="space-y-6">
                {/* Playback Section */}
                <div>
                  <h3 className="text-lg font-rajdhani text-neon-pink mb-3">PLAYBACK</h3>
                  <div className="space-y-2">
                    <ShortcutRow keys={['Space']} description="Play / Pause" />
                    <ShortcutRow keys={['←']} description="Seek -1 second" />
                    <ShortcutRow keys={['→']} description="Seek +1 second" />
                  </div>
                </div>
                
                {/* Editing Section */}
                <div>
                  <h3 className="text-lg font-rajdhani text-neon-pink mb-3">EDITING</h3>
                  <div className="space-y-2">
                    <ShortcutRow keys={['Click']} description="Place TAP note or select existing" />
                    <ShortcutRow keys={['Click + Drag']} description="Create HOLD note" />
                    <ShortcutRow keys={['Ctrl', 'Click']} description="Multi-select notes" />
                    <ShortcutRow keys={['Del']} description="Delete selected note(s)" />
                    <ShortcutRow keys={['Backspace']} description="Delete selected note(s)" />
                  </div>
                </div>
                
                {/* Undo/Redo Section */}
                <div>
                  <h3 className="text-lg font-rajdhani text-neon-pink mb-3">HISTORY</h3>
                  <div className="space-y-2">
                    <ShortcutRow keys={['Ctrl', 'Z']} description="Undo" />
                    <ShortcutRow keys={['Ctrl', 'Y']} description="Redo" />
                    <ShortcutRow keys={['Ctrl', 'Shift', 'Z']} description="Redo" />
                  </div>
                </div>
                
                {/* Tools Section */}
                <div>
                  <h3 className="text-lg font-rajdhani text-neon-pink mb-3">TOOLS</h3>
                  <div className="space-y-2">
                    <ShortcutRow keys={['Space']} description="Tap BPM (when BPM tapper open)" />
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="w-full mt-6 py-2 bg-transparent border border-gray-600 text-gray-400 rounded text-sm font-rajdhani hover:bg-gray-800 transition-colors"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper component for shortcut display
function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800">
      <div className="flex gap-2">
        {keys.map((key, idx) => (
          <span key={idx}>
            <kbd className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-sm font-rajdhani text-neon-cyan">
              {key}
            </kbd>
            {idx < keys.length - 1 && <span className="mx-2 text-gray-600">+</span>}
          </span>
        ))}
      </div>
      <span className="text-gray-400 font-rajdhani text-sm">{description}</span>
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  icon,
  collapsed,
  onToggleCollapse,
  onPopout,
  onClose,
  children
}: {
  title: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPopout: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-neon-cyan/30">
      <div className="p-3 flex items-center justify-between bg-gray-800/50 hover:bg-gray-800 transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-rajdhani text-neon-cyan">{title}</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggleCollapse}
            className="p-1 text-neon-cyan/70 hover:text-neon-cyan transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={onPopout}
            className="p-1 text-neon-cyan/70 hover:text-neon-cyan transition-colors"
            title="Pop out"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-red-500/70 hover:text-red-500 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
