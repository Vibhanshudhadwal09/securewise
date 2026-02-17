'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

function statusDot(status?: string) {
  if (status === 'active') return 'bg-green-500';
  if (status === 'paused') return 'bg-gray-400';
  if (status === 'failed') return 'bg-red-500';
  if (status === 'testing') return 'bg-blue-500 animate-pulse';
  return 'bg-yellow-400';
}

export default function RuleStatusCard(props: {
  name: string;
  category: string;
  status?: string;
  lastCheck?: string | null;
  nextCheck?: string | null;
  onRun?: () => void;
}) {
  const { name, category, status, lastCheck, nextCheck, onRun } = props;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{name}</div>
          <div className="text-xs text-gray-500">{category}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusDot(status)}`} />
          <Badge className="border-gray-200 bg-gray-50 text-gray-600">{status || 'pending'}</Badge>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
        <div>Last check: {lastCheck ? lastCheck.replace('T', ' ').slice(0, 19) : 'N/A'}</div>
        <div>Next check: {nextCheck ? nextCheck.replace('T', ' ').slice(0, 19) : 'N/A'}</div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onRun}
        >
          Run now
        </button>
      </div>
    </Card>
  );
}
