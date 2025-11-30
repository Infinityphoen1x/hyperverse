import React from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { getLaneAngle, getColorForLane } from '@/lib/utils/laneUtils';
import { calculateTapNoteGeometry } from "@/lib/geometry/tapNoteGeometry";
import { calculateTapNoteStyle } from "@/lib/notes/tap/tapNoteStyle";
import { TapNoteState } from '@/lib/notes/tap/tapNoteHelpers';

interface TapNoteProps {
  note: Note;
  currentTime: number;
  vpX: number;
  vpY: number;
  state: TapNoteState;
  progressForGeometry: number;
  clampedProgress: number;
  rawProgress: number;
}

export function TapNote({ note, currentTime, vpX, vpY, state, progressForGeometry, clampedProgress, rawProgress }: TapNoteProps) {
  const tapRayAngle = getLaneAngle(note.lane);
  const noteColor = getColorForLane(note.lane);
  const geometry = calculateTapNoteGeometry(progressForGeometry, tapRayAngle, vpX, vpY, state.isHit, currentTime, state.isFailed, note.time);
  const style = calculateTapNoteStyle(clampedProgress, state, noteColor, rawProgress);

  return (
    <polygon
      points={geometry.points}
      fill={style.fill}
      opacity={style.opacity}
      stroke={style.stroke}
      strokeWidth={1.5}
      style={{ filter: style.filter, transition: 'all 0.05s linear', mixBlendMode: 'screen' }}
    />
  );
}
