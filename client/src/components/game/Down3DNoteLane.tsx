import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
  holdStartTimes?: Record<number, number>;
}

export function Down3DNoteLane({ notes, currentTime, holdStartTimes = {} }: Down3DNoteLaneProps) {
  // Filter visible notes - soundpad notes (0-3) AND deck notes (-1, -2)
  // TAP notes: appear 2000ms before hit, show glitch 500ms after miss, then disappear
  // SPIN (hold) notes: appear 4000ms before, stay visible through hold duration
  const visibleNotes = notes.filter(n => {
    const timeUntilHit = n.time - currentTime;
    
    if (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') {
      // Hold notes: 4000ms lead + 2000ms hold duration, filter out hit/missed
      if (n.hit || n.missed) return false;
      return timeUntilHit >= -2000 && timeUntilHit <= 4000;
    } else {
      // TAP notes: show 2000ms before hit
      if (timeUntilHit > 2000) return false; // Too early
      
      // If hit or already past glitch window, hide completely
      if (n.hit) return false;
      if (n.missed && timeUntilHit < -500) return false; // Past glitch window
      
      // Show note 2000ms before OR during 500ms glitch window after miss
      return timeUntilHit <= 2000 && timeUntilHit >= -500;
    }
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
          
          {/* Variable-width lines for tunnel rays - 6 equally spaced cyan rays */}
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
          
          {/* Thin white rays for trapezoid calculation - flanking the deck rays */}
          {[165, 195, 345, 15].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const segments = 12;
            return (
              <g key={`trapezoid-ray-${angle}`}>
                {Array.from({ length: segments }).map((_, segIdx) => {
                  const segProgress = (segIdx + 1) / segments;
                  
                  // Start point
                  const x1 = VANISHING_POINT_X + Math.cos(rad) * (1 + segProgress * MAX_DISTANCE - (MAX_DISTANCE / segments));
                  const y1 = VANISHING_POINT_Y + Math.sin(rad) * (1 + segProgress * MAX_DISTANCE - (MAX_DISTANCE / segments));
                  
                  // End point
                  const x2 = VANISHING_POINT_X + Math.cos(rad) * (1 + segProgress * MAX_DISTANCE);
                  const y2 = VANISHING_POINT_Y + Math.sin(rad) * (1 + segProgress * MAX_DISTANCE);
                  
                  return (
                    <line 
                      key={`trapezoid-segment-${angle}-${segIdx}`}
                      x1={x1} 
                      y1={y1} 
                      x2={x2} 
                      y2={y2} 
                      stroke="rgba(255,255,255,0.4)" 
                      strokeWidth="0.8"
                      opacity="0.6"
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
              const LEAD_TIME = 4000; // Hold notes appear 4000ms before hit
              const JUDGEMENT_RADIUS = 187;
              
              // Phase 1: Trapezoid grows from vanishing point to judgement line (before player presses)
              // Phase 2: Trapezoid shrinks as player holds (variable duration until deck dot hits hitline)
              const holdStartTime = holdStartTimes[note.lane] || 0;
              let holdProgress;
              
              if (holdStartTime === 0) {
                // Phase 1: Not being held - trapezoid grows during approach
                if (timeUntilHit > 0) {
                  holdProgress = (LEAD_TIME - timeUntilHit) / LEAD_TIME;
                } else {
                  holdProgress = 1.0;
                }
              } else {
                // Phase 2: Being held - trapezoid shrinks based on actual hold duration
                // When hitline is detected, holdStartTimes[note.lane] is set back to 0
                const actualHoldDuration = currentTime - holdStartTime;
                // When onHoldEnd fires, this will remain at max while other notes progress
                holdProgress = 1.0 + Math.min(actualHoldDuration / 4000, 1.0);
              }
              
              // Get ray angle
              const rayAngle = getLaneAngle(note.lane);
              const rad = (rayAngle * Math.PI) / 180;
              
              // Get flanking ray angles (±15° from center ray)
              const leftRayAngle = rayAngle - 15;
              const rightRayAngle = rayAngle + 15;
              const leftRad = (leftRayAngle * Math.PI) / 180;
              const rightRad = (rightRayAngle * Math.PI) / 180;
              
              // holdProgress goes from 0 to 2 over the full visible window
              // PHASE 1 (0 to 1.0): Note approaches, trapezoid GROWS from vanishing point to judgement line
              // PHASE 2 (1.0 to 2.0): Held, trapezoid SHRINKS back: near end stays at judgement, far end moves toward it
              
              const isInPhase2 = holdProgress >= 1.0;
              
              // PHASE 1 (0 to 1.0): Near end grows from vanishing point (1) toward judgement line (187)
              // PHASE 2 (1.0 to 2.0): Far end shrinks back from vanishing point toward judgement line
              
              // Near end: grows toward judgement line during Phase 1, stays fixed during Phase 2
              const nearDistance = 1 + (Math.min(holdProgress, 1.0) * (JUDGEMENT_RADIUS - 1));
              
              // Far end: stays at vanishing point during Phase 1, moves toward near end during Phase 2
              let farDistance;
              if (!isInPhase2) {
                // Phase 1: Far end stays at vanishing point (1)
                farDistance = 1;
              } else {
                // Phase 2: Far end moves from vanishing point (1) toward judgement line (187)
                // This closes the gap and shrinks the trapezoid width while both ends approach each other
                const shrinkProgress = holdProgress - 1.0; // 0 to 1.0 during phase 2
                farDistance = 1 + (shrinkProgress * (JUDGEMENT_RADIUS - 1));
              }
              
              // Glow intensity scales with how close to judgement line
              const glowScale = 0.2 + (Math.min(holdProgress, 1.0) * 0.8);
              
              // Calculate trapezoid corners using flanking rays
              // Far end corners (at vanishing point on flanking rays)
              const x1 = VANISHING_POINT_X + Math.cos(leftRad) * farDistance;
              const y1 = VANISHING_POINT_Y + Math.sin(leftRad) * farDistance;
              const x2 = VANISHING_POINT_X + Math.cos(rightRad) * farDistance;
              const y2 = VANISHING_POINT_Y + Math.sin(rightRad) * farDistance;
              
              // Near end corners (at judgement line on flanking rays)
              const x3 = VANISHING_POINT_X + Math.cos(rightRad) * nearDistance;
              const y3 = VANISHING_POINT_Y + Math.sin(rightRad) * nearDistance;
              const x4 = VANISHING_POINT_X + Math.cos(leftRad) * nearDistance;
              const y4 = VANISHING_POINT_Y + Math.sin(leftRad) * nearDistance;
              
              const opacity = 0.4 + Math.min(holdProgress, 1.0) * 0.6; // Higher minimum opacity for visibility
              const color = getColorForLane(note.lane);
              const strokeWidth = 2 + (Math.min(holdProgress, 1.0) * 2); // Stroke grows with trapezoid
              
              return (
                <polygon
                  key={note.id}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                  fill={color}
                  opacity={opacity}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={strokeWidth}
                  style={{
                    filter: `drop-shadow(0 0 ${25 * glowScale}px ${color}) drop-shadow(0 0 ${15 * glowScale}px ${color})`,
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
            
            const JUDGEMENT_RADIUS = 187;
            const distance = 1 + (progress * (JUDGEMENT_RADIUS - 1));
            const xOffset = Math.cos(rad) * distance;
            const yOffset = Math.sin(rad) * distance;
            
            const xPosition = VANISHING_POINT_X + xOffset;
            const yPosition = VANISHING_POINT_Y + yOffset;
            const scale = 0.12 + (progress * 0.88);
            
            // Missed note glitch effect
            const isMissed = note.missed;
            const missProgress = isMissed ? Math.max(0, -timeUntilHit / 500) : 0; // 0 to 1 as it fades
            const glitchAmplitude = 4 * (1 - missProgress); // Decrease glitch intensity as it fades

            return (
              <motion.div
                key={note.id}
                className="absolute w-14 h-14 rounded-lg flex items-center justify-center text-black font-bold text-sm font-rajdhani pointer-events-none"
                animate={isMissed ? { 
                  x: [0, -glitchAmplitude, glitchAmplitude, -glitchAmplitude/2, glitchAmplitude/2, 0],
                  y: [0, glitchAmplitude/2, -glitchAmplitude/2, glitchAmplitude/2, 0, 0]
                } : {}}
                transition={isMissed ? { duration: 0.12, repeat: Infinity } : {}}
                style={{
                  backgroundColor: isMissed ? 'rgba(80,80,80,0.6)' : getColorForLane(note.lane),
                  boxShadow: isMissed 
                    ? `0 0 ${6 * scale}px rgba(100,0,0,0.4)` 
                    : `0 0 ${30 * scale}px ${getColorForLane(note.lane)}, inset 0 0 ${18 * scale}px rgba(255,255,255,0.4)`,
                  left: `${xPosition}px`,
                  top: `${yPosition}px`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: isMissed ? (1 - missProgress) * 0.6 : (0.15 + progress * 0.85),
                  zIndex: Math.floor(progress * 1000),
                  border: `2px solid rgba(100,100,100,${isMissed ? (1-missProgress) * 0.6 : 0.4 * progress})`,
                  filter: isMissed ? `grayscale(1) brightness(0.5) blur(${1 + missProgress * 1.5}px)` : 'none',
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
