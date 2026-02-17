'use client';

import React, { useEffect, useMemo, useState } from 'react';
import FrameworkSelector, { type FrameworkName } from '@/components/FrameworkSelector';
import { AuditPeriodSelector, type FrameworkId } from '@/components/grc/AuditPeriodSelector';

function readCookie(name: string): string | null {
  const cur = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}

type ReqRow = {
  request_id: string;
  period_id: string;
  framework: FrameworkId;
  control_id: string;
  asset_id: string | null;
  owner_id: string | null;
  status: 'open' | 'submitted' | 'accepted' | 'rejected' | 'cancelled';
  due_at: string | null;
  notes: string | null;
  created_at: string;
};

export default function EvidenceRequestsPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [framework, setFramework] = useState<FrameworkName>('iso27001');
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('open');
  const [items, setItems] = useState<ReqRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [controlId, setControlId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');

  async function refresh() {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ periodId, ...(status ? { status } : {}) });
      const res = await fetch(`/api/evidence-requests?${qs.toString()}`, { credentials: 'include', headers: { 'x-tenant-id': tenantId } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to load requests (${res.status})`);
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId, status]);

  async function create() {
    if (!periodId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        periodId,
        framework,
        controlId: controlId.trim(),
        assetId: assetId.trim() || undefined,
        ownerId: ownerId.trim() || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      };
      const res = await fetch('/api/evidence-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to create request (${res.status})`);
      setControlId('');
      setAssetId('');
      setOwnerId('');
      setDueAt('');
      setNotes('');
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to create request.');
    } finally {
      setLoading(false);
    }
  }

  async function setRequestStatus(requestId: string, next: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evidence-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to update request (${res.status})`);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to update request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <div className="text-2xl font-semibold text-gray-900">Evidence requests</div>
        <div className="mt-1 text-sm text-gray-600">Track and manage evidence requests for a specific audit period.</div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Framework</div>
            <div className="mt-2">
              <FrameworkSelector selected={framework} onChange={setFramework} />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Audit period</div>
            <div className="mt-2">
              <AuditPeriodSelector framework={framework as any} value={periodId} onChange={setPeriodId} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-xs text-gray-600">
            Status
            <select className="ml-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">open</option>
              <option value="submitted">submitted</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm disabled:opacity-60" onClick={refresh} disabled={!periodId}>
            Refresh
          </button>
          <a className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm" href="/compliance">
            Back to compliance
          </a>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-900">Create request</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={controlId} onChange={(e) => setControlId(e.target.value)} placeholder="Control ID (e.g. A.8.15 or CC6.1)" />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={assetId} onChange={(e) => setAssetId(e.target.value)} placeholder="Asset (optional)" />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="Owner (optional)" />
          <input type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
        </div>
        <div className="mt-3">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={create} disabled={loading || !periodId || !controlId.trim()}>
            Create request
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="text-base font-semibold text-gray-900">Requests</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-5 py-3">Control</th>
                <th className="px-5 py-3">Asset</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.request_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-semibold">{r.control_id}</div>
                    <div className="text-xs font-mono text-gray-500">{r.request_id}</div>
                  </td>
                  <td className="px-5 py-3">{r.asset_id || '-'}</td>
                  <td className="px-5 py-3">{r.owner_id || '-'}</td>
                  <td className="px-5 py-3">{r.status}</td>
                  <td className="px-5 py-3">{r.due_at ? String(r.due_at).slice(0, 10) : '-'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <a className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm" href={`/compliance?framework=${encodeURIComponent(r.framework)}&periodId=${encodeURIComponent(r.period_id)}&controlId=${encodeURIComponent(r.control_id)}`}>
                        Open control
                      </a>
                      <select className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm" value={r.status} onChange={(e) => setRequestStatus(r.request_id, e.target.value)}>
                        <option value="open">open</option>
                        <option value="submitted">submitted</option>
                        <option value="accepted">accepted</option>
                        <option value="rejected">rejected</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr><td className="px-5 py-6 text-gray-600" colSpan={6}>{periodId ? 'No requests found.' : 'Select a period to view requests.'}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

