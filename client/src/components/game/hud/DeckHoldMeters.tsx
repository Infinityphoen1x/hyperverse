// src/components/DeckHoldMeters.tsx
import React, { memo, useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useHoldProgress } from '@/hooks/game/notes/useHoldProgress';
import { RectangleMeter } from '@/components/game/hud/RectangleMeter';
import { Note } from '@/types/game';
import { getPositionAngle, getColorForPosition } from '@/lib/utils/laneUtils';

interface DeckHoldMetersProps {
  notes?: Note[];
  currentTime?: number;
}

// Helper: Check if a note is an active (pressed, not failed) hold note
function isActiveHoldNote(note: Note): boolean {
  return !!(
    note &&
    note.type === 'HOLD' &&
    !note.hit &&
    !note.tooEarlyFailure &&
    !note.holdMissFailure &&
    !note.holdReleaseFailure &&
    note.pressHoldTime &&
    note.pressHoldTime > 0
  );
}

// Get which positions are currently aligned with deck positions (0° and 180°)
function getAlignedPositions(tunnelRotation: number): { left: number; right: number } {
  // Left deck is at 180°, right deck is at 0°
  const positions = [0, 1, 2, 3, -1, -2];
  
  let leftPosition = -1;
  let rightPosition = -2;
  
  // Find which positions are closest to 180° and 0° with current rotation
  // Use tight threshold (±1°) so meters only change color when rotation is nearly complete
  const ALIGNMENT_THRESHOLD = 1.0;
  
  for (const position of positions) {
    const positionAngle = getPositionAngle(position, tunnelRotation);
    const normalized = ((positionAngle % 360) + 360) % 360;
    
    // Check if aligned with left deck (180°)
    if (Math.abs(normalized - 180) < ALIGNMENT_THRESHOLD) {
      leftPosition = position;
    }
    // Check if aligned with right deck (0° or 360°)
    if (normalized < ALIGNMENT_THRESHOLD || normalized > 360 - ALIGNMENT_THRESHOLD) {
      rightPosition = position;
    }
  }
  
  return { left: leftPosition, right: rightPosition };
}

// Get positions to display on meters, prioritizing active hold notes over aligned positions
function getDisplayPositions(tunnelRotation: number, notes: Note[]): { left: number; right: number } {
  // First check if there are any active hold notes
  const activeHoldNotes = notes.filter(isActiveHoldNote);
  
  // If we have exactly 2 active hold notes on opposite positions, prioritize showing them
  if (activeHoldNotes.length === 2) {
    const positions = activeHoldNotes.map(n => n.lane).sort((a, b) => a - b); // DEPRECATED: note.lane field
    // Check if they're on opposite positions (difference of 2 for diamond positions, or one horizontal + one diamond)
    const [pos1, pos2] = positions;
    if (Math.abs(pos1 - pos2) === 2 || (pos1 < 0 && pos2 >= 0)) {
      return { left: pos1, right: pos2 };
    }
  }
  
  // If we have 1 active hold note, show it on the appropriate deck
  if (activeHoldNotes.length === 1) {
    const activePosition = activeHoldNotes[0].lane; // DEPRECATED: note.lane field, treat as position
    const aligned = getAlignedPositions(tunnelRotation);
    
    // Determine which deck should show the active note based on position
    // Horizontal positions (-1, -2) and left-side diamond positions (0, 1) go to left deck
    // Right-side diamond positions (2, 3) go to right deck
    if (activePosition <= 1) {
      return { left: activePosition, right: aligned.right };
    } else {
      return { left: aligned.left, right: activePosition };
    }
  }
  
  // No active hold notes, use aligned positions
  return getAlignedPositions(tunnelRotation);
}

// Get key label for position
function getKeyLabel(position: number): string {
  switch (position) {
    case -1: return 'Q';
    case -2: return 'P';
    case 0: return 'W';
    case 1: return 'O';
    case 2: return 'I';
    case 3: return 'E';
    default: return '?';
  }
}

const DeckHoldMetersComponent = ({ notes: propNotes, currentTime: propCurrentTime }: DeckHoldMetersProps = {}) => {
  const tunnelRotation = useGameStore(state => state.tunnelRotation);
  const storeNotes = useGameStore(state => state.notes);
  
  // Use prop notes if provided, otherwise use store notes
  const notes = propNotes || storeNotes;
  
  // Determine which positions to display, prioritizing active hold notes
  const { left: leftPosition, right: rightPosition } = useMemo(
    () => getDisplayPositions(tunnelRotation, notes),
    [tunnelRotation, notes]
  );
  
  // Get colors for current positions
  const leftColor = getColorForPosition(leftPosition);
  const rightColor = getColorForPosition(rightPosition);
  
  // Get progress for current positions
  const { progress: leftProgress, isGlowing: leftGlowing } = useHoldProgress({ lane: leftPosition }); // useHoldProgress hook still uses 'lane' param name
  const { progress: rightProgress, isGlowing: rightGlowing } = useHoldProgress({ lane: rightPosition }); // useHoldProgress hook still uses 'lane' param name

  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      {/* Left Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div 
          className="text-sm font-rajdhani font-bold tracking-widest"
          style={{ color: leftColor }}
        >
          {getKeyLabel(leftPosition)}
        </div>
        <RectangleMeter
          key="left-deck"
          progress={leftProgress}
          outlineColor={leftColor}
          position={leftPosition}
          isGlowing={leftGlowing}
        />
      </div>
      {/* Right Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div 
          className="text-sm font-rajdhani font-bold tracking-widest"
          style={{ color: rightColor }}
        >
          {getKeyLabel(rightPosition)}
        </div>
        <RectangleMeter
          key="right-deck"
          progress={rightProgress}
          outlineColor={rightColor}
          position={rightPosition}
          isGlowing={rightGlowing}
        />
      </div>
    </div>
  );
};

export const DeckHoldMeters = memo(DeckHoldMetersComponent);