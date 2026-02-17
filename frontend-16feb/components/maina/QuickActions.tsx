'use client';

import React from 'react';

const quickActions = [
  { label: 'Show enforcement status', prompt: 'Show enforcement status' },
  { label: 'Enable FIM on agent 001', prompt: 'Enable FIM on agent 001' },
  { label: 'Enable SCA on agent 001', prompt: 'Enable SCA on agent 001' },
  { label: 'Run rootcheck on agent 001', prompt: 'Run rootcheck on agent 001' },
];

export function QuickActions({
  onSelect,
  disabled = false,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {quickActions.map((action) => (
        <button
          key={action.prompt}
          className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-700 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onSelect(action.prompt)}
          disabled={disabled}
          type="button"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
