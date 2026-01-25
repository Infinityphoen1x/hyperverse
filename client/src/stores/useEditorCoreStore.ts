import { create } from 'zustand';
import { Note } from '@/types/game';

interface BeatmapMetadata {
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  youtubeUrl: string;
  beatmapStart: number;
  beatmapEnd: number;
}

interface EditorCoreStoreState {
  // Metadata and notes
  metadata: BeatmapMetadata;
  parsedNotes: Note[];
  beatmapText: string;
  
  // Difficulty state
  currentDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  difficultyNotes: {
    EASY: Note[];
    MEDIUM: Note[];
    HARD: Note[];
  };
  
  // Selection state
  selectedNoteId: string | null;
  selectedNoteIds: string[];
  hoveredNote: { lane: number; time: number } | null;
  
  // History for undo/redo
  history: Note[][];
  historyIndex: number;
  
  // Playback state
  isPlaying: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  editorMode: boolean;
  
  // Actions
  setMetadata: (metadata: BeatmapMetadata) => void;
  updateMetadata: (partial: Partial<BeatmapMetadata>) => void;
  setParsedNotes: (notes: Note[]) => void;
  setBeatmapText: (text: string) => void;
  
  // Difficulty actions
  setCurrentDifficulty: (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => void;
  setDifficultyNotes: (difficulty: 'EASY' | 'MEDIUM' | 'HARD', notes: Note[]) => void;
  getDifficultyNotes: (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => Note[];
  
  // Selection actions
  setSelectedNoteId: (id: string | null) => void;
  setSelectedNoteIds: (ids: string[]) => void;
  toggleNoteSelection: (id: string) => void;
  clearSelection: () => void;
  setHoveredNote: (note: { lane: number; time: number } | null) => void;
  
  // History actions
  addToHistory: (notes: Note[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Playback actions
  setIsPlaying: (playing: boolean) => void;
  setLoopStart: (time: number | null) => void;
  setLoopEnd: (time: number | null) => void;
  setEditorMode: (mode: boolean) => void;
}

export const useEditorCoreStore = create<EditorCoreStoreState>((set, get) => ({
  // Initial metadata
  metadata: {
    title: '',
    artist: '',
    bpm: 120,
    duration: 0,
    youtubeUrl: '',
    beatmapStart: 0,
    beatmapEnd: 180000,
  },
  
  // Initial notes and text
  parsedNotes: [],
  beatmapText: '',
  
  // Initial difficulty state
  currentDifficulty: 'MEDIUM',
  difficultyNotes: {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  },
  
  // Initial selection state
  selectedNoteId: null,
  selectedNoteIds: [],
  hoveredNote: null,
  
  // Initial history
  history: [],
  historyIndex: -1,
  
  // Initial playback state
  isPlaying: false,
  loopStart: null,
  loopEnd: null,
  editorMode: true,
  
  // Actions
  setMetadata: (metadata) => set({ metadata }),
  updateMetadata: (partial) => set((state) => ({ 
    metadata: { ...state.metadata, ...partial } 
  })),
  setParsedNotes: (notes) => set({ parsedNotes: notes }),
  setBeatmapText: (text) => set({ beatmapText: text }),
  
  // Difficulty actions
  setCurrentDifficulty: (difficulty) => set({ currentDifficulty: difficulty }),
  setDifficultyNotes: (difficulty, notes) => set((state) => ({
    difficultyNotes: { ...state.difficultyNotes, [difficulty]: notes }
  })),
  getDifficultyNotes: (difficulty) => get().difficultyNotes[difficulty],
  
  // Selection actions
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setSelectedNoteIds: (ids) => set({ selectedNoteIds: ids }),
  toggleNoteSelection: (id) => set((state) => {
    const isSelected = state.selectedNoteIds.includes(id);
    return {
      selectedNoteIds: isSelected
        ? state.selectedNoteIds.filter(noteId => noteId !== id)
        : [...state.selectedNoteIds, id]
    };
  }),
  clearSelection: () => set({ selectedNoteIds: [], selectedNoteId: null }),
  setHoveredNote: (note) => set({ hoveredNote: note }),
  
  // History actions
  addToHistory: (notes) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...notes]);
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  
  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      set({ 
        historyIndex: historyIndex - 1,
        parsedNotes: history[historyIndex - 1]
      });
    }
  },
  
  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      set({ 
        historyIndex: historyIndex + 1,
        parsedNotes: history[historyIndex + 1]
      });
    }
  },
  
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  
  // Playback actions
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setLoopStart: (time) => set({ loopStart: time }),
  setLoopEnd: (time) => set({ loopEnd: time }),
  setEditorMode: (mode) => set({ editorMode: mode }),
}));
