// src/components/ErrorIndicator.tsx
import React from 'react';
import { useGameStore } from '@/stores/useGameStore';

interface ErrorIndicatorProps {
  count?: number;
}

export function ErrorIndicator({ count: propCount }: ErrorIndicatorProps = {}) {
  // Count missed notes from game store
  const missedCount = useGameStore(state => {
    const notes = state.notes || [];
    return notes.filter(n => n.missed || n.tapMissFailure || n.holdMissFailure).length;
  });
  
  const totalErrors = propCount ?? missedCount;

  return totalErrors > 0 ? (
    <div className="text-xs text-red-400 font-rajdhani" data-testid="error-indicator">
      {totalErrors} miss{totalErrors !== 1 ? 'es' : ''}
    </div>
  ) : null;
}