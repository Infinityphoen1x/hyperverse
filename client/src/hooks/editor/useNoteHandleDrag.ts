/**
 * Note handle dragging logic
 * Updates note time/duration based on handle being dragged
 */

import { Note } from '@/types/game';
import { mouseToTime, snapTimeToGrid, checkNoteOverlap } from '@/lib/editor/editorUtils';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
import { LEAD_TIME, GAME_CONFIG } from '@/lib/config/timing';
import { MIN_HOLD_DURATION } from '@/lib/config/editor';
import { ConversionFeedback } from '@/components/editor/ConversionToast';
import type { HandleType } from './useHandleDetection';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;

export interface HandleDragParams {
  mouseX: number;
  mouseY: number;
  currentTime: number;
  snapEnabled: boolean;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  bpm: number;
  beatmapStart: number;
  draggedNoteId: string;
  draggedHandle: HandleType;
  parsedNotes: Note[];
}

/**
 * Update note based on handle drag operation
 * @param params Handle drag parameters
 * @returns Updated notes array
 */
export function updateNoteFromHandleDrag(params: HandleDragParams): Note[] {
  const {
    mouseX,
    mouseY,
    currentTime,
    snapEnabled,
    snapDivision,
    bpm,
    beatmapStart,
    draggedNoteId,
    draggedHandle,
    parsedNotes,
  } = params;

  const { time: timeOffset } = mouseToTime(
    mouseX,
    mouseY,
    VANISHING_POINT_X,
    VANISHING_POINT_Y,
    currentTime,
    LEAD_TIME,
    JUDGEMENT_RADIUS
  );
  
  const newTime = snapEnabled ? snapTimeToGrid(timeOffset, bpm, snapDivision, beatmapStart) : timeOffset;

  return parsedNotes.map(note => {
    if (note.id !== draggedNoteId) return note;

    let proposedStart = note.time;
    let proposedEnd = note.time;

    // Handle TAP/HOLD note near/far handles
    // 'near' handle = closest to judgement lines (start time, front of note)
    // 'far' handle = closest to VP (end time, back of note)

    if (draggedHandle === 'near') {
      // Dragging near handle (front of note, closest to judgement) - adjusts START time
      const oldEndTime = note.type === 'HOLD' && note.duration ? note.time + note.duration : note.time;
      const newStartTime = newTime;
      const newDuration = oldEndTime - newStartTime;

      proposedStart = newStartTime;
      proposedEnd = oldEndTime;

      // Check for overlap before applying
      const checkStart = newDuration <= MIN_HOLD_DURATION ? proposedStart - TAP_HIT_WINDOW : proposedStart;
      const checkEnd = newDuration <= MIN_HOLD_DURATION ? proposedEnd + TAP_HIT_WINDOW : proposedEnd;

      if (checkNoteOverlap(parsedNotes, draggedNoteId, note.lane, checkStart, checkEnd)) {
        return note; // Don't change - overlap detected
      }

      if (newDuration > MIN_HOLD_DURATION) {
        return { ...note, time: newStartTime, type: 'HOLD' as const, duration: newDuration };
      } else if (newDuration > 0) {
        // Converting HOLD to TAP
        if (note.type === 'HOLD') {
          ConversionFeedback.show('HOLD → TAP (duration too short)');
        }
        return { ...note, time: newStartTime, type: 'TAP' as const, duration: undefined };
      } else {
        return note; // Invalid duration
      }
    } else if (draggedHandle === 'far') {
      // Dragging far handle (back of note, closest to VP) - adjusts END time
      const newEndTime = newTime;
      const newDuration = newEndTime - note.time;

      proposedStart = note.time;
      proposedEnd = newEndTime;

      // Check for overlap before applying
      const checkStart = newDuration <= MIN_HOLD_DURATION ? proposedStart - TAP_HIT_WINDOW : proposedStart;
      const checkEnd = newDuration <= MIN_HOLD_DURATION ? proposedEnd + TAP_HIT_WINDOW : proposedEnd;

      if (checkNoteOverlap(parsedNotes, draggedNoteId, note.lane, checkStart, checkEnd)) {
        return note; // Don't change - overlap detected
      }

      if (newDuration > MIN_HOLD_DURATION) {
        // Converting TAP to HOLD
        if (note.type === 'TAP') {
          ConversionFeedback.show('TAP → HOLD (extended duration)');
        }
        return { ...note, type: 'HOLD' as const, duration: newDuration };
      } else if (newDuration > 0) {
        // Converting HOLD to TAP
        if (note.type === 'HOLD') {
          ConversionFeedback.show('HOLD → TAP (shortened)');
        }
        return { ...note, type: 'TAP' as const, duration: undefined };
      } else {
        return note; // Invalid duration
      }
    } else if (draggedHandle === 'start') {
      // Dragging start handle - adjust note time
      const oldEndTime = note.type === 'HOLD' && note.duration ? note.time + note.duration : note.time;
      const newDuration = oldEndTime - newTime;

      proposedStart = newTime;
      proposedEnd = oldEndTime;

      // Check for overlap before applying
      const checkStart = newDuration <= MIN_HOLD_DURATION ? proposedStart - TAP_HIT_WINDOW : proposedStart;
      const checkEnd = newDuration <= MIN_HOLD_DURATION ? proposedEnd + TAP_HIT_WINDOW : proposedEnd;

      if (checkNoteOverlap(parsedNotes, draggedNoteId, note.lane, checkStart, checkEnd)) {
        return note; // Don't change - overlap detected
      }

      if (newDuration > MIN_HOLD_DURATION) {
        return { ...note, time: newTime, type: 'HOLD' as const, duration: newDuration };
      } else {
        // Converting to TAP
        if (note.type === 'HOLD') {
          ConversionFeedback.show('HOLD → TAP (duration too short)');
        }
        return { ...note, time: newTime, type: 'TAP' as const, duration: undefined };
      }
    } else {
      // Dragging end handle - adjust duration
      const newDuration = newTime - note.time;

      proposedStart = note.time;
      proposedEnd = newTime;

      // Check for overlap before applying
      const checkStart = newDuration <= MIN_HOLD_DURATION ? proposedStart - TAP_HIT_WINDOW : proposedStart;
      const checkEnd = newDuration <= MIN_HOLD_DURATION ? proposedEnd + TAP_HIT_WINDOW : proposedEnd;

      if (checkNoteOverlap(parsedNotes, draggedNoteId, note.lane, checkStart, checkEnd)) {
        return note; // Don't change - overlap detected
      }

      if (newDuration > MIN_HOLD_DURATION) {
        // Converting TAP to HOLD
        if (note.type === 'TAP') {
          ConversionFeedback.show('TAP → HOLD (extended duration)');
        }
        return { ...note, type: 'HOLD' as const, duration: newDuration };
      } else {
        // Converting HOLD to TAP
        if (note.type === 'HOLD') {
          ConversionFeedback.show('HOLD → TAP (shortened)');
        }
        return { ...note, type: 'TAP' as const, duration: undefined };
      }
    }
  });
}
