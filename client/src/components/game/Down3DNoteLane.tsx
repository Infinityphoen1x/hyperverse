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

  // Get angle for each lane in star pattern (360/6 = 60 degrees each)
  const getLaneAngle = (lane: number): number => {
    const angles: Record<number, number> = {
      '-2': 0,    // P - top
      '0': 60,    // W - top-right
      '3': 120,   // O - bottom-right
      '-1': 180,  // Q - bottom
      '2': 240,   // I - bottom-left
      '1': 300,   // E - top-left
    };
    return angles[lane as keyof typeof angles] || 0;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Star tunnel container */}
      <div 
        className="relative"
        style={{
          width: '600px',
          height: '600px',
        }}
      >
        {/* SVG for star/pentagonal tunnel guides */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.4 }}
        >
          {/* Star/tunnel edges - lines from vanishing point spreading outward */}
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 300 + Math.cos(rad) * 5;
            const y1 = 150 + Math.sin(rad) * 5;
            const x2 = 300 + Math.cos(rad) * 300;
            const y2 = 450 + Math.sin(rad) * 300;
            return (
              <line 
                key={`spoke-${angle}`}
                x1={x1} 
                y1={y1} 
                x2={x2} 
                y2={y2} 
                stroke="rgba(0,255,255,0.6)" 
                strokeWidth="2" 
              />
            );
          })}

          {/* Star shape at vanishing point */}
          <circle cx="300" cy="150" r="8" fill="rgba(0,255,255,0.8)" />
          
          {/* Depth rings - show tunnel depth */}
          {[0.2, 0.4, 0.6, 0.8].map((depthFactor) => {
            const radius = 15 + depthFactor * 285;
            return (
              <circle 
                key={`ring-${depthFactor}`}
                cx="300" 
                cy="300" 
                r={radius}
                fill="none"
                stroke="rgba(0,255,255,0.15)"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {/* Notes falling through tunnel */}
        <AnimatePresence>
          {visibleNotes.map(note => {
            const timeUntilHit = note.time - currentTime;
            const progress = 1 - (timeUntilHit / 2000); // 0 (far/spawn) to 1 (near/hitline)
            
            // Y position: starts at vanishing point (150), comes to hitline (450)
            const yPosition = 150 + (progress * 300);
            
            // Scale: starts tiny at vanishing point, grows as approaches
            const scale = 0.15 + (progress * 0.85);
            
            // Get angle for this lane
            const angle = getLaneAngle(note.lane);
            const rad = (angle * Math.PI) / 180;
            
            // Distance from center based on progress
            // Starts very close to center at vanishing point, spreads out as comes toward player
            const distanceFromCenter = 20 + (progress * 280);
            
            // Calculate X/Y using polar coordinates centered on vanishing point
            const xOffset = Math.cos(rad) * distanceFromCenter;
            const yOffset = Math.sin(rad) * distanceFromCenter;
            
            const xPosition = 300 + xOffset;

            return (
              <motion.div
                key={note.id}
                className="absolute w-12 h-12 rounded-lg flex items-center justify-center text-black font-bold text-xs font-rajdhani pointer-events-none"
                style={{
                  backgroundColor: getColorClass(note.lane),
                  boxShadow: `0 0 ${25 * scale}px ${getColorClass(note.lane)}, inset 0 0 ${15 * scale}px rgba(255,255,255,0.3)`,
                  left: `${xPosition}px`,
                  top: `${yPosition}px`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: 0.2 + progress * 0.8,
                  zIndex: Math.floor(progress * 1000),
                  border: `2px solid rgba(255,255,255,${0.3 * progress})`,
                }}
              >
                {getNoteKey(note.lane)}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Hitline area at bottom - where player hits notes */}
        <div 
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '80px',
            background: 'linear-gradient(to bottom, rgba(0,255,255,0.2), rgba(0,255,255,0.05))',
            borderTop: '4px solid hsl(180, 100%, 50%)',
            boxShadow: '0 -15px 40px rgba(0,255,255,0.4), inset 0 10px 30px rgba(0,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="text-neon-cyan font-rajdhani tracking-widest text-lg font-bold">
            ⬤ HIT ZONE ⬤
          </div>
        </div>
      </div>
    </div>
  );
}
