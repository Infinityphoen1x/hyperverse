// src/components/TapJudgementLines.tsx
import React from 'react';
import { calculateLinePoints, TAP_LINE_CONFIGS } from '@/utils/judgementLineUtils';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config/gameConstants';
import { TAP_JUDGEMENT_LINE_WIDTH } from '@/lib/config/gameConstants';

interface TapJudgementLinesProps {
  vpX: number;
  vpY: number;
}

export function TapJudgementLines({ vpX, vpY }: TapJudgementLinesProps) {
  return (
    <svg 
      className="absolute inset-0" 
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
          <g key={`judgement-line-${idx}`}>
            <line 
              x1={x1} 
              y1={y1} 
              x2={x2} 
              y2={y2} 
              stroke={config.color} 
              strokeWidth="2.5" 
              opacity="1" 
              strokeLinecap="round" 
            />
          </g>
        );
      })}
    </svg>
  );
}