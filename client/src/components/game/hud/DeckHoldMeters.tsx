// src/components/DeckHoldMeters.tsx
import React, { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useHoldProgress } from '@/hooks/game/notes/useHoldProgress';
import { RectangleMeter } from '@/components/game/hud/RectangleMeter';
import { Note } from '@/types/game';
import { getLaneAngle, getColorForLane } from '@/lib/utils/laneUtils';

interface DeckHoldMetersProps {
  notes?: Note[];
  currentTime?: number;
}

// Get which lanes are currently aligned with deck positions (0° and 180°)
function getAlignedLanes(tunnelRotation: number): { left: number; right: number } {
  // Left deck is at 180°, right deck is at 0°
  const lanes = [0, 1, 2, 3, -1, -2];
  
  let leftLane = -1;
  let rightLane = -2;
  
  // Find which lanes are closest to 180° and 0° with current rotation
  for (const lane of lanes) {
    const laneAngle = getLaneAngle(lane, tunnelRotation);
    const normalized = ((laneAngle % 360) + 360) % 360;
    
    // Check if aligned with left deck (180°)
    if (Math.abs(normalized - 180) < 5) {
      leftLane = lane;
    }
    // Check if aligned with right deck (0° or 360°)
    if (normalized < 5 || normalized > 355) {
      rightLane = lane;
    }
  }
  
  return { left: leftLane, right: rightLane };
}

// Get key label for lane
function getKeyLabel(lane: number): string {
  switch (lane) {
    case -1: return 'Q';
    case -2: return 'P';
    case 0: return 'W';
    case 1: return 'O';
    case 2: return 'I';
    case 3: return 'E';
    default: return '?';
  }
}

export function DeckHoldMeters({ notes: propNotes, currentTime: propCurrentTime }: DeckHoldMetersProps = {}) {
  const tunnelRotation = useGameStore(state => state.tunnelRotation);
  
  // Determine which lanes are currently aligned with decks
  const { left: leftLane, right: rightLane } = useMemo(
    () => getAlignedLanes(tunnelRotation),
    [tunnelRotation]
  );
  
  // Get colors for current lanes
  const leftColor = getColorForLane(leftLane);
  const rightColor = getColorForLane(rightLane);
  
  // Get progress for current lanes
  const { progress: leftProgress, isGlowing: leftGlowing } = useHoldProgress({ lane: leftLane });
  const { progress: rightProgress, isGlowing: rightGlowing } = useHoldProgress({ lane: rightLane });

  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      {/* Left Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div 
          className="text-sm font-rajdhani font-bold tracking-widest"
          style={{ color: leftColor }}
        >
          {getKeyLabel(leftLane)}
        </div>
        <RectangleMeter
          progress={leftProgress}
          outlineColor={leftColor}
          lane={leftLane}
          isGlowing={leftGlowing}
        />
      </div>
      {/* Right Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div 
          className="text-sm font-rajdhani font-bold tracking-widest"
          style={{ color: rightColor }}
        >
          {getKeyLabel(rightLane)}
        </div>
        <RectangleMeter
          progress={rightProgress}
          outlineColor={rightColor}
          lane={rightLane}
          isGlowing={rightGlowing}
        />
      </div>
    </div>
  );
}