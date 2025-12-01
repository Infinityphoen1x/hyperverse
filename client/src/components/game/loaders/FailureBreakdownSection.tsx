// src/components/FailureBreakdownSection.tsx
import React from 'react';
import { StatSection } from './ErrorLogViewerHelpers';

interface FailureBreakdownSectionProps {
  hitStats: { tapMissFailures: number; tooEarlyFailures: number; holdMissFailures: number; holdReleaseFailures: number };
}

export const FailureBreakdownSection: React.FC<FailureBreakdownSectionProps> = ({ hitStats }) => {
  const failures = [
    { label: 'TAP Miss', count: hitStats.tapMissFailures },
    { label: 'Too Early', count: hitStats.tooEarlyFailures },
    { label: 'Hold Miss', count: hitStats.holdMissFailures },
    { label: 'Release Fail', count: hitStats.holdReleaseFailures },
  ].filter(f => f.count > 0);

  if (failures.length === 0) return null;

  return (
    <StatSection title="FAILURE BREAKDOWN" titleColor="red" textColor="red">
      <div className="grid grid-cols-2 gap-1">
        {failures.map(({ label, count }) => (
          <div key={label}>
            <span className="text-gray-500">{label}</span>: <span className="font-bold">{count}</span>
          </div>
        ))}
      </div>
    </StatSection>
  );
};