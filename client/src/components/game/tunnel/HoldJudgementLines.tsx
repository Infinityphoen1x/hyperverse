// src/components/HoldJudgementLines.tsx
import React, { memo } from 'react';
import { calculateLinePoints, HOLD_LINE_CONFIGS } from '@/lib/utils/judgementLineUtils';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, HOLD_JUDGEMENT_LINE_WIDTH, VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { useTunnelRotation } from '@/hooks/useTunnelRotation';

interface HoldJudgementLinesProps {
  vpX?: number; // Optional, defaults to fixed VP
  vpY?: number; // Optional, defaults to fixed VP
}

const HoldJudgementLinesComponent = ({ vpX = VANISHING_POINT_X, vpY = VANISHING_POINT_Y }: HoldJudgementLinesProps) => {
  const tunnelRotation = useTunnelRotation();
  
  return (
    <svg 
      className="absolute inset-0"
      data-testid="hold-judgement-lines-container"
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`, 
        opacity: 1, 
        pointerEvents: 'none', 
        margin: '0 auto' 
      }}
    >
      {HOLD_LINE_CONFIGS.map((config, idx) => {
        const { x1, y1, x2, y2 } = calculateLinePoints(config, vpX, vpY, HOLD_JUDGEMENT_LINE_WIDTH, tunnelRotation);
        return (
          <line 
            key={`hold-judgement-line-${idx}`}
            data-testid={`hold-judgement-line-${idx}`}
            x1={x1} 
            y1={y1} 
            x2={x2} 
            y2={y2} 
            stroke={config.color} 
            strokeWidth={3}
            opacity={1}
            strokeLinecap="round" 
          />
        );
      })}
    </svg>
  );
};

export const HoldJudgementLines = memo(HoldJudgementLinesComponent);