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
      
      {/* Judgement Marker (Static above the wheel at 12 o'clock) */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-30">
        <div className="text-neon-cyan text-xs font-orbitron tracking-widest mb-1">HIT</div>
        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-neon-cyan drop-shadow-[0_0_10px_cyan]" />
        <div className="w-[2px] h-8 bg-neon-cyan/50" />
      </div>

      {/* Outer Glow Ring */}
      <div className="absolute inset-0 rounded-full border border-white/10 scale-110" />

      {/* The Wheel Container */}
      <div className="relative w-full h-full">
        {/* The Interactive Wheel (Spins) */}
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
        </motion.div>

        {/* Note Layer (Does not spin with wheel, sits on top) */}
        {/* Notes move from CENTER to TOP RIM (12 o'clock) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
           <AnimatePresence>
             {activeNotes.map(note => {
               const timeUntilHit = note.time - currentTime;
               // 2000ms approach time
               if (timeUntilHit > 2000 || timeUntilHit < -200) return null;
               
               // Progress: 0 = at center, 1 = at rim
               const progress = 1 - (timeUntilHit / 2000);
               
               // We want the dot to move from center (50% 50%) to top center (50% 0%)
               // Top of wheel is 0% top. Center is 50% top.
               // Interpolate top from 50% to 0%.
               
               // Clamped visual progress for overshoot
               const visualProgress = Math.max(0, progress);
               
               // Start at 50% (center), end at 0% (top)
               const topPosition = 50 - (visualProgress * 50); 
               
               // Scale effect: Start small, get bigger at rim
               const scale = 0.5 + (visualProgress * 0.5);
               const opacity = Math.min(1, visualProgress * 2); // Fade in from center

               return (
                 <motion.div
                   key={note.id}
                   className="absolute left-1/2 -translate-x-1/2 z-20"
                   style={{ 
                     top: `${topPosition}%`,
                     scale,
                     opacity
                   }}
                   initial={{ opacity: 0, top: '50%' }}
                 >
                   <div className="w-6 h-6 rounded-full bg-neon-pink shadow-[0_0_15px_magenta] border-2 border-white" />
                 </motion.div>
               );
             })}
           </AnimatePresence>
        </div>
      </div>
      
      {/* Label */}
      <div className="absolute -bottom-10 left-0 right-0 text-center text-neon-blue font-orbitron text-sm tracking-widest">
        DECK {side === 'left' ? 'A' : 'B'}
      </div>
    </div>
  );
}
