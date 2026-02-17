'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

function severityColor(severity: string) {
  if (severity === 'critical') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'high') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (severity === 'warning') return 'border-yellow-200 bg-yellow-50 text-yellow-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

export default function AlertCard(props: {
  title: string;
  message: string;
  severity: string;
  resource?: string | null;
  detectedAt?: string | null;
  status?: string;
  onAcknowledge?: () => void;
  onResolve?: () => void;
  onDetails?: () => void;
}) {
  const { title, message, severity, resource, detectedAt, status, onAcknowledge, onResolve, onDetails } = props;

  return (
    <Card className="p-4 border-l-4 border-l-red-400">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{message}</div>
          {resource ? <div className="text-xs text-gray-500 mt-1">Resource: {resource}</div> : null}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Badge className={severityColor(severity)}>{severity.toUpperCase()}</Badge>
          {status ? <Badge className="border-gray-200 bg-gray-50 text-gray-600">{status}</Badge> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-gray-500">
        <span>{detectedAt ? detectedAt.replace('T', ' ').slice(0, 19) : 'Just now'}</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            onClick={onDetails}
          >
            Details
          </button>
          <button
            type="button"
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            onClick={onAcknowledge}
          >
            Acknowledge
          </button>
          <button
            type="button"
            className="rounded-md border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
            onClick={onResolve}
          >
            Resolve
          </button>
        </div>
      </div>
    </Card>
  );
}
