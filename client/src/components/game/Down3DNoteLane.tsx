import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
}

export function Down3DNoteLane({ notes, currentTime }: Down3DNoteLaneProps) {
  // Filter visible notes - soundpad notes (0-3) AND deck notes (-1, -2)
  // Hold notes (SPIN) need to stay visible for the full hold duration (2000ms)
  const visibleNotes = notes.filter(n => {
    const timeUntilHit = n.time - currentTime;
    const holdDuration = (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') ? 2000 : 0;
    return timeUntilHit > -holdDuration - 200 && timeUntilHit < 2000;
  });


  const getNoteKey = (lane: number): string => {
    if (lane === -1) return 'Q';
    if (lane === -2) return 'P';
    return ['W', 'E', 'I', 'O'][lane];
  };

  const getColorForLane = (lane: number): string => {
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

  // 6 equally-spaced rays at 60° intervals
  const allRayAngles = [0, 60, 120, 180, 240, 300];

  // Map lanes to rays
  const getLaneAngle = (lane: number): number => {
    const rayMapping: Record<number, number> = {
      '-2': 0,     // P - right deck
      '-1': 180,   // Q - left deck
      '0': 240,    // W - bottom-left pad
      '1': 300,    // E - left-ish pad
      '2': 60,     // I - top-right-ish pad
      '3': 120,    // O - right pad
    };
    return rayMapping[lane as keyof typeof rayMapping];
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
  const MAX_DISTANCE = 260;
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
          {/* Concentric hexagons - faint tunnel walls with variable thickness */}
          {[22, 52, 89, 135, 187, 248].map((radius, idx) => {
            const maxRadius = 248;
            const progress = radius / maxRadius; // 0 to 1, thinner at center to thicker at edge
            
            // Generate hexagon points
            const points = Array.from({ length: 6 }).map((_, i) => {
              const angle = (i * 60 * Math.PI) / 180;
              const x = VANISHING_POINT_X + radius * Math.cos(angle);
              const y = VANISHING_POINT_Y + radius * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ');
            
            // Stroke width: thin at vanishing point (0.3), thick at edge (3.8)
            const strokeWidth = 0.3 + progress * 3.5;
            // Opacity: translucent at center (0.08), more visible at edge (0.3)
            const opacity = 0.08 + progress * 0.22;
            
            return (
              <polygon
                key={`tunnel-hexagon-${idx}`}
                points={points}
                fill="none"
                stroke="rgba(0,255,255,1)"
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            );
          })}

          {/* Vanishing point - nearly invisible */}
          <circle cx={VANISHING_POINT_X} cy={VANISHING_POINT_Y} r="6" fill="rgba(0,255,255,0.05)" />
          
          {/* Judgement line indicators - perpendicular to rays */}
          {/* Second-last ring is at radius 187 */}
          {[
            { angle: 240, color: '#FF007F' },   // W - pink
            { angle: 300, color: '#00FFFF' },   // E - cyan
            { angle: 60, color: '#BE00FF' },    // I - purple
            { angle: 120, color: '#0096FF' },   // O - blue
          ].map((lane, idx) => {
            const rad = (lane.angle * Math.PI) / 180;
            const radius = 187;
            const lineLength = 35;
            
            // Point on the ray at the radius
            const cx = VANISHING_POINT_X + Math.cos(rad) * radius;
            const cy = VANISHING_POINT_Y + Math.sin(rad) * radius;
            
            // Perpendicular direction (rotate 90 degrees)
            const perpRad = rad + Math.PI / 2;
            const x1 = cx + Math.cos(perpRad) * (lineLength / 2);
            const y1 = cy + Math.sin(perpRad) * (lineLength / 2);
            const x2 = cx - Math.cos(perpRad) * (lineLength / 2);
            const y2 = cy - Math.sin(perpRad) * (lineLength / 2);
            
            return (
              <line
                key={`judgement-line-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={lane.color}
                strokeWidth="2.5"
                opacity="1"
                strokeLinecap="round"
              />
            );
          })}
          
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

        {/* Hold note trapezoids rendered as SVG polygons */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 1, pointerEvents: 'none' }}
        >
          {visibleNotes
            .filter(n => n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT')
            .map(note => {
              const timeUntilHit = note.time - currentTime;
              const HOLD_DURATION = 2000;
              const JUDGEMENT_RADIUS = 187;
              
              // Only render while note is visible and active
              if (timeUntilHit > 0 || timeUntilHit < -HOLD_DURATION) return null;
              
              // holdProgress: 0 = note arriving, 1 = note at judgement, 2 = hold complete
              const holdProgress = -timeUntilHit / 1000;
              
              // Get ray angle
              const rayAngle = getLaneAngle(note.lane);
              const rad = (rayAngle * Math.PI) / 180;
              
              // holdProgress goes from 0 to 2 over the full visible window
              // PHASE 1 (0 to 1.0): Note approaches, trapezoid GROWS as near end travels to judgement line
              // PHASE 2 (1.0 to 2.0): Held, trapezoid SHRINKS
              
              const isInPhase2 = holdProgress >= 1.0;
              
              // Near end: goes from vanishing point (1) to judgement line (187) in phase 1, stays at 187 in phase 2
              const nearDistance = isInPhase2 
                ? JUDGEMENT_RADIUS
                : 1 + (holdProgress * (JUDGEMENT_RADIUS - 1));
              
              // Far end distance
              let farDistance;
              if (isInPhase2) {
                // PHASE 2: Trapezoid SHRINKS - far end moves toward near end
                const shrinkProgress = holdProgress - 1.0; // 0 to 1.0 during phase 2
                // Far end shrinks from MAX_DISTANCE toward judgement line as shrinkProgress goes 0 to 1
                farDistance = JUDGEMENT_RADIUS + ((1 - shrinkProgress) * (MAX_DISTANCE - JUDGEMENT_RADIUS));
              } else {
                // PHASE 1: Trapezoid GROWS - far end leads as near end approaches
                // Far end starts ahead and continues traveling
                farDistance = 1 + (holdProgress * (MAX_DISTANCE - 1));
              }
              
              // Calculate positions
              const nearX = VANISHING_POINT_X + Math.cos(rad) * nearDistance;
              const nearY = VANISHING_POINT_Y + Math.sin(rad) * nearDistance;
              
              const farX = VANISHING_POINT_X + Math.cos(rad) * farDistance;
              const farY = VANISHING_POINT_Y + Math.sin(rad) * farDistance;
              
              // Width scales with distance
              const scale = 0.12 + (Math.min(holdProgress, 1.0) * 0.88);
              const farWidth = 12 + (scale * 18);
              const nearWidth = 30 + (scale * 50);
              
              // Perpendicular direction
              const perpRad = rad + Math.PI / 2;
              
              // Calculate trapezoid corners
              const x1 = farX + Math.cos(perpRad) * (farWidth / 2);
              const y1 = farY + Math.sin(perpRad) * (farWidth / 2);
              const x2 = farX - Math.cos(perpRad) * (farWidth / 2);
              const y2 = farY - Math.sin(perpRad) * (farWidth / 2);
              
              const x3 = nearX - Math.cos(perpRad) * (nearWidth / 2);
              const y3 = nearY - Math.sin(perpRad) * (nearWidth / 2);
              const x4 = nearX + Math.cos(perpRad) * (nearWidth / 2);
              const y4 = nearY + Math.sin(perpRad) * (nearWidth / 2);
              
              const opacity = 0.15 + Math.min(holdProgress, 1.0) * 0.85;
              const color = getColorForLane(note.lane);
              
              return (
                <polygon
                  key={note.id}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                  fill={color}
                  opacity={opacity}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="2"
                  style={{
                    filter: `drop-shadow(0 0 ${20 * scale}px ${color})`,
                  }}
                />
              );
            })}

          {/* Judgement lines for hold notes */}
          {[
            { angle: 180, color: '#00FF00' },   // Q - left deck, green
            { angle: 0, color: '#FF0000' },     // P - right deck, red
          ].map((lane, idx) => {
            const rad = (lane.angle * Math.PI) / 180;
            const radius = 187;
            const lineLength = 45;
            
            // Point on the ray at the radius
            const cx = VANISHING_POINT_X + Math.cos(rad) * radius;
            const cy = VANISHING_POINT_Y + Math.sin(rad) * radius;
            
            // Perpendicular direction (rotate 90 degrees)
            const perpRad = rad + Math.PI / 2;
            const x1 = cx + Math.cos(perpRad) * (lineLength / 2);
            const y1 = cy + Math.sin(perpRad) * (lineLength / 2);
            const x2 = cx - Math.cos(perpRad) * (lineLength / 2);
            const y2 = cy - Math.sin(perpRad) * (lineLength / 2);
            
            return (
              <line
                key={`hold-judgement-line-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={lane.color}
                strokeWidth="3"
                opacity="1"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Notes falling through tunnel - following ray paths */}
        <AnimatePresence>
          {visibleNotes
            .filter(n => n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT')
            .map(note => {
            const timeUntilHit = note.time - currentTime;
            const progress = 1 - (timeUntilHit / 2000);
            
            const rayAngle = getLaneAngle(note.lane);
            const rad = (rayAngle * Math.PI) / 180;
            
            const distance = 1 + (progress * (MAX_DISTANCE - 1));
            const xOffset = Math.cos(rad) * distance;
            const yOffset = Math.sin(rad) * distance;
            
            const xPosition = VANISHING_POINT_X + xOffset;
            const yPosition = VANISHING_POINT_Y + yOffset;
            const scale = 0.12 + (progress * 0.88);

            return (
              <motion.div
                key={note.id}
                className="absolute w-14 h-14 rounded-lg flex items-center justify-center text-black font-bold text-sm font-rajdhani pointer-events-none"
                style={{
                  backgroundColor: getColorForLane(note.lane),
                  boxShadow: `0 0 ${30 * scale}px ${getColorForLane(note.lane)}, inset 0 0 ${18 * scale}px rgba(255,255,255,0.4)`,
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
          const color = getColorForLane(lane);
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
