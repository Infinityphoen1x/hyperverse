// src/stores/useNotesStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import type { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { NoteValidator } from '@/lib/notes/processors/noteValidator'; // Assume migrated or kept as util
import { NoteProcessor } from '@/lib/notes/processors/noteProcessor'; // Assume migrated or kept as util
import type { GameConfig } from '@/lib/engine/gameTypes';

interface NotesState {
  notes: Note[];
  releaseTimeMap: Map<string, number>;
  validator: NoteValidator;
  processor: NoteProcessor;

  init: (config: GameConfig) => void;
  setNotes: (newNotes: Note[]) => void;
  processFrame: (currentTime: number) => { shouldGameOver: boolean };
  processTapHit: (note: Note, currentTime: number) => { success: boolean; updatedNote: Note };
  processHoldStart: (note: Note, currentTime: number) => { success: boolean; updatedNote: Note };
  processHoldEnd: (note: Note, currentTime: number) => { success: boolean; updatedNote: Note };
  findClosestActiveNote: (lane: number, type: 'TAP', currentTime: number) => Note | null;
  findPressableHoldNote: (lane: number, currentTime: number) => Note | null;
  findActiveHoldNote: (lane: number, currentTime: number) => Note | null;
  updateNoteTimes: (notes: Note[], videoTimeMs: number) => Note[];
  getActiveNotes: () => Note[];
  getCompletedNotes: () => Note[];
  getActiveNotesOnLane: (lane: number) => Note[];
  isDead: () => boolean;
}

export const useNotesStore = create<NotesState>()(
  produce((set, get) => {
    const validator = new NoteValidator({} as GameConfig); // Init with config in init()
    const processor = new NoteProcessor({} as GameConfig, validator, useScoringStore.getState()); // Will update in init

    return {
      notes: [],
      releaseTimeMap: new Map(),
      validator,
      processor,

      init: (config) => {
        get().validator = new NoteValidator(config);
        get().processor = new NoteProcessor(config, get().validator, useScoringStore.getState());
      },

      setNotes: (newNotes) => set({ notes: [...newNotes] }),

      processFrame: (currentTime) => {
        const result = get().processor.processNotesFrame(get().notes, currentTime);
        set({ notes: result.updatedNotes });
        return result;
      },

      processTapHit: (note, currentTime) => {
        const result = get().processor.processTapHit(note, currentTime);
        if (result.success) {
          useScoringStore.getState().addPoints(result.points ?? 0);
          useScoringStore.getState().incrementCombo();
        }
        return result;
      },

      processHoldStart: (note, currentTime) => {
        const result = get().processor.processHoldStart(note, currentTime);
        if (result.success) useScoringStore.getState().incrementCombo();
        return result;
      },

      processHoldEnd: (note, currentTime) => {
        const result = get().processor.processHoldEnd(note, currentTime);
        if (result.success) {
          useScoringStore.getState().updateAccuracy(result.accuracy ?? 0);
        } else {
          useScoringStore.getState().resetCombo();
          useScoringStore.getState().deductHealth(10); // Example penalty
        }
        return result;
      },

      findClosestActiveNote: (lane, type, currentTime) => get().validator.findClosestActiveNote(get().notes, lane, type, currentTime),

      findPressableHoldNote: (lane, currentTime) => get().validator.findPressableHoldNote(get().notes, lane, currentTime),

      findActiveHoldNote: (lane, currentTime) => get().validator.findActiveHoldNote(get().notes, lane, currentTime),

      updateNoteTimes: (notes, videoTimeMs) => get().validator.updateNoteTimes(notes, videoTimeMs),

      getActiveNotes: () => get().validator.getActiveNotes(get().notes),

      getCompletedNotes: () => get().validator.getCompletedNotes(get().notes),

      getActiveNotesOnLane: (lane) => get().validator.getActiveNotesOnLane(get().notes, lane),

      isDead: () => get().validator.isDead(useScoringStore.getState().health),
    };
  })
);
// src/stores/useNotesStore.ts (snippet: add/enhance queries; assume validator as util)
import { NoteValidator } from '@/lib/notes/processors/noteValidator'; // Util class/function

// In interface and create():
getActiveNotes: () => {
  return get().validator.getActiveNotes(get().notes); // Delegate to util
},

getCompletedNotes: () => {
  return get().validator.getCompletedNotes(get().notes);
},

getActiveNotesOnLane: (lane: number) => {
  return get().validator.getActiveNotesOnLane(get().notes, lane);
},
  import {
    calculateApproachGeometry,
    calculateCollapseGeometry,
    calculateHoldNoteGlow,
    getTrapezoidCorners,
  } from '@/utils/holdNoteGeometry';

  interface ProcessedHoldGeometry {
    note: Note;
    approach: ApproachGeometry;
    collapse: CollapseGeometry;
    glow: GlowCalculation;
    corners: TrapezoidCorners | null;
  }

  getProcessedHoldNotes: () => ProcessedHoldGeometry[] => {
    const { notes, currentTime } = get();
    return notes
      .filter(n => n.type === 'HOLD' && !n.hit && !n.missed)
      .map(note => {
        const timeUntilHit = note.time - currentTime;
        const approach = calculateApproachGeometry(timeUntilHit, note.pressHoldTime || 0, false, note.duration || 0);
        const collapse = calculateCollapseGeometry(
          note.pressHoldTime || 0,
          500, // collapseDuration from config
          currentTime,
          JUDGEMENT_RADIUS,
          approach.farDistance,
          approach.nearDistance,
          approach.farDistance
        );
        const glow = calculateHoldNoteGlow(note.pressHoldTime || 0, currentTime, 500, 0.5, note); // approachProgress approx
        const corners = getTrapezoidCorners(note.lane * 60, approach.nearDistance, approach.farDistance, 350, 300, note.id); // rayAngle approx
        return { note, approach, collapse, glow, corners };
      });
  },