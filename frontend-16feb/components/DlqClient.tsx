'use client';

import React, { useEffect, useMemo, useState } from 'react';

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
  let json: any = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { json = { raw: txt }; }
  return { ok: res.ok, status: res.status, json };
}

function Drawer(props: { open: boolean; onClose: () => void; title: string; children: any }) {
  if (!props.open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={props.onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 92vw)',
          height: '100%',
          background: '#fff',
          padding: 18,
          overflowY: 'auto',
          boxShadow: '0 0 30px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0 }}>{props.title}</h2>
          <button
            onClick={props.onClose}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}
          >
            Close
          </button>
        </div>
        <div style={{ marginTop: 14 }}>{props.children}</div>
      </div>
    </div>
  );
}

function JsonBlock({ obj }: { obj: any }) {
  return (
    <pre
      style={{
        marginTop: 10,
        padding: 12,
        border: '1px solid #eee',
        borderRadius: 10,
        background: '#fafafa',
        overflowX: 'auto',
        fontSize: 12,
      }}
    >
      {JSON.stringify(obj, null, 2)}
    </pre>
  );
}

export function DlqClient(props: { tenantId: string; initialJobs: any[] }) {
  const [jobs, setJobs] = useState<any[]>(props.initialJobs || []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [actionDetails, setActionDetails] = useState<any | null>(null);
  const [drawerErr, setDrawerErr] = useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  async function retry(jobId: string) {
    setError(null);
    setBusy(jobId);
    const r = await apiJson(`enforcement-jobs/${jobId}/retry`, 'POST', {}, props.tenantId);
    if (!r.ok) {
      setError(`Retry failed (${r.status}). ${JSON.stringify(r.json)}`);
      setBusy(null);
      return;
    }
    setJobs((prev) => prev.map((j) => (String(j.job_id) === String(jobId) ? r.json : j)));
    setBusy(null);
  }

  async function openDetails(job: any) {
    setSelectedJob(job);
    setActionDetails(null);
    setDrawerErr(null);
    setDrawerLoading(true);
    setDrawerOpen(true);

    const actionId = String(job.action_id || '');
    if (!actionId) {
      setDrawerErr('No action_id on job.');
      setDrawerLoading(false);
      return;
    }

    const r = await apiJson(`enforcement-action/${actionId}`, 'GET', undefined, props.tenantId);
    if (!r.ok) {
      setDrawerErr(`Failed to load enforcement action (${r.status}). ${JSON.stringify(r.json)}`);
      setDrawerLoading(false);
      return;
    }
    setActionDetails(r.json);
    setDrawerLoading(false);
  }

  function closeDetails() {
    setDrawerOpen(false);
    setSelectedJob(null);
    setActionDetails(null);
    setDrawerErr(null);
  }

  const rows = useMemo(() => jobs, [jobs]);

  return (
    <>
      {error ? (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid #f1c0c0', borderRadius: 10, background: '#fff6f6' }}>
          <strong>Error</strong>
          <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}>{error}</div>
        </div>
      ) : null}

      <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 10, marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['created_at','job_id','action_id','status','attempts','last_error','actions'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #eee' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((j: any) => (
              <tr key={j.job_id}>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>{j.created_at}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2', fontFamily: 'monospace' }}>{j.job_id}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2', fontFamily: 'monospace' }}>{j.action_id}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>{j.status}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>{j.attempts}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2', maxWidth: 420 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.8, whiteSpace: 'pre-wrap' }}>{j.last_error || '-'}</div>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #f2f2f2' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => openDetails(j)}
                      style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => retry(String(j.job_id))}
                      disabled={busy !== null}
                      style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}
                    >
                      {busy === String(j.job_id) ? 'Retrying…' : 'Retry'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={closeDetails} title="DLQ Job Details">
        {drawerLoading ? <p style={{ opacity: 0.7 }}>Loading…</p> : null}
        {drawerErr ? (
          <div style={{ padding: 12, border: '1px solid #f1c0c0', borderRadius: 10, background: '#fff6f6' }}>
            <strong>Error</strong>
            <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}>{drawerErr}</div>
          </div>
        ) : null}

        {selectedJob ? (
          <>
            <h3 style={{ marginTop: 14 }}>Job</h3>
            <JsonBlock obj={selectedJob} />
          </>
        ) : null}

        {actionDetails ? (
          <>
            <h3 style={{ marginTop: 14 }}>Linked Enforcement Action</h3>
            <p style={{ opacity: 0.75, marginTop: 6 }}>
              Includes proposed actions and OPA decision (inline) for auditor-friendly investigation.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', padding: 12, border: '1px solid #eee', borderRadius: 10, background: '#fafafa' }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>control_id</div>
                <div style={{ fontFamily: 'monospace' }}>{actionDetails.control_id}</div>
              </div>
              <div style={{ flex: '1 1 220px', padding: 12, border: '1px solid #eee', borderRadius: 10, background: '#fafafa' }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>asset_id</div>
                <div style={{ fontFamily: 'monospace' }}>{actionDetails.asset_id}</div>
              </div>
              <div style={{ flex: '1 1 220px', padding: 12, border: '1px solid #eee', borderRadius: 10, background: '#fafafa' }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>state</div>
                <div style={{ fontFamily: 'monospace' }}>{actionDetails.state}</div>
              </div>
            </div>

            <h3 style={{ marginTop: 14 }}>OPA Decision</h3>
            <JsonBlock obj={actionDetails.opa_decision || {}} />

            <h3 style={{ marginTop: 14 }}>Proposed Actions</h3>
            <JsonBlock obj={actionDetails.proposed_actions || []} />
          </>
        ) : null}
      </Drawer>
    </>
  );
}
