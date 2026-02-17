import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
  green: 'from-green-500 to-green-600 shadow-green-500/20',
  orange: 'from-orange-500 to-orange-600 shadow-orange-500/20',
  purple: 'from-purple-500 to-purple-600 shadow-purple-500/20',
};

export function SectionHeader({ title, subtitle, icon: Icon, action, color = 'blue' }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
      <div className="flex items-center gap-4">
        {Icon ? (
          <div className={`w-10 h-10 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        ) : (
          <div className={`w-1.5 h-10 bg-gradient-to-b ${colorClasses[color]} rounded-full`} />
        )}
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          {subtitle ? <p className="text-[var(--text-secondary)] text-sm mt-1">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
