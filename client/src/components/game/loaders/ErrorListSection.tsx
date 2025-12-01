// src/components/ErrorListSection.tsx
import React from 'react';

interface ErrorListSectionProps {
  errors: string[];
}

export const ErrorListSection: React.FC<ErrorListSectionProps> = ({ errors }) => (
  <div
    className="bg-gray-900 rounded p-2 text-xs text-red-300 font-mono space-y-1 flex-1 overflow-y-auto"
    data-testid="list-error-messages"
  >
    {errors.length === 0 ? (
      <div className="text-gray-500">No errors</div>
    ) : (
      errors.map((error, idx) => (
        <div key={idx} className="truncate hover:text-red-200 break-words whitespace-pre-wrap">
          {error}
        </div>
      ))
    )}
  </div>
);