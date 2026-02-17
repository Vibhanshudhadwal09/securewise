"use client";

import { Loader2, Play } from 'lucide-react';

export default function TestRunner(props: { onRun: () => Promise<void>; loading: boolean; status?: string }) {
  const { onRun, loading, status } = props;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-gray-900">Run test</div>
        <div className="text-xs text-gray-500">Execute the test and review the latest results.</div>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
        onClick={onRun}
        disabled={loading}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
        {loading ? 'Running...' : status ? status : 'Run test'}
      </button>
    </div>
  );
}
