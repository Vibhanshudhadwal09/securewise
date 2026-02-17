'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type EvidenceDetail = {
  evidence_id: string;
  control_id: string;
  control_title?: string | null;
  control_description?: string | null;
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

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function statusVariant(status: string) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'pending' || status === 'needs_review') return 'warning';
  return 'neutral';
}

export default function EvidenceDetailPage() {
  const params = useParams();
  const evidenceId = String(params?.evidenceId || '');
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [detail, setDetail] = useState<EvidenceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/evidence/collection/${encodeURIComponent(evidenceId)}`, {
          credentials: 'include',
          headers: { 'x-tenant-id': tenantId },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);
        setDetail((json as any)?.evidence || null);
      } catch (err: any) {
        setError(err?.message || 'Failed to load evidence detail');
      } finally {
        setLoading(false);
      }
    }
    if (evidenceId) void load();
  }, [evidenceId, tenantId]);

  async function handleReview(status: 'approved' | 'rejected') {
    try {
      setReviewing(status);

      const res = await fetch(`/api/evidence/collection/${encodeURIComponent(evidenceId)}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: reviewNotes || undefined,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error((errorBody as any)?.error || 'Failed to review evidence');
      }

      const data = await res.json().catch(() => ({}));
      if (data?.evidence) {
        setDetail(data.evidence);
      }
      setReviewNotes('');
      alert(`Evidence ${status} successfully.`);
    } catch (err: any) {
      console.error('Review error:', err);
      alert(`Failed to ${status} evidence: ${err?.message || 'Unknown error'}`);
    } finally {
      setReviewing(null);
    }
  }

  if (loading) {
    return <div className="p-8">Loading evidence detail...</div>;
  }

  if (error || !detail) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-sm text-red-600">{error || 'Evidence not found.'}</div>
        <Link href="/compliance/evidence-collection" className="text-primary-600 hover:text-primary-700">
          Back to evidence collection
        </Link>
      </div>
    );
  }

  const status = String(detail.approval_status || 'needs_review');

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evidence Detail</h1>
          <p className="text-gray-600 mt-1">Evidence ID: {detail.evidence_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              const qs = new URLSearchParams();
              if (detail.framework) qs.set('framework', detail.framework);
              qs.set('evidenceId', detail.evidence_id);
              window.location.href = `/compliance/controls/${encodeURIComponent(detail.control_id)}/workbench?${qs.toString()}`;
            }}
          >
            Open Related Control
          </Button>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="outline"
                disabled={!detail.source_ref}
                onClick={() => {
                  if (!detail.source_ref) return;
                  window.open(detail.source_ref, '_blank', 'noopener,noreferrer');
                }}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Source
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {detail.source_ref ? 'Open the original record in the connected tool.' : 'No source link available for this item.'}
            </TooltipContent>
          </Tooltip>
          <Link href="/compliance/evidence-collection">
            <Button variant="outline">Back to Evidence</Button>
          </Link>
        </div>
      </div>

      {detail.approval_status === 'approved' ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <span className="text-green-700 font-medium">This evidence has been approved.</span>
        </div>
      ) : null}

      {detail.approval_status === 'rejected' ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <span className="text-red-700 font-medium">This evidence has been rejected.</span>
        </div>
      ) : null}

      {detail.approval_status !== 'approved' && detail.approval_status !== 'rejected' ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Review Evidence</h3>
          <div className="flex gap-3">
            <Button
              onClick={() => handleReview('approved')}
              disabled={Boolean(reviewing)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {reviewing === 'approved' ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              onClick={() => handleReview('rejected')}
              disabled={Boolean(reviewing)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {reviewing === 'rejected' ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Review Notes (Optional)</label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={3}
              placeholder="Add any notes about this review decision..."
            />
          </div>
        </Card>
      ) : null}

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Control</div>
            <div className="text-lg font-semibold">{detail.control_id}</div>
            <div className="text-sm text-gray-600">{detail.control_title || '-'}</div>
          </div>
          <Badge variant={statusVariant(status)}>{status.replace('_', ' ')}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Framework</div>
            <div className="font-medium">{detail.framework || '-'}</div>
          </div>
          <div>
            <div className="text-gray-500">Asset</div>
            <div className="font-medium">{detail.asset_id || '-'}</div>
          </div>
          <div>
            <div className="text-gray-500">Captured at</div>
            <div className="font-medium">{detail.captured_at ? new Date(detail.captured_at).toLocaleString() : '-'}</div>
          </div>
          <div>
            <div className="text-gray-500">Source</div>
            <div className="font-medium">{detail.source || '-'}</div>
          </div>
          <div>
            <div className="text-gray-500">Expiration</div>
            <div className="font-medium">{detail.expiration_date ? new Date(detail.expiration_date).toLocaleDateString() : '-'}</div>
          </div>
          <div>
            <div className="text-gray-500">SHA256</div>
            <div className="font-mono text-xs">{detail.sha256 || '-'}</div>
          </div>
        </div>

        <div>
          <div className="text-gray-500 text-sm mb-1">Artifact URI</div>
          {detail.artifact_uri ? (
            <a className="text-primary-600 hover:text-primary-700 break-all text-sm" href={detail.artifact_uri} target="_blank" rel="noreferrer">
              {detail.artifact_uri}
            </a>
          ) : (
            <div className="text-sm text-gray-600">-</div>
          )}
        </div>

        {detail.control_description && (
          <div>
            <div className="text-gray-500 text-sm mb-1">Control description</div>
            <div className="text-sm text-gray-700">{detail.control_description}</div>
          </div>
        )}

        {detail.review_notes && (
          <div>
            <div className="text-gray-500 text-sm mb-1">Review notes</div>
            <div className="text-sm text-gray-700">{detail.review_notes}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
