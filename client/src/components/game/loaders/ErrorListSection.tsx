// src/components/ErrorListSection.tsx
import React from 'react';

interface ErrorListSectionProps {
  errors: (string | any)[];
}

export const ErrorListSection: React.FC<ErrorListSectionProps> = ({ errors }) => (
  <div
    className="bg-gray-900 rounded p-2 text-xs text-red-300 font-mono space-y-1 flex-1 overflow-y-auto"
    data-testid="list-error-messages"
  >
    {errors.length === 0 ? (
      <div className="text-gray-500">No errors</div>
    ) : (
      errors.map((entry, idx) => {
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