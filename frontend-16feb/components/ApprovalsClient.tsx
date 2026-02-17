'use client';

import React, { useMemo, useRef, useState } from 'react';

type Approval = any;

async function apiJson(path: string, method: string, body?: any, tenantId?: string) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': tenantId || 'demo-tenant',
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: txt ? JSON.parse(txt) : null };
  } catch {
    return { ok: res.ok, status: res.status, json: { raw: txt } };
  }
}

function typeLabel(approval: any): string {
  const t = String(approval.approval_type || approval.type || '');
  if (t === 'exception_request') return 'Exception Request';
  if (t === 'evidence_review') return 'Evidence Review';
  return t ? t : 'Approval';
}

function briefDescription(approval: any): string {
  const meta = approval?.metadata || {};
  const title = meta?.title ? String(meta.title) : '';
  const control = meta?.control_id ? String(meta.control_id) : '';
  if (title && control) return `${control} — ${title}`;
  if (title) return title;
  if (control) return control;
  return String(approval.reason || '').slice(0, 180) || '—';
}

function detailsLink(approval: any): string | null {
  const t = String(approval.approval_type || '');
  const entityId = String(approval.entity_id || approval.action_id || '');
  if (!entityId) return null;
  if (t === 'exception_request') return `/exceptions/${entityId}`;
  if (t === 'evidence_review') {
    const control = String(approval?.metadata?.control_id || '');
    if (control) return `/evidence?controlId=${encodeURIComponent(control)}`;
    return `/evidence`;
  }
  return null;
}

export function ApprovalsClient(props: { tenantId: string; initialItems: Approval[] }) {
  const [items, setItems] = useState<Approval[]>(props.initialItems || []);
  const [comment, setComment] = useState<string>('Approved by security');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const pending: Approval[] = [];
    const approved: Approval[] = [];
    const rejected: Approval[] = [];
    for (const a of items) {
      const st = String(a.state || a.status || '');
      if (st === 'PENDING_APPROVAL' || st === 'pending') pending.push(a);
      else if (st === 'APPROVED' || st === 'approved') approved.push(a);
      else if (st === 'REJECTED' || st === 'rejected') rejected.push(a);
      else pending.push(a);
    }
    return { pending, approved, rejected };
  }, [items]);

  async function decide(id: string, decision: 'approve' | 'reject') {
    const key = `${id}:${decision}`;
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    setError(null);
    setBusy(key);
    try {
      const r = await apiJson(`approvals/${id}/${decision}`, 'POST', { comment }, props.tenantId);
      if (!r.ok) {
        setError(`Failed (${r.status}). ${JSON.stringify(r.json)}`);
        return;
      }

      // Optimistic update: set state & decided fields if present
      setItems((prev) =>
        prev.map((x) => {
          if (String(x.approval_id) !== String(id)) return x;
          const next = { ...x };
          next.state = decision === 'approve' ? 'APPROVED' : 'REJECTED';
          next.decided_by = 'you';
          next.decided_at = new Date().toISOString();
          return next;
        })
      );
    } finally {
      inflight.current.delete(key);
      setBusy(null);
    }
  }

  async function decideEvidence(evidenceId: string, decision: 'approve' | 'reject') {
    const notes =
      decision === 'reject'
        ? prompt('Rejection reason (required):') || ''
        : prompt('Approval notes (optional):') || '';
    if (decision === 'reject' && !notes.trim()) {
      alert('Rejection reason is required');
      return;
    }

    const key = `evidence:${evidenceId}:${decision}`;
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    setError(null);
    setBusy(key);
    try {
      const r = await apiJson(`evidence/${evidenceId}/${decision}`, 'POST', { notes }, props.tenantId);
      if (!r.ok) {
        setError(`Failed (${r.status}). ${JSON.stringify(r.json)}`);
        return;
      }

      // Best-effort optimistic update: find matching approval by entity_id
      setItems((prev) =>
        prev.map((x) => {
          const t = String(x.approval_type || '');
          const ent = String(x.entity_id || x.action_id || '');
          if (t !== 'evidence_review') return x;
          if (ent !== String(evidenceId)) return x;
          const next = { ...x };
          next.state = decision === 'approve' ? 'APPROVED' : 'REJECTED';
          next.decided_by = 'you';
          next.decided_at = new Date().toISOString();
          return next;
        })
      );
    } finally {
      inflight.current.delete(key);
      setBusy(null);
    }
  }

  const Table = ({ title, rows }: { title: string; rows: Approval[] }) => (
    <section style={{ marginTop: 18 }}>
      <h2>
        {title} <span style={{ opacity: 0.6 }}>({rows.length})</span>
      </h2>

      {title === 'Pending' ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Decision comment"
            style={{ minWidth: 320, padding: 10, border: '1px solid #ddd', borderRadius: 10 }}
          />
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            Comment is stored as evidence with the decision.
          </span>
        </div>
      ) : null}

      <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['created_at', 'type', 'description', 'actions'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a: any) => (
              <tr key={a.approval_id}>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>{a.created_at}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>{typeLabel(a)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>{briefDescription(a)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {detailsLink(a) ? (
                      <a
                        href={detailsLink(a) as string}
                        style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7', textDecoration: 'none', color: 'inherit' }}
                      >
                        View Details
                      </a>
                    ) : null}

                    {String(a.state || '') === 'PENDING_APPROVAL' && String(a.approval_type || '') === 'evidence_review' ? (
                      <>
                        <button
                          onClick={() => decideEvidence(String(a.entity_id || a.action_id || ''), 'approve')}
                          disabled={busy !== null}
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}
                        >
                          {busy === `evidence:${String(a.entity_id || a.action_id || '')}:approve` ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => decideEvidence(String(a.entity_id || a.action_id || ''), 'reject')}
                          disabled={busy !== null}
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}
                        >
                          {busy === `evidence:${String(a.entity_id || a.action_id || '')}:reject` ? 'Rejecting…' : 'Reject'}
                        </button>
                      </>
                    ) : String(a.state || '') === 'PENDING_APPROVAL' ? (
                      <>
                        <button
                          onClick={() => decide(String(a.approval_id), 'approve')}
                          disabled={busy !== null}
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}
                        >
                          {busy === String(a.approval_id) + ':approve' ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => decide(String(a.approval_id), 'reject')}
                          disabled={busy !== null}
                          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}
                        >
                          {busy === String(a.approval_id) + ':reject' ? 'Rejecting…' : 'Reject'}
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <>
      {error ? (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #f1c0c0', borderRadius: 10, background: '#fff6f6' }}>
          <strong>Error</strong>
          <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}>{error}</div>
        </div>
      ) : null}

      <Table title="Pending" rows={grouped.pending} />
      <Table title="Approved" rows={grouped.approved} />
      <Table title="Rejected" rows={grouped.rejected} />
    </>
  );
}
