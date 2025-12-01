// src/components/TapJudgementLines.tsx
import React, { memo } from 'react';
import { calculateLinePoints, TAP_LINE_CONFIGS } from '@/lib/utils/judgementLineUtils';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, TAP_JUDGEMENT_LINE_WIDTH } from '@/lib/config/gameConstants';

interface TapJudgementLinesProps {
  vpX: number;
  vpY: number;
}

const TapJudgementLinesComponent = ({ vpX, vpY }: TapJudgementLinesProps) => {
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
        const { x1, y1, x2, y2 } = calculateLinePoints(config, vpX, vpY, TAP_JUDGEMENT_LINE_WIDTH);
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