import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Note, GameErrors } from "@/lib/gameEngine";

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
  
  // Validate progress before rendering
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    GameErrors.log(`DeckMeter: Invalid progress=${progress} for lane ${lane}`);
    return null;
  }
  
  const filledSegments = Math.ceil(progress * segments);
  
  // Validate segment count
  if (!Number.isFinite(filledSegments) || filledSegments < 0 || filledSegments > segments) {
    GameErrors.log(`DeckMeter: Invalid filledSegments=${filledSegments} for lane ${lane} (max=${segments})`);
    return null;
  }

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
  // Completion is based on beatmap hold duration
  useEffect(() => {
    [-1, -2].forEach((lane) => {
      try {
        const activeNote = Array.isArray(notes) ? notes.find(n => 
          n && n.lane === lane && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && !n.hit && !n.missed
        ) : null;
        
        const wasActive = prevNoteStates.current[lane];
        const isActive = activeNote && (activeNote.pressTime || 0) > 0;
        
        // Hold just ended (was active, now inactive)
        if (wasActive && !isActive) {
          // Only freeze meter if note wasn't marked as failed
          if (activeNote && !activeNote.tooEarlyFailure && !activeNote.holdMissFailure && !activeNote.holdReleaseFailure) {
            const beatmapHoldDuration = activeNote.duration || 1000;
            const pressTime = activeNote.pressTime || 0;
            const holdDuration = currentTime - pressTime;
            
            // Validate calculations
            if (!Number.isFinite(holdDuration) || holdDuration < 0) {
              GameErrors.log(`DeckMeter: Invalid holdDuration=${holdDuration} for lane ${lane}, note ${activeNote.id}`);
              setHoldEndProgress(prev => ({ ...prev, [lane]: 0 }));
              setHoldEndTime(prev => ({ ...prev, [lane]: 0 }));
              prevNoteStates.current[lane] = isActive || false;
              return;
            }
            
            const finalProgress = Math.min(holdDuration / beatmapHoldDuration, 1.0);
            
            // Validate final progress
            if (!Number.isFinite(finalProgress) || finalProgress < 0 || finalProgress > 1) {
              GameErrors.log(`DeckMeter: Invalid finalProgress=${finalProgress} for lane ${lane}, holdDuration=${holdDuration}, beatmapDuration=${beatmapHoldDuration}`);
              setHoldEndProgress(prev => ({ ...prev, [lane]: 0 }));
              setHoldEndTime(prev => ({ ...prev, [lane]: 0 }));
              prevNoteStates.current[lane] = isActive || false;
              return;
            }
            
            setHoldEndProgress(prev => ({ ...prev, [lane]: finalProgress }));
            setHoldEndTime(prev => ({ ...prev, [lane]: currentTime }));
            
            // Trigger completion glow if meter is full (95%+)
            if (finalProgress >= COMPLETION_THRESHOLD) {
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
      } catch (error) {
        GameErrors.log(`DeckMeter effect error for lane ${lane}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
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
      
      // Find active hold note on this lane (currently being held with pressTime set)
      // This uses the note's own pressTime, matching Down3DNoteLane's source of truth
      const activeNote = Array.isArray(notes) ? notes.find(n => 
        n &&
        n.lane === lane && 
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        !n.hit && 
        !n.missed &&
        n.pressTime && 
        n.pressTime > 0
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
      
      // Note: Activation already validated by gameEngine.trackHoldStart
      // If pressTime is set, it was within ±300ms accuracy window
      // No need to re-validate here
      
      // Meter charges over beatmap-defined hold duration (or 1000ms default)
      const beatmapHoldDuration = activeNote.duration || 1000;
      const actualHoldDuration = currentTime - pressTime;
      
      if (actualHoldDuration < 0 || !Number.isFinite(actualHoldDuration)) {
        return 0;
      }
      
      // Hold note duration has expired - meter is empty regardless of player still holding
      if (actualHoldDuration >= beatmapHoldDuration) {
        return 0;
      }
      
      // Progress = how much of the beatmap hold duration has elapsed
      // 0% at press, 100% at press + beatmapHoldDuration (matches shrink animation in Down3DNoteLane)
      const progress = actualHoldDuration / beatmapHoldDuration;
      
      // Clamp to valid range [0, 1]
      const clampedProgress = Math.min(Math.max(progress, 0), 1);
      
      // Validate final result
      if (!Number.isFinite(clampedProgress)) {
        GameErrors.log(`DeckMeter: Final clamped progress invalid for lane ${lane}: ${clampedProgress}`);
        return 0;
      }
      
      return clampedProgress;
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
