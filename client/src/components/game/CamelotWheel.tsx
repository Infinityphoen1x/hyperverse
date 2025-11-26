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

export function CamelotWheel({ side, onSpin, notes, currentTime }: CamelotWheelProps) {
  const [rotation, setRotation] = useState(0);

  // Filter relevant notes
  const wheelLane = side === 'left' ? -1 : -2;
  const activeNotes = notes.filter(n => n.lane === wheelLane && !n.hit && !n.missed);

  const handleDrag = (_: any, info: any) => {
    setRotation((prev) => prev + info.delta.x);
    if (Math.abs(info.velocity.x) > 100) {
      onSpin();
    }
  };

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
      
      {/* Judgement Marker (Static on Rim at 12 o'clock) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-neon-cyan z-30 drop-shadow-[0_0_10px_cyan]" />
      
      {/* Outer Glow Ring */}
      <div className="absolute inset-0 rounded-full border border-white/10 scale-110" />

      {/* The Wheel */}
      <motion.div
        className="w-full h-full rounded-full border-4 border-neon-purple/50 overflow-hidden relative bg-black cursor-grab active:cursor-grabbing shadow-[0_0_30px_rgba(190,0,255,0.3)]"
        style={{ rotate: rotation }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
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

         {/* Note Dots (Rotating with logic relative to Judgement Line) */}
         {/* 
             Since the wheel spins freely, we need to decouple the visual note position from the wheel rotation 
             OR map them to a separate overlay that doesn't spin with user drag but spins with time?
             
             User request: "moving dots on them that must line up with a judgement line"
             
             Let's implement: An overlay layer that rotates based on TIME to approach the 12 o'clock mark.
             It does NOT rotate with the user's drag (which is for input).
         */}
         <div className="absolute inset-0 pointer-events-none">
            <AnimatePresence>
              {activeNotes.map(note => {
                const timeUntilHit = note.time - currentTime;
                if (timeUntilHit > 2000 || timeUntilHit < -200) return null;
                
                // Map time to rotation.
                // 0ms = 0deg (at top)
                // 2000ms = -180deg (at bottom) ? Or full circle?
                // Let's do -90deg (9 o'clock) to 0deg (12 o'clock) approach
                // Or standard clock: appear at some angle and rotate to 0.
                
                const degrees = (timeUntilHit / 2000) * -360; // Full rotation approach

                return (
                  <motion.div
                    key={note.id}
                    className="absolute inset-0"
                    style={{ rotate: degrees }} // Rotate the container
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* The Dot is at the top (12 o'clock) of this rotated container */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-neon-pink shadow-[0_0_15px_magenta] border-2 border-white" />
                  </motion.div>
                );
              })}
            </AnimatePresence>
         </div>
      </motion.div>
      
      {/* Label */}
      <div className="absolute -bottom-10 left-0 right-0 text-center text-neon-blue font-orbitron text-sm tracking-widest">
        DECK {side === 'left' ? 'A' : 'B'}
      </div>
    </div>
  );
}
