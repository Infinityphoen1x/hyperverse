import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import {
  DECK_METER_SEGMENTS,
  DECK_METER_SEGMENT_WIDTH,
  DECK_METER_COMPLETION_THRESHOLD,
  DECK_METER_COMPLETION_GLOW_DURATION,
  DECK_METER_DEFAULT_HOLD_DURATION,
  COLOR_DECK_LEFT,
  COLOR_DECK_RIGHT,
} from '@/lib/config/gameConstants';

interface DeckHoldMetersProps {
  notes: Note[];
  currentTime: number;
}

const getRectangleMeterColor = (lane: number): string => {
  if (lane === -1) return COLOR_DECK_LEFT; // Q - green
  if (lane === -2) return COLOR_DECK_RIGHT; // P - red
  return '#FFFFFF'; // Fallback
};

// Helper: Check if a note is an active (pressed, not failed) hold note on a specific lane
const isActiveHoldNote = (note: Note, lane: number): boolean => {
  return !!(
    note &&
    note.lane === lane && 
    (note.type === 'SPIN_LEFT' || note.type === 'SPIN_RIGHT') && 
    !note.hit &&
    !note.tooEarlyFailure &&
    !note.holdMissFailure &&
    !note.holdReleaseFailure &&
    note.pressHoldTime && 
    note.pressHoldTime > 0
  );
};

interface RectangleMeterProps {
  progress: number;
  outlineColor: string;
  lane: number;
  completionGlow: Record<number, boolean>;
}

const RectangleMeter = ({ progress, outlineColor, lane, completionGlow }: RectangleMeterProps) => {
  // Validate progress before rendering
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    GameErrors.log(`DeckMeter: Invalid progress=${progress} for lane ${lane}`);
    return null;
  }
  
  const filledSegments = Math.ceil(progress * DECK_METER_SEGMENTS);
  const isFull = progress >= DECK_METER_COMPLETION_THRESHOLD;
  
  // Validate segment count
  if (!Number.isFinite(filledSegments) || filledSegments < 0 || filledSegments > DECK_METER_SEGMENTS) {
    GameErrors.log(`DeckMeter: Invalid filledSegments=${filledSegments} for lane ${lane} (max=${DECK_METER_SEGMENTS})`);
    return null;
  }

  return (
    <motion.div 
      className="flex flex-col-reverse gap-0.5"
      animate={completionGlow[lane] ? { scale: 1.15 } : { scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {Array.from({ length: DECK_METER_SEGMENTS }).map((_, idx) => {
        const fillColor = getRectangleMeterColor(lane);
        const isFilled = idx < filledSegments;
        
        // Full meter gets special glow treatment
        const fullMeterGlow = isFull && isFilled;
        
        return (
          <motion.div
            key={idx}
            className="h-4 rounded-sm border-2"
            style={{
              width: `${DECK_METER_SEGMENT_WIDTH}px`,
              borderColor: outlineColor,
              background: isFilled ? fillColor : 'transparent',
              boxShadow: fullMeterGlow
                ? `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`
                : isFilled 
                  ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)` 
                  : 'none',
            }}
            animate={{
              opacity: isFilled ? 1 : 0.15,
              boxShadow: fullMeterGlow
                ? [
                    `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`,
                    `0 0 20px ${fillColor}, 0 0 40px ${fillColor}, inset 0 0 10px rgba(255,255,255,0.8)`,
                    `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`,
                  ]
                : isFilled
                  ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)`
                  : 'none',
            }}
            transition={fullMeterGlow ? { duration: 0.6, repeat: Infinity } : { duration: 0.08 }}
          />
        );
      })}
    </motion.div>
  );
};

export function DeckHoldMeters({ notes, currentTime }: DeckHoldMetersProps) {
  // CRITICAL: Meter calculation is INDEPENDENT of Hold Note rendering
  // - Receives full, unfiltered notes array from gameEngine
  // - Uses only note properties: duration, pressHoldTime, currentTime
  // - Not affected by Down3DNoteLane's rendering skip (collapseProgress >= 1.0)
  // - Meter fills based on (currentTime - pressHoldTime) / duration
  
  const [completionGlow, setCompletionGlow] = useState<Record<number, boolean>>({ [-1]: false, [-2]: false });
  const prevCompletionRef = useRef<Record<number, boolean>>({ [-1]: false, [-2]: false });
  const prevActiveNoteIdRef = useRef<Record<number, string>>({ [-1]: '', [-2]: '' });
  const glowTimeoutRef = useRef<Record<number, NodeJS.Timeout | null>>({ [-1]: null, [-2]: null });

  // Clean up timeout refs on unmount
  useEffect(() => {
    return () => {
      [-1, -2].forEach((lane) => {
        if (glowTimeoutRef.current[lane]) {
          clearTimeout(glowTimeoutRef.current[lane]!);
          glowTimeoutRef.current[lane] = null;
        }
      });
    };
  }, []);

  // Detect when a hold note changes state and reset meter
  useEffect(() => {
    if (!Array.isArray(notes)) return;
    
    [-1, -2].forEach((lane) => {
      const activeNote = notes.find(n => isActiveHoldNote(n, lane));
      const currentNoteId = activeNote?.id || '';
      const prevNoteId = prevActiveNoteIdRef.current[lane];
      
      // Note ID changed (including from having active to having none) - reset glow
      if (prevNoteId !== currentNoteId) {
        prevCompletionRef.current[lane] = false;
        setCompletionGlow(prev => ({ ...prev, [lane]: false }));
      }
      
      // Update tracking
      prevActiveNoteIdRef.current[lane] = currentNoteId;
    });
  }, [notes]);

  // Calculate hold note progress with completion glow trigger
  // INDEPENDENT CALCULATION: Uses only note properties, never affected by rendering state
  const getHoldProgress = (lane: number): number => {
    try {
      if (!Array.isArray(notes) || !Number.isFinite(currentTime)) return 0;
      
      // Find active hold note on this lane (pressHoldTime set, not hit, and not failed)
      // This check is INDEPENDENT of rendering - uses raw note state from gameEngine
      const activeNote = notes.find(n => isActiveHoldNote(n, lane));
      
      // No active note = no progress
      if (!activeNote) return 0;
      
      // Must have pressHoldTime to show progress
      if (!activeNote.pressHoldTime || activeNote.pressHoldTime <= 0) return 0;
      
      // Duration comes directly from beatmap, not from rendering state
      const beatmapHoldDuration = (activeNote.duration && activeNote.duration > 0) ? activeNote.duration : DECK_METER_DEFAULT_HOLD_DURATION;
      
      // CRITICAL: Measure from note.time (not pressHoldTime) so early presses don't double-count
      // Example: If note.time=1000, duration=1000, and player presses at 950 (early):
      // - Meter should measure from 1000 to 2000 (1000ms window)
      // - Not from 950 to 2000 (1050ms)
      const elapsedFromNoteTime = currentTime - activeNote.time;
      
      // No negative progress (before note.time)
      if (elapsedFromNoteTime < 0) return 0;
      
      // Calculate progress: 0→1.0 over hold duration window starting from note.time
      const progress = Math.min(elapsedFromNoteTime / beatmapHoldDuration, 1.0);
      
      // Sanity check
      if (!Number.isFinite(progress) || progress < 0 || progress > 1) return 0;
      
      // Trigger completion glow when meter reaches threshold
      if (progress >= DECK_METER_COMPLETION_THRESHOLD && !prevCompletionRef.current[lane]) {
        prevCompletionRef.current[lane] = true;
        setCompletionGlow(prev => ({ ...prev, [lane]: true }));
        if (glowTimeoutRef.current[lane]) clearTimeout(glowTimeoutRef.current[lane]!);
        glowTimeoutRef.current[lane] = setTimeout(
          () => setCompletionGlow(prev => ({ ...prev, [lane]: false })),
          DECK_METER_COMPLETION_GLOW_DURATION
        );
      } else if (progress < DECK_METER_COMPLETION_THRESHOLD) {
        prevCompletionRef.current[lane] = false;
      }
      
      return progress;
    } catch (error) {
      GameErrors.log(`DeckMeter getHoldProgress error for lane ${lane}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return 0;
    }
  };

  const leftProgress = getHoldProgress(-1);
  const rightProgress = getHoldProgress(-2);

  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      {/* Left Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-green font-bold tracking-widest">Q</div>
        <RectangleMeter progress={leftProgress} outlineColor={COLOR_DECK_LEFT} lane={-1} completionGlow={completionGlow} />
      </div>

      {/* Right Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-red font-bold tracking-widest">P</div>
        <RectangleMeter progress={rightProgress} outlineColor={COLOR_DECK_RIGHT} lane={-2} completionGlow={completionGlow} />
      </div>
    </div>
  );
}
