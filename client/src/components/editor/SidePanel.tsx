import { motion } from 'framer-motion';
import { ArrowLeftRight } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import type { Difficulty } from '@/lib/editor/beatmapTextUtils';

// Side panel component for left/right editor panels
type SectionName = 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics' | 'statistics';

interface SidePanelProps {
  side: 'left' | 'right';
  panelWidth: number;
  sections: SectionName[];
  sectionConfigs: Record<SectionName, { title: string; icon: React.ReactNode }>;
  sectionStates: Record<SectionName, { visible: boolean; collapsed: boolean; poppedOut: boolean; side: 'left' | 'right'; floatPosition: { x: number; y: number } }>;
  toggleSectionCollapse: (section: SectionName) => void;
  toggleSectionPopout: (section: SectionName) => void;
  closeSectionCompletely: (section: SectionName) => void;
  setSectionSide: (section: SectionName, side: 'left' | 'right') => void;
  reopenSection: (section: SectionName) => void;
  renderSectionContent: (section: SectionName) => React.ReactNode;
  currentDifficulty: Difficulty;
  setCurrentDifficulty: (diff: Difficulty) => void;
  difficultyNotes: Record<Difficulty, any[]>;
  editorMode: boolean;
  setEditorMode: (mode: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  resizeRef: React.RefObject<HTMLDivElement | null>;
  setIsResizing: (resizing: boolean) => void;
  onCollapseSide: () => void;
  clearSelection: () => void;
}

export function SidePanel({
  side,
  panelWidth,
  sections,
  sectionConfigs,
  sectionStates,
  toggleSectionCollapse,
  toggleSectionPopout,
  closeSectionCompletely,
  setSectionSide,
  reopenSection,
  renderSectionContent,
  currentDifficulty,
  setCurrentDifficulty,
  difficultyNotes,
  editorMode,
  setEditorMode,
  snapEnabled,
  setSnapEnabled,
  resizeRef,
  setIsResizing,
  onCollapseSide,
  clearSelection,
}: SidePanelProps) {
  // Get all sections that aren't visible on this side for the reopen toolbar
  const allSections: SectionName[] = ['tools', 'playback', 'metadata', 'beatmapText', 'graphics', 'statistics'];
  const hiddenSections = allSections.filter(
    (name) => !sectionStates[name].visible || sectionStates[name].poppedOut || sectionStates[name].side !== side
  );

  return (
    <motion.div
      initial={{ x: side === 'left' ? -panelWidth : panelWidth, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: side === 'left' ? -panelWidth : panelWidth, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`fixed top-0 ${side === 'left' ? 'left-0 border-r' : 'right-0 border-l'} border-neon-cyan/30 h-full bg-black/95 backdrop-blur-sm z-50 flex flex-col pointer-events-auto`}
      style={{ width: `${panelWidth}px`, pointerEvents: 'auto' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-neon-cyan/30 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-rajdhani text-neon-cyan font-bold">BEATMAP EDITOR</h1>
          <button
            onClick={onCollapseSide}
            className="p-1 hover:bg-neon-cyan/10 rounded transition-colors group"
            title={`Collapse ${side} panel`}
          >
            {side === 'left' ? (
              <ArrowLeftRight className="w-5 h-5 text-gray-400 group-hover:text-neon-cyan rotate-180" />
            ) : (
              <ArrowLeftRight className="w-5 h-5 text-gray-400 group-hover:text-neon-cyan" />
            )}
          </button>
        </div>

        {/* Closed Sections Toolbar */}
        {hiddenSections.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {hiddenSections.map((section) => (
              <button
                key={section}
                onClick={() => {
                  if (sectionStates[section].side !== side) {
                    setSectionSide(section, side);
                  }
                  if (!sectionStates[section].visible) {
                    reopenSection(section);
                  }
                  if (sectionStates[section].poppedOut) {
                    toggleSectionPopout(section);
                  }
                }}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded hover:border-neon-cyan hover:text-neon-cyan transition-colors flex items-center gap-1"
                title={`Reopen ${sectionConfigs[section].title}`}
              >
                {sectionConfigs[section].icon}
                {sectionConfigs[section].title}
              </button>
            ))}
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

      {/* Scrollable Sections */}
      <div 
        className="flex-1 overflow-y-auto"
        onClick={(e) => {
          // Deselect notes when clicking on empty space in the panel
          if (e.target === e.currentTarget) {
            clearSelection();
          }
        }}
      >
        {sections.map((section) => (
          <CollapsibleSection
            key={section}
            title={sectionConfigs[section].title}
            icon={sectionConfigs[section].icon}
            collapsed={sectionStates[section].collapsed}
            onToggleCollapse={() => toggleSectionCollapse(section)}
            onPopout={() => toggleSectionPopout(section)}
            onClose={() => closeSectionCompletely(section)}
            onSwitchSide={() => setSectionSide(section, side === 'left' ? 'right' : 'left')}
          >
            {renderSectionContent(section)}
          </CollapsibleSection>
        ))}
      </div>

      {/* Resize Handle */}
      <div
        ref={resizeRef}
        onMouseDown={() => setIsResizing(true)}
        className={`absolute ${side === 'left' ? 'right-0' : 'left-0'} top-0 w-1 h-full cursor-ew-resize hover:bg-neon-cyan/50 transition-colors`}
      />
    </motion.div>
  );
}
