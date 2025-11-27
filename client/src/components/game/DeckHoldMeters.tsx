import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Note } from "@/lib/gameEngine";

const COMPLETION_THRESHOLD = 0.95;

interface DeckHoldMetersProps {
  notes: Note[];
  currentTime: number;
}

const getRectangleMeterColor = (lane: number): string => {
  if (lane === -1) return '#00FF00'; // Q - green
  if (lane === -2) return '#FF0000'; // P - red
  return '#FFFFFF'; // Fallback
};

interface RectangleMeterProps {
  progress: number;
  outlineColor: string;
  lane: number;
  completionGlow: Record<number, boolean>;
}

const RectangleMeter = ({ progress, outlineColor, lane, completionGlow }: RectangleMeterProps) => {
  const segments = 16;
  const filledSegments = Math.ceil(progress * segments);
  const isComplete = progress >= COMPLETION_THRESHOLD;

  return (
    <motion.div 
      className="flex flex-col-reverse gap-0.5"
      animate={completionGlow[lane] ? { scale: 1.1 } : { scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {Array.from({ length: segments }).map((_, idx) => {
        const fillColor = getRectangleMeterColor(lane);
        const isFilled = idx < filledSegments;
        return (
          <motion.div
            key={idx}
            className="h-4 rounded-sm border-2"
            style={{
              width: '60px',
              borderColor: outlineColor,
              background: isFilled ? fillColor : 'transparent',
              boxShadow: isFilled 
                ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)` 
                : 'none',
            }}
            animate={{
              opacity: isFilled ? 1 : 0.15,
              boxShadow: completionGlow[lane] && isFilled
                ? `0 0 20px ${fillColor}, inset 0 0 10px rgba(255,255,255,0.6)`
                : isFilled
                  ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)`
                  : 'none',
            }}
            transition={{ duration: 0.08 }}
          />
        );
      })}
    </motion.div>
  );
};

export function DeckHoldMeters({ notes, currentTime }: DeckHoldMetersProps) {
  // Track when holds end to briefly freeze meter for visual feedback
  const [holdEndProgress, setHoldEndProgress] = useState<Record<number, number>>({ [-1]: 0, [-2]: 0 });
  const [holdEndTime, setHoldEndTime] = useState<Record<number, number>>({ [-1]: 0, [-2]: 0 });
  const [completionGlow, setCompletionGlow] = useState<Record<number, boolean>>({ [-1]: false, [-2]: false });
  const prevNoteStates = useRef<Record<number, boolean>>({ [-1]: false, [-2]: false });

  // Detect when hold notes transition from active to inactive
  // Completion is based on fixed 1000ms hold duration
  useEffect(() => {
    [-1, -2].forEach((lane) => {
      const activeNote = Array.isArray(notes) ? notes.find(n => 
        n && n.lane === lane && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && !n.hit && !n.missed
      ) : null;
      
      const wasActive = prevNoteStates.current[lane];
      const isActive = activeNote && (activeNote.pressTime || 0) > 0;
      
      // Hold just ended (was active, now inactive)
      if (wasActive && !isActive) {
        let finalProgress = 0;
        let isComplete = false;
        // Only freeze meter if note wasn't marked as failed
        if (activeNote && !activeNote.tooEarlyFailure && !activeNote.holdMissFailure && !activeNote.holdReleaseFailure) {
          const HOLD_DURATION = 1000; // ms - fixed hold duration
          const pressTime = activeNote.pressTime || 0;
          const holdDuration = currentTime - pressTime;
          finalProgress = Math.min(holdDuration / HOLD_DURATION, 1.0);
          isComplete = finalProgress >= COMPLETION_THRESHOLD; // Consider 95%+ as complete
          
          setHoldEndProgress(prev => ({ ...prev, [lane]: finalProgress }));
          setHoldEndTime(prev => ({ ...prev, [lane]: currentTime })); // Mark when it ended
          
          // Trigger completion glow if meter is full
          if (isComplete) {
            setCompletionGlow(prev => ({ ...prev, [lane]: true }));
            setTimeout(() => setCompletionGlow(prev => ({ ...prev, [lane]: false })), 400);
          }
        } else {
          // Failed hold - clear frozen state immediately
          setHoldEndProgress(prev => ({ ...prev, [lane]: 0 }));
          setHoldEndTime(prev => ({ ...prev, [lane]: 0 }));
        }
      }
      
      // New hold started, clear the end progress
      if (!wasActive && isActive) {
        setHoldEndProgress(prev => ({ ...prev, [lane]: 0 }));
        setHoldEndTime(prev => ({ ...prev, [lane]: 0 }));
        setCompletionGlow(prev => ({ ...prev, [lane]: false }));
      }
      
      prevNoteStates.current[lane] = isActive || false;
    });
  }, [currentTime, notes]);

  // Get hold progress based on note.pressTime (single source of truth)
  // Meter charges from 0% at press to 100% at press + 1000ms hold duration
  // Synced with Down3DNoteLane which uses the same note.pressTime source
  const getHoldProgress = (lane: number): number => {
    try {
      if (!Number.isInteger(lane)) return 0;
      
      // Validate time values
      if (!Number.isFinite(currentTime)) {
        return 0;
      }
      
      // Find active hold note on this lane (not hit, not missed)
      // This uses the note's own pressTime, matching Down3DNoteLane's source of truth
      const activeNote = Array.isArray(notes) ? notes.find(n => 
        n &&
        n.lane === lane && 
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        !n.hit && 
        !n.missed
      ) : null;
      
      // Show frozen meter for 1000ms after hold ends (synced with shrinking animation)
      const holdEndTimeVal = holdEndTime[lane] || 0;
      if (holdEndTimeVal > 0 && currentTime - holdEndTimeVal < 1000) {
        const frozenProgress = Math.min(Math.max(holdEndProgress[lane], 0), 1);
        return frozenProgress;
      }
      
      // If no active hold note, return 0 (no charge without active note)
      if (!activeNote) {
        return 0;
      }
      
      // If note has any failure flags, return 0 (no meter for failed notes)
      if (activeNote.tooEarlyFailure || activeNote.holdMissFailure || activeNote.holdReleaseFailure) {
        return 0;
      }
      
      // Get press time from note object (single source of truth, matches Down3DNoteLane)
      const pressTime = activeNote.pressTime || 0;
      
      // Not actively holding
      if (!pressTime || pressTime <= 0) return 0;
      
      // CRITICAL: Validate hold was pressed within accuracy window (±300ms)
      const timeSinceNoteSpawn = pressTime - activeNote.time;
      const ACTIVATION_WINDOW = 300;
      const isValidActivation = Math.abs(timeSinceNoteSpawn) <= ACTIVATION_WINDOW;
      
      // If pressed outside valid window, meter returns 0 (no charge)
      if (!isValidActivation) {
        return 0;
      }
      
      // Meter charges over fixed 1000ms hold duration (slowed for easier timing)
      const HOLD_DURATION = 1000; // ms - fixed hold duration
      const actualHoldDuration = currentTime - pressTime;
      
      if (actualHoldDuration < 0 || !Number.isFinite(actualHoldDuration)) {
        return 0;
      }
      
      // Hold note duration has expired - meter is empty regardless of player still holding
      if (actualHoldDuration >= HOLD_DURATION) {
        return 0;
      }
      
      // Progress = how much of the 1000ms hold duration has elapsed
      // 0% at press, 100% at press + 1000ms (matches shrink animation in Down3DNoteLane)
      const progress = actualHoldDuration / HOLD_DURATION;
      
      // Clamp to valid range [0, 1]
      return Math.min(Math.max(progress, 0), 1);
    } catch (error) {
      console.warn(`getHoldProgress error: ${error}`);
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
        <RectangleMeter progress={leftProgress} outlineColor="#00FF00" lane={-1} completionGlow={completionGlow} />
      </div>

      {/* Right Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-red font-bold tracking-widest">P</div>
        <RectangleMeter progress={rightProgress} outlineColor="#FF0000" lane={-2} completionGlow={completionGlow} />
      </div>
    </div>
  );
}
