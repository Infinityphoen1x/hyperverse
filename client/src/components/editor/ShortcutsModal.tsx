import { motion } from 'framer-motion';
import { X, RotateCcw, Edit2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useShortcutsStore } from '@/stores/useShortcutsStore';
import { audioManager } from '@/lib/audio/audioManager';

interface ShortcutsModalProps {
  onClose: () => void;
}

interface ShortcutRowProps {
  id: string;
  keys: string;
  description: string;
  onEdit: (id: string) => void;
  onReset: (id: string) => void;
  isEditing: boolean;
  hasModifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean };
}

function ShortcutRow({ id, keys, description, onEdit, onReset, isEditing, hasModifiers }: ShortcutRowProps) {
  const displayKey = [
    hasModifiers?.ctrl ? 'Ctrl' : '',
    hasModifiers?.shift ? 'Shift' : '',
    hasModifiers?.alt ? 'Alt' : '',
    keys
  ].filter(Boolean).join('+');

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0 group">
      <span className="text-sm font-rajdhani text-gray-300">{description}</span>
      <div className="flex items-center gap-2">
        <kbd className={`px-2 py-1 border rounded text-xs font-mono ${
          isEditing 
            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan animate-pulse' 
            : 'bg-gray-800 border-gray-600 text-neon-cyan'
        }`}>
          {isEditing ? 'Press key...' : displayKey}
        </kbd>
        <button
          onClick={() => onEdit(id)}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neon-cyan/20 rounded transition-all"
          title="Edit binding"
        >
          <Edit2 className="w-3 h-3 text-neon-cyan" />
        </button>
        <button
          onClick={() => onReset(id)}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-yellow-500/20 rounded transition-all"
          title="Reset to default"
        >
          <RotateCcw className="w-3 h-3 text-yellow-500" />
        </button>
      </div>
    </div>
  );
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  const { bindings, setBinding, resetBinding, resetAll } = useShortcutsStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleReset = (id: string) => {
    resetBinding(id);
    audioManager.play('tapHit');
  };

  const handleResetAll = () => {
    resetAll();
    audioManager.play('difficultySettingsApply');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!editingId) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Cancel on Escape
    if (e.key === 'Escape') {
      setEditingId(null);
      return;
    }
    
    // Capture the key and modifiers
    const key = e.key;
    const modifiers = {
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };
    
    setBinding(editingId, key, modifiers);
    setEditingId(null);
    audioManager.play('tapHit');
  };

  // Attach global key listener when editing
  useEffect(() => {
    if (editingId) {
      const listener = (e: KeyboardEvent) => handleKeyDown(e);
      window.addEventListener('keydown', listener);
      return () => window.removeEventListener('keydown', listener);
    }
  }, [editingId]);

  const categorizedBindings = {
    general: bindings.filter(b => b.category === 'general'),
    editing: bindings.filter(b => b.category === 'editing'),
    playback: bindings.filter(b => b.category === 'playback'),
    export: bindings.filter(b => b.category === 'export'),
  };
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              className="px-3 py-1 bg-yellow-500/20 border border-yellow-500 text-yellow-500 rounded hover:bg-yellow-500/30 transition-colors text-xs font-rajdhani flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              RESET ALL
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Click the edit icon next to any shortcut to customize it. Press Escape to cancel editing.
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="text-md font-rajdhani text-neon-pink font-bold mb-2">GENERAL</h3>
            <div className="space-y-1">
              {categorizedBindings.general.map(binding => (
                <ShortcutRow
                  key={binding.id}
                  id={binding.id}
                  keys={binding.currentKey}
                  description={binding.description}
                  onEdit={handleEdit}
                  onReset={handleReset}
                  isEditing={editingId === binding.id}
                  hasModifiers={{
                    ctrl: binding.ctrlRequired,
                    shift: binding.shiftRequired,
                    alt: binding.altRequired,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-md font-rajdhani text-neon-pink font-bold mb-2">NOTE EDITING</h3>
            <div className="space-y-1">
              {categorizedBindings.editing.map(binding => (
                <ShortcutRow
                  key={binding.id}
                  id={binding.id}
                  keys={binding.currentKey}
                  description={binding.description}
                  onEdit={handleEdit}
                  onReset={handleReset}
                  isEditing={editingId === binding.id}
                  hasModifiers={{
                    ctrl: binding.ctrlRequired,
                    shift: binding.shiftRequired,
                    alt: binding.altRequired,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-md font-rajdhani text-neon-pink font-bold mb-2">PLAYBACK</h3>
            <div className="space-y-1">
              {categorizedBindings.playback.map(binding => (
                <ShortcutRow
                  key={binding.id}
                  id={binding.id}
                  keys={binding.currentKey}
                  description={binding.description}
                  onEdit={handleEdit}
                  onReset={handleReset}
                  isEditing={editingId === binding.id}
                  hasModifiers={{
                    ctrl: binding.ctrlRequired,
                    shift: binding.shiftRequired,
                    alt: binding.altRequired,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-md font-rajdhani text-neon-pink font-bold mb-2">EXPORT</h3>
            <div className="space-y-1">
              {categorizedBindings.export.map(binding => (
                <ShortcutRow
                  key={binding.id}
                  id={binding.id}
                  keys={binding.currentKey}
                  description={binding.description}
                  onEdit={handleEdit}
                  onReset={handleReset}
                  isEditing={editingId === binding.id}
                  hasModifiers={{
                    ctrl: binding.ctrlRequired,
                    shift: binding.shiftRequired,
                    alt: binding.altRequired,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
