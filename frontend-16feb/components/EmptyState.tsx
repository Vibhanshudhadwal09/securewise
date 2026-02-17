import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({ icon: Icon, title, description, action, size = 'md' }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  const sizes = {
    sm: { container: 'py-10', icon: 'w-12 h-12', iconSize: 'w-6 h-6', title: 'text-sm', spacing: 'mb-3' },
    md: { container: 'py-12', icon: 'w-12 h-12', iconSize: 'w-6 h-6', title: 'text-sm', spacing: 'mb-4' },
    lg: { container: 'py-16', icon: 'w-14 h-14', iconSize: 'w-7 h-7', title: 'text-md', spacing: 'mb-4' },
  };
  const s = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center ${s.container} text-center px-4`}>
      <div className={`${s.icon} bg-gray-100 rounded-lg flex items-center justify-center ${s.spacing}`}>
        <Icon className={`${s.iconSize} text-gray-400`} strokeWidth={2} />
      </div>
      <h3 className={`${s.title} font-medium text-gray-900 mb-1`}>{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md leading-relaxed">{description}</p>
      {action ? (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 shadow-sm flex items-center gap-2 font-medium"
        >
          {ActionIcon ? <ActionIcon className="w-4 h-4" strokeWidth={2} /> : null}
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
