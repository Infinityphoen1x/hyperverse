// src/hooks/useErrorMonitoring.ts
import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/useErrorStore'; // For error state
import { GameErrors } from '@/lib/errors/errorLog';
import { Note } from '@/lib/engine/gameTypes';

interface UseErrorMonitoringProps {
  notes: Note[];
}

export function useErrorMonitoring({ notes }: UseErrorMonitoringProps) {
  const [gameErrors, setGameErrors] = useState<string[]>([]);
  const { addError, updateNoteStats } = useGameStore(); // Or error store

  useEffect(() => {
    const interval = setInterval(() => {
      if (GameErrors.notes.length > 0) {
        GameErrors.notes.forEach(err => addError(err));
        setGameErrors([...GameErrors.notes]);
        GameErrors.notes = []; // Clear after sync
      }
      updateNoteStats(notes);
    }, 500);

    return () => clearInterval(interval);
  }, [notes, addError, updateNoteStats]);

  return gameErrors;
}