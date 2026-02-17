'use client';

import { Loader2 } from 'lucide-react';

export default function RuleTestRunner(props: {
  onRun: () => Promise<void>;
  loading: boolean;
  result?: any;
  error?: string | null;
}) {
  const { onRun, loading, result, error } = props;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">Test rule now</div>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onRun}
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Running...
            </span>
          ) : (
            'Run test'
          )}
        </button>
      </div>

      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      {result ? (
        <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-700">
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : (
        <div className="text-xs text-gray-500">Tests run without saving changes.</div>
      )}
    </div>
  );
}
