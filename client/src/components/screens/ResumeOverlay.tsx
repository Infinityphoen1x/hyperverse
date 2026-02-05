// src/components/ResumeOverlay.tsx
import React, { memo } from 'react';
import { m } from "@/lib/motion/MotionProvider";
import { useGameStore } from '@/stores/useGameStore';

interface ResumeOverlayProps {
  visible?: boolean;
  opacity?: number;
}

const ResumeOverlayComponent = ({ visible: propVisible, opacity: propOpacity = 0.3 }: ResumeOverlayProps = {}) => {
  const isPaused = propVisible ?? useGameStore(state => state.isPaused);

  if (!isPaused) return null;

  return (
    <m.div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      data-testid="resume-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: propOpacity }}
      transition={{ duration: 0.2 }}
    />
  );
};

export const ResumeOverlay = memo(ResumeOverlayComponent);