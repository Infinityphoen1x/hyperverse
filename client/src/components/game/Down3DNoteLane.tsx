import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
}

export function Down3DNoteLane({ notes, currentTime }: Down3DNoteLaneProps) {
  // Filter visible notes (all lanes: 0-3 for pads, -1/-2 for decks)
  const visibleNotes = notes.filter(n => {
    const timeUntilHit = n.time - currentTime;
    return timeUntilHit > -200 && timeUntilHit < 2000;
  });

  const getColorClass = (lane: number): string => {
    switch (lane) {
      case -1: return 'bg-neon-green shadow-[0_0_20px_rgb(0,255,0)]';
      case -2: return 'bg-neon-red shadow-[0_0_20px_rgb(255,0,0)]';
      case 0: return 'bg-neon-pink shadow-[0_0_20px_rgb(255,0,127)]';
      case 1: return 'bg-neon-cyan shadow-[0_0_20px_rgb(0,255,255)]';
      case 2: return 'bg-neon-purple shadow-[0_0_20px_rgb(190,0,255)]';
      case 3: return 'bg-neon-blue shadow-[0_0_20px_rgb(0,150,255)]';
      default: return 'bg-gray-500';
    }
  };

  const getNoteKey = (lane: number): string => {
    if (lane === -1) return 'Q';
    if (lane === -2) return 'P';
    return ['W', 'E', 'I', 'O'][lane];
  };

  // Position notes in a 360-degree circular pattern
  const getPositionForLane = (lane: number): { x: number; rotation: number } => {
    const angles = {
      '-2': 0,    // P - top
      '0': 45,    // W - top-right
      '1': 90,    // E - right
      '3': 135,   // O - bottom-right
      '-1': 180,  // Q - bottom
      '2': 225,   // I - bottom-left
    };
    const angle = angles[lane as keyof typeof angles] || 0;
    const radius = 120;
    const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
    return { x, rotation: angle };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1200px' }}>
      {/* 3D Lane Container */}
      <div 
        className="relative"
        style={{
          width: '300px',
          height: '600px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Background depth lanes - circular pattern */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-white/10"
          style={{
            transform: 'translateZ(-400px)',
            width: '100%',
            height: '100%',
            opacity: 0.2,
          }}
        />
        <div 
          className="absolute inset-0 rounded-full border-2 border-white/5"
          style={{
            transform: 'translateZ(-200px)',
            width: '100%',
            height: '100%',
            opacity: 0.3,
          }}
        />

        {/* Notes scrolling down with 3D perspective */}
        <AnimatePresence>
          {visibleNotes.map(note => {
            const timeUntilHit = note.time - currentTime;
            const progress = 1 - (timeUntilHit / 2000); // 0 to 1, where 1 is at hitline
            
            // Z-depth: notes start far (negative Z) and come toward camera (positive Z)
            const zDepth = -500 + (progress * 500);
            
            // Y position: starts high up, comes down
            const yPosition = -250 + (progress * 500);
            
            // Scale based on depth (perspective effect)
            const scale = 0.3 + (progress * 0.7);
            
            const { x, rotation } = getPositionForLane(note.lane);

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className={`absolute w-12 h-12 rounded-lg ${getColorClass(note.lane)} flex items-center justify-center text-black font-bold text-sm font-rajdhani`}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `
                    translateX(${x}px)
                    translateY(${yPosition}px)
                    translateZ(${zDepth}px)
                    translateX(-50%)
                    translateY(-50%)
                    scale(${scale})
                    rotateY(${rotation}deg)
                  `,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0s linear',
                  filter: `brightness(${0.5 + progress * 0.5})`,
                }}
              >
                {getNoteKey(note.lane)}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Hitline at bottom (where player hits) */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center"
          style={{
            width: '280px',
            height: '60px',
            transformStyle: 'preserve-3d',
            borderRadius: '50%',
            border: '2px solid hsl(180, 100%, 50%)',
            boxShadow: '0 0 30px hsl(180, 100%, 50%), inset 0 0 20px hsl(180, 100%, 50%)',
            background: 'radial-gradient(circle, rgba(0,255,255,0.1) 0%, transparent 70%)',
          }}
        >
          <div className="text-xs text-neon-cyan font-rajdhani tracking-widest">HIT</div>
        </div>

        {/* Lane guide lines - show the circular paths */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.1 }}
        >
          {/* Circle guide */}
          <circle cx="150" cy="150" r="120" fill="none" stroke="white" strokeWidth="1" />
          {/* Radial guides for each lane */}
          <line x1="150" y1="30" x2="150" y2="270" stroke="white" strokeWidth="1" />
          <line x1="150" y1="30" x2="275" y2="155" stroke="white" strokeWidth="1" />
          <line x1="150" y1="30" x2="270" y2="150" stroke="white" strokeWidth="1" />
          <line x1="150" y1="30" x2="275" y2="155" stroke="white" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
