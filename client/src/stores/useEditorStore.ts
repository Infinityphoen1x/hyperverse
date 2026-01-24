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

interface EditorStoreState {
  // Panel state
  isPanelOpen: boolean;
  panelWidth: number;
  isResizing: boolean;
  panelSide: 'left' | 'right';
  leftSideCollapsed: boolean;
  rightSideCollapsed: boolean;
  
  // Section state
  sections: {
    tools: { visible: boolean; collapsed: boolean; poppedOut: boolean; side: 'left' | 'right'; floatPosition: { x: number; y: number } };
    playback: { visible: boolean; collapsed: boolean; poppedOut: boolean; side: 'left' | 'right'; floatPosition: { x: number; y: number } };
    metadata: { visible: boolean; collapsed: boolean; poppedOut: boolean; side: 'left' | 'right'; floatPosition: { x: number; y: number } };
    beatmapText: { visible: boolean; collapsed: boolean; poppedOut: boolean; side: 'left' | 'right'; floatPosition: { x: number; y: number } };
    graphics: { visible: boolean; collapsed: boolean; poppedOut: boolean; side: 'left' | 'right'; floatPosition: { x: number; y: number } };
  };
  
  // Editor mode
  editorMode: boolean;
  
  // Playback state
  isPlaying: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  
  // Selection state
  selectedNoteId: string | null;
  selectedNoteIds: string[];
  hoveredNote: { lane: number; time: number } | null;
  
  // Difficulty state
  currentDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  difficultyNotes: {
    EASY: Note[];
    MEDIUM: Note[];
    HARD: Note[];
  };
  
  // BPM Tapper state
  bpmTapTimestamps: number[];
  showBpmTapper: boolean;
  
  // UI state
  showShortcutsModal: boolean;
  
  // Drag state for HOLD notes
  isDragging: boolean;
  dragStartTime: number | null;
  dragStartLane: number | null;
  draggedNoteId: string | null;
  draggedHandle: 'start' | 'end' | null;
  
  // Selected handle (for glow effect before dragging)
  selectedHandle: { noteId: string; handle: 'start' | 'end' } | null;
  
  // Snap settings
  snapEnabled: boolean;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  
  // Graphics settings
  glowEnabled: boolean;
  dynamicVPEnabled: boolean;
  zoomEnabled: boolean;
  judgementLinesEnabled: boolean;
  spinEnabled: boolean;
  
  // History for undo/redo
  history: Note[][];
  historyIndex: number;
  
  // Metadata and notes
  metadata: BeatmapMetadata;
  parsedNotes: Note[];
  beatmapText: string;
  
  // Actions
  setIsPanelOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;
  setIsResizing: (resizing: boolean) => void;
  setPanelSide: (side: 'left' | 'right') => void;
  setLeftSideCollapsed: (collapsed: boolean) => void;
  setRightSideCollapsed: (collapsed: boolean) => void;
  
  // Section actions
  toggleSectionCollapse: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics') => void;
  toggleSectionPopout: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics') => void;
  closeSectionCompletely: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics') => void;
  reopenSection: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics') => void;
  setSectionSide: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics', side: 'left' | 'right') => void;
  setSectionFloatPosition: (section: 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics', position: { x: number; y: number }) => void;
  setEditorMode: (mode: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setLoopStart: (time: number | null) => void;
  setLoopEnd: (time: number | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  setSelectedNoteIds: (ids: string[]) => void;
  toggleNoteSelection: (id: string) => void;
  clearSelection: () => void;
  setHoveredNote: (note: { lane: number; time: number } | null) => void;
  
  // Difficulty actions
  setCurrentDifficulty: (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => void;
  setDifficultyNotes: (difficulty: 'EASY' | 'MEDIUM' | 'HARD', notes: Note[]) => void;
  getDifficultyNotes: (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => Note[];
  
  // BPM Tapper actions
  addBpmTap: () => void;
  resetBpmTapper: () => void;
  setShowBpmTapper: (show: boolean) => void;
  calculateBpmFromTaps: () => number | null;
  
  // UI actions
  setShowShortcutsModal: (show: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragStartTime: (time: number | null) => void;
  setDragStartLane: (lane: number | null) => void;
  setDraggedNoteId: (id: string | null) => void;
  setDraggedHandle: (handle: 'start' | 'end' | null) => void;
  setSelectedHandle: (selection: { noteId: string; handle: 'start' | 'end' } | null) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapDivision: (division: 1 | 2 | 4 | 8 | 16) => void;
  
  // Graphics settings actions
  setGlowEnabled: (enabled: boolean) => void;
  setDynamicVPEnabled: (enabled: boolean) => void;
  setZoomEnabled: (enabled: boolean) => void;
  setJudgementLinesEnabled: (enabled: boolean) => void;
  setSpinEnabled: (enabled: boolean) => void;
  setMetadata: (metadata: BeatmapMetadata) => void;
  updateMetadata: (partial: Partial<BeatmapMetadata>) => void;
  setParsedNotes: (notes: Note[]) => void;
  setBeatmapText: (text: string) => void;
  
  // History actions
  addToHistory: (notes: Note[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  // Initial panel state
  isPanelOpen: true,
  panelWidth: 450,
  isResizing: false,
  panelSide: 'left',  leftSideCollapsed: false,
  rightSideCollapsed: false,  
  // Initial section state
  sections: {
    tools: { visible: true, collapsed: false, poppedOut: false, side: 'left', floatPosition: { x: 100, y: 100 } },
    playback: { visible: true, collapsed: false, poppedOut: false, side: 'left', floatPosition: { x: 100, y: 300 } },
    metadata: { visible: true, collapsed: true, poppedOut: false, side: 'left', floatPosition: { x: 100, y: 500 } },
    beatmapText: { visible: true, collapsed: true, poppedOut: false, side: 'left', floatPosition: { x: 100, y: 700 } },
    graphics: { visible: true, collapsed: false, poppedOut: false, side: 'right', floatPosition: { x: 800, y: 100 } },
  },
  
  // Initial editor mode
  editorMode: true,
  
  // Initial playback state
  isPlaying: false,
  loopStart: null,
  loopEnd: null,
  
  // Initial selection state
  selectedNoteId: null,
  selectedNoteIds: [],
  hoveredNote: null,
  
  // Initial difficulty state
  currentDifficulty: 'MEDIUM',
  difficultyNotes: {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  },
  
  // Initial BPM tapper state
  bpmTapTimestamps: [],
  showBpmTapper: false,
  
  // Initial UI state
  showShortcutsModal: false,
  
  // Initial drag state
  isDragging: false,
  dragStartTime: null,
  dragStartLane: null,
  draggedNoteId: null,
  draggedHandle: null,
  
  // Initial selected handle
  selectedHandle: null,
  draggedHandle: null,
  
  // Initial snap settings
  snapEnabled: true,
  snapDivision: 4,
  
  // Initial graphics settings
  glowEnabled: true,
  dynamicVPEnabled: true,
  zoomEnabled: true,
  judgementLinesEnabled: true,
  spinEnabled: true,
  
  // Initial history
  history: [],
  historyIndex: -1,
  
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
  
  // Actions
  setIsPanelOpen: (open) => set({ isPanelOpen: open }),
  setPanelWidth: (width) => set({ panelWidth: width }),
  setIsResizing: (resizing) => set({ isResizing: resizing }),
  setPanelSide: (side) => set({ panelSide: side }),
  setLeftSideCollapsed: (collapsed) => set({ leftSideCollapsed: collapsed }),
  setRightSideCollapsed: (collapsed) => set({ rightSideCollapsed: collapsed }),
  
  // Section actions
  toggleSectionCollapse: (section) => set((state) => ({
    sections: {
      ...state.sections,
      [section]: { ...state.sections[section], collapsed: !state.sections[section].collapsed }
    }
  })),
  toggleSectionPopout: (section) => set((state) => ({
    sections: {
      ...state.sections,
      [section]: { 
        ...state.sections[section], 
        poppedOut: !state.sections[section].poppedOut,
        collapsed: false // Expand when popping out
      }
    }
  })),
  closeSectionCompletely: (section) => set((state) => ({
    sections: {
      ...state.sections,
      [section]: { ...state.sections[section], visible: false, poppedOut: false }
    }
  })),
  reopenSection: (section) => set((state) => ({
    sections: {
      ...state.sections,
      [section]: { visible: true, collapsed: false, poppedOut: false, side: state.sections[section].side, floatPosition: state.sections[section].floatPosition }
    }
  })),
  setSectionSide: (section, side) => set((state) => ({
    sections: {
      ...state.sections,
      [section]: { ...state.sections[section], side }
    }
  })),
  setSectionFloatPosition: (section, position) => set((state) => ({
    sections: {
      ...state.sections,
      [section]: { ...state.sections[section], floatPosition: position }
    }
  })),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setLoopStart: (time) => set({ loopStart: time }),
  setLoopEnd: (time) => set({ loopEnd: time }),
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
  
  // Difficulty actions
  setCurrentDifficulty: (difficulty) => set({ currentDifficulty: difficulty }),
  setDifficultyNotes: (difficulty, notes) => set((state) => ({
    difficultyNotes: { ...state.difficultyNotes, [difficulty]: notes }
  })),
  getDifficultyNotes: (difficulty) => get().difficultyNotes[difficulty],
  
  // BPM Tapper actions
  addBpmTap: () => set((state) => {
    const now = Date.now();
    const newTaps = [...state.bpmTapTimestamps, now];
    // Keep only last 8 taps
    const recentTaps = newTaps.slice(-8);
    return { bpmTapTimestamps: recentTaps };
  }),
  resetBpmTapper: () => set({ bpmTapTimestamps: [] }),
  setShowBpmTapper: (show) => set({ showBpmTapper: show }),
  calculateBpmFromTaps: () => {
    const taps = get().bpmTapTimestamps;
    if (taps.length < 2) return null;
    
    // Calculate intervals between taps
    const intervals: number[] = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i] - taps[i - 1]);
    }
    
    // Average interval in milliseconds
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Convert to BPM (60000ms per minute)
    const bpm = 60000 / avgInterval;
    return Math.round(bpm * 10) / 10; // Round to 1 decimal
  },
  
  // UI actions
  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setDragStartTime: (time) => set({ dragStartTime: time }),
  setDragStartLane: (lane) => set({ dragStartLane: lane }),
  setDraggedNoteId: (id) => set({ draggedNoteId: id }),
  setDraggedHandle: (handle) => set({ draggedHandle: handle }),
  setSelectedHandle: (selection) => set({ selectedHandle: selection }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setSnapDivision: (division) => set({ snapDivision: division }),
  setMetadata: (metadata) => set({ metadata }),
  updateMetadata: (partial) => set((state) => ({ 
    metadata: { ...state.metadata, ...partial } 
  })),
  setParsedNotes: (notes) => set({ parsedNotes: notes }),
  setBeatmapText: (text) => set({ beatmapText: text }),
  
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
  
  // Graphics settings actions
  setGlowEnabled: (enabled) => set({ glowEnabled: enabled }),
  setDynamicVPEnabled: (enabled) => set({ dynamicVPEnabled: enabled }),
  setZoomEnabled: (enabled) => set({ zoomEnabled: enabled }),
  setJudgementLinesEnabled: (enabled) => set({ judgementLinesEnabled: enabled }),
  setSpinEnabled: (enabled) => set({ spinEnabled: enabled }),
}));
