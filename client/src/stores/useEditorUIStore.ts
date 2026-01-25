import { create } from 'zustand';

type SectionName = 'tools' | 'playback' | 'metadata' | 'beatmapText' | 'graphics';

interface Section {
  visible: boolean;
  collapsed: boolean;
  poppedOut: boolean;
  side: 'left' | 'right';
  floatPosition: { x: number; y: number };
}

interface EditorUIStoreState {
  // Panel state
  isPanelOpen: boolean;
  panelWidth: number;
  isResizing: boolean;
  panelSide: 'left' | 'right';
  leftSideCollapsed: boolean;
  rightSideCollapsed: boolean;
  
  // Section state
  sections: Record<SectionName, Section>;
  
  // Modal state
  showShortcutsModal: boolean;
  showBpmTapper: boolean;
  
  // BPM Tapper state
  bpmTapTimestamps: number[];
  
  // Drag state for HOLD notes
  isDragging: boolean;
  dragStartTime: number | null;
  dragStartLane: number | null;
  draggedNoteId: string | null;
  draggedHandle: 'start' | 'end' | 'near' | 'far' | null;
  
  // Snap settings
  snapEnabled: boolean;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  
  // Actions
  setIsPanelOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;
  setIsResizing: (resizing: boolean) => void;
  setPanelSide: (side: 'left' | 'right') => void;
  setLeftSideCollapsed: (collapsed: boolean) => void;
  setRightSideCollapsed: (collapsed: boolean) => void;
  
  // Section actions
  toggleSectionCollapse: (section: SectionName) => void;
  toggleSectionPopout: (section: SectionName) => void;
  closeSectionCompletely: (section: SectionName) => void;
  reopenSection: (section: SectionName) => void;
  setSectionSide: (section: SectionName, side: 'left' | 'right') => void;
  setSectionFloatPosition: (section: SectionName, position: { x: number; y: number }) => void;
  
  // Modal actions
  setShowShortcutsModal: (show: boolean) => void;
  setShowBpmTapper: (show: boolean) => void;
  
  // BPM Tapper actions
  addBpmTap: () => void;
  resetBpmTapper: () => void;
  calculateBpmFromTaps: () => number | null;
  
  // Drag actions
  setIsDragging: (dragging: boolean) => void;
  setDragStartTime: (time: number | null) => void;
  setDragStartLane: (lane: number | null) => void;
  setDraggedNoteId: (id: string | null) => void;
  setDraggedHandle: (handle: 'start' | 'end' | 'near' | 'far' | null) => void;
  
  // Snap actions
  setSnapEnabled: (enabled: boolean) => void;
  setSnapDivision: (division: 1 | 2 | 4 | 8 | 16) => void;
}

export const useEditorUIStore = create<EditorUIStoreState>((set, get) => ({
  // Initial panel state
  isPanelOpen: true,
  panelWidth: 450,
  isResizing: false,
  panelSide: 'left',
  leftSideCollapsed: false,
  rightSideCollapsed: false,
  
  // Initial section state
  sections: {
    tools: { visible: true, collapsed: false, poppedOut: false, side: 'left', floatPosition: { x: 100, y: 100 } },
    playback: { visible: true, collapsed: false, poppedOut: false, side: 'left', floatPosition: { x: 100, y: 300 } },
    metadata: { visible: true, collapsed: true, poppedOut: false, side: 'left', floatPosition: { x: 100, y: 500 } },
    beatmapText: { visible: true, collapsed: true, poppedOut: false, side: 'left', floatPosition: { x: 100, y: 700 } },
    graphics: { visible: true, collapsed: false, poppedOut: false, side: 'right', floatPosition: { x: 800, y: 100 } },
  },
  
  // Initial modal state
  showShortcutsModal: false,
  showBpmTapper: false,
  
  // Initial BPM tapper state
  bpmTapTimestamps: [],
  
  // Initial drag state
  isDragging: false,
  dragStartTime: null,
  dragStartLane: null,
  draggedNoteId: null,
  draggedHandle: null,
  
  // Initial snap settings
  snapEnabled: true,
  snapDivision: 4,
  
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
        collapsed: false
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
  
  // Modal actions
  setShowShortcutsModal: (show) => set({ showShortcutsModal: show }),
  setShowBpmTapper: (show) => set({ showBpmTapper: show }),
  
  // BPM Tapper actions
  addBpmTap: () => set((state) => {
    const now = Date.now();
    const newTaps = [...state.bpmTapTimestamps, now];
    const recentTaps = newTaps.slice(-8);
    return { bpmTapTimestamps: recentTaps };
  }),
  resetBpmTapper: () => set({ bpmTapTimestamps: [] }),
  calculateBpmFromTaps: () => {
    const taps = get().bpmTapTimestamps;
    if (taps.length < 2) return null;
    
    const intervals: number[] = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i] - taps[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = 60000 / avgInterval;
    return Math.round(bpm * 10) / 10;
  },
  
  // Drag actions
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setDragStartTime: (time) => set({ dragStartTime: time }),
  setDragStartLane: (lane) => set({ dragStartLane: lane }),
  setDraggedNoteId: (id) => set({ draggedNoteId: id }),
  setDraggedHandle: (handle) => set({ draggedHandle: handle }),
  
  // Snap actions
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setSnapDivision: (division) => set({ snapDivision: division }),
}));
