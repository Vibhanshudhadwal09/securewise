import React from 'react';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'danger' | 'info';
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const styles = {
    success: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-orange-100 text-orange-800 border-orange-300',
    danger: 'bg-red-100 text-red-800 border-red-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  return (
    <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${styles[status]}`}>
      {label}
    </span>
  );
}
