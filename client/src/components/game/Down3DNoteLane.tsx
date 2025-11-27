import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Note } from "@/lib/gameEngine";

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
  holdStartTimes?: Record<number, number>;
  onNoteMissed?: (noteId: string) => void;
  health?: number;
}

export function Down3DNoteLane({ notes, currentTime, holdStartTimes = {}, onNoteMissed, health = 100 }: Down3DNoteLaneProps) {
  // Track which hold notes have been activated (entered Phase 2)
  const [activeHolds, setActiveHolds] = useState<Set<string>>(new Set());
  const [failedHolds, setFailedHolds] = useState<Set<string>>(new Set());
  const prevHoldStartTimes = useRef<Record<number, number>>({});

  // Detect when a hold starts (holdStartTime becomes non-zero)
  useEffect(() => {
    try {
      if (!Array.isArray(notes) || !holdStartTimes || typeof holdStartTimes !== 'object') {
        return; // Invalid data, skip
      }

      const lanes = [-1, -2];
      lanes.forEach((lane) => {
        if (!Number.isFinite(lane)) return; // Skip invalid lanes
        
        const prevTime = prevHoldStartTimes.current[lane] || 0;
        const currTime = holdStartTimes[lane] || 0;
        
        if (!Number.isFinite(prevTime) || !Number.isFinite(currTime)) {
          return; // Skip if times are invalid
        }
        
        // Hold just started
        if (prevTime === 0 && currTime > 0) {
          // Find the hold note that should be active NOW (closest spawn time within valid window)
          setActiveHolds(prev => {
            const newSet = new Set(prev);
            
            // Find the note with spawn time (note.time) closest to currentTime
            // This ensures we're holding the note that's actually being triggered NOW
            let bestNote: Note | null = null;
            let bestDistance = Infinity;
            
            notes.forEach((n: Note | undefined) => {
              if (n && n.lane === lane && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && !n.hit && !n.missed && n.id) {
                const distance = Math.abs(n.time - currentTime);
                if (distance < bestDistance) {
                  bestDistance = distance;
                  bestNote = n as Note;
                }
              }
            });
            
            if (bestNote?.id) {
              newSet.add(bestNote.id);
            }
            return newSet;
          });
        }
        
        // Hold ended - mark note as missed if released before completion
        if (prevTime > 0 && currTime === 0) {
          setActiveHolds(prev => {
            const newSet = new Set(prev);
            const firstActiveNote = notes.find(n => 
              n && n.lane === lane && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && !n.hit && !n.missed && n.id
            );
            if (firstActiveNote && firstActiveNote.id) {
              // Only mark as missed if released before note.time (premature release)
              if (currentTime < firstActiveNote.time) {
                onNoteMissed?.(firstActiveNote.id);
              }
              newSet.delete(firstActiveNote.id);
            }
            return newSet;
          });
        }
      });
      
      prevHoldStartTimes.current = { ...holdStartTimes };
    } catch (error) {
      console.warn(`Down3DNoteLane hold tracking error: ${error}`);
    }
  }, [holdStartTimes, notes, currentTime]);

  // Detect too-early presses and mark as missed
  useEffect(() => {
    if (!onNoteMissed) return;
    
    const STRICT_EARLY_START = -3000;
    
    notes.forEach(note => {
      if (!note || !note.id || note.hit || note.missed || failedHolds.has(note.id)) return;
      if (note.type !== 'SPIN_LEFT' && note.type !== 'SPIN_RIGHT') return;
      
      const holdStartTime = holdStartTimes[note.lane] || 0;
      if (holdStartTime === 0) return; // Not held
      
      const timeSinceNoteSpawn = holdStartTime - note.time;
      const isTooEarly = timeSinceNoteSpawn < STRICT_EARLY_START;
      
      if (isTooEarly) {
        onNoteMissed(note.id);
        setFailedHolds(prev => new Set(prev).add(note.id));
      }
    });
  }, [holdStartTimes, notes, onNoteMissed, failedHolds]);
  // Filter visible notes - soundpad notes (0-3) AND deck notes (-1, -2)
  // TAP notes: appear 2000ms before hit, show glitch 500ms after miss, then disappear
  // SPIN (hold) notes: appear 4000ms before, stay visible through hold duration
  const visibleNotes = Array.isArray(notes) ? notes.filter(n => {
    try {
      if (!n || !Number.isFinite(n.time) || !Number.isFinite(currentTime)) {
        return false; // Skip invalid notes
      }
      
      const timeUntilHit = n.time - currentTime;
      
      if (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') {
        // Hold notes: keep ALL hold notes visible including missed ones (for greyscale shrink animation)
        // Filter out only HITS (successful holds)
        if (n.hit) return false;
        // Missed holds stay visible for 500ms after note.time to show failure animation
        if (n.missed && timeUntilHit < -500) return false;
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
    } catch (error) {
      console.warn(`Note visibility filter error: ${error}`);
      return false;
    }
  }) : [];


  const getNoteKey = (lane: number): string => {
    if (lane === -1) return 'Q';
    if (lane === -2) return 'P';
    return ['W', 'E', 'I', 'O'][lane];
  };

  const getColorForLane = (lane: number): string => {
    const baseColor = (() => {
      switch (lane) {
        case -1: return '#00FF00'; // Q - green
        case -2: return '#FF0000'; // P - red
        case 0: return '#FF007F'; // W - pink
        case 1: return '#00FFFF'; // E - cyan
        case 2: return '#BE00FF'; // I - purple
        case 3: return '#0096FF'; // O - blue
        default: return '#FFFFFF';
      }
    })();
    
    // Shift towards red (#FF0000) as health decreases (0-200 range)
    const healthFactor = Math.max(0, 200 - health) / 200; // 0 at 200 health, 1 at 0 health
    if (healthFactor === 0) return baseColor;
    
    // Parse base color to RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    
    // Interpolate towards red (#FF, #00, #00)
    const newR = Math.round(r + (255 - r) * healthFactor);
    const newG = Math.round(g * (1 - healthFactor));
    const newB = Math.round(b * (1 - healthFactor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`.toUpperCase();
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
    const angle = rayMapping[lane as keyof typeof rayMapping];
    if (!Number.isFinite(angle)) {
      console.warn(`Invalid lane: ${lane}, using default angle 0`);
      return 0; // Fallback to 0 degrees
    }
    return angle;
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
            
            // Shift main ray color from cyan toward red as health decreases
            const healthFactor = Math.max(0, 200 - health) / 200;
            const r = Math.round(0 + (255 - 0) * healthFactor);
            const g = Math.round(255 * (1 - healthFactor));
            const b = Math.round(255 * (1 - healthFactor));
            const rayColor = `rgba(${r},${g},${b},1)`;
            
            return (
              <polygon
                key={`tunnel-hexagon-${idx}`}
                points={points}
                fill="none"
                stroke={rayColor}
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
          
          {/* Variable-width lines for tunnel rays - 6 equally spaced rays that shift toward red at low health */}
          {allRayAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            
            // Shift main ray color from cyan toward red as health decreases
            const healthFactor = Math.max(0, 200 - health) / 200;
            const r = Math.round(0 + (255 - 0) * healthFactor);
            const g = Math.round(255 * (1 - healthFactor));
            const b = Math.round(255 * (1 - healthFactor));
            const rayColor = `rgba(${r},${g},${b},1)`;
            
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
                      stroke={rayColor}
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
            .filter(n => n && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && n.id)
            .map(note => {
              try {
                if (!note || !Number.isFinite(note.time) || !note.id) {
                  return null; // Skip corrupted notes
                }

                const timeUntilHit = note.time - currentTime;
                const LEAD_TIME = 4000; // Hold notes appear 4000ms before hit
                const JUDGEMENT_RADIUS = 187;
                
                if (!Number.isFinite(timeUntilHit) || !Number.isFinite(LEAD_TIME)) {
                  return null; // Skip if calculations would be invalid
                }
                
                const holdStartTime = holdStartTimes[note.lane] || 0;
                const isCurrentlyHeld = holdStartTime > 0;
                const wasActivated = activeHolds.has(note.id);
                const isTooEarlyFailure = (note as any).tooEarlyFailure || false;
                const isHoldReleaseFailure = (note as any).holdReleaseFailure || false;
                const isHoldMissFailure = (note as any).holdMissFailure || false;
                
                // Define timing windows
                // "Strict beginning": -3000ms (presses before this trigger no Phase 2, show grey)
                // "Early but valid": -3000 to -100ms (reduced score, but triggers Phase 2)
                // "Normal window": -100 to +100ms (full score)
                const STRICT_EARLY_START = -3000;
                const NORMAL_WINDOW_START = -100;
                const NORMAL_WINDOW_END = 100;
                
                const timeWhenPressed = holdStartTime;
                const timeSinceNoteSpawn = timeWhenPressed - note.time;
                
                // Check if too early (before strict beginning)
                const isTooEarly = isCurrentlyHeld && timeSinceNoteSpawn < STRICT_EARLY_START;
                
                // Valid activation: within -3000 to +100 (early + normal windows)
                const isValidActivation = isCurrentlyHeld && !isTooEarly && (
                  timeSinceNoteSpawn <= NORMAL_WINDOW_END && timeSinceNoteSpawn >= STRICT_EARLY_START
                );
                
                let holdProgress;
                let isGreyed = false;
                
                // Too early failure - show growing greyscale animation until judgement, then shrinking for 500ms
                if (isTooEarlyFailure) {
                  isGreyed = true;
                  if (timeUntilHit > 0) {
                    // Phase 1: Growing until note reaches judgement line
                    holdProgress = (LEAD_TIME - timeUntilHit) / LEAD_TIME;
                  } else if (timeUntilHit <= 0) {
                    // Phase 2: Note has passed judgement line - show 500ms shrinking animation
                    const timePastJudgement = currentTime - note.time;
                    // Safety check: if more than 600ms has passed (500ms animation + 100ms buffer), hide it
                    if (timePastJudgement >= 600) {
                      return null; // Animation complete, remove note
                    }
                    // Only show shrinking if at least 0ms has passed since judgement
                    if (timePastJudgement < 0) {
                      // Edge case: shouldn't happen, but clamp to Phase 1
                      holdProgress = 1.0;
                    } else {
                      // Shrink from 1.0 to 2.0 over 500ms
                      const shrinkProgress = Math.min(timePastJudgement / 500, 1.0);
                      holdProgress = 1.0 + shrinkProgress;
                    }
                  }
                } else if (isHoldReleaseFailure || isHoldMissFailure) {
                  // Hold release failure or missed hold - show shrinking greyscale animation for 500ms
                  isGreyed = true;
                  const estimatedFailTime = isHoldReleaseFailure ? holdStartTime : Math.max(note.time + 2000, currentTime - 500);
                  const timeSinceEstimatedFail = Math.max(0, currentTime - estimatedFailTime);
                  if (timeSinceEstimatedFail > 500) {
                    return null; // Animation complete
                  }
                  const shrinkProgress = timeSinceEstimatedFail / 500;
                  holdProgress = 1.0 + shrinkProgress;
                } else if (note.missed) {
                  isGreyed = true;
                  // Calculate shrink animation: note.time is spawn time, missed happens at note.time + 2000 at latest
                  // Estimate missed time as max(note.time + 2000, currentTime - 500) to start shrink 500ms ago or later
                  const estimatedMissTime = Math.max(note.time + 2000, currentTime - 500);
                  const timeSinceEstimatedMiss = Math.max(0, currentTime - estimatedMissTime);
                  if (timeSinceEstimatedMiss > 500) {
                    return null; // Animation complete, hide trapezoid
                  }
                  // Shrink animation: go from 1.0 to 2.0 over 500ms
                  const missedShrinkProgress = timeSinceEstimatedMiss / 500; // 0 to 1 over 500ms
                  holdProgress = 1.0 + missedShrinkProgress; // 1.0 to 2.0
                } else if (isCurrentlyHeld && isValidActivation) {
                  // Phase 2: Being held - trapezoid shrinks over 2000ms (dot's journey to hitline)
                  // CRITICAL: When hold pressed early, "near end" stays LOCKED at press position
                  // This prevents jumping when pressing before note visually arrives
                  
                  const timeUntilHitAtPress = note.time - holdStartTime; // How far away note was when pressed
                  const phase1ProgressAtPress = (LEAD_TIME - timeUntilHitAtPress) / LEAD_TIME; // Where Phase 1 was
                  
                  const actualHoldDuration = currentTime - holdStartTime;
                  const DOT_TRAVEL_TIME = 2000; // Dot takes 2000ms to reach hitline
                  
                  // Near end anchors at where it was when key pressed (prevents jumping)
                  // Clamp to [0, 1] so it starts from the growing phase
                  const lockedNearProgress = Math.min(Math.max(phase1ProgressAtPress, 0), 1.0);
                  
                  if (!Number.isFinite(actualHoldDuration) || actualHoldDuration < 0) {
                    // Just started holding - show current Phase 1 position but transition smoothly
                    holdProgress = lockedNearProgress;
                  } else {
                    // Shrink phase: far end moves toward near end over 2000ms
                    // holdProgress: 1.0 = both at judgement, 2.0 = far end at vanishing
                    const shrinkAmount = actualHoldDuration / DOT_TRAVEL_TIME; // 0 to 1 during hold
                    holdProgress = Math.min(1.0 + shrinkAmount, 2.0);
                  }
                } else if (wasActivated && !isCurrentlyHeld) {
                  // After hold released (let go), show greyscale shrinking animation for 500ms
                  isGreyed = true;
                  const timeSinceRelease = currentTime - holdStartTime;
                  if (timeSinceRelease > 500) {
                    return null; // Animation complete, hide trapezoid
                  }
                  // Shrink animation from 1.0 to 2.0 over 500ms
                  const releaseShrinkProgress = timeSinceRelease / 500;
                  holdProgress = 1.0 + releaseShrinkProgress;
                } else if (isCurrentlyHeld && isTooEarly) {
                  // Too early press: no Phase 2, stay in Phase 1 and show GREY
                  // Trapezoid continues growing to show player that note is coming
                  isGreyed = true;
                  if (timeUntilHit > 0) {
                    holdProgress = (LEAD_TIME - timeUntilHit) / LEAD_TIME;
                  } else {
                    holdProgress = 0.99;
                  }
                } else {
                  // Phase 1: Not activated yet - trapezoid grows during approach
                  if (timeUntilHit > 0) {
                    holdProgress = (LEAD_TIME - timeUntilHit) / LEAD_TIME;
                  } else {
                    // Note time passed but not activated - stay at Phase 1 max, don't jump
                    holdProgress = 0.99;
                  }
                }
                
                // Validate holdProgress
                if (!Number.isFinite(holdProgress)) {
                  holdProgress = 0;
                }
              
              // Get ray angle
              const rayAngle = getLaneAngle(note.lane);
              if (!Number.isFinite(rayAngle)) {
                console.warn(`Invalid ray angle for lane ${note.lane}`);
                return null;
              }
              const rad = (rayAngle * Math.PI) / 180;
              
              // Get flanking ray angles (±15° from center ray)
              // These are only used for trapezoid geometry, not rendered as separate rays
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
              
              // During Phase 2, trapezoid shrinks: both ends move toward judgement line
              // But maintain minimum size to stay visible
              let nearDistance, farDistance;
              
              if (!isInPhase2) {
                // Phase 1: Growing - near end moves toward judgement line, far stays at vanishing
                nearDistance = 1 + (holdProgress * (JUDGEMENT_RADIUS - 1));
                farDistance = 1;
              } else {
                // Phase 2: Shrinking - trapezoid collapses with fade
                // Near end STAYS at judgement line, far end moves toward it
                const shrinkProgress = Math.min(holdProgress - 1.0, 1.0); // 0 to 1.0 during phase 2
                
                // Near end stays locked at judgement line
                nearDistance = JUDGEMENT_RADIUS;
                
                // Far end moves from vanishing point (1) toward near end (judgement line)
                farDistance = 1 + (shrinkProgress * (JUDGEMENT_RADIUS - 1));
              }
              
              // Glow intensity scales with how close to judgement line (capped at Phase 1)
              const glowScale = 0.2 + (Math.min(holdProgress, 1.0) * 0.8);
              
              // Phase 2 intensity: decrease glow as trapezoid collapses
              const phase2Progress = Math.max(0, holdProgress - 1.0) / 1.0; // 0 to 1 during Phase 2
              const phase2Glow = phase2Progress > 0 ? (1 - phase2Progress) * 0.8 : 0;
              const finalGlowScale = Math.max(glowScale - phase2Glow, 0.1);
              
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
              
              // Phase 1: Opacity increases; Phase 2: Stays visible with gentle fade
              let opacity = 0.4 + Math.min(holdProgress, 1.0) * 0.6;
              if (isInPhase2) {
                const shrinkProgress = Math.min(holdProgress - 1.0, 1.0);
                // During Phase 2, keep opacity high (fade only at the very end)
                opacity = Math.max(0.7 - (shrinkProgress * 0.5), 0.2); // Visible during Phase 2
              }
              // Greyscale notes use fixed grey colors, never affected by health-based color shift
              const color = isGreyed ? 'rgba(80, 80, 80, 0.6)' : getColorForLane(note.lane);
              const strokeColor = isGreyed ? 'rgba(120, 120, 120, 0.7)' : 'rgba(255,255,255,0.8)';
              const strokeWidth = 2 + (Math.min(holdProgress, 1.0) * 2); // Stroke grows with trapezoid
              
              return (
                <polygon
                  key={note.id}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                  fill={color}
                  opacity={isGreyed ? 0.4 : opacity}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{
                    filter: isGreyed 
                      ? 'drop-shadow(0 0 6px rgba(100,100,100,0.3)) grayscale(1)'
                      : `drop-shadow(0 0 ${25 * finalGlowScale}px ${color}) drop-shadow(0 0 ${15 * finalGlowScale}px ${color})`,
                    transition: 'all 0.05s linear',
                  }}
                />
              );
              } catch (error) {
                console.warn(`Trapezoid rendering error: ${error}`);
                return null;
              }
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
