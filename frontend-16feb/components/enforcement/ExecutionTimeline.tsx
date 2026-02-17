import React from 'react';
import { Card } from '../ui/card';
import { StatusBadge } from './StatusBadge';

export type TimelineEvent = {
  label: string;
  time?: string | null;
  status?: string;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : value;
}

export function ExecutionTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        {events.map((evt, idx) => (
          <div key={`${evt.label}-${idx}`} className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{evt.label}</span>
                {evt.status ? <StatusBadge status={evt.status} /> : null}
              </div>
              <div className="text-xs text-gray-500">{formatDate(evt.time)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
