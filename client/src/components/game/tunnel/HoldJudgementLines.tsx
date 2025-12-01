// src/components/HoldJudgementLines.tsx
import React from 'react';
import { calculateLinePoints, HOLD_LINE_CONFIGS } from '@/lib/utils/judgementLineUtils';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config/gameConstants';
import { HOLD_JUDGEMENT_LINE_WIDTH } from '@/lib/config/gameConstants';

interface HoldJudgementLinesProps {
  vpX: number;
  vpY: number;
}

export function HoldJudgementLines({ vpX, vpY }: HoldJudgementLinesProps) {
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
      {HOLD_LINE_CONFIGS.map((config, idx) => {
        const { x1, y1, x2, y2 } = calculateLinePoints(config, vpX, vpY, HOLD_JUDGEMENT_LINE_WIDTH);
        return (
          <line 
            key={`hold-judgement-line-${idx}`} 
            x1={x1} 
            y1={y1} 
            x2={x2} 
            y2={y2} 
            stroke={config.color} 
            strokeWidth="3" 
            opacity="1" 
            strokeLinecap="round" 
          />
        );
      })}
    </svg>
  );
}