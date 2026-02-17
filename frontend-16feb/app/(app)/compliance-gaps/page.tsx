'use client';

import { Loading } from '@/components/ui/Loading';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type GapRow = {
  id: string;
  framework?: string | null;
  control_code?: string | null;
  gap_type?: string | null;
  gap_severity?: string | null;
  gap_description?: string | null;
  suggested_remediation?: string | null;
  risk_score?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

function severityVariant(sev?: string | null) {
  switch (sev) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    default:
      return 'neutral';
  }
}

export default function ComplianceGapsPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || 'demo-tenant';

  const [gaps, setGaps] = useState<GapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [framework, setFramework] = useState('iso27001');
  const [sortBy, setSortBy] = useState('risk');
  const [analyzing, setAnalyzing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'accepted_risk' | 'false_positive'>('resolved');

  useEffect(() => {
    fetchGaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter, sortBy, framework, tenantId]);

  async function fetchGaps() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        sort_by: sortBy,
      });
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (framework) params.set('framework', framework);

      const res = await fetch(`/api/compliance-gaps?${params.toString()}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await res.json();
      setGaps(data.gaps || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load gaps');
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      await fetch('/api/compliance-gaps/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ framework }),
      });
      await fetchGaps();
    } catch (err) {
      setError('Failed to run analysis');
    } finally {
      setAnalyzing(false);
    }
  }

  async function resolveGap(gapId: string) {
    if (!resolutionNotes.trim()) return;
    await fetch(`/api/compliance-gaps/${encodeURIComponent(gapId)}/resolve`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({
        status: resolutionStatus,
        resolution_notes: resolutionNotes.trim(),
      }),
    });
    setResolvingId(null);
    setResolutionNotes('');
    setResolutionStatus('resolved');
    fetchGaps();
  }

  const openCount = useMemo(() => gaps.filter((g) => g.status === 'open').length, [gaps]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Gap Analysis</h1>
          <p className="text-sm text-gray-600 mt-1">Identify missing controls, stale evidence, and remediation priorities.</p>
        </div>
        <Button onClick={runAnalysis} loading={analyzing}>
          Run Analysis
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-gray-600">Framework</div>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={framework} onChange={(e) => setFramework(e.target.value)}>
            <option value="iso27001">ISO 27001</option>
            <option value="soc2">SOC 2</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600">Status</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {['open', 'in_progress', 'resolved'].map((status) => (
              <Button key={status} size="sm" variant={statusFilter === status ? 'default' : 'outline'} onClick={() => setStatusFilter(status)}>
                {status.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Severity</div>
          <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <div className="text-sm text-gray-600">Sort</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {['risk', 'severity', 'date'].map((sort) => (
              <Button key={sort} size="sm" variant={sortBy === sort ? 'default' : 'outline'} onClick={() => setSortBy(sort)}>
                {sort}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="text-sm text-gray-600">Open gaps: {openCount}</div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="space-y-3">
        {loading ? (
          <Loading />
        ) : gaps.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">No gaps found. Run analysis to identify compliance gaps.</Card>
        ) : (
          gaps.map((gap) => (
            <Card key={gap.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityVariant(gap.gap_severity)}>{gap.gap_severity || 'medium'}</Badge>
                    <span className="font-semibold">
                      {(gap.framework || '').toUpperCase()}: {gap.control_code}
                    </span>
                    {gap.gap_type ? <Badge variant="neutral">{gap.gap_type.replace('_', ' ')}</Badge> : null}
                  </div>
                  <div className="text-sm text-gray-700 mt-2">{gap.gap_description}</div>
                  {gap.suggested_remediation ? (
                    <div className="text-sm mt-2 bg-blue-50 p-2 rounded">
                      <strong>Suggested Remediation:</strong> {gap.suggested_remediation}
                    </div>
                  ) : null}
                  <div className="text-xs text-gray-500 mt-2">
                    Risk Score: {gap.risk_score ?? 'n/a'} | Created:{' '}
                    {gap.created_at ? new Date(gap.created_at).toLocaleDateString() : 'n/a'}
                  </div>
                </div>
                {gap.status === 'open' ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setResolvingId(gap.id);
                      setResolutionNotes('');
                      setResolutionStatus('resolved');
                    }}
                  >
                    Resolve
                  </Button>
                ) : (
                  <Badge variant="info">{gap.status || 'open'}</Badge>
                )}
              </div>

              {resolvingId === gap.id ? (
                <div className="border-t pt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Resolution Status</label>
                      <select
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={resolutionStatus}
                        onChange={(e) => setResolutionStatus(e.target.value as typeof resolutionStatus)}
                      >
                        <option value="resolved">Resolved</option>
                        <option value="accepted_risk">Accepted Risk</option>
                        <option value="false_positive">False Positive</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Resolution Notes</label>
                      <input
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => resolveGap(gap.id)}>Save</Button>
                    <Button variant="outline" onClick={() => setResolvingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
