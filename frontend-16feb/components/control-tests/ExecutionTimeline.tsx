"use client";

import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { ControlTestExecution } from '@/types/control-tests';

function statusIcon(status: string) {
  if (status === 'passed') return <CheckCircle size={14} className="text-green-500" />;
  if (status === 'failed') return <XCircle size={14} className="text-red-500" />;
  if (status === 'running') return <Loader2 size={14} className="text-blue-500 animate-spin" />;
  return <Loader2 size={14} className="text-gray-400" />;
}

export default function ExecutionTimeline(props: {
  executions: ControlTestExecution[];
  onSelect: (exec: ControlTestExecution) => void;
}) {
  const { executions, onSelect } = props;

  return (
    <div className="space-y-2">
      {executions.map((exec) => (
        <button
          key={exec.id}
          type="button"
          className="w-full text-left rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
          onClick={() => onSelect(exec)}
        >
          <div className="flex items-center gap-2">
            {statusIcon(exec.status)}
            <span>{exec.started_at}</span>
          </div>
          <div className="mt-1 flex gap-4 text-xs text-gray-500">
            <span>Status: {exec.status}</span>
            <span>Duration: {exec.duration_ms || 0} ms</span>
          </div>
        </button>
      ))}
    </div>
  );
}
