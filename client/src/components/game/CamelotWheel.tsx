import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import wheelImg from "@assets/generated_images/neon_glowing_cyber_turntable_interface.png";
import { Note } from "@/lib/gameEngine";

interface CamelotWheelProps {
  side: "left" | "right";
  onSpin: () => void;
  notes: Note[];
  currentTime: number;
}

// Session-based pattern: use note index to get consistent pattern across game
function getPatternAngle(noteIndex: number): number {
  const pattern = [10, 45, 80, 120, 160, 35, 90, 140, 25, 70, 130, 155]; // 12-note pattern
  return pattern[noteIndex % pattern.length];
}

export function CamelotWheel({ side, onSpin, notes, currentTime }: CamelotWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [indicatorGlow, setIndicatorGlow] = useState(false);
  const keysPressed = useState<Set<string>>(new Set())[0];
  const rotationRef = useState(0);

  // Smooth continuous rotation while holding keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      
      const leftKeys = ['q', 'w'];
      const rightKeys = ['o', 'p'];
      
      if ((side === 'left' && leftKeys.includes(key)) || (side === 'right' && rightKeys.includes(key))) {
        keysPressed.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [side, keysPressed]);

  // Continuous rotation loop using RAF
  useEffect(() => {
    let animationId: number;
    const rotationSpeed = 2; // degrees per frame
    const spinThreshold = 30; // trigger onSpin every N degrees
    let lastSpinRotation = 0;

    const animate = () => {
      let rotationDelta = 0;

      // Check which keys are pressed
      if (side === 'left') {
        if (keysPressed.has('q')) rotationDelta -= rotationSpeed;
        if (keysPressed.has('w')) rotationDelta += rotationSpeed;
      } else {
        if (keysPressed.has('o')) rotationDelta -= rotationSpeed;
        if (keysPressed.has('p')) rotationDelta += rotationSpeed;
      }

      if (rotationDelta !== 0) {
        setRotation((prev) => {
          const newRotation = prev + rotationDelta;
          rotationRef[1](newRotation);

          // Trigger onSpin event periodically based on rotation distance
          if (Math.abs(newRotation - lastSpinRotation) >= spinThreshold) {
            onSpin();
            lastSpinRotation = newRotation;
          }

          return newRotation;
        });
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [side, onSpin, keysPressed]);

  // Filter relevant notes
  const wheelLane = side === 'left' ? -1 : -2;
  const activeNotes = notes.filter(n => n.lane === wheelLane && !n.hit && !n.missed);

  // Detect when a note hits the hitline
  useEffect(() => {
    const hittingNotes = activeNotes.filter(note => {
      const timeUntilHit = note.time - currentTime;
      const progress = 1 - (timeUntilHit / 2000);
      const visualProgress = Math.max(0, Math.min(1, progress));
      
      // Get the target endpoint for this note using pattern
      const noteIndex = parseInt(note.id.split('-')[1]) || 0;
      const targetAngle = getPatternAngle(noteIndex);
      
      // Convert angle to position on rim
      const radians = (targetAngle * Math.PI) / 180;
      const targetY = 50 + 50 * Math.sin(radians);
      
      // Check if at the rim (progress ~1.0) and near spawn point (targetY close to 50)
      return visualProgress >= 0.95 && Math.abs(targetY - 50) < 3;
    });

    if (hittingNotes.length > 0) {
      setIndicatorGlow(true);
      setTimeout(() => setIndicatorGlow(false), 200);
    }
  }, [activeNotes, currentTime]);

  const handleDrag = (_: any, info: any) => {
    setRotation((prev) => prev + info.delta.x);
    if (Math.abs(info.velocity.x) > 100) {
      onSpin();
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
            style={{ rotate: rotation }}
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
                   if (timeUntilHit > 2000 || timeUntilHit < -200) return null;
                   
                   // Progress: 0 = at center, 1 = at rim
                   const progress = 1 - (timeUntilHit / 2000);
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
