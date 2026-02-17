'use client';

import { useState } from 'react';
import ConnectionTestStatus from '@/components/evidence/ConnectionTestStatus';
import { previewEvidence, testEvidenceConnection } from '@/lib/api/evidence-templates';
import type { ConnectionTestResult } from '@/types/evidence';

export default function Step3TestPreview(props: {
  config: any;
  tenantId?: string;
  onResult: (result: ConnectionTestResult) => void;
}) {
  const { config, tenantId, onResult } = props;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = (await testEvidenceConnection(config, tenantId)) as ConnectionTestResult;
      setResult(res);
      onResult(res);
      if (res.success) {
        const previewRes = await previewEvidence(config, tenantId);
        setPreview(previewRes?.response || previewRes);
      }
    } catch (err: any) {
      const next = { success: false, error: err?.message || 'Unable to test connection.' };
      setResult(next);
      onResult(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Test & preview</div>
          <div className="text-xs text-gray-500">Validate credentials before saving.</div>
        </div>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
          onClick={runTest}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test connection'}
        </button>
      </div>

      <ConnectionTestStatus loading={loading} result={result || undefined} />

      {result?.success ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-900">Preview</div>
          <pre className="max-h-64 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700">
            {JSON.stringify(preview || result.response || {}, null, 2)}
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-500">
            <div>Response time: {result.metrics?.response_time_ms ?? 0} ms</div>
            <div>Evidence size: {result.metrics?.evidence_size_bytes ?? 0} bytes</div>
            <div>Status code: {result.metrics?.status_code ?? 200}</div>
          </div>
        </div>
      ) : null}

      {!result?.success && !loading ? (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>You can skip this step and test later.</span>
          <button type="button" className="text-blue-600 hover:underline">
            Skip test
          </button>
        </div>
      ) : null}
    </div>
  );
}
