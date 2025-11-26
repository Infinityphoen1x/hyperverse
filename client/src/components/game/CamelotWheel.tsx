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
    <div className="flex flex-col items-center gap-4">
      {/* Judgement Marker - Always at 12 o'clock relative to the full circle */}
      {/* Since we are clipping, we need to position this relative to the visible part */}
      <div className="flex flex-col items-center z-30">
        <div className="text-neon-cyan text-xs font-orbitron tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(0,0,0,1)]">HIT</div>
        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[16px] border-t-neon-cyan drop-shadow-[0_0_10px_cyan]" />
      </div>

      {/* 
          Vertical Semicircle Container 
          Width = Half of Height (approx)
          We want to show the 'inner' halves usually, or just a vertical slice.
          Let's do a generic vertical slice for now.
          
          If side='left', maybe show the left half?
          If side='right', show the right half?
          
          User asked for "splicing axis... the y-axis".
          Let's make them look like brackets [  ] around the center console.
          Left Deck = Shows Right Half ( D )
          Right Deck = Shows Left Half ( C )
      */}
      <div className="relative w-32 h-64 md:w-40 md:h-80 overflow-hidden">
        
        {/* Inner Container for the Full Wheel - Positioned to show correct half */}
        <div 
          className={`absolute top-0 w-64 h-64 md:w-80 md:h-80 ${side === 'left' ? 'right-0' : 'left-0'}`}
        >
          {/* The Interactive Wheel (Spins) */}
          <motion.div
            className="w-full h-full rounded-full border-4 border-neon-purple/50 overflow-hidden relative bg-black cursor-grab active:cursor-grabbing shadow-[0_0_30px_rgba(190,0,255,0.3)]"
            style={{ rotate: rotation }}
            drag="y" // vertical drag feels better on side wheels? Or X? User said "Spin decks with mouse".
            // Let's keep drag="x" logic but maybe on the vertical axis it maps differently?
            // Let's stick to drag="x" on the element itself, even if clipped.
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

          {/* Note Layer (Does not spin with wheel, sits on top) */}
          <div className="absolute inset-0 pointer-events-none rounded-full">
             <AnimatePresence>
               {activeNotes.map(note => {
                 const timeUntilHit = note.time - currentTime;
                 // 2000ms approach time
                 if (timeUntilHit > 2000 || timeUntilHit < -200) return null;
                 
                 // Progress: 0 = at center, 1 = at rim
                 const progress = 1 - (timeUntilHit / 2000);
                 const visualProgress = Math.max(0, progress);
                 
                 // RADIATE OUTWARD: Center to Top (12 o'clock)
                 // Center is 50%, 50%. Top is 50%, 0%.
                 // Distance from center (0) to edge (50%).
                 
                 // Current distance from center (in %)
                 // At progress 0 (start), distance is 0.
                 // At progress 1 (end), distance is 50% (to reach edge).
                 
                 const distance = visualProgress * 50; 
                 
                 // If we want to go to 12 o'clock:
                 // Top position = 50% (Center) - distance
                 // Left position = 50% (Center)
                 
                 const topPos = 50 - distance;
                 
                 // Scale effect
                 const scale = 0.5 + (visualProgress * 0.5);
                 const opacity = Math.min(1, visualProgress * 2); 

                 return (
                   <motion.div
                     key={note.id}
                     className="absolute left-1/2 -translate-x-1/2 z-20"
                     style={{ 
                       top: `${topPos}%`,
                       scale,
                       opacity
                     }}
                     initial={{ opacity: 0, top: '50%' }}
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
