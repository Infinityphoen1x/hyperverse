// src/stores/useGameEngineStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import { useTimingStore } from './useTimingStore';
import { useScoringStore } from './useScoringStore';
import { useNotesStore } from './useNotesStore';
import type { Note, GameConfig, ScoreState } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { useYouTubePlayerStore } from './useYouTubePlayerStore'; // From prior

interface GameEngineState {
  config: GameConfig | null;
  init: (config: GameConfig, initialNotes?: Note[]) => void;

  // Lifecycle
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (newNotes?: Note[]) => void;

  // Timing
  getCurrentTime: (videoTime?: number | null) => number;
  syncToVideoTime: (videoTimeMs: number) => void;
  setCurrentTime: (videoTimeMs: number) => void;

  // Scoring
  getScore: () => ScoreState;

  // Notes
  getNotes: () => Note[];
  getReleaseTime: (noteId: string) => number | undefined;
  getConfig: () => Readonly<GameConfig> | null;

  // Frame/Input
  processFrame: (currentTime: number) => { shouldGameOver: boolean };
  handleTap: (lane: number, currentTime: number) => boolean;
  handleHoldStart: (lane: number, currentTime: number) => boolean;
  handleHoldEnd: (lane: number, currentTime: number) => boolean;

  // Queries
  getActiveNotes: () => Note[];
  getCompletedNotes: () => Note[];
  getActiveNotesOnLane: (lane: number) => Note[];
  isDead: () => boolean;
}

export const useGameEngineStore = create<GameEngineState>()(
  produce((set, get) => ({
    config: null,

    init: (config, initialNotes) => {
      useScoringStore.getState().init(config);
      useNotesStore.getState().init(config);
      if (initialNotes) useNotesStore.getState().setNotes(initialNotes);
      set({ config });
    },

    start: () => {
      useTimingStore.getState().start();
      useYouTubePlayerStore.getState().play(); // Sync audio
    },

    pause: () => {
      useTimingStore.getState().pause();
      useYouTubePlayerStore.getState().pause();
    },

    resume: () => {
      useTimingStore.getState().resume();
      useYouTubePlayerStore.getState().play();
    },

    reset: (newNotes) => {
      useTimingStore.getState().reset();
      useScoringStore.getState().reset();
      if (newNotes) useNotesStore.getState().setNotes(newNotes);
      useNotesStore.getState().releaseTimeMap.clear();
    },

    getCurrentTime: (videoTime) => useTimingStore.getState().getCurrentTime(videoTime),

    syncToVideoTime: (videoTimeMs) => useTimingStore.getState().syncToVideoTime(videoTimeMs),

    setCurrentTime: (videoTimeMs) => {
      console.log(`[ENGINE-TIME-SET] Setting engine time to ${videoTimeMs.toFixed(0)}ms`);
      useTimingStore.getState().syncToVideoTime(videoTimeMs);
      const notes = useNotesStore.getState().notes;
      const updatedNotes = useNotesStore.getState().updateNoteTimes(notes, videoTimeMs);
      useNotesStore.getState().setNotes(updatedNotes);
      console.log(`[ENGINE-TIME-SET] Engine synced - active notes: ${useNotesStore.getState().getActiveNotes().length}`);
    },

    getScore: () => useScoringStore.getState().getState(),

    getNotes: () => useNotesStore.getState().notes,

    getReleaseTime: (noteId) => useNotesStore.getState().releaseTimeMap.get(noteId),

    getConfig: () => get().config ? Object.freeze({ ...get().config }) : null,

    processFrame: (currentTime) => useNotesStore.getState().processFrame(currentTime),

    handleTap: (lane, currentTime) => {
      const note = useNotesStore.getState().findClosestActiveNote(lane, 'TAP', currentTime);
      if (!note) {
        GameErrors.log(`GameEngineCore: No note found for TAP on lane ${lane}`);
        return false;
      }
      const result = useNotesStore.getState().processTapHit(note, currentTime);
      // Update notes immutably via store
      const updatedNotes = get().getNotes().map(n => n.id === note.id ? result.updatedNote : n);
      useNotesStore.getState().setNotes(updatedNotes);
      return result.success || false;
    },

    handleHoldStart: (lane, currentTime) => {
      const note = useNotesStore.getState().findPressableHoldNote(lane, currentTime);
      if (!note) {
        GameErrors.log(`GameEngineCore: No note found for HOLD_START on lane ${lane}`);
        return false;
      }
      const result = useNotesStore.getState().processHoldStart(note, currentTime);
      const updatedNotes = get().getNotes().map(n => n.id === note.id ? result.updatedNote : n);
      useNotesStore.getState().setNotes(updatedNotes);
      return result.success || false;
    },

    handleHoldEnd: (lane, currentTime) => {
      const note = useNotesStore.getState().findActiveHoldNote(lane, currentTime);
      if (!note || !note.pressHoldTime) {
        GameErrors.log(`GameEngineCore: No active HOLD to release on lane ${lane}`);
        return false;
      }
      const result = useNotesStore.getState().processHoldEnd(note, currentTime);
      const updatedNotes = get().getNotes().map(n => n.id === note.id ? result.updatedNote : n);
      useNotesStore.getState().setNotes(updatedNotes);
      useNotesStore.getState().releaseTimeMap.set(note.id, Math.round(currentTime));
      return result.success || false;
    },

    getActiveNotes: () => useNotesStore.getState().getActiveNotes(),

    getCompletedNotes: () => useNotesStore.getState().getCompletedNotes(),

    getActiveNotesOnLane: (lane) => useNotesStore.getState().getActiveNotesOnLane(lane),

    isDead: () => useNotesStore.getState().isDead(),
  }))
);
// src/stores/useGameEngineStore.ts (snippet: add to interface/actions)
getActiveNotes: () => useNotesStore.getState().getActiveNotes(),

getCompletedNotes: () => useNotesStore.getState().getCompletedNotes(),

getActiveNotesOnLane: (lane: number) => useNotesStore.getState().getActiveNotesOnLane(lane),

isDead: () => useScoringStore.getState().isDead(),