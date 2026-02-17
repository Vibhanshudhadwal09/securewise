'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Search, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCompliance } from '@/contexts/ComplianceContext';
import { Loading } from '@/components/ui/Loading';

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

function statusVariant(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'pending' || status === 'needs_review') return 'warning';
  return 'neutral';
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
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div>
          <nav className="text-xs text-[var(--text-secondary)] mb-2">
            <span>GRC / Compliance</span> <span className="px-1">/</span> <span className="text-[var(--text-primary)]">Evidence Collection</span>
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Evidence Collection</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Collected evidence from connected systems. Open a control to review and accept evidence for an audit period.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Total Evidence</div>
            <div className="text-3xl font-bold mt-2 text-[var(--text-primary)]">{stats?.total_evidence?.toLocaleString() || 0}</div>
            <div className="text-sm text-[var(--text-tertiary)] mt-1">Collected items</div>
          </Card>
          <Card className="p-6 bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Approved</div>
            <div className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">{stats?.approved?.toLocaleString() || 0}</div>
            <div className="text-sm text-[var(--text-tertiary)] mt-1">Accepted evidence</div>
          </Card>
          <Card className="p-6 bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Needs Review</div>
            <div className="text-3xl font-bold mt-2 text-amber-600 dark:text-amber-400">{stats?.needs_review?.toLocaleString() || 0}</div>
            <div className="text-sm text-[var(--text-tertiary)] mt-1">Awaiting approval</div>
          </Card>
          <Card className="p-6 bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm">
            <div className="text-sm text-[var(--text-secondary)]">Rejected</div>
            <div className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">{stats?.rejected?.toLocaleString() || 0}</div>
            <div className="text-sm text-[var(--text-tertiary)] mt-1">Needs attention</div>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="all">All Status</option>
                <option value="needs_review">Needs Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Filter className="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="all">All Sources</option>
                <option value="wazuh_indexer">Wazuh</option>
                <option value="securewise.risk_autogen">Risk Autogen</option>
              </select>
              <Filter className="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search evidence..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pl-9 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
            </div>
          </div>

          {selectedItems.size > 0 ? (
            <div className="text-xs text-[var(--text-secondary)]">
              {selectedItems.size} selected · Open a control to review evidence
            </div>
          ) : null}
        </div>

        <div className="border border-[var(--card-border)] rounded-lg overflow-hidden bg-[var(--card-bg)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] border-b border-[var(--card-border)] text-[var(--text-secondary)]">
                <tr>
                  <th className="p-3 text-left w-10">
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
                  <th className="p-3 text-left font-medium">Evidence ID</th>
                  <th className="p-3 text-left font-medium">Control</th>
                  <th className="p-3 text-left font-medium">Framework</th>
                  <th className="p-3 text-left font-medium">Source</th>
                  <th className="p-3 text-left font-medium">Captured</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium uppercase tracking-wider">
                    Actions
                  </th>
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
                      <tr key={row.evidence_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="rounded border-[var(--card-border)] bg-[var(--bg-primary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                            checked={selectedItems.has(row.evidence_id)}
                            onChange={() => toggleSelection(row.evidence_id)}
                          />
                        </td>
                        <td className="p-3 font-mono text-xs text-[var(--accent-blue)]">{row.evidence_id.slice(0, 8)}...</td>
                        <td className="p-3">
                          <div className="font-medium text-[var(--text-primary)]">{row.control_id}</div>
                          <div className="text-xs text-[var(--text-secondary)] line-clamp-1">{row.control_title || '-'}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] rounded text-xs uppercase font-medium">
                            {row.framework || 'n/a'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-[var(--text-primary)]">{row.source || '-'}</td>
                        <td className="p-3 text-sm text-[var(--text-secondary)]">
                          {row.captured_at ? new Date(row.captured_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3">
                          <Badge variant={statusVariant(status)}>{status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/compliance/evidence-collection/${row.evidence_id}`)}
                                  className="text-xs h-8 px-2"
                                >
                                  View
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const params = new URLSearchParams({
                                      framework: row.framework || 'iso27001',
                                      evidenceId: row.evidence_id,
                                    });
                                    router.push(`/compliance/controls/${row.control_id}/workbench?${params.toString()}`);
                                  }}
                                  className="text-xs h-8 px-2"
                                >
                                  Control
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Open Control Workbench
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!row.source_ref}
                                  onClick={() => {
                                    if (!row.source_ref) return;
                                    window.open(row.source_ref, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="text-xs h-8 px-2"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {row.source_ref
                                  ? 'Open Source'
                                  : 'No source link'}
                              </TooltipContent>
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

        <div className="flex justify-between items-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3 shadow-sm">
          <div className="text-sm text-[var(--text-secondary)]">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
