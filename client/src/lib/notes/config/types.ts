import { Note, ScoreState } from '@/lib/engine/gameTypes';

export interface NoteUpdateResult {
  updatedNote: Note;
  scoreChange?: ScoreState;
  success: boolean;
}
