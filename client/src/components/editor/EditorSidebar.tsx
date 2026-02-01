import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Settings, Clock, FileText, Wrench } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { ToolsSection } from './ToolsSection';
import { PlaybackSection } from './PlaybackSection';
import { MetadataSection } from './MetadataSection';
import { BeatmapTextSection } from './BeatmapTextSection';
import type { Difficulty } from '@/lib/editor/beatmapTextUtils';

interface EditorSidebarProps {
  isPanelOpen: boolean;
  panelWidth: number;
  panelSide: 'left' | 'right';
  sections: {
    tools: { visible: boolean; collapsed: boolean; poppedOut: boolean };
    playback: { visible: boolean; collapsed: boolean; poppedOut: boolean };
    metadata: { visible: boolean; collapsed: boolean; poppedOut: boolean };
    beatmapText: { visible: boolean; collapsed: boolean; poppedOut: boolean };
  };
  setPanelSide: (side: 'left' | 'right') => void;
  toggleSectionCollapse: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText') => void;
  toggleSectionPopout: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText') => void;
  closeSectionCompletely: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText') => void;
  reopenSection: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText') => void;
  currentDifficulty: Difficulty;
  setCurrentDifficulty: (diff: Difficulty) => void;
  difficultyNotes: Record<Difficulty, any[]>;
  isEditMode: boolean;
  setIsEditMode: (mode: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  setSnapDivision: (div: 1 | 2 | 4 | 8 | 16) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  deleteSelectedNote: () => void;
  selectedNoteId: string | null;
  selectedNoteIds: string[];
  copyToClipboard: () => void;
  downloadBeatmap: () => void;
  showBpmTapper: boolean;
  setShowBpmTapper: (show: boolean) => void;
  setShowShortcutsModal: (show: boolean) => void;
  validationIssues: Array<{ message: string }>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  metadata: any;
  updateMetadata: (updates: any) => void;
  loopStart: number | null;
  loopEnd: number | null;
  setLoopStart: (time: number | null) => void;
  setLoopEnd: (time: number | null) => void;
  beatmapText: string;
  setBeatmapText: (text: string) => void;
  updateFromText: (text: string) => void;
  resizeRef: React.RefObject<HTMLDivElement>;
  setIsResizing: (resizing: boolean) => void;
  videoDurationMs?: number;
}

export function EditorSidebar({
  isPanelOpen,
  panelWidth,
  panelSide,
  sections,
  setPanelSide,
  toggleSectionCollapse,
  toggleSectionPopout,
  closeSectionCompletely,
  reopenSection,
  currentDifficulty,
  setCurrentDifficulty,
  difficultyNotes,
  isEditMode,
  setIsEditMode,
  snapEnabled,
  setSnapEnabled,
  snapDivision,
  setSnapDivision,
  canUndo,
  canRedo,
  undo,
  redo,
  deleteSelectedNote,
  selectedNoteId,
  selectedNoteIds,
  copyToClipboard,
  downloadBeatmap,
  showBpmTapper,
  setShowBpmTapper,
  setShowShortcutsModal,
  validationIssues,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  metadata,
  updateMetadata,
  loopStart,
  loopEnd,
  setLoopStart,
  setLoopEnd,
  beatmapText,
  setBeatmapText,
  updateFromText,
  resizeRef,
  setIsResizing,
  videoDurationMs,
}: EditorSidebarProps) {
  return (
    <AnimatePresence>
      {isPanelOpen && (
        <motion.div
          initial={{ x: panelSide === 'left' ? -panelWidth : panelWidth, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: panelSide === 'left' ? -panelWidth : panelWidth, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`fixed top-0 ${panelSide === 'left' ? 'left-0 border-r' : 'right-0 border-l'} border-neon-cyan/30 h-full bg-black/95 backdrop-blur-sm z-50 flex flex-col`}
          style={{ width: `${panelWidth}px` }}
        >
          {/* Header */}
          <div className="p-4 border-b border-neon-cyan/30 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-rajdhani text-neon-cyan font-bold">BEATMAP EDITOR</h1>
              <button
                onClick={() => setPanelSide(panelSide === 'left' ? 'right' : 'left')}
                className="p-2 hover:bg-neon-cyan/20 rounded transition-colors"
                title="Switch panel side"
              >
                <ArrowLeftRight className="w-5 h-5 text-neon-cyan" />
              </button>
            </div>

            {/* Closed Sections Toolbar */}
            {(!sections.tools.visible || !sections.playback.visible || !sections.metadata.visible || !sections.beatmapText.visible) && (
              <div className="flex gap-2 flex-wrap mb-3">
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
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3 py-1 text-sm font-rajdhani rounded border transition-colors ${
                  isEditMode
                    ? 'bg-neon-pink border-neon-pink text-black'
                    : 'bg-transparent border-gray-600 text-gray-400'
                }`}
              >
                EDIT MODE
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

          {/* Scrollable Sections */}
          <div className="flex-1 overflow-y-auto">
            {sections.tools.visible && !sections.tools.poppedOut && (
              <CollapsibleSection
                title="TOOLS"
                icon={<Wrench className="w-4 h-4" />}
                collapsed={sections.tools.collapsed}
                onToggleCollapse={() => toggleSectionCollapse('tools')}
                onPopout={() => toggleSectionPopout('tools')}
                onClose={() => closeSectionCompletely('tools')}
              >
                <ToolsSection
                  snapEnabled={snapEnabled}
                  snapDivision={snapDivision}
                  setSnapDivision={setSnapDivision}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  undo={undo}
                  redo={redo}
                  deleteSelectedNote={deleteSelectedNote}
                  selectedNoteId={selectedNoteId}
                  selectedNoteIds={selectedNoteIds}
                  copyToClipboard={copyToClipboard}
                  downloadBeatmap={downloadBeatmap}
                  showBpmTapper={showBpmTapper}
                  setShowBpmTapper={setShowBpmTapper}
                  setShowShortcutsModal={setShowShortcutsModal}
                  validationIssues={validationIssues}
                />
              </CollapsibleSection>
            )}

            {sections.playback.visible && !sections.playback.poppedOut && (
              <CollapsibleSection
                title="PLAYBACK"
                icon={<Clock className="w-4 h-4" />}
                collapsed={sections.playback.collapsed}
                onToggleCollapse={() => toggleSectionCollapse('playback')}
                onPopout={() => toggleSectionPopout('playback')}
                onClose={() => closeSectionCompletely('playback')}
              >
                <PlaybackSection
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  currentTime={currentTime}
                  setCurrentTime={setCurrentTime}
                  metadata={metadata}
                  loopStart={loopStart}
                  loopEnd={loopEnd}
                  setLoopStart={setLoopStart}
                  setLoopEnd={setLoopEnd}
                />
              </CollapsibleSection>
            )}

            {sections.metadata.visible && !sections.metadata.poppedOut && (
              <CollapsibleSection
                title="METADATA"
                icon={<Settings className="w-4 h-4" />}
                collapsed={sections.metadata.collapsed}
                onToggleCollapse={() => toggleSectionCollapse('metadata')}
                onPopout={() => toggleSectionPopout('metadata')}
                onClose={() => closeSectionCompletely('metadata')}
              >
                <MetadataSection
                  metadata={metadata}
                  updateMetadata={updateMetadata}
                  videoDurationMs={videoDurationMs}
                />
              </CollapsibleSection>
            )}

            {sections.beatmapText.visible && !sections.beatmapText.poppedOut && (
              <CollapsibleSection
                title="BEATMAP TEXT"
                icon={<FileText className="w-4 h-4" />}
                collapsed={sections.beatmapText.collapsed}
                onToggleCollapse={() => toggleSectionCollapse('beatmapText')}
                onPopout={() => toggleSectionPopout('beatmapText')}
                onClose={() => closeSectionCompletely('beatmapText')}
              >
                <BeatmapTextSection
                  beatmapText={beatmapText}
                  setBeatmapText={setBeatmapText}
                  updateFromText={updateFromText}
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
  );
}
