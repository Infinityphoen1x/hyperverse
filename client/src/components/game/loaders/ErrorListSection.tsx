// src/components/ErrorListSection.tsx
import React from 'react';

interface ErrorListSectionProps {
  errors: (string | any)[];
}

export const ErrorListSection: React.FC<ErrorListSectionProps> = ({ errors }) => {
  // Filter to show important events (failures, hits, state changes) - not every frame render
  const importantLogs = errors.filter((entry) => {
    const msg = typeof entry === 'string' ? entry : entry.message || '';
    // Show: failures, hits, lifecycle events - hide frame-by-frame render logs
    return (
      msg.includes('Failure') ||
      msg.includes('HIT') ||
      msg.includes('Lifecycle') ||
      msg.includes('Success') ||
      msg.includes('Error') ||
      msg.includes('CRITICAL') ||
      (!msg.includes('HOLD-RENDER') && !msg.includes('TAP-RENDER'))
    );
  });
  
  const displayLogs = importantLogs.length > 0 ? importantLogs : errors.slice(-50); // Show last 50 if no important events

  return (
    <div
      className="bg-gray-900 rounded p-2 text-xs text-red-300 font-mono space-y-1 flex-1 overflow-y-auto"
      data-testid="list-error-messages"
    >
      {displayLogs.length === 0 ? (
        <div className="text-gray-500">No events</div>
      ) : (
        displayLogs.map((entry, idx) => {
          const msg = typeof entry === 'string' ? entry : entry.message || '';
          const timestamp = typeof entry === 'string' ? '' : ` [${entry.timestamp?.toFixed(0) || '?'}ms]`;
          return (
            <div key={idx} className="truncate hover:text-red-200 break-words whitespace-pre-wrap">
              {msg}{timestamp}
            </div>
          );
        })
      )}
    </div>
  );
};