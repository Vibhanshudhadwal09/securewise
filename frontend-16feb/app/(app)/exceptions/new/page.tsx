'use client';

import React from 'react';
import { usePermissions } from '../../../../lib/permissions';

export default function NewException() {
  const { can } = usePermissions();
  return (
    <main style={{ padding: 24 }}>
      <a href="/exceptions" style={{ textDecoration: 'none' }}>← Back</a>
      <h1 style={{ marginTop: 10 }}>Create Exception</h1>
      <p style={{ opacity: 0.75 }}>Create an exception (draft). Then request approval.</p>

      {!can('policies.create') ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid #f0f0f0', background: '#fff7e6' }}>
          You don’t have permission to create exceptions.
        </div>
      ) : null}

      <form action="/api/exceptions" method="post" style={{ marginTop: 12 }}>
        <input name="controlId" placeholder="Control ID (e.g., A.8.28)" defaultValue="A.8.28" style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 10, marginBottom: 10 }} />
        <input name="title" placeholder="Title" defaultValue="Temporary exception for secure coding scanner gap" style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 10, marginBottom: 10 }} />
        <textarea name="description" placeholder="Description" defaultValue="Exception requested while scanner rollout completes; compensating controls documented." style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 10, marginBottom: 10, minHeight: 100 }} />
        <input name="validUntil" defaultValue={new Date(Date.now() + 30*24*3600*1000).toISOString()} style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 10, marginBottom: 10 }} />
        <button
          disabled={!can('policies.create')}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #ddd',
            background: '#f7f7f7',
            opacity: can('policies.create') ? 1 : 0.5,
            cursor: can('policies.create') ? 'pointer' : 'not-allowed',
          }}
        >
          Create Draft Exception
        </button>
      </form>

      <p style={{ marginTop: 12, opacity: 0.75 }}>
        After creation, open the exception and click “Request approval”.
      </p>
      <p style={{ opacity: 0.75 }}>
        (audit-only) Actions write evidence logs and approvals appear in <a href="/approvals">Approvals Inbox</a>.
      </p>
    </main>
  );
}
