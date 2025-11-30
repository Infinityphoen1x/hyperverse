// src/components/HoldNote.tsx
import React from 'react';
import { getTrapezoidCorners } from "@/lib/notes/holdNoteGeometry";
import { calculateHoldNoteStyle } from "@/lib/notes/holdNoteStyle";
import { calculateHoldNoteColors } from "@/lib/notes/holdGreystate";
import { getColorForLane } from '@/lib/utils/laneUtils';
import { HoldNoteProcessedData } from '@/hooks/useHoldNotes';

interface HoldNoteProps {
  noteData: HoldNoteProcessedData;
  vpX: number;
  vpY: number;
}

export function HoldNote({ noteData, vpX, vpY }: HoldNoteProps) {
  const { note, rayAngle, colors, approachProgress, collapseProgress, pressHoldTime, failures, failureTime, currentTime, greyscaleState, finalGlowScale } = noteData;

  const corners = getTrapezoidCorners(rayAngle, noteData.nearDistance, noteData.farDistance, vpX, vpY, note.id);

  if (!corners) {
    return null;
  }

  const { x1, y1, x2, y2, x3, y3, x4, y4 } = corners;

  const holdStyle = calculateHoldNoteStyle(
    approachProgress,
    collapseProgress,
    pressHoldTime,
    failures,
    failureTime,
    currentTime,
    greyscaleState,
    colors,
    finalGlowScale
  );

  const { opacity, strokeWidth, filter } = holdStyle;

  return (
    <polygon
      points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
      fill={colors.fillColor}
      opacity={opacity}
      stroke={colors.strokeColor}
      strokeWidth={strokeWidth}
      style={{
        filter,
        transition: 'all 0.05s linear',
        mixBlendMode: 'screen',
      }}
    />
  );
}