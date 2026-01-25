// src/components/HoldNote.tsx
import React, { memo } from 'react';
import { getTrapezoidCorners } from "@/lib/geometry/holdNoteGeometry";
import { calculateHoldNoteStyle } from "@/lib/notes/hold/holdNoteStyle";
import { HoldNoteProcessedData } from '@/hooks/game/notes/useHoldNotes';

interface HoldNoteProps {
  noteData: HoldNoteProcessedData;
  vpX: number;
  vpY: number;
}

const HoldNoteComponent = ({ noteData, vpX, vpY }: HoldNoteProps) => {
  const { note, rayAngle, colors, approachProgress, collapseProgress, pressHoldTime, failures, failureTime, currentTime, greyscaleState, finalGlowScale } = noteData;
  const corners = getTrapezoidCorners(rayAngle, noteData.nearDistance, noteData.farDistance, vpX, vpY, note.id);
  if (!corners) return null;
  const { x1, y1, x2, y2, x3, y3, x4, y4 } = corners;
  const holdStyle = calculateHoldNoteStyle(approachProgress, collapseProgress, pressHoldTime, failures, failureTime, currentTime, greyscaleState, colors, finalGlowScale);
  
  // Unique gradient ID for this note instance
  const gradientId = `hold-gradient-${note.id}`;
  
  // Opacity gradient: low opacity near vanishing point (far), high opacity near judgement (near)
  // The gradient flows from point (x1,y1)-(x2,y2) [far end] to (x4,y4)-(x3,y3) [near end]
  const gradientStartOpacity = Math.max(0.1, holdStyle.opacity * 0.3); // Far end: ~30% of full opacity
  const gradientEndOpacity = holdStyle.opacity; // Near end: full opacity
  
  return (
    <>
      <defs>
        <linearGradient 
          id={gradientId}
          x1={x1} y1={y1}
          x2={x4} y2={y4}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={colors.fillColor} stopOpacity={gradientStartOpacity} />
          <stop offset="100%" stopColor={colors.fillColor} stopOpacity={gradientEndOpacity} />
        </linearGradient>
      </defs>
      <polygon
        key={`hold-note-${note.id}`}
        data-testid={`hold-note-${note.id}`}
        points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
        fill={`url(#${gradientId})`}
        stroke={colors.strokeColor}
        strokeWidth={holdStyle.strokeWidth}
        style={{ filter: holdStyle.filter || 'none', transition: 'all 0.05s linear', mixBlendMode: 'screen' }}
      />
    </>
  );
};

export const HoldNote = memo(HoldNoteComponent);