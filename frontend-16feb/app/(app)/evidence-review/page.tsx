'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

function statusVariant(status?: string | null) {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'needs_revision':
      return 'warning';
    default:
      return 'info';
  }
}

function priorityVariant(priority?: string | null) {
  switch (priority) {
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(queue.map((item) => item.id));
    });
  }

  async function bulkReview(status: 'approved' | 'rejected') {
    if (!selectedCount) return;
    await fetch('/api/evidence-review/bulk-review', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({
        review_ids: Array.from(selected),
        review_status: status,
        review_comments: bulkComment || undefined,
      }),
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
      body: JSON.stringify({
        review_ids: Array.from(selected),
        assigned_to: bulkAssignee.trim(),
      }),
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evidence Review Queue</h1>
          <p className="text-sm text-gray-600 mt-1">Review, approve, or reject submitted evidence.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['pending', 'approved', 'rejected', 'needs_revision'].map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? 'default' : 'outline'}
            onClick={() => setStatusFilter(status)}
          >
            {status.replace('_', ' ')}
          </Button>
        ))}
        <div className="ml-2 flex items-center gap-2">
          <span className="text-sm text-gray-600">Priority</span>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {selectedCount > 0 ? (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-medium">Bulk Actions ({selectedCount} selected)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Comment</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                placeholder="Add a review note"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={bulkAssignee}
                onChange={(e) => setBulkAssignee(e.target.value)}
                placeholder="assignee@example.com"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => bulkReview('approved')}>Approve</Button>
              <Button variant="outline" onClick={() => bulkReview('rejected')}>
                Reject
              </Button>
              <Button variant="outline" onClick={bulkAssign}>
                Assign
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            Select all
          </label>
          <div className="text-sm text-gray-500">{queue.length} items</div>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div>Loading...</div>
          ) : queue.length === 0 ? (
            <div className="text-center text-gray-500 py-6">No evidence to review</div>
          ) : (
            queue.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex items-start gap-4">
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  <div className="flex-1">
                    <div className="font-semibold">{item.evidence_title || 'Untitled Evidence'}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {(item.framework || '').toUpperCase()}: {item.control_code} - {item.control_title}
                    </div>
                    <div className="text-sm mt-2 text-gray-700">
                      Type: {item.evidence_type || 'unknown'} | Submitted:{' '}
                      {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'n/a'}
                    </div>
                    {item.assigned_to ? (
                      <div className="text-sm text-gray-600 mt-1">Assigned to: {item.assigned_to}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusVariant(item.review_status)}>{item.review_status || 'pending'}</Badge>
                    {item.priority ? <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge> : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReviewingId(item.id);
                        setReviewStatus('approved');
                        setReviewComments('');
                        setReviewRejectionReason('');
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </div>
                {reviewingId === item.id ? (
                  <div className="border-t pt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Decision</label>
                        <select
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={reviewStatus}
                          onChange={(e) => setReviewStatus(e.target.value as typeof reviewStatus)}
                        >
                          <option value="approved">Approve</option>
                          <option value="rejected">Reject</option>
                          <option value="needs_revision">Needs Revision</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Comment</label>
                        <input
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                        />
                      </div>
                      {reviewStatus === 'rejected' ? (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium">Rejection Reason</label>
                          <input
                            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                            value={reviewRejectionReason}
                            onChange={(e) => setReviewRejectionReason(e.target.value)}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => submitReview(item.id)}>Submit</Button>
                      <Button variant="outline" onClick={() => setReviewingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
