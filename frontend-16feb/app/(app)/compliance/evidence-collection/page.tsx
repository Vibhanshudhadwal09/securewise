'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Search, Filter, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCompliance } from '@/contexts/ComplianceContext';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/PageHeader';

type EvidenceRow = {
  evidence_id: string;
  control_id: string;
  control_title?: string | null;
  asset_id?: string | null;
  framework?: string | null;
  type?: string | null;
  artifact_uri?: string | null;
  sha256?: string | null;
  captured_at?: string | null;
  source?: string | null;
  source_tool?: string | null;
  source_ref?: string | null;
  source_raw_ref?: string | null;
  approval_status?: string | null;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  expiration_date?: string | null;
};

type EvidenceStats = {
  total_evidence?: number;
  needs_review?: number;
  approved?: number;
  rejected?: number;
  expired?: number;
};

type EvidenceResponse = {
  evidence: EvidenceRow[];
  total: number;
  page: number;
  limit: number;
  stats: EvidenceStats;
  frameworks: Array<{ framework: string; count: number }>;
  recent_activity: Array<{ date: string; count: number }>;
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

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'expired') return 'danger';
  if (status === 'needs_review' || status === 'pending') return 'warning';
  return 'neutral';
}

function statusLabel(status: string): string {
  if (status === 'needs_review') return 'Needs Review';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'pending') return 'Pending';
  if (status === 'expired') return 'Expired';
  return status.replace(/_/g, ' ');
}

export default function EvidenceCollectionPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const router = useRouter();
  const { framework, periodId } = useCompliance();
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, sourceFilter, searchQuery, framework, periodId]);

  async function fetchEvidence() {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (framework) params.append('framework', framework);
      if (periodId) params.append('periodId', periodId);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/evidence-collection?${params.toString()}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });

      const data = (await res.json().catch(() => ({}))) as EvidenceResponse;
      if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
      setEvidence(data.evidence || []);
      setStats(data.stats || {});
      setTotalPages(Math.max(1, Math.ceil(Number(data.total || 0) / 50)));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load evidence:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(evidenceId: string, status: string, notes?: string) {
    try {
      await fetch(`/api/evidence-collection/${encodeURIComponent(evidenceId)}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ status, notes }),
      });

      fetchEvidence();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to review evidence:', error);
    }
  }

  async function handleBulkReview(status: string) {
    if (selectedItems.size === 0) return;

    try {
      await fetch('/api/evidence/collection/bulk-review', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          evidenceIds: Array.from(selectedItems),
          status,
        }),
      });

      setSelectedItems(new Set());
      fetchEvidence();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to bulk review:', error);
    }
  }

  function toggleSelection(evidenceId: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(evidenceId)) {
        next.delete(evidenceId);
      } else {
        next.add(evidenceId);
      }
      return next;
    });
  }

  if (loading && !evidence.length) {
    return <div className="p-8 flex justify-center"><Loading /></div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <PageHeader
        title="Evidence Collection"
        description="Collected evidence from connected systems. Open a control to review and accept evidence for an audit period."
        icon={FileCheck}
        breadcrumbs={[
          { label: 'GRC / Compliance' },
          { label: 'Evidence Collection' },
        ]}
        stats={[
          { label: 'Total', value: stats?.total_evidence ?? 0 },
          { label: 'Needs Review', value: stats?.needs_review ?? 0 },
        ]}
      />

      <div className="max-w-[1600px] mx-auto px-8 py-8 space-y-8">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Evidence', value: stats?.total_evidence, sub: 'Collected items', color: 'blue' },
            { label: 'Approved', value: stats?.approved, sub: 'Accepted evidence', color: 'green' },
            { label: 'Needs Review', value: stats?.needs_review, sub: 'Awaiting approval', color: 'orange' },
            { label: 'Rejected', value: stats?.rejected, sub: 'Needs attention', color: 'red' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm backdrop-blur-md border-l-4 border-l-${color}-500`}>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">{label}</div>
              <div className={`text-3xl font-bold text-${color}-400`}>{(value ?? 0).toLocaleString()}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">{sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="appearance-none border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="all" className="bg-[var(--bg-primary)]">All Status</option>
                <option value="needs_review" className="bg-[var(--bg-primary)]">Needs Review</option>
                <option value="approved" className="bg-[var(--bg-primary)]">Approved</option>
                <option value="rejected" className="bg-[var(--bg-primary)]">Rejected</option>
              </select>
              <Filter className="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
                className="appearance-none border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="all" className="bg-[var(--bg-primary)]">All Sources</option>
                <option value="wazuh_indexer" className="bg-[var(--bg-primary)]">Wazuh</option>
                <option value="securewise.risk_autogen" className="bg-[var(--bg-primary)]">Risk Autogen</option>
              </select>
              <Filter className="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search evidence..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pl-9 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
            </div>
          </div>

          {selectedItems.size > 0 ? (
            <div className="text-xs text-[var(--accent-blue)] font-medium">
              {selectedItems.size} selected · Open a control to review evidence
            </div>
          ) : null}
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Evidence Ledger</h3>
            <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--card-border)]">
              {evidence.length} items
            </span>
          </div>
          <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
            <table className="w-full text-sm text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium border-b border-[var(--card-border)]">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-[var(--card-border)] bg-[var(--bg-primary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(new Set(evidence.map((ev) => ev.evidence_id)));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                      checked={selectedItems.size > 0 && selectedItems.size === evidence.length}
                    />
                  </th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider">Evidence ID</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider">Control</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider">Framework</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider">Captured</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {evidence.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-[var(--text-secondary)]">
                      No evidence found
                    </td>
                  </tr>
                ) : (
                  evidence.map((row) => {
                    const status = String(row.approval_status || 'needs_review');
                    return (
                      <tr key={row.evidence_id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded border-[var(--card-border)] bg-[var(--bg-primary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                            checked={selectedItems.has(row.evidence_id)}
                            onChange={() => toggleSelection(row.evidence_id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--accent-blue)]">{row.evidence_id.slice(0, 8)}...</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--text-primary)] text-xs">{row.control_id}</div>
                          <div className="text-xs text-[var(--text-secondary)] line-clamp-1 group-hover:text-[var(--text-primary)] transition-colors">{row.control_title || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] rounded text-xs uppercase font-medium">
                            {row.framework || 'n/a'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{row.source || '-'}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {row.captured_at ? new Date(row.captured_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => router.push(`/compliance/evidence-collection/${row.evidence_id}`)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-medium rounded-lg hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)] border border-[var(--card-border)] transition-colors"
                                >
                                  View
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    const params = new URLSearchParams({
                                      framework: row.framework || 'iso27001',
                                      evidenceId: row.evidence_id,
                                    });
                                    router.push(`/compliance/controls/${row.control_id}/workbench?${params.toString()}`);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-medium rounded-lg hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--text-primary)] border border-[var(--card-border)] transition-colors"
                                >
                                  Control
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Open Control Workbench</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  disabled={!row.source_ref}
                                  onClick={() => {
                                    if (!row.source_ref) return;
                                    window.open(row.source_ref, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="inline-flex items-center gap-1 p-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-medium rounded-lg hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--accent-blue)] border border-[var(--card-border)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{row.source_ref ? 'Open Source' : 'No source link'}</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm">
          <div className="text-sm text-[var(--text-secondary)]">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
