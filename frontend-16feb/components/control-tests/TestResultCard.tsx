"use client";

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import CategoryIcon from '@/components/control-tests/CategoryIcon';

function statusIcon(status?: string) {
  if (status === 'passed') return <CheckCircle size={18} className="text-green-500" />;
  if (status === 'failed') return <XCircle size={18} className="text-red-500" />;
  if (status === 'running') return <Loader2 size={18} className="text-blue-500 animate-spin" />;
  return <Loader2 size={18} className="text-gray-400" />;
}

export default function TestResultCard(props: {
  name: string;
  category: string;
  status?: string;
  executedAt?: string | null;
  durationMs?: number | null;
  passCriteriaMet?: boolean | null;
  failedChecks?: string[];
  onView?: () => void;
  onRerun?: () => void;
}) {
  const { name, category, status, executedAt, durationMs, passCriteriaMet, failedChecks, onView, onRerun } = props;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <CategoryIcon category={category} className="text-gray-500" size={16} />
          {name}
        </div>
        {statusIcon(status)}
      </div>
      <div className="text-xs text-gray-500">
        {executedAt ? executedAt.replace('T', ' ').slice(0, 19) : 'Not run yet'}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <div>Duration: {durationMs || 0} ms</div>
        <div>Criteria met: {passCriteriaMet ? 'Yes' : 'No'}</div>
      </div>
      {failedChecks && failedChecks.length ? (
        <div className="text-xs text-red-600">Failed checks: {failedChecks.join(', ')}</div>
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onView}
        >
          View details
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onRerun}
        >
          Re-run test
        </button>
      </div>
    </Card>
  );
}
