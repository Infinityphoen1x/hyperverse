import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import wheelImg from "@assets/generated_images/neon_glowing_cyber_turntable_interface.png";
import { Note, GameErrors } from "@/lib/gameEngine";

interface CamelotWheelProps {
  side: "left" | "right";
  onSpin: () => void;
  notes: Note[];
  currentTime: number;
  holdStartTime?: number;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  onRotationChange?: (rotation: number) => void;
}

// Session-based pattern: use note index to get consistent pattern across game
function getPatternAngle(noteIndex: number): number {
  const pattern = [10, 45, 80, 120, 160, 35, 90, 140, 25, 70, 130, 155]; // 12-note pattern
  return pattern[noteIndex % pattern.length];
}

export function CamelotWheel({ side, onSpin, notes, currentTime, holdStartTime = 0, onHoldStart = () => {}, onHoldEnd = () => {}, onRotationChange = () => {} }: CamelotWheelProps) {
  const [internalRotation, setInternalRotation] = useState(0);
  const [indicatorGlow, setIndicatorGlow] = useState(false);
  const [spinDirection, setSpinDirection] = useState(1); // 1 for clockwise, -1 for counter-clockwise
  const [isKeyPressed, setIsKeyPressed] = useState(false);
  const [hitlineReached, setHitlineReached] = useState(false); // Track hitline detection separately
  const rotationRef = useState(0);

  // Single key toggle for spin direction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      
      const isLeftDeckKey = side === 'left' && key === 'q';
      const isRightDeckKey = side === 'right' && key === 'p';
      
      if (isLeftDeckKey || isRightDeckKey) {
        setIsKeyPressed(true);
        setHitlineReached(false); // Reset hitline detection on new press
        setSpinDirection((prev) => prev * -1); // Toggle direction
        // Defer callback to next microtask
        setTimeout(() => onHoldStart(), 0);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      const isLeftDeckKey = side === 'left' && key === 'q';
      const isRightDeckKey = side === 'right' && key === 'p';
      
      if (isLeftDeckKey || isRightDeckKey) {
        setIsKeyPressed(false);
        setHitlineReached(false); // Reset hitline detection
        // Defer callback to next microtask
        setTimeout(() => onHoldEnd(), 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [side, onHoldStart, onHoldEnd]);

  // Continuous rotation loop using RAF
  useEffect(() => {
    let animationId: number;
    const rotationSpeed = 0.5; // degrees per frame (slow enough to see dot reach hitline)
    const spinThreshold = 30; // trigger onSpin every N degrees
    let lastSpinRotation = 0;

    const animate = () => {
      if (isKeyPressed) {
        setInternalRotation((prev) => {
          const rotationDelta = rotationSpeed * spinDirection;
          const newRotation = prev + rotationDelta;
          rotationRef[1](newRotation);
          setTimeout(() => onRotationChange(newRotation), 0); // Export to parent

          // Trigger onSpin event periodically based on rotation distance
          if (Math.abs(newRotation - lastSpinRotation) >= spinThreshold) {
            setTimeout(() => onSpin(), 0);
            lastSpinRotation = newRotation;
          }
          
          // Check hitline detection (safe from RAF, not render)
          if (checkHitlineRef.current) {
            checkHitlineRef.current(newRotation);
          }

          return newRotation;
        });
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isKeyPressed, spinDirection, onSpin]);

  // Filter relevant notes
  const wheelLane = side === 'left' ? -1 : -2;
  const activeNotes = notes.filter(n => n.lane === wheelLane && !n.hit && !n.missed);

  // Hitline detection logic stored in ref - called from RAF
  const checkHitlineRef = useRef<((rot: number) => void) | null>(null);
  
  useEffect(() => {
    checkHitlineRef.current = (rot: number) => {
      try {
        if (holdStartTime === 0 || !isKeyPressed) return; // Not holding
        
        if (!Number.isFinite(rot)) {
          GameErrors.log(`CamelotWheel: Invalid rotation ${rot}`);
          return;
        }
        
        const wheelLane = side === 'left' ? -1 : -2;
        const activeNote = notes.find(n => n && n.lane === wheelLane && !n.hit && !n.missed);
        if (!activeNote) return;
        
        // Get target angle for this note
        const angleMatch = activeNote.id.match(/note-\d+-(\d+)/);
        if (!angleMatch || !angleMatch[1]) {
          GameErrors.log(`CamelotWheel: Could not parse note ID: ${activeNote.id}`);
          return;
        }
        const noteIndex = parseInt(angleMatch[1]);
        
        if (!Number.isFinite(noteIndex) || noteIndex < 0) {
          GameErrors.log(`CamelotWheel: Invalid noteIndex ${noteIndex} from ${activeNote.id}`);
          return;
        }
        
        const targetAngle = getPatternAngle(noteIndex);
        
        if (!Number.isFinite(targetAngle)) {
          GameErrors.log(`CamelotWheel: Invalid targetAngle ${targetAngle}`);
          return;
        }
        
        // Hitline is at top (spawn point). Deck dot is at (rotation + targetAngle)
        if (!Number.isFinite(rot)) {
          GameErrors.log(`CamelotWheel: Invalid rotation in hitline check: ${rot}`);
          return;
        }
        const normalizedRotation = ((rot % 360) + 360) % 360;
        const dotVisualAngle = (normalizedRotation + targetAngle) % 360;
        
        if (!Number.isFinite(dotVisualAngle) || !Number.isFinite(normalizedRotation)) {
          GameErrors.log(`CamelotWheel: Invalid angle calculation: dot=${dotVisualAngle}, norm=${normalizedRotation}`);
          return;
        }
        
        // Hitline at top is 0 degrees (or 360)
        const hitlineAngle = 0;
        
        // Check if dot has reached hitline (within tolerance)
        // Reduced from 15° to 10° for more precise hitline detection
        const angleDiff = Math.abs(dotVisualAngle - hitlineAngle);
        const normalizedDiff = angleDiff > 180 ? 360 - angleDiff : angleDiff;
        const isAtHitline = normalizedDiff < 10;
        
        if (isAtHitline && !hitlineReached) {
          setHitlineReached(true); // Update state - triggers separate effect
          setIndicatorGlow(true);
          setTimeout(() => setIndicatorGlow(false), 200);
        }
      } catch (error) {
        GameErrors.log(`CamelotWheel hitline check error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    };
  }, [holdStartTime, isKeyPressed, side, notes, hitlineReached]);

  // Call onHoldEnd when hitline is reached - separate from RAF
  useEffect(() => {
    if (hitlineReached) {
      setTimeout(() => onHoldEnd(), 0);
    }
  }, [hitlineReached, onHoldEnd]);

  const handleDrag = (_: any, info: any) => {
    try {
      if (!info || !info.delta || !Number.isFinite(info.delta.x)) {
        GameErrors.log(`CamelotWheel: Invalid drag info`);
        return;
      }
      
      setInternalRotation((prev) => {
        if (!Number.isFinite(prev)) {
          GameErrors.log(`CamelotWheel: Invalid rotation state ${prev}`);
          return prev;
        }
        const newRot = prev + info.delta.x;
        setTimeout(() => onRotationChange(newRot), 0);
        return newRot;
      });
      
      if (info.velocity && Math.abs(info.velocity.x) > 100) {
        onSpin();
      }
    } catch (error) {
      GameErrors.log(`CamelotWheel drag error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 relative">

      {/* Hitline at top edge, aligned with spawn point of visible deck */}
      <div className={`absolute z-40 -top-16 ${side === 'left' ? 'left-0' : 'right-0'}`}>
        <motion.div 
          className={`w-1 h-16 ${side === 'left' ? 'bg-neon-green/70 shadow-[0_0_20px_rgb(0,255,0)]' : 'bg-neon-red/70 shadow-[0_0_20px_rgb(255,0,0)]'}`}
          animate={{
            boxShadow: indicatorGlow 
              ? side === 'left'
                ? "0 0 50px 20px rgb(0,255,0), 0 0 30px 10px rgb(0,255,0)"
                : "0 0 50px 20px rgb(255,0,0), 0 0 30px 10px rgb(255,0,0)"
              : side === 'left'
              ? "0 0 20px rgb(0,255,0)"
              : "0 0 20px rgb(255,0,0)"
          }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Semicircle Container */}
      <div className="relative h-64 w-32 md:h-80 md:w-40 overflow-hidden">

        {/* Inner Container for the Full Wheel - positioned to show only from spawn point (50%) onwards */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-64 h-64 md:w-80 md:h-80 ${side === 'left' ? 'right-0' : 'left-0'}`}
        >
          {/* The Interactive Wheel (Spins) */}
          <motion.div
            className={`w-full h-full rounded-full border-4 overflow-hidden relative bg-black cursor-grab active:cursor-grabbing ${side === 'left' ? 'border-neon-green/50 shadow-[0_0_30px_rgba(0,255,0,0.3)]' : 'border-neon-red/50 shadow-[0_0_30px_rgba(255,0,0,0.3)]'}`}
            style={{ rotate: internalRotation }}
            drag="x"
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0}
            onDrag={handleDrag}
          >
             <img 
               src={wheelImg} 
               alt="Turntable" 
               className="w-full h-full object-cover opacity-80 mix-blend-screen"
               draggable={false}
             />
             
             {/* Center Axis */}
             <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black border-2 border-neon-cyan flex items-center justify-center z-20">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
             </div>

             {/* Note Layer - INSIDE the rotating wheel so dots spin with it */}
             <div className="absolute inset-0 pointer-events-none rounded-full">
               <AnimatePresence>
                 {activeNotes.map(note => {
                   const timeUntilHit = note.time - currentTime;
                   const HOLD_DURATION = 2000; // Hold lasts 2 seconds
                   // Dots appear at note.time (timeUntilHit = 0) and hit at note.time + 2000 (timeUntilHit = -2000)
                   // Only show dots while actively pressing the key - hide when released
                   if (!isKeyPressed) return null;
                   if (timeUntilHit > 0 || timeUntilHit < -HOLD_DURATION) return null;
                   
                   // Progress: 0 = at center (note.time), 1 = at rim (note.time + 2000)
                   const progress = -timeUntilHit / HOLD_DURATION;
                   const visualProgress = Math.max(0, Math.min(1, progress));
                   
                   // Get the target position using pattern
                   const noteIndex = parseInt(note.id.split('-')[1]) || 0;
                   const targetAngle = getPatternAngle(noteIndex);
                   
                   // Convert angle to x,y position on rim
                   const radians = (targetAngle * Math.PI) / 180;
                   const targetX = 50 + 50 * Math.cos(radians);
                   const targetY = 50 + 50 * Math.sin(radians);
                   
                   // Interpolate from center to target
                   const currentX = 50 + (targetX - 50) * visualProgress;
                   const currentY = 50 + (targetY - 50) * visualProgress;
                   
                   const scale = 0.5 + (visualProgress * 0.5);
                   const opacity = visualProgress > 0 ? Math.min(1, visualProgress * 1.5) : 0;

                   return (
                     <motion.div
                       key={note.id}
                       className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                       style={{
                         left: `${currentX}%`,
                         top: `${currentY}%`,
                         scale,
                         opacity
                       }}
                     >
                       <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-neon-pink shadow-[0_0_15px_magenta] border-2 border-white" />
                     </motion.div>
                   );
                 })}
               </AnimatePresence>
             </div>
          </motion.div>
        </div>
      </div>
      
      {/* Label */}
      <div className="text-neon-blue font-orbitron text-sm tracking-widest">
        DECK {side === 'left' ? 'A' : 'B'}
      </div>
    </div>
  );
}
