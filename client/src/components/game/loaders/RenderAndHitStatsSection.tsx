// src/components/RenderAndHitStatsSection.tsx
import React from 'react';
import { StatBox, StatSection } from './ErrorLogViewerHelpers';

interface RenderAndHitStatsSectionProps {
  renderStats: { rendered: number; preMissed: number };
  hitStats: { successfulHits: number; tapMissFailures: number; tooEarlyFailures: number; holdMissFailures: number; holdReleaseFailures: number };
}

export const RenderAndHitStatsSection: React.FC<RenderAndHitStatsSectionProps> = ({ renderStats, hitStats }) => (
  <div className="grid grid-cols-2 gap-2">
    <StatSection title="RENDER TRACKING" titleColor="green" textColor="green">
      <StatBox label="Rendered" value={renderStats.rendered} color="gray" />
      <StatBox label="Pre-Missed" value={renderStats.preMissed} color="yellow" />
    </StatSection>
    <StatSection title="HIT RESULTS" titleColor="blue" textColor="blue">
      <StatBox label="✓ Successful" value={hitStats.successfulHits} color="green" />
      <StatBox label="✗ Failed" value={hitStats.tapMissFailures + hitStats.tooEarlyFailures + hitStats.holdMissFailures + hitStats.holdReleaseFailures} color="red" />
    </StatSection>
  </div>
);