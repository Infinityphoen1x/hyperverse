import { create } from 'zustand';

interface EditorGraphicsStoreState {
  // Graphics settings
  glowEnabled: boolean;
  dynamicVPEnabled: boolean;
  zoomEnabled: boolean;
  judgementLinesEnabled: boolean;
  spinEnabled: boolean;
  idleMotionEnabled: boolean;
  
  // Actions
  setGlowEnabled: (enabled: boolean) => void;
  setDynamicVPEnabled: (enabled: boolean) => void;
  setZoomEnabled: (enabled: boolean) => void;
  setJudgementLinesEnabled: (enabled: boolean) => void;
  setSpinEnabled: (enabled: boolean) => void;
  setIdleMotionEnabled: (enabled: boolean) => void;
}

export const useEditorGraphicsStore = create<EditorGraphicsStoreState>((set) => ({
  // Initial graphics settings
  glowEnabled: true,
  dynamicVPEnabled: true,
  zoomEnabled: true,
  judgementLinesEnabled: true,
  spinEnabled: true,
  idleMotionEnabled: true,
  
  // Actions
  setGlowEnabled: (enabled) => set({ glowEnabled: enabled }),
  setDynamicVPEnabled: (enabled) => set({ dynamicVPEnabled: enabled }),
  setZoomEnabled: (enabled) => set({ zoomEnabled: enabled }),
  setJudgementLinesEnabled: (enabled) => set({ judgementLinesEnabled: enabled }),
  setSpinEnabled: (enabled) => set({ spinEnabled: enabled }),
  setIdleMotionEnabled: (enabled) => set({ idleMotionEnabled: enabled }),
}));
