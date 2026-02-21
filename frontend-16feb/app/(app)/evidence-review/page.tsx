'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ClipboardCheck, CheckCircle, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';

type ReviewItem = {
  id: string;
  evidence_id: string;
  evidence_title?: string | null;
  evidence_description?: string | null;
  evidence_type?: string | null;
  framework?: string | null;
  control_code?: string | null;
  control_title?: string | null;
  review_status?: string | null;
  submitted_at?: string | null;
  priority?: string | null;
  assigned_to?: string | null;
  captured_at?: string | null;
};

function statusVariant(status?: string | null): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'needs_revision': return 'warning';
    default: return 'info';
  }
}

function statusLabel(status?: string | null): string {
  switch (status) {
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'needs_revision': return 'Needs Revision';
    case 'pending': return 'Pending';
    default: return status || 'Pending';
  }
}

function priorityVariant(priority?: string | null): 'danger' | 'warning' | 'info' | 'neutral' {
  switch (priority) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'info';
    default: return 'neutral';
  }
}

const inputCls = 'w-full rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] placeholder:text-[var(--text-tertiary)]';
const selectCls = `appearance-none ${inputCls} pr-8`;

export default function EvidenceReviewPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || 'demo-tenant';

  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkComment, setBulkComment] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'needs_revision'>('approved');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewRejectionReason, setReviewRejectionReason] = useState('');

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, tenantId]);

  async function fetchQueue() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      const res = await fetch(`/api/evidence-review/queue?${params.toString()}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = selected.size;
  const allSelected = useMemo(() => {
    if (!queue.length) return false;
    return queue.every((item) => selected.has(item.id));
  }, [queue, selected]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(queue.map((item) => item.id)));
  }

  async function bulkReview(status: 'approved' | 'rejected') {
    if (!selectedCount) return;
    await fetch('/api/evidence-review/bulk-review', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ review_ids: Array.from(selected), review_status: status, review_comments: bulkComment || undefined }),
    });
    setSelected(new Set());
    setBulkComment('');
    fetchQueue();
  }

  async function bulkAssign() {
    if (!selectedCount || !bulkAssignee.trim()) return;
    await fetch('/api/evidence-review/bulk-assign', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ review_ids: Array.from(selected), assigned_to: bulkAssignee.trim() }),
    });
    setBulkAssignee('');
    fetchQueue();
  }

  async function submitReview(reviewId: string) {
    await fetch(`/api/evidence-review/${encodeURIComponent(reviewId)}/review`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({
        review_status: reviewStatus,
        review_comments: reviewComments || undefined,
        rejection_reason: reviewStatus === 'rejected' ? reviewRejectionReason || undefined : undefined,
      }),
    });
    setReviewingId(null);
    setReviewComments('');
    setReviewRejectionReason('');
    setReviewStatus('approved');
    fetchQueue();
  }

  const statusTabs = ['pending', 'approved', 'rejected', 'needs_revision'] as const;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <PageHeader
        title="Evidence Review Queue"
        description="Review, approve, or reject submitted evidence from controls across all frameworks."
        icon={ClipboardCheck}
        breadcrumbs={[
          { label: 'GRC' },
          { label: 'Evidence Review' },
        ]}
        stats={[
          { label: 'In Queue', value: queue.length },
          { label: 'Selected', value: selectedCount },
        ]}
      />

      <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6">

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
          {/* Status tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {statusTabs.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === status
                    ? 'bg-[var(--accent-blue)] text-white shadow-sm'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)]'
                  }`}
              >
                {statusLabel(status)}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-[var(--card-border)] hidden sm:block" />

          {/* Priority filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Priority</span>
            <div className="relative">
              <select
                className={selectCls + ' min-w-[120px]'}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all" className="bg-[var(--bg-primary)]">All</option>
                <option value="critical" className="bg-[var(--bg-primary)]">Critical</option>
                <option value="high" className="bg-[var(--bg-primary)]">High</option>
                <option value="medium" className="bg-[var(--bg-primary)]">Medium</option>
                <option value="low" className="bg-[var(--bg-primary)]">Low</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedCount > 0 && (
          <div className="rounded-xl border border-[var(--accent-blue)]/30 bg-[rgba(59,130,246,0.06)] p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-blue)]">
              <CheckCircle className="w-4 h-4" />
              Bulk Actions — {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Comment</label>
                <input className={inputCls} value={bulkComment} onChange={(e) => setBulkComment(e.target.value)} placeholder="Add a review note" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Assign To</label>
                <input className={inputCls} value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} placeholder="assignee@example.com" />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => bulkReview('approved')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg text-xs font-semibold hover:bg-green-500/25 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => bulkReview('rejected')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold hover:bg-red-500/25 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={bulkAssign}
                  className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--card-border)] rounded-lg text-xs font-semibold hover:text-[var(--text-primary)] transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Queue card */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-sm font-medium text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="rounded border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
              />
              Select all
            </label>
            <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--card-border)]">
              {queue.length} items
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-[var(--card-border)]">
            {loading ? (
              <div className="p-12 flex justify-center"><Loading /></div>
            ) : queue.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-secondary)]">No evidence to review in this queue.</div>
            ) : (
              queue.map((item) => (
                <div key={item.id} className="p-5 hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="mt-1 rounded border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {item.evidence_title || 'Untitled Evidence'}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
                        {(item.framework || '').toUpperCase()}: {item.control_code} — {item.control_title}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--text-tertiary)]">
                        <span>Type: <span className="text-[var(--text-secondary)]">{item.evidence_type || 'unknown'}</span></span>
                        <span>Submitted: <span className="text-[var(--text-secondary)]">{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'n/a'}</span></span>
                        {item.assigned_to && <span>Assigned: <span className="text-[var(--accent-blue)]">{item.assigned_to}</span></span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={statusVariant(item.review_status)}>{statusLabel(item.review_status)}</Badge>
                      {item.priority && <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>}
                      <button
                        onClick={() => {
                          setReviewingId(reviewingId === item.id ? null : item.id);
                          setReviewStatus('approved');
                          setReviewComments('');
                          setReviewRejectionReason('');
                        }}
                        className="mt-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
                      >
                        {reviewingId === item.id ? 'Cancel' : 'Review'}
                      </button>
                    </div>
                  </div>

                  {/* Inline review form */}
                  {reviewingId === item.id && (
                    <div className="mt-4 pt-4 border-t border-[var(--card-border)] space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Decision</label>
                          <div className="relative">
                            <select
                              className={selectCls}
                              value={reviewStatus}
                              onChange={(e) => setReviewStatus(e.target.value as typeof reviewStatus)}
                            >
                              <option value="approved" className="bg-[var(--bg-primary)]">Approve</option>
                              <option value="rejected" className="bg-[var(--bg-primary)]">Reject</option>
                              <option value="needs_revision" className="bg-[var(--bg-primary)]">Needs Revision</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Comment</label>
                          <input className={inputCls} value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} placeholder="Optional review note..." />
                        </div>
                        {reviewStatus === 'rejected' && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-red-400 mb-1">
                              <AlertTriangle className="inline w-3.5 h-3.5 mr-1" />Rejection Reason
                            </label>
                            <input className={inputCls + ' border-red-500/40 focus:ring-red-500'} value={reviewRejectionReason} onChange={(e) => setReviewRejectionReason(e.target.value)} placeholder="Explain why evidence was rejected..." />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => submitReview(item.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${reviewStatus === 'approved'
                              ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
                              : reviewStatus === 'rejected'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                            }`}
                        >
                          Submit Decision
                        </button>
                        <button
                          onClick={() => setReviewingId(null)}
                          className="px-4 py-2 rounded-lg text-xs font-medium border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
