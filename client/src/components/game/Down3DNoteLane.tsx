import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
}

export function Down3DNoteLane({ notes, currentTime }: Down3DNoteLaneProps) {
  // Filter visible notes
  const visibleNotes = notes.filter(n => {
    const timeUntilHit = n.time - currentTime;
    return timeUntilHit > -200 && timeUntilHit < 2000;
  });

  const getColorClass = (lane: number): string => {
    switch (lane) {
      case -1: return '#00FF00'; // Q - green
      case -2: return '#FF0000'; // P - red
      case 0: return '#FF007F'; // W - pink
      case 1: return '#00FFFF'; // E - cyan
      case 2: return '#BE00FF'; // I - purple
      case 3: return '#0096FF'; // O - blue
      default: return '#FFFFFF';
    }
  };

  const getNoteKey = (lane: number): string => {
    if (lane === -1) return 'Q';
    if (lane === -2) return 'P';
    return ['W', 'E', 'I', 'O'][lane];
  };

  // Get horizontal lane position (for the 6 lanes arranged)
  const getLaneX = (lane: number): number => {
    const lanes: Record<number, number> = {
      '-2': -60,  // P - left far
      '-1': -30,  // Q - left near
      '0': 0,     // W - center-left
      '1': 30,    // E - center
      '2': 60,    // I - right far
      '3': 90,    // O - right far+
    };
    return lanes[lane as keyof typeof lanes] || 0;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" 
      style={{ perspective: '1500px' }}>
      
      {/* Perspective container */}
      <div 
        className="relative"
        style={{
          width: '800px',
          height: '600px',
          transformStyle: 'preserve-3d',
          perspective: '1500px',
        }}
      >
        {/* Lane guides - converging lines showing perspective */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.3 }}
        >
          {/* Vanishing point center */}
          <circle cx="400" cy="150" r="3" fill="white" />
          
          {/* Lane divider lines converging to vanishing point */}
          {[-120, -60, 0, 60, 120, 180].map((xOffset, i) => (
            <line 
              key={`line-${i}`}
              x1={xOffset + 400} 
              y1="600" 
              x2="400" 
              y2="150" 
              stroke="rgba(0,255,255,0.4)" 
              strokeWidth="2" 
            />
          ))}
          
          {/* Depth rings - horizontal lines showing distance */}
          {[100, 200, 300, 400, 500].map((y, i) => (
            <line 
              key={`ring-${i}`}
              x1={400 - (150 * (1 - (600 - y) / 450))}
              y1={y}
              x2={400 + (150 * (1 - (600 - y) / 450))}
              y2={y}
              stroke="rgba(0,255,255,0.2)"
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Notes falling down the tunnel */}
        <AnimatePresence>
          {visibleNotes.map(note => {
            const timeUntilHit = note.time - currentTime;
            const progress = 1 - (timeUntilHit / 2000); // 0 (far) to 1 (near/hitline)
            
            // Y position: starts at top, comes to bottom
            const yPosition = 150 + (progress * 450);
            
            // Scale based on perspective (far to near)
            const scale = 0.3 + (progress * 0.8);
            
            // Horizontal position (depends on lane)
            const baseX = getLaneX(note.lane);
            
            // Horizontal convergence toward center (wider when far, narrower when near)
            const convergence = baseX * (1 - progress * 0.7);
            const xPosition = 400 + convergence;

            return (
              <motion.div
                key={note.id}
                className="absolute w-12 h-12 rounded-lg flex items-center justify-center text-black font-bold text-xs font-rajdhani pointer-events-none"
                style={{
                  backgroundColor: getColorClass(note.lane),
                  boxShadow: `0 0 ${20 * scale}px ${getColorClass(note.lane)}`,
                  left: `${xPosition}px`,
                  top: `${yPosition}px`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: 0.3 + progress * 0.7,
                  zIndex: Math.floor(progress * 100),
                }}
              >
                {getNoteKey(note.lane)}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Hitline area at bottom */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-24"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,255,255,0.1), rgba(0,255,255,0.05))',
            borderTop: '3px solid hsl(180, 100%, 50%)',
            boxShadow: '0 -10px 30px rgba(0,255,255,0.3), inset 0 10px 30px rgba(0,255,255,0.1)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-neon-cyan font-rajdhani tracking-widest text-xl font-bold">
            HIT ZONE
          </div>
        </div>
      </div>
    </div>
  );
}
