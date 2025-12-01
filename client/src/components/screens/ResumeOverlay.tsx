// src/components/ResumeOverlay.tsx
import React from 'react';
import { motion } from "framer-motion";
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with pause/resume state

interface ResumeOverlayProps {
  // Optional overrides; defaults to store for global sync
  visible?: boolean;
  opacity?: number;
}

export function ResumeOverlay({ visible: propVisible, opacity: propOpacity }: ResumeOverlayProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { isPaused, overlayOpacity } = useGameStore(state => ({
    isPaused: propVisible ?? state.isPaused, // Map 'visible' to pause state
    overlayOpacity: propOpacity ?? state.overlayOpacity ?? 0.3, // Default fallback
  }));

  if (!isPaused) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: overlayOpacity }}
      transition={{ duration: 0 }}
    />
  );
}