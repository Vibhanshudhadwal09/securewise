import React from 'react';
import { apiFetch } from '../../../../lib/server-api';

async function getJson(path: string, tenantId?: string) {
  const res = await apiFetch(path, { tenantId: tenantId || 'demo-tenant' });
  return res.json();
}

export default async function ExceptionDetail({ params }: { params: Promise<{ exceptionId: string }> }) {
  const tenantId = 'demo-tenant';
  const p = await params;
  const ex = await getJson(`exceptions/${p.exceptionId}`, tenantId);

  return (
    <main style={{ padding: 24 }}>
      <a href="/exceptions" style={{ textDecoration: 'none' }}>← Back</a>
      <h1 style={{ marginTop: 10 }}>{ex.title}</h1>
      <p style={{ opacity: 0.75 }}>{ex.description || ''}</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
        {[
          ['control', ex.control_id],
          ['status', ex.status],
          ['valid_until', ex.valid_until || '-'],
          ['requested_by', ex.requested_by || '-'],
          ['approved_by', ex.approved_by || '-'],
        ].map(([k,v]) => (
          <div key={k} style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10, minWidth: 220 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{k}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{String(v)}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 20 }}>Lifecycle actions (audit-only)</h2>

      <form action={`/api/exceptions/${ex.exception_id}/request-approval`} method="post" style={{ marginTop: 10 }}>
        <input name="reason" defaultValue="Business need with compensating controls; time-bound exception." style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 10, marginBottom: 10 }} />
        <button style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}>
          Request approval
        </button>
      </form>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        <form action={`/api/exceptions/${ex.exception_id}/approve`} method="post">
          <button style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}>
            Approve (admin)
          </button>
        </form>
        <form action={`/api/exceptions/${ex.exception_id}/reject`} method="post">
          <button style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}>
            Reject (admin)
          </button>
        </form>
        <form action={`/api/exceptions/${ex.exception_id}/revoke`} method="post">
          <button style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}>
            Revoke
          </button>
        </form>
      </div>

      <p style={{ marginTop: 12, opacity: 0.75 }}>
        Decisions emit evidence and appear in <a href="/approvals">Approvals Inbox</a>.
      </p>
    </main>
  );
}
