interface EditorStatusBarProps {
  currentTime: number;
  noteCount: number;
  selectedCount: number;
  isDragging: boolean;
  snapEnabled: boolean;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  bpm: number;
}

export function EditorStatusBar({
  currentTime,
  noteCount,
  selectedCount,
  isDragging,
  snapEnabled,
  snapDivision,
  bpm
}: EditorStatusBarProps) {
  return (
    <div className="absolute top-20 right-4 space-y-2">
      <div className="bg-black/80 border border-neon-cyan/50 px-4 py-2 rounded font-rajdhani text-neon-cyan">
        TIME: {currentTime.toFixed(0)}ms | NOTES: {noteCount}
      </div>
      {selectedCount > 1 && (
        <div className="bg-black/80 border border-yellow-500/50 px-4 py-2 rounded font-rajdhani text-yellow-500 text-sm">
          {selectedCount} NOTES SELECTED
        </div>
      )}
      {isDragging && (
        <div className="bg-black/80 border border-yellow-500/50 px-4 py-2 rounded font-rajdhani text-yellow-500 text-sm">
          DRAG TO CREATE HOLD
        </div>
      )}
      {snapEnabled && (
        <div className="bg-black/80 border border-neon-cyan/50 px-4 py-2 rounded font-rajdhani text-neon-cyan text-sm">
          SNAP: 1/{snapDivision} @ {bpm} BPM
        </div>
      )}
    </div>
  );
}
