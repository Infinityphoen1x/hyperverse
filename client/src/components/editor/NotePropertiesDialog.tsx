import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Hash, ArrowRight } from 'lucide-react';
import { Note } from '@/types/game';
import { audioManager } from '@/lib/audio/audioManager';

interface NotePropertiesDialogProps {
  notes: Note[];
  selectedNoteIds: string[];
  onClose: () => void;
  onUpdate: (updates: Array<{ id: string; changes: Partial<Note> }>) => void;
}

export function NotePropertiesDialog({
  notes,
  selectedNoteIds,
  onClose,
  onUpdate,
}: NotePropertiesDialogProps) {
  const selectedNotes = notes.filter(n => selectedNoteIds.includes(n.id));
  
  // Get initial values (use first selected note's values)
  const firstNote = selectedNotes[0];
  const [startTime, setStartTime] = useState(firstNote?.time.toString() || '0');
  const [endTime, setEndTime] = useState(
    firstNote?.type === 'HOLD' && firstNote.duration
      ? (firstNote.time + firstNote.duration).toString()
      : firstNote?.time.toString() || '0'
  );
  const [duration, setDuration] = useState(
    firstNote?.type === 'HOLD' && firstNote.duration
      ? firstNote.duration.toString()
      : '0'
  );

  // Check if all selected notes share the same values
  const hasMultipleStartTimes = selectedNotes.length > 1 && 
    !selectedNotes.every(n => n.time === firstNote.time);
  const hasMultipleDurations = selectedNotes.length > 1 &&
    !selectedNotes.every(n => {
      const dur1 = n.type === 'HOLD' && n.duration ? n.duration : 0;
      const dur2 = firstNote.type === 'HOLD' && firstNote.duration ? firstNote.duration : 0;
      return dur1 === dur2;
    });

  // Auto-calculate based on which field is being edited
  const [lastEditedField, setLastEditedField] = useState<'start' | 'end' | 'duration'>('start');

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    setLastEditedField('start');
    
    const start = parseFloat(value) || 0;
    if (lastEditedField === 'duration' || lastEditedField === 'start') {
      // Recalculate end time from start + duration
      const dur = parseFloat(duration) || 0;
      setEndTime((start + dur).toString());
    } else {
      // Recalculate duration from end - start
      const end = parseFloat(endTime) || 0;
      setDuration((end - start).toString());
    }
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    setLastEditedField('end');
    
    const end = parseFloat(value) || 0;
    const start = parseFloat(startTime) || 0;
    setDuration((end - start).toString());
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
    setLastEditedField('duration');
    
    const dur = parseFloat(value) || 0;
    const start = parseFloat(startTime) || 0;
    setEndTime((start + dur).toString());
  };

  const handleApply = useCallback(() => {
    const start = parseFloat(startTime) || 0;
    const dur = parseFloat(duration) || 0;

    const updates = selectedNotes.map(note => ({
      id: note.id,
      changes: {
        time: start,
        duration: dur > 0 ? dur : undefined,
        type: (dur > 0 ? 'HOLD' : 'TAP') as 'TAP' | 'HOLD',
      } as Partial<Note>,
    }));

    onUpdate(updates);
    audioManager.play('difficultySettingsApply');
    onClose();
  }, [startTime, duration, selectedNotes, onUpdate, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (selectedNotes.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border-2 border-neon-cyan rounded-lg p-6 w-[480px] mx-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-rajdhani text-neon-cyan font-bold">
              NOTE PROPERTIES
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>

          {/* Info */}
          <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
            <p className="text-sm font-rajdhani text-gray-300">
              {selectedNotes.length === 1 ? (
                <>
                  Editing <span className="text-neon-cyan font-bold">1 note</span>
                  {' '}- Lane {firstNote.lane}
                </>
              ) : (
                <>
                  Editing <span className="text-neon-cyan font-bold">{selectedNotes.length} notes</span>
                </>
              )}
            </p>
            {hasMultipleStartTimes && (
              <p className="text-xs text-yellow-400 mt-1">
                ⚠️ Notes have different start times - will be synchronized
              </p>
            )}
            {hasMultipleDurations && (
              <p className="text-xs text-yellow-400 mt-1">
                ⚠️ Notes have different durations - will be synchronized
              </p>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Start Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-rajdhani text-gray-300 mb-2">
                <Clock className="w-4 h-4 text-neon-cyan" />
                Start Time (ms)
              </label>
              <input
                type="number"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono focus:border-neon-cyan focus:outline-none"
                step="10"
                autoFocus
              />
            </div>

            {/* End Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-rajdhani text-gray-300 mb-2">
                <ArrowRight className="w-4 h-4 text-neon-cyan" />
                End Time (ms)
              </label>
              <input
                type="number"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono focus:border-neon-cyan focus:outline-none"
                step="10"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="flex items-center gap-2 text-sm font-rajdhani text-gray-300 mb-2">
                <Hash className="w-4 h-4 text-neon-cyan" />
                Duration (ms)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono focus:border-neon-cyan focus:outline-none"
                step="10"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                {parseFloat(duration) > 0 ? 'HOLD note' : 'TAP note (duration = 0)'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-neon-cyan text-black rounded hover:bg-neon-cyan/80 transition-colors font-rajdhani font-bold"
            >
              APPLY
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-transparent border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors font-rajdhani"
            >
              CANCEL
            </button>
          </div>

          {/* Hint */}
          <p className="text-xs text-gray-500 text-center mt-3">
            Press <kbd className="px-1 bg-gray-800 rounded">Enter</kbd> to apply, <kbd className="px-1 bg-gray-800 rounded">Esc</kbd> to cancel
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
