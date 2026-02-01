import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BeatmapStoreState {
  youtubeVideoId: string | null;
  beatmapText: string | null;
  updatedAt: number | null;
  setBeatmapText: (beatmapText: string | null) => void;
  setYoutubeVideoId: (youtubeVideoId: string | null) => void;
  setBeatmapData: (data: Partial<Pick<BeatmapStoreState, 'youtubeVideoId' | 'beatmapText'>>) => void;
  clear: () => void;
  hasBeatmap: () => boolean;
}

const defaultState: Pick<BeatmapStoreState, 'youtubeVideoId' | 'beatmapText' | 'updatedAt'> = {
  youtubeVideoId: null,
  beatmapText: null,
  updatedAt: null,
};

export const useBeatmapStore = create<BeatmapStoreState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setBeatmapText: (beatmapText) => {
        set((state) => {
          if (state.beatmapText === beatmapText) {
            return state;
          }
          return {
            ...state,
            beatmapText,
            updatedAt: Date.now(),
          };
        });
      },
      setYoutubeVideoId: (youtubeVideoId) => {
        set((state) => {
          if (state.youtubeVideoId === youtubeVideoId) {
            return state;
          }
          return {
            ...state,
            youtubeVideoId,
            updatedAt: Date.now(),
          };
        });
      },
        setBeatmapData: (data) => {
          const state = get();
          const nextYoutubeVideoId = data.youtubeVideoId ?? state.youtubeVideoId;
          const nextBeatmapText = data.beatmapText ?? state.beatmapText;

          if (
            nextYoutubeVideoId === state.youtubeVideoId &&
            nextBeatmapText === state.beatmapText
          ) {
            return;
          }

          set({
            youtubeVideoId: nextYoutubeVideoId,
            beatmapText: nextBeatmapText,
            updatedAt: Date.now(),
          });
        },
      clear: () => set({ ...defaultState }),
      hasBeatmap: () => {
        const state = get();
        return Boolean(state.youtubeVideoId && state.beatmapText);
      },
    }),
    {
      name: 'pendingBeatmap',
      version: 1,
      partialize: (state) => ({
        youtubeVideoId: state.youtubeVideoId,
        beatmapText: state.beatmapText,
        updatedAt: state.updatedAt,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<BeatmapStoreState>),
      }),
    }
  )
);
