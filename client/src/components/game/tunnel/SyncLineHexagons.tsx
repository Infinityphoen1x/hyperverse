// src/components/game/tunnel/SyncLineHexagons.tsx
import React, { memo, useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { detectSyncGroups } from '@/lib/utils/syncLineUtils';
import { JUDGEMENT_RADIUS } from '@/lib/config';

interface SyncLineHexagonsProps {
  vpX: number;
  vpY: number;
  rotationOffset?: number;
  zoomScale?: number;
}

const SyncLineHexagonsComponent = ({ vpX, vpY, rotationOffset = 0, zoomScale = 1.0 }: SyncLineHexagonsProps) => {
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);
  const playerSpeed = useGameStore(state => state.playerSpeed);
  
  const syncGroups = useMemo(() => {
    return detectSyncGroups(notes, currentTime, playerSpeed);
  }, [notes, currentTime, playerSpeed]);

  return (
    <>
      {syncGroups.map((group) => {
        const scaledRadius = group.radius * zoomScale;
        const progress = group.radius / JUDGEMENT_RADIUS;
        
        // Generate hexagon points
        const points = Array.from({ length: 6 }).map((_, i) => {
          const angle = ((i * 60 + rotationOffset) * Math.PI) / 180;
          const x = vpX + scaledRadius * Math.cos(angle);
          const y = vpY + scaledRadius * Math.sin(angle);
          return `${x},${y}`;
        }).join(' ');
        
        // Visual properties that scale with progress
        const strokeWidth = 1.5 + progress * 3.0;
        const opacity = 0.4 + progress * 0.5;
        const glowRadius = 12 + progress * 25;
        
        return (
          <polygon
            key={`sync-line-${group.timestamp}`}
            points={points}
            fill="none"
            stroke="rgba(255, 255, 255, 1)"
            strokeWidth={strokeWidth}
            opacity={opacity}
            style={{
              filter: `drop-shadow(0 0 ${glowRadius}px rgba(255, 255, 255, 0.9))`,
            }}
          />
        );
      })}
    </>
  );
};

export const SyncLineHexagons = memo(SyncLineHexagonsComponent);
