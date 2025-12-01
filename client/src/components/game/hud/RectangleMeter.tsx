// src/components/RectangleMeter.tsx
import React, { memo } from "react";
import { motion } from "framer-motion";
import { GameErrors } from '@/lib/errors/errorLog';
import {
  DECK_METER_SEGMENTS,
  DECK_METER_SEGMENT_WIDTH,
  DECK_METER_COMPLETION_THRESHOLD,
  COLOR_DECK_LEFT,
  COLOR_DECK_RIGHT,
} from '@/lib/config/gameConstants';

const getRectangleMeterColor = (lane: number): string => {
  if (lane === -1) return COLOR_DECK_LEFT; // Q - green
  if (lane === -2) return COLOR_DECK_RIGHT; // P - red
  return '#FFFFFF'; // Fallback
};

interface RectangleMeterProps {
  progress: number;
  outlineColor: string;
  lane: number;
  isGlowing: boolean; // From hook, replaces completionGlow record
}

const RectangleMeterComponent = ({ progress, outlineColor, lane, isGlowing }: RectangleMeterProps) => {
  // Validate progress before rendering
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    GameErrors.log(`DeckMeter: Invalid progress=${progress} for lane ${lane}`);
    return null;
  }

  const filledSegments = Math.ceil(progress * DECK_METER_SEGMENTS);
  const isFull = progress >= DECK_METER_COMPLETION_THRESHOLD;

  // Validate segment count
  if (!Number.isFinite(filledSegments) || filledSegments < 0 || filledSegments > DECK_METER_SEGMENTS) {
    GameErrors.log(`DeckMeter: Invalid filledSegments=${filledSegments} for lane ${lane} (max=${DECK_METER_SEGMENTS})`);
    return null;
  }

  const fillColor = getRectangleMeterColor(lane);

  return (
    <motion.div
      className="flex flex-col-reverse gap-0.5"
      animate={isGlowing ? { scale: 1.15 } : { scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {Array.from({ length: DECK_METER_SEGMENTS }).map((_, idx) => {
        const isFilled = idx < filledSegments;

        return (
          <motion.div
            key={idx}
            className="h-4 rounded-sm border-2"
            style={{
              width: `${DECK_METER_SEGMENT_WIDTH}px`,
              borderColor: outlineColor,
              background: isFilled ? fillColor : 'transparent',
              boxShadow: isFull && isFilled
                ? `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`
                : isFilled
                  ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)`
                  : 'none',
            }}
            animate={{
              opacity: isFilled ? 1 : 0.15,
              boxShadow: isFull && isFilled
                ? [
                    `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`,
                    `0 0 20px ${fillColor}, 0 0 40px ${fillColor}, inset 0 0 10px rgba(255,255,255,0.8)`,
                    `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`,
                  ]
                : isFilled
                  ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)`
                  : 'none',
            }}
            transition={isFull && isFilled ? { duration: 0.6, repeat: Infinity } : { duration: 0.08 }}
          />
        );
      })}
    </motion.div>
  );
};

export const RectangleMeter = memo(RectangleMeterComponent);