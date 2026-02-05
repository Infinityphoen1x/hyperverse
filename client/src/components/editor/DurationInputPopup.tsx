/**
 * Duration input popup for HOLD note creation via keyboard
 * Appears when user holds Q W E I O P keys for >150ms
 */

import { useState, useEffect, useRef } from 'react';
import { MIN_HOLD_DURATION } from '@/lib/config/editor';

interface DurationInputPopupProps {
  visible: boolean;
  lane: number; // Position value (-2 to 3)
  time: number;
  onConfirm: (duration: number) => void;
  onCancel: () => void;
}

export function DurationInputPopup({ visible, lane, time, onConfirm, onCancel }: DurationInputPopupProps) {
  // Early return BEFORE hooks to avoid hook count mismatch
  if (!visible) return null;

  const [durationInput, setDurationInput] = useState('500'); // Default 500ms
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when visible
    setTimeout(() => inputRef.current?.focus(), 50);
    
    // Reset input when unmounting
    return () => {
      setDurationInput('500');
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const duration = parseInt(durationInput, 10);
      if (!isNaN(duration) && duration >= MIN_HOLD_DURATION) {
        onConfirm(duration);
      } else {
        // Invalid - cancel and create TAP instead
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel(); // Cancel - will create TAP instead
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, '');
    setDurationInput(value);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ marginTop: '-100px' }} // Slightly above center
    >
      <div className="bg-black/90 border-2 border-cyan-400 rounded-lg p-4 shadow-lg pointer-events-auto">
        <div className="text-cyan-300 text-sm font-rajdhani mb-2">
          HOLD Duration (ms)
        </div>
        <input
          ref={inputRef}
          type="text"
          value={durationInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-32 bg-black/50 border border-cyan-400/50 text-white text-center font-mono text-lg px-2 py-1 rounded focus:outline-none focus:border-cyan-400"
          placeholder="500"
        />
        <div className="text-white/50 text-xs font-rajdhani mt-2 space-y-1">
          <div>↵ Enter = Confirm</div>
          <div>Esc = Cancel (TAP)</div>
          <div className="text-cyan-400/70">Min: {MIN_HOLD_DURATION}ms</div>
        </div>
      </div>
    </div>
  );
}
