'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ControlSummary = {
  control_id: string;
  title?: string;
  standard?: string;
  enforceability?: string | null;
  expected_evidence_type?: string | null;
  evidence_status?: string | null;
  evidence_reason?: string | null;
  effective_sla_hours?: number | null;
  last_evidence_at?: string | null;
  evidence_assets_count?: number | null;
  evidence_total_count?: number | null;
  stale?: boolean;
};

type EvidenceRow = {
  evidence_id: string;
  control_id: string;
  asset_id?: string | null;
  evidence_type?: string | null;
  source?: string | null;
  captured_at?: string | null;
  expiration_date?: string | null;
  summary?: string | null;
};

function readCookie(name: string): string | null {
  const cur = String(document.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function ControlWorkbenchPage() {
  const params = useParams();
  const sp = useSearchParams();
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const controlId = String(params.controlId || '');
  const framework = sp?.get('framework') || 'iso27001';
  const periodId = sp?.get('periodId');
  const evidenceId = sp?.get('evidenceId');

  const [summary, setSummary] = useState<ControlSummary | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightEvidenceId, setHighlightEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ framework });
        if (periodId) qs.set('periodId', String(periodId));
        const [summaryRes, evidenceRes] = await Promise.all([
          fetch(`/api/controls/${encodeURIComponent(controlId)}/summary?${qs.toString()}`, {
            credentials: 'include',
            headers: { 'x-tenant-id': tenantId },
          }),
          fetch(`/api/controls/${encodeURIComponent(controlId)}/evidence?${qs.toString()}`, {
            credentials: 'include',
            headers: { 'x-tenant-id': tenantId },
          }),
        ]);

        const summaryJson = await summaryRes.json().catch(() => ({}));
        const evidenceJson = await evidenceRes.json().catch(() => ({}));

        if (!summaryRes.ok) throw new Error(summaryJson?.error || `Failed to load control (${summaryRes.status})`);
        if (!evidenceRes.ok) throw new Error(evidenceJson?.error || `Failed to load evidence (${evidenceRes.status})`);

        setSummary(summaryJson || null);
        setEvidence(Array.isArray(evidenceJson?.currentEvidence) ? evidenceJson.currentEvidence : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load control workbench');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [controlId, framework, periodId, tenantId]);

  useEffect(() => {
    if (!evidenceId) return;
    setHighlightEvidenceId(evidenceId);
  }, [evidenceId]);

  useEffect(() => {
    if (!highlightEvidenceId) return;
    const row = document.getElementById(`evidence-${highlightEvidenceId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightEvidenceId, evidence]);

  if (loading) return <div className="p-8">Loading workbench...</div>;

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <nav className="text-xs text-slate-500">
          <span>GRC / Compliance</span> <span className="px-1">/</span>{' '}
          <Link href="/compliance/controls" className="hover:text-slate-700">
            Controls
          </Link>{' '}
          <span className="px-1">/</span> <span>{summary?.control_id || controlId}</span>{' '}
          <span className="px-1">/</span> <span className="text-slate-900">Workbench</span>
        </nav>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Control Workbench</h1>
            <p className="text-sm text-slate-600 mt-1">
              {framework.toUpperCase()} · {summary?.control_id || controlId}
            </p>
          </div>
          <Link href="/compliance" className="text-sm text-blue-600 hover:text-blue-700">
            Back to Compliance Overview
          </Link>
        </div>

      <Card className="p-6">
        <div className="text-lg font-semibold">{summary?.title || 'Control details'}</div>
        <div className="text-sm text-gray-600 mt-2">{summary?.standard || ''}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div className="text-xs uppercase text-gray-500">Evidence Status</div>
            <div className="font-medium">{summary?.evidence_status || 'unknown'}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Last Evidence</div>
            <div className="font-medium">
              {summary?.last_evidence_at ? new Date(summary.last_evidence_at).toLocaleString() : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500">Evidence Count</div>
            <div className="font-medium">{summary?.evidence_total_count ?? 0}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" title="Create an evidence request for this control">
            Request Evidence
          </Button>
          <Button
            variant="outline"
            title="Upload evidence and link it to this control for the selected audit period"
            onClick={() => window.location.assign(`/evidence?controlId=${encodeURIComponent(controlId)}`)}
          >
            Upload Evidence
          </Button>
          <Button variant="outline" title="Schedule an automated or manual test for this control" onClick={() => window.location.assign('/control-testing')}>
            Schedule Test
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="text-lg font-semibold mb-3">Latest Evidence</div>
        {evidence.length === 0 ? (
          <div className="text-sm text-gray-500">No evidence found for this control.</div>
        ) : (
          <div className="space-y-3">
            {evidence.map((row) => {
              const isHighlighted = highlightEvidenceId === row.evidence_id;
              return (
                <div
                  key={row.evidence_id}
                  id={`evidence-${row.evidence_id}`}
                  className={`rounded-lg border p-4 ${isHighlighted ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                >
                  <div className="text-sm font-medium">{row.summary || `${row.control_id} evidence`}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Asset: {row.asset_id || '-'} · Type: {row.evidence_type || '-'} · Source: {row.source || '-'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Captured: {row.captured_at ? new Date(row.captured_at).toLocaleString() : '-'} · Expires:{' '}
                    {row.expiration_date ? String(row.expiration_date).slice(0, 10) : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
