// src/components/ErrorCountsSection.tsx
import React from 'react';

interface ErrorCountsSectionProps {
  errorCounts: { beatmapLoader: number; parser: number; converter: number; meter: number; trapezoid: number; game: number };
}

export const ErrorCountsSection: React.FC<ErrorCountsSectionProps> = ({ errorCounts }) => {
  const hasErrors = Object.values(errorCounts).some(v => v > 0);
  if (!hasErrors) return null;

  return (
    <div className="bg-gray-900 rounded p-2 text-xs text-yellow-300 font-mono grid grid-cols-3 gap-1">
      {errorCounts.beatmapLoader > 0 && (
        <div><span className="text-gray-500">Loader</span>: <span className="font-bold">{errorCounts.beatmapLoader}</span></div>
      )}
      {errorCounts.parser > 0 && (
        <div><span className="text-gray-500">Parser</span>: <span className="font-bold">{errorCounts.parser}</span></div>
      )}
      {errorCounts.converter > 0 && (
        <div><span className="text-gray-500">Convert</span>: <span className="font-bold">{errorCounts.converter}</span></div>
      )}
      {errorCounts.meter > 0 && (
        <div><span className="text-gray-500">Meter</span>: <span className="font-bold">{errorCounts.meter}</span></div>
      )}
      {errorCounts.trapezoid > 0 && (
        <div><span className="text-gray-500">Trap</span>: <span className="font-bold">{errorCounts.trapezoid}</span></div>
      )}
      {errorCounts.game > 0 && (
        <div><span className="text-gray-500">Game</span>: <span className="font-bold">{errorCounts.game}</span></div>
      )}
    </div>
  );
};