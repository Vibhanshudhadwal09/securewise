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
    blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600' },
    orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600' },
    red: { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600' },
    purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
  };

  const isUp = trend ? Boolean(trend.isUp ?? trend.isPositive) : false;

  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{ borderLeftColor: `var(--color-${color})` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 ${colors[color].light} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${colors[color].text}`} strokeWidth={2.5} />
        </div>
        {badge ? (
          <div className="text-sm font-bold text-gray-700">{badge}</div>
        ) : trend ? (
          <div className={`flex items-center gap-1 text-sm font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {isUp ? '↑' : '↓'} {trend.value}%
          </div>
        ) : null}
      </div>
      <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">{title}</div>
      <div className="text-4xl font-bold text-gray-900">{value}</div>
      {subtitle ? <div className="mt-2 text-sm font-medium text-gray-500">{subtitle}</div> : null}
      {progress !== undefined ? (
        <div className="mt-4 w-full bg-gray-200 rounded-full h-4">
          <div className={`${colors[color].bg} h-4 rounded-full shadow-lg`} style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}
