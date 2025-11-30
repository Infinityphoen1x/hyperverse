import { Note, ScoreState } from '../engine/gameTypes';

export interface NoteUpdateResult {
  updatedNote: Note;
  scoreChange?: ScoreState;
  shouldGameOver?: boolean;
  success?: boolean;
}
