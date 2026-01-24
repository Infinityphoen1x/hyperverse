import { AnimatePresence } from 'framer-motion';
import { Settings, Clock, FileText, Wrench, ArrowLeftRight, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { SidePanel } from '@/components/editor/SidePanel';
import { FloatingWindow } from '@/components/editor/FloatingWindow';
import { ToolsSection } from './ToolsSection';
import { PlaybackSection } from './PlaybackSection';
import { MetadataSection } from './MetadataSection';
import { BeatmapTextSection } from './BeatmapTextSection';
import { GraphicsSection } from './GraphicsSection';
import type { Difficulty } from '@/lib/editor/beatmapTextUtils';

type SectionName = 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics';

interface Section {
  visible: boolean;
  collapsed: boolean;
  poppedOut: boolean;
  side: 'left' | 'right';
  floatPosition: { x: number; y: number };
}

interface EditorSidebarManagerProps {
  panelWidth: number;
  leftSideCollapsed: boolean;
  rightSideCollapsed: boolean;
  setLeftSideCollapsed: (collapsed: boolean) => void;
  setRightSideCollapsed: (collapsed: boolean) => void;
  sections: Record<SectionName, Section>;
  toggleSectionCollapse: (section: SectionName) => void;
  toggleSectionPopout: (section: SectionName) => void;
  closeSectionCompletely: (section: SectionName) => void;
  reopenSection: (section: SectionName) => void;
  setSectionSide: (section: SectionName, side: 'left' | 'right') => void;
  setSectionFloatPosition: (section: SectionName, position: { x: number; y: number }) => void;
  currentDifficulty: Difficulty;
  setCurrentDifficulty: (diff: Difficulty) => void;
  difficultyNotes: Record<Difficulty, any[]>;
  editorMode: boolean;
  setEditorMode: (mode: boolean) => void;
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
  onPlay?: () => void;
  onPause?: () => void;
  metadata: any;
  updateMetadata: (updates: any) => void;
  loopStart: number | null;
  loopEnd: number | null;
  setLoopStart: (time: number | null) => void;
  setLoopEnd: (time: number | null) => void;
  beatmapText: string;
  setBeatmapText: (text: string) => void;
  updateFromText: (text: string) => void;
  resizeRef: React.RefObject<HTMLDivElement | null>;
  setIsResizing: (resizing: boolean) => void;
  glowEnabled: boolean;
  setGlowEnabled: (enabled: boolean) => void;
  dynamicVPEnabled: boolean;
  setDynamicVPEnabled: (enabled: boolean) => void;
  zoomEnabled: boolean;
  setZoomEnabled: (enabled: boolean) => void;
  judgementLinesEnabled: boolean;
  setJudgementLinesEnabled: (enabled: boolean) => void;
  spinEnabled: boolean;
  setSpinEnabled: (enabled: boolean) => void;
}

export function EditorSidebarManager(props: EditorSidebarManagerProps) {
  const sectionConfigs = {
    tools: { title: 'TOOLS', icon: <Wrench className="w-4 h-4" /> },
    playback: { title: 'PLAYBACK', icon: <Clock className="w-4 h-4" /> },
    metadata: { title: 'METADATA', icon: <Settings className="w-4 h-4" /> },
    beatmapText: { title: 'BEATMAP TEXT', icon: <FileText className="w-4 h-4" /> },
    graphics: { title: 'GRAPHICS', icon: <Monitor className="w-4 h-4" /> },
  };

  const renderSectionContent = (section: SectionName) => {
    switch (section) {
      case 'tools':
        return (
          <ToolsSection
            snapEnabled={props.snapEnabled}
            snapDivision={props.snapDivision}
            setSnapDivision={props.setSnapDivision}
            canUndo={props.canUndo}
            canRedo={props.canRedo}
            undo={props.undo}
            redo={props.redo}
            deleteSelectedNote={props.deleteSelectedNote}
            selectedNoteId={props.selectedNoteId}
            selectedNoteIds={props.selectedNoteIds}
            copyToClipboard={props.copyToClipboard}
            downloadBeatmap={props.downloadBeatmap}
            showBpmTapper={props.showBpmTapper}
            setShowBpmTapper={props.setShowBpmTapper}
            setShowShortcutsModal={props.setShowShortcutsModal}
            validationIssues={props.validationIssues}
          />
        );
      case 'playback':
        return (
          <PlaybackSection
            isPlaying={props.isPlaying}
            setIsPlaying={props.setIsPlaying}
            onPlay={props.onPlay}
            onPause={props.onPause}
            currentTime={props.currentTime}
            setCurrentTime={props.setCurrentTime}
            metadata={props.metadata}
            loopStart={props.loopStart}
            loopEnd={props.loopEnd}
            setLoopStart={props.setLoopStart}
            setLoopEnd={props.setLoopEnd}
          />
        );
      case 'metadata':
        return (
          <MetadataSection
            metadata={props.metadata}
            updateMetadata={props.updateMetadata}
          />
        );
      case 'beatmapText':
        return (
          <BeatmapTextSection
            beatmapText={props.beatmapText}
            setBeatmapText={props.setBeatmapText}
            updateFromText={props.updateFromText}
          />
        );
      case 'graphics':
        return (
          <GraphicsSection
            glowEnabled={props.glowEnabled}
            setGlowEnabled={props.setGlowEnabled}
            dynamicVPEnabled={props.dynamicVPEnabled}
            setDynamicVPEnabled={props.setDynamicVPEnabled}
            zoomEnabled={props.zoomEnabled}
            setZoomEnabled={props.setZoomEnabled}
            judgementLinesEnabled={props.judgementLinesEnabled}
            setJudgementLinesEnabled={props.setJudgementLinesEnabled}
            spinEnabled={props.spinEnabled}
            setSpinEnabled={props.setSpinEnabled}
          />
        );
    }
  };

  // Separate sections by side and whether they're popped out
  const leftSections = (Object.keys(props.sections) as SectionName[]).filter(
    (name) => props.sections[name].visible && !props.sections[name].poppedOut && props.sections[name].side === 'left'
  );
  const rightSections = (Object.keys(props.sections) as SectionName[]).filter(
    (name) => props.sections[name].visible && !props.sections[name].poppedOut && props.sections[name].side === 'right'
  );
  const floatingSections = (Object.keys(props.sections) as SectionName[]).filter(
    (name) => props.sections[name].visible && props.sections[name].poppedOut
  );

  return (
    <>
      {/* Left Panel */}
      {!props.leftSideCollapsed && leftSections.length > 0 && (
        <SidePanel
          side="left"
          panelWidth={props.panelWidth}
          sections={leftSections}
          sectionConfigs={sectionConfigs}
          sectionStates={props.sections}
          toggleSectionCollapse={props.toggleSectionCollapse}
          toggleSectionPopout={props.toggleSectionPopout}
          closeSectionCompletely={props.closeSectionCompletely}
          setSectionSide={props.setSectionSide}
          reopenSection={props.reopenSection}
          renderSectionContent={renderSectionContent}
          currentDifficulty={props.currentDifficulty}
          setCurrentDifficulty={props.setCurrentDifficulty}
          difficultyNotes={props.difficultyNotes}
          editorMode={props.editorMode}
          setEditorMode={props.setEditorMode}
          snapEnabled={props.snapEnabled}
          setSnapEnabled={props.setSnapEnabled}
          resizeRef={props.resizeRef}
          setIsResizing={props.setIsResizing}
          onCollapseSide={() => props.setLeftSideCollapsed(true)}
        />
      )}

      {/* Left Panel Collapse Toggle */}
      {props.leftSideCollapsed && (
        <button
          onClick={() => props.setLeftSideCollapsed(false)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-black/95 border border-neon-cyan/30 border-l-0 rounded-r-lg p-2 hover:bg-neon-cyan/10 transition-colors group"
          title="Show left panel"
        >
          <ChevronRight className="w-5 h-5 text-neon-cyan group-hover:text-white" />
        </button>
      )}

      {/* Right Panel */}
      {!props.rightSideCollapsed && rightSections.length > 0 && (
        <SidePanel
          side="right"
          panelWidth={props.panelWidth}
          sections={rightSections}
          sectionConfigs={sectionConfigs}
          sectionStates={props.sections}
          toggleSectionCollapse={props.toggleSectionCollapse}
          toggleSectionPopout={props.toggleSectionPopout}
          closeSectionCompletely={props.closeSectionCompletely}
          setSectionSide={props.setSectionSide}
          reopenSection={props.reopenSection}
          renderSectionContent={renderSectionContent}
          currentDifficulty={props.currentDifficulty}
          setCurrentDifficulty={props.setCurrentDifficulty}
          difficultyNotes={props.difficultyNotes}
          editorMode={props.editorMode}
          setEditorMode={props.setEditorMode}
          snapEnabled={props.snapEnabled}
          setSnapEnabled={props.setSnapEnabled}
          resizeRef={props.resizeRef}
          setIsResizing={props.setIsResizing}
          onCollapseSide={() => props.setRightSideCollapsed(true)}
        />
      )}

      {/* Right Panel Collapse Toggle */}
      {props.rightSideCollapsed && (
        <button
          onClick={() => props.setRightSideCollapsed(false)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-black/95 border border-neon-cyan/30 border-r-0 rounded-l-lg p-2 hover:bg-neon-cyan/10 transition-colors group"
          title="Show right panel"
        >
          <ChevronLeft className="w-5 h-5 text-neon-cyan group-hover:text-white" />
        </button>
      )}

      {/* Floating Windows */}
      <AnimatePresence>
        {floatingSections.map((section) => (
          <FloatingWindow
            key={section}
            title={sectionConfigs[section].title}
            icon={sectionConfigs[section].icon}
            initialPosition={props.sections[section].floatPosition}
            collapsed={props.sections[section].collapsed}
            onToggleCollapse={() => props.toggleSectionCollapse(section)}
            onClose={() => props.toggleSectionPopout(section)}
            onDock={(side) => {
              props.toggleSectionPopout(section);
              props.setSectionSide(section, side);
            }}
            onPositionChange={(position) => props.setSectionFloatPosition(section, position)}
          >
            {renderSectionContent(section)}
          </FloatingWindow>
        ))}
      </AnimatePresence>
    </>
  );
}
