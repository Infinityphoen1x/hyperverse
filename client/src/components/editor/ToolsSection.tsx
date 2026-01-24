import { Copy, Download, Music, Keyboard, AlertTriangle } from 'lucide-react';
import { audioManager } from '@/lib/audio/audioManager';
import type { Difficulty } from '@/lib/editor/beatmapTextUtils';

interface ToolsSectionProps {
  snapEnabled: boolean;
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
}

export function ToolsSection({
  snapEnabled,
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
}: ToolsSectionProps) {
  return (
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
  );
}
