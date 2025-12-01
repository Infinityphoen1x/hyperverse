// src/components/ErrorIndicator.tsx
import React from 'react';
import { useErrorStore } from '@/stores/useErrorStore'; // Assumes error store with total count

interface ErrorIndicatorProps {
  // Optional override; defaults to store for global sync
  count?: number;
}

export function ErrorIndicator({ count: propCount }: ErrorIndicatorProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const totalErrors = useErrorStore(state => propCount ?? state.errors.length); // Or state.totalErrors if derived

  return totalErrors > 0 ? (
    <div className="text-xs text-neon-yellow font-rajdhani">
      {totalErrors} error(s)
    </div>
  ) : null;
}