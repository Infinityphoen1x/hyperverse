import { create } from 'zustand';
import { useBeatmapStore } from './useBeatmapStore';

export type TutorialStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

interface TutorialState {
  currentStage: TutorialStage;
  isInTutorial: boolean;
  savedBeatmapState: {
    youtubeVideoId: string | null;
    beatmapText: string | null;
  } | null;
  
  // Actions
  setCurrentStage: (stage: TutorialStage) => void;
  completeStage: (stage: TutorialStage) => void;
  failStage: () => void; // Restart current stage
  startTutorial: () => void;
  exitTutorial: () => void;
  skipTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>()((set, get) => ({
  currentStage: 1,
  isInTutorial: false,
  savedBeatmapState: null,

  setCurrentStage: (stage) => set({ currentStage: stage }),

  completeStage: (stage) => {
    const nextStage = (stage + 1) as TutorialStage;
    
    if (stage === 11) {
      // Tutorial complete! Exit tutorial
      const { exitTutorial } = get();
      exitTutorial();
    } else {
      set({ currentStage: nextStage });
    }
  },

  failStage: () => {
    // Loop current stage - just reset to beginning of current stage
    console.log('[Tutorial] Stage failed, restarting current stage');
  },

  startTutorial: () => {
    // Save current beatmap state before starting tutorial
    const { youtubeVideoId, beatmapText } = useBeatmapStore.getState();
    
    set({
      isInTutorial: true,
      currentStage: 1,
      savedBeatmapState: { youtubeVideoId, beatmapText },
    });
  },

  exitTutorial: () => {
    // Restore saved beatmap state
    const { savedBeatmapState } = get();
    if (savedBeatmapState) {
      useBeatmapStore.getState().setBeatmapData(savedBeatmapState);
    }
    
    set({
      isInTutorial: false,
      currentStage: 1,
      savedBeatmapState: null,
    });
  },

  skipTutorial: () => {
    const { exitTutorial } = get();
    exitTutorial();
  },
}));
