import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

interface ShortcutRowProps {
  keys: string;
  description: string;
}

function ShortcutRow({ keys, description }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
      <span className="text-sm font-rajdhani text-gray-300">{description}</span>
      <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs font-mono text-neon-cyan">
        {keys}
      </kbd>
    </div>
  );
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 border-2 border-neon-cyan rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-rajdhani text-neon-cyan font-bold">KEYBOARD SHORTCUTS</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-md font-rajdhani text-neon-pink font-bold mb-2">GENERAL</h3>
            <div className="space-y-1">
              <ShortcutRow keys="Space" description="Play/Pause" />
              <ShortcutRow keys="E" description="Toggle Editor Mode" />
              <ShortcutRow keys="S" description="Toggle Snap" />
              <ShortcutRow keys="Ctrl+Z" description="Undo" />
              <ShortcutRow keys="Ctrl+Y" description="Redo" />
              <ShortcutRow keys="Esc" description="Deselect All" />
            </div>
          </div>

          <div>
            <h3 className="text-md font-rajdhani text-neon-pink font-bold mb-2">NOTE EDITING</h3>
            <div className="space-y-1">
              <ShortcutRow keys="Click" description="Add Note (Editor Mode)" />
              <ShortcutRow keys="Ctrl+Click" description="Multi-Select" />
              <ShortcutRow keys="Delete" description="Delete Selected" />
              <ShortcutRow keys="1-6" description="Select Lane" />
              <ShortcutRow keys="T" description="Toggle Note Type (Tap/Hold)" />
            </div>
          </div>

          <div>
            <h3 className="text-md font-rajdhani text-neon-pink font-bold mb-2">PLAYBACK</h3>
            <div className="space-y-1">
              <ShortcutRow keys="←" description="Seek -1s" />
              <ShortcutRow keys="→" description="Seek +1s" />
              <ShortcutRow keys="↑" description="Seek +5s" />
              <ShortcutRow keys="↓" description="Seek -5s" />
            </div>
          </div>

          <div>
            <h3 className="text-md font-rajdhani text-neon-pink font-bold mb-2">EXPORT</h3>
            <div className="space-y-1">
              <ShortcutRow keys="Ctrl+C" description="Copy to Clipboard" />
              <ShortcutRow keys="Ctrl+S" description="Download Beatmap" />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
