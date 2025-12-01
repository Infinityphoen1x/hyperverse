// src/components/AnimationStatsSection.tsx
import React from 'react';
import { StatBox, StatGrid, StatSection } from './ErrorLogViewerHelpers';

interface AnimationStatsSectionProps {
  animationStats: { total: number; completed: number; failed: number; pending: number; rendering: number };
  animations: any[];
}

export const AnimationStatsSection: React.FC<AnimationStatsSectionProps> = ({ animationStats, animations }) => (
  <>
    <StatSection title="ANIMATION LIFECYCLE" titleColor="cyan" textColor="cyan">
      <StatGrid cols={4}>
        <StatBox label="Total" value={animationStats.total} color="gray" />
        <StatBox label="Pending" value={animationStats.pending} color="yellow" />
        <StatBox label="Rendering" value={animationStats.rendering} color="blue" />
        <StatBox label="✓ Completed" value={animationStats.completed} color="green" />
      </StatGrid>
      {animationStats.failed > 0 && (
        <div className="bg-red-900/30 border border-red-600 p-1 rounded">
          <div className="text-red-400 text-xs">✗ Animation Errors</div>
          <div className="text-lg font-bold text-red-300">{animationStats.failed}</div>
        </div>
      )}
      <div className="text-xs text-gray-500 italic pt-1 border-t border-gray-700">
        Lifecycle: pending → rendering → completed
      </div>
    </StatSection>
    {animations.length > 0 && (
      <details className="bg-gray-900 rounded p-2 text-xs text-yellow-300 font-mono">
        <summary className="cursor-pointer hover:text-yellow-200">
          {animations.length} Animation Events
        </summary>
        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
          {animations.map((anim, idx) => (
            <div key={idx} className="text-gray-400 truncate">
              [{anim.type}] {anim.noteId.substring(0, 12)}... = {anim.status}
              {anim.errorMsg && ` - ${anim.errorMsg}`}
            </div>
          ))}
        </div>
      </details>
    )}
  </>
);