// src/components/NoteStatsSection.tsx
import React from 'react';
import { StatBox, StatGrid, StatSection, formatLaneStats } from './ErrorLogViewerHelpers';

interface NoteStatsSectionProps {
  noteStats: { total: number; tap: number; hold: number; hit: number; missed: number; failed: number; byLane: Record<number, number> };
}

export const NoteStatsSection: React.FC<NoteStatsSectionProps> = ({ noteStats }) => {
  if (noteStats.total === 0) return null;

  return (
    <StatSection title="BEATMAP LOADED" titleColor="purple" textColor="purple">
      <StatGrid cols={3}>
        <StatBox label="Total" value={noteStats.total} color="gray" />
        <StatBox label="TAP" value={noteStats.tap} color="blue" />
        <StatBox label="HOLD" value={noteStats.hold} color="pink" />
      </StatGrid>
      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-700">
        <StatBox label="✓ Hit" value={noteStats.hit} color="green" />
        <StatBox label="✗ Failed" value={noteStats.failed} color="red" />
        <StatBox label="Pending" value={noteStats.total - noteStats.hit - noteStats.failed - noteStats.missed} color="yellow" />
      </div>
      {Object.keys(noteStats.byLane).length > 0 && (
        <div className="text-xs text-gray-400 pt-1 border-t border-gray-700">
          <div className="font-mono">Lanes: {formatLaneStats(noteStats.byLane)}</div>
        </div>
      )}
    </StatSection>
  );
};