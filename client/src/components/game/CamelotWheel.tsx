import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
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
    <div className="flex flex-col items-center gap-6 relative">
      
      {/* Judgement Indicator - ABOVE the deck, vertical (parallel to y-axis) */}
      <div className="flex flex-col items-center gap-1 z-30">
        <div className="text-neon-cyan text-xs font-orbitron tracking-widest">HIT</div>
        <div className="w-1 h-12 bg-neon-cyan/50 shadow-[0_0_10px_cyan]" />
      </div>

      {/* Semicircle Container */}
      <div className="relative h-64 w-32 md:h-80 md:w-40 overflow-hidden">
        
        {/* Inner Container for the Full Wheel - Show RIGHT half for Left Deck, LEFT half for Right Deck */}
        <div 
          className={`absolute top-0 w-64 h-64 md:w-80 md:h-80 ${side === 'left' ? 'right-0' : 'left-0'}`}
        >
          {/* The Interactive Wheel (Spins) */}
          <motion.div
            className="w-full h-full rounded-full border-4 border-neon-purple/50 overflow-hidden relative bg-black cursor-grab active:cursor-grabbing shadow-[0_0_30px_rgba(190,0,255,0.3)]"
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
          </motion.div>

          {/* Note Layer (Sits on top, non-spinning container) */}
          {/* Dots move from center UPWARD toward top rim to match the indicator line above */}
          <div className="absolute inset-0 pointer-events-none rounded-full">
             <AnimatePresence>
               {activeNotes.map(note => {
                 const timeUntilHit = note.time - currentTime;
                 if (timeUntilHit > 2000 || timeUntilHit < -200) return null;
                 
                 // Progress: 0 = at center, 1 = at rim
                 const progress = 1 - (timeUntilHit / 2000);
                 const visualProgress = Math.max(0, Math.min(1, progress));
                 
                 // Vertical movement: from center (50%) to top (0%)
                 const topPos = 50 - (visualProgress * 50);
                 
                 const scale = 0.5 + (visualProgress * 0.5);
                 const opacity = visualProgress > 0 ? Math.min(1, visualProgress * 1.5) : 0;

                 return (
                   <motion.div
                     key={note.id}
                     className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                     style={{
                       top: `${topPos}%`,
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
        </div>
      </div>
      
      {/* Label */}
      <div className="text-neon-blue font-orbitron text-sm tracking-widest">
        DECK {side === 'left' ? 'A' : 'B'}
      </div>
    </div>
  );
}
