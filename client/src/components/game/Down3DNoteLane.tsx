import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
}

export function Down3DNoteLane({ notes, currentTime }: Down3DNoteLaneProps) {
  // Filter visible notes - ONLY soundpad notes (lanes 0, 1, 2, 3), exclude deck notes (-1, -2)
  const visibleNotes = notes.filter(n => {
    const timeUntilHit = n.time - currentTime;
    return timeUntilHit > -200 && timeUntilHit < 2000 && n.lane >= 0;
  });

  const getColorClass = (lane: number): string => {
    switch (lane) {
      case 0: return '#FF007F'; // W - pink
      case 1: return '#00FFFF'; // E - cyan
      case 2: return '#BE00FF'; // I - purple
      case 3: return '#0096FF'; // O - blue
      default: return '#FFFFFF';
    }
  };

  const getNoteKey = (lane: number): string => {
    return ['W', 'E', 'I', 'O'][lane];
  };

  // Get angle for each lane in star pattern (4 lanes at 90 degree intervals)
  const getLaneAngle = (lane: number): number => {
    const angles: Record<number, number> = {
      '0': 270,   // W - left
      '1': 315,   // E - bottom-right
      '2': 225,   // I - bottom-left
      '3': 315,   // O - right (adjusted for 4-lane layout)
    };
    return angles[lane as keyof typeof angles] || 0;
  };

  // Adjusted angles for 4-lane star (bottom half - where soundpads are)
  const getFourLaneAngle = (lane: number): number => {
    switch (lane) {
      case 0: return 225;  // W - bottom-left
      case 1: return 270;  // E - left-ish
      case 2: return 315;  // I - bottom-right area
      case 3: return 0;    // O - right
      default: return 0;
    }
  };

  // Judgement dot positions (where soundpad keys are)
  const getJudgementPos = (lane: number): { x: number; y: number } => {
    const positions: Record<number, { x: number; y: number }> = {
      '0': { x: 150, y: 520 }, // W - left pad
      '1': { x: 250, y: 520 }, // E - left-center pad
      '2': { x: 350, y: 520 }, // I - right-center pad
      '3': { x: 450, y: 520 }, // O - right pad
    };
    return positions[lane as keyof typeof positions] || { x: 300, y: 520 };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Star tunnel container - centered */}
      <div 
        className="relative"
        style={{
          width: '700px',
          height: '600px',
          margin: '0 auto',
        }}
      >
        {/* SVG for star/tunnel guides */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.3 }}
        >
          {/* Vanishing point at true center top */}
          <circle cx="350" cy="80" r="10" fill="rgba(0,255,255,0.8)" />
          
          {/* Star/tunnel edges - 4 main rays for soundpad lanes */}
          {[225, 270, 315, 0].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 350 + Math.cos(rad) * 10;
            const y1 = 80 + Math.sin(rad) * 10;
            const x2 = 350 + Math.cos(rad) * 320;
            const y2 = 80 + Math.sin(rad) * 420;
            return (
              <line 
                key={`spoke-${angle}`}
                x1={x1} 
                y1={y1} 
                x2={x2} 
                y2={y2} 
                stroke="rgba(0,255,255,0.5)" 
                strokeWidth="2" 
              />
            );
          })}

          {/* Depth rings */}
          {[0.2, 0.4, 0.6, 0.8].map((depthFactor) => {
            const radius = 15 + depthFactor * 310;
            return (
              <circle 
                key={`ring-${depthFactor}`}
                cx="350" 
                cy="300" 
                r={radius}
                fill="none"
                stroke="rgba(0,255,255,0.12)"
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
            
            // Y position: starts at vanishing point (80), comes to judgement line (520)
            const yPosition = 80 + (progress * 440);
            
            // Scale: starts tiny at vanishing point, grows
            const scale = 0.12 + (progress * 0.88);
            
            // Get angle for this lane (4-lane configuration)
            const angle = getFourLaneAngle(note.lane);
            const rad = (angle * Math.PI) / 180;
            
            // Distance from center based on progress
            const distanceFromCenter = 15 + (progress * 310);
            
            // Calculate X/Y using polar coordinates centered on vanishing point
            const xOffset = Math.cos(rad) * distanceFromCenter;
            const yOffset = Math.sin(rad) * distanceFromCenter;
            
            const xPosition = 350 + xOffset;

            return (
              <motion.div
                key={note.id}
                className="absolute w-14 h-14 rounded-lg flex items-center justify-center text-black font-bold text-sm font-rajdhani pointer-events-none"
                style={{
                  backgroundColor: getColorClass(note.lane),
                  boxShadow: `0 0 ${30 * scale}px ${getColorClass(note.lane)}, inset 0 0 ${18 * scale}px rgba(255,255,255,0.4)`,
                  left: `${xPosition}px`,
                  top: `${yPosition}px`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: 0.15 + progress * 0.85,
                  zIndex: Math.floor(progress * 1000),
                  border: `2px solid rgba(255,255,255,${0.4 * progress})`,
                }}
              >
                {getNoteKey(note.lane)}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Judgement dots at soundpad positions */}
        {[0, 1, 2, 3].map((lane) => {
          const pos = getJudgementPos(lane);
          const color = getColorClass(lane);
          return (
            <motion.div
              key={`judgement-${lane}`}
              className="absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-rajdhani font-bold pointer-events-none"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 20px ${color}, inset 0 0 10px rgba(255,255,255,0.5)`,
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'translate(-50%, -50%)',
                border: `2px solid rgba(255,255,255,0.6)`,
              }}
            >
              {getNoteKey(lane)}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
