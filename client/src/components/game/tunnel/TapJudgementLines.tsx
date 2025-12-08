// src/components/TapJudgementLines.tsx
import React, { memo } from 'react';
import { calculateLinePoints, TAP_LINE_CONFIGS } from '@/lib/utils/judgementLineUtils';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, TAP_JUDGEMENT_LINE_WIDTH, VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { useTunnelRotation } from '@/hooks/useTunnelRotation';

interface TapJudgementLinesProps {
  vpX?: number; // Optional, defaults to fixed VP
  vpY?: number; // Optional, defaults to fixed VP
}

const TapJudgementLinesComponent = ({ vpX = VANISHING_POINT_X, vpY = VANISHING_POINT_Y }: TapJudgementLinesProps) => {
  const tunnelRotation = useTunnelRotation();
  
  return (
    <svg 
      className="absolute inset-0" 
      data-testid="tap-judgement-lines-svg"
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`, 
        opacity: 1, 
        pointerEvents: 'none', 
        margin: '0 auto' 
      }}
    >
      {TAP_LINE_CONFIGS.map((config, idx) => {
        const { x1, y1, x2, y2 } = calculateLinePoints(config, vpX, vpY, TAP_JUDGEMENT_LINE_WIDTH, tunnelRotation);
        return (
          <g key={`judgement-line-${idx}`} data-testid={`tap-line-group-${idx}`}>
            <line 
              x1={x1} 
              y1={y1} 
              x2={x2} 
              y2={y2} 
              stroke={config.color} 
              strokeWidth="2.5" 
              opacity="1" 
              strokeLinecap="round"
              data-testid={`tap-line-${idx}`}
            />
          </g>
        );
      })}
    </svg>
  );
};

export const TapJudgementLines = memo(TapJudgementLinesComponent);