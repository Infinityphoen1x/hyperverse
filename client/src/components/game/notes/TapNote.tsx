// src/components/TapNote.tsx
import React, { memo } from 'react';
import type { Note } from '@/lib/engine/gameTypes';
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

const TapNoteComponent = ({ note, currentTime, vpX, vpY, state, progressForGeometry, clampedProgress, rawProgress }: TapNoteProps): React.ReactElement => {
  const tapRayAngle = getLaneAngle(note.lane);
  const noteColor = getColorForLane(note.lane);
  const geometry = calculateTapNoteGeometry(progressForGeometry, tapRayAngle, vpX, vpY, state.isHit, currentTime, state.isFailed, note.time);
  const style = calculateTapNoteStyle(clampedProgress, state, noteColor, rawProgress, note.lane);
  return (
    <polygon
      data-testid={`tap-note-${note.id}`}
      points={geometry.points}
      fill={style.fill}
      opacity={style.opacity}
      stroke={style.stroke}
      strokeWidth={1.5}
      style={{ filter: style.filter || 'none', transition: 'all 0.05s linear', mixBlendMode: 'screen' }}
    />
  );
};

export const TapNote = memo(TapNoteComponent, (prev, next) => 
  prev.note.id === next.note.id &&
  prev.currentTime === next.currentTime &&
  prev.vpX === next.vpX &&
  prev.vpY === next.vpY &&
  prev.state.isHit === next.state.isHit &&
  prev.state.isFailed === next.state.isFailed &&
  prev.progressForGeometry === next.progressForGeometry &&
  prev.clampedProgress === next.clampedProgress &&
  prev.rawProgress === next.rawProgress
);