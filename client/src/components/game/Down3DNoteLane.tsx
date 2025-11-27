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

  // 6 equally-spaced rays at 60° intervals
  const allRayAngles = [0, 60, 120, 180, 240, 300];

  // Map 4 soundpad lanes to specific rays (evenly distributed)
  const getLaneAngle = (lane: number): number => {
    const rayMapping: Record<number, number> = {
      0: 240,  // W - bottom-left
      1: 300,  // E - left-ish  
      2: 60,   // I - top-right-ish
      3: 120,  // O - right
    };
    return rayMapping[lane];
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

  const VANISHING_POINT_X = 350;
  const VANISHING_POINT_Y = 200;
  const MAX_DISTANCE = 350;
  const HITLINE_Y = 520;

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
        {/* SVG for tunnel with concentric circles and variable-width lines */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 1 }}
        >
          {/* Concentric circles - faint tunnel walls */}
          {[30, 70, 120, 180, 250, 330].map((radius, idx) => (
            <circle 
              key={`tunnel-ring-${idx}`}
              cx={VANISHING_POINT_X}
              cy={VANISHING_POINT_Y}
              r={radius}
              fill="none"
              stroke="rgba(0,255,255,0.08)"
              strokeWidth="1"
            />
          ))}

          {/* Vanishing point */}
          <circle cx={VANISHING_POINT_X} cy={VANISHING_POINT_Y} r="6" fill="rgba(0,255,255,0.6)" />
          
          {/* Variable-width lines for tunnel rays - 6 equally spaced */}
          {allRayAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            
            // Create line with multiple segments for smooth thickness and opacity gradient
            const segments = 12;
            return (
              <g key={`spoke-group-${angle}`}>
                {Array.from({ length: segments }).map((_, segIdx) => {
                  const segProgress = (segIdx + 1) / segments;
                  
                  // Start point
                  const x1 = VANISHING_POINT_X + Math.cos(rad) * (1 + segProgress * MAX_DISTANCE - (MAX_DISTANCE / segments));
                  const y1 = VANISHING_POINT_Y + Math.sin(rad) * (1 + segProgress * MAX_DISTANCE - (MAX_DISTANCE / segments));
                  
                  // End point
                  const x2 = VANISHING_POINT_X + Math.cos(rad) * (1 + segProgress * MAX_DISTANCE);
                  const y2 = VANISHING_POINT_Y + Math.sin(rad) * (1 + segProgress * MAX_DISTANCE);
                  
                  // Stroke width: thin at vanishing point, thick at edge
                  const strokeWidth = 0.3 + segProgress * 3.5;
                  
                  // Opacity: translucent at vanishing point, more visible at edge
                  const opacity = 0.1 + segProgress * 0.4;
                  
                  return (
                    <line 
                      key={`segment-${angle}-${segIdx}`}
                      x1={x1} 
                      y1={y1} 
                      x2={x2} 
                      y2={y2} 
                      stroke="rgba(0,255,255,1)" 
                      strokeWidth={strokeWidth}
                      opacity={opacity}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Notes falling through tunnel - following ray paths */}
        <AnimatePresence>
          {visibleNotes.map(note => {
            const timeUntilHit = note.time - currentTime;
            const progress = 1 - (timeUntilHit / 2000); // 0 (far/spawn) to 1 (near/hitline)
            
            // Get the exact ray angle for this note's lane
            const rayAngle = getLaneAngle(note.lane);
            const rad = (rayAngle * Math.PI) / 180;
            
            // Distance from vanishing point: 0 at spawn, MAX_DISTANCE at hitline
            const distance = 1 + (progress * (MAX_DISTANCE - 1));
            
            // Position along the ray
            const xOffset = Math.cos(rad) * distance;
            const yOffset = Math.sin(rad) * distance;
            
            const xPosition = VANISHING_POINT_X + xOffset;
            const yPosition = VANISHING_POINT_Y + yOffset;
            
            // Scale: starts tiny at vanishing point, grows as approaches
            const scale = 0.12 + (progress * 0.88);

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
