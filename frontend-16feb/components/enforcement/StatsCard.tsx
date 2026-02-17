import React from 'react';
import { Card } from '../ui/card';

type Status = 'healthy' | 'warning' | 'danger' | 'neutral';

type StatsCardProps = {
  title: string;
  value: React.ReactNode;
  trend?: string;
  subtitle?: string;
  status?: Status;
};

const statusStyles: Record<Status, string> = {
  healthy: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  neutral: 'text-gray-600',
};

export function StatsCard({ title, value, trend, subtitle, status = 'neutral' }: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
          {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
        </div>
        {trend ? <span className={`text-xs font-semibold ${statusStyles[status]}`}>{trend}</span> : null}
      </div>
    </Card>
  );
}
