import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShortcutBinding {
  id: string;
  name: string;
  category: 'general' | 'editing' | 'playback' | 'export';
  defaultKey: string;
  currentKey: string;
  description: string;
  ctrlRequired?: boolean;
  shiftRequired?: boolean;
  altRequired?: boolean;
}

interface ShortcutsStoreState {
  bindings: ShortcutBinding[];
  setBinding: (id: string, newKey: string, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }) => void;
  resetBinding: (id: string) => void;
  resetAll: () => void;
  getBinding: (id: string) => ShortcutBinding | undefined;
}

const DEFAULT_BINDINGS: ShortcutBinding[] = [
  // General
  { id: 'playPause', name: 'Play/Pause', category: 'general', defaultKey: ' ', currentKey: ' ', description: 'Toggle playback' },
  { id: 'toggleEditor', name: 'Toggle Edit Mode', category: 'general', defaultKey: 'e', currentKey: 'e', description: 'Enable/disable note editing & placement' },
  { id: 'toggleSnap', name: 'Toggle Snap', category: 'general', defaultKey: 's', currentKey: 's', description: 'Enable/disable grid snapping' },
  { id: 'undo', name: 'Undo', category: 'general', defaultKey: 'z', currentKey: 'z', description: 'Undo last change', ctrlRequired: true },
  { id: 'redo', name: 'Redo', category: 'general', defaultKey: 'y', currentKey: 'y', description: 'Redo last undone change', ctrlRequired: true },
  { id: 'deselectAll', name: 'Deselect All', category: 'general', defaultKey: 'Escape', currentKey: 'Escape', description: 'Clear note selection' },
  
  // Editing
  { id: 'deleteNote', name: 'Delete Selected', category: 'editing', defaultKey: 'Delete', currentKey: 'Delete', description: 'Delete selected notes' },
  { id: 'selectLane0', name: 'Select Position 0', category: 'editing', defaultKey: '1', currentKey: '1', description: 'Jump to position 0 (W)' },
  { id: 'selectLane1', name: 'Select Position 1', category: 'editing', defaultKey: '2', currentKey: '2', description: 'Jump to position 1 (O)' },
  { id: 'selectLane2', name: 'Select Position 2', category: 'editing', defaultKey: '3', currentKey: '3', description: 'Jump to position 2 (I)' },
  { id: 'selectLane3', name: 'Select Position 3', category: 'editing', defaultKey: '4', currentKey: '4', description: 'Jump to position 3 (E)' },
  { id: 'selectLaneNeg1', name: 'Select Position -1', category: 'editing', defaultKey: '5', currentKey: '5', description: 'Jump to position -1 (Q)' },
  { id: 'selectLaneNeg2', name: 'Select Position -2', category: 'editing', defaultKey: '6', currentKey: '6', description: 'Jump to position -2 (P)' },
  { id: 'editProperties', name: 'Edit Properties', category: 'editing', defaultKey: 'Enter', currentKey: 'Enter', description: 'Edit note type, timing & duration' },
  
  // Playback
  { id: 'seekBackward1', name: 'Seek -1s', category: 'playback', defaultKey: 'ArrowLeft', currentKey: 'ArrowLeft', description: 'Rewind 1 second' },
  { id: 'seekForward1', name: 'Seek +1s', category: 'playback', defaultKey: 'ArrowRight', currentKey: 'ArrowRight', description: 'Forward 1 second' },
  { id: 'seekForward5', name: 'Seek +5s', category: 'playback', defaultKey: 'ArrowUp', currentKey: 'ArrowUp', description: 'Forward 5 seconds' },
  { id: 'seekBackward5', name: 'Seek -5s', category: 'playback', defaultKey: 'ArrowDown', currentKey: 'ArrowDown', description: 'Rewind 5 seconds' },
  
  // Export
  { id: 'copyClipboard', name: 'Copy to Clipboard', category: 'export', defaultKey: 'c', currentKey: 'c', description: 'Copy beatmap text', ctrlRequired: true },
  { id: 'downloadBeatmap', name: 'Download Beatmap', category: 'export', defaultKey: 's', currentKey: 's', description: 'Save beatmap file', ctrlRequired: true },
];

export const useShortcutsStore = create<ShortcutsStoreState>()(
  persist(
    (set, get) => ({
      bindings: DEFAULT_BINDINGS,
      
      setBinding: (id, newKey, modifiers = {}) => {
        set(state => ({
          bindings: state.bindings.map(binding =>
            binding.id === id
              ? {
                  ...binding,
                  currentKey: newKey,
                  ctrlRequired: modifiers.ctrl !== undefined ? modifiers.ctrl : binding.ctrlRequired,
                  shiftRequired: modifiers.shift !== undefined ? modifiers.shift : binding.shiftRequired,
                  altRequired: modifiers.alt !== undefined ? modifiers.alt : binding.altRequired,
                }
              : binding
          ),
        }));
      },
      
      resetBinding: (id) => {
        set(state => ({
          bindings: state.bindings.map(binding =>
            binding.id === id
              ? { ...binding, currentKey: binding.defaultKey }
              : binding
          ),
        }));
      },
      
      resetAll: () => {
        set({ bindings: DEFAULT_BINDINGS });
      },
      
      getBinding: (id) => {
        return get().bindings.find(b => b.id === id);
      },
    }),
    {
      name: 'editor-shortcuts',
    }
  )
);
