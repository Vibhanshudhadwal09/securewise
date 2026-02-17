import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isUp?: boolean; isPositive?: boolean };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  subtitle?: string;
  progress?: number;
  badge?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  subtitle,
  progress,
  badge,
  onClick,
}: MetricCardProps) {
  const colors = {
    blue: { bg: 'bg-blue-500', light: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500' },
    green: { bg: 'bg-green-500', light: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500' },
    orange: { bg: 'bg-orange-500', light: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500' },
    red: { bg: 'bg-red-500', light: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500' },
    purple: { bg: 'bg-purple-500', light: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500' },
  };

  const isUp = trend ? Boolean(trend.isUp ?? trend.isPositive) : false;
  const activeColor = colors[color] || colors.blue;

  return (
    <div
      className={`bg-[var(--card-bg)] rounded-xl p-6 shadow-[var(--card-shadow)] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300 border border-[var(--card-border)] backdrop-blur-md ${onClick ? 'cursor-pointer hover:border-[var(--accent-blue)]' : ''
        }`}
      style={{ borderLeft: `4px solid`, borderLeftColor: `var(--color-${color}, ${color})` }} // Fallback to color name if var not found, though var(--color-blue) might not exist, relying on CSS classes primarily or standard colors. Actually, let's use the utility class approach for the border, or inline style with standard colors if theme vars aren't set for all.
      // Re-evaluating border-left: The original used style={{ borderLeftColor: ... }}. The theme.css might not have --color-blue.
      // Let's us standard tailwind colors via the `activeColor.border` class if possible, but `border-l-4` combined with `border-color` utility.
      // However, to keep it simple and working:
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${activeColor.light} rounded-lg flex items-center justify-center border border-${color}-500/20`}>
          <Icon className={`w-6 h-6 ${activeColor.text}`} strokeWidth={2.5} />
        </div>
        {badge ? (
          <div className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1 rounded-full border border-[var(--card-border)]">{badge}</div>
        ) : trend ? (
          <div className={`flex items-center gap-1 text-sm font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
            {isUp ? '↑' : '↓'} {trend.value}%
          </div>
        ) : null}
      </div>
      <div className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{title}</div>
      <div className="text-3xl font-bold text-[var(--text-primary)]">{value}</div>
      {subtitle ? <div className="mt-2 text-xs font-medium text-[var(--text-secondary)]">{subtitle}</div> : null}
      {progress !== undefined ? (
        <div className="mt-4 w-full bg-[var(--bg-secondary)] rounded-full h-3 overflow-hidden">
          <div className={`${activeColor.bg} h-full rounded-full shadow-sm`} style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}
