// src/components/ErrorIndicator.tsx
import React from 'react';
import { useGameDebuggerStore } from '@/stores/useGameDebuggerStore';

interface ErrorIndicatorProps {
  // Optional override; defaults to store for global sync
  count?: number;
}

export function ErrorIndicator({ count: propCount }: ErrorIndicatorProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const totalErrors = useGameDebuggerStore(state => propCount ?? state.notes.length);

  return totalErrors > 0 ? (
    <div className="text-xs text-neon-yellow font-rajdhani">
      {totalErrors} error(s)
    </div>
  ) : null;
}