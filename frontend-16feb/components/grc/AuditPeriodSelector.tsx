'use client';

import React, { useEffect, useMemo, useState } from 'react';

export type FrameworkId = 'iso27001' | 'soc2';

export type AuditPeriod = {
  period_id: string;
  framework: FrameworkId;
  name: string;
  starts_at: string;
  ends_at: string;
  status: 'planned' | 'active' | 'closed';
};

function readCookie(name: string): string | null {
  const cur = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function AuditPeriodSelector(props: {
  framework: FrameworkId;
  value: string | null;
  onChange: (periodId: string | null) => void;
}) {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [items, setItems] = useState<AuditPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit-periods?framework=${encodeURIComponent(props.framework)}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to load periods (${res.status})`);
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load audit periods.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.framework]);

  async function create() {
    setError(null);
    try {
      const payload = {
        framework: props.framework,
        name: name.trim(),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        status: 'active',
      };
      const res = await fetch('/api/audit-periods', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to create period (${res.status})`);
      setCreateOpen(false);
      setName('');
      setStartsAt('');
      setEndsAt('');
      await refresh();
      props.onChange(String(json.period_id));
    } catch (e: any) {
      setError(e?.message || 'Failed to create audit period.');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          value={props.value || ''}
          onChange={(e) => props.onChange(e.target.value || null)}
          aria-label="Audit period selector"
          disabled={loading}
        >
          <option value="">{loading ? 'Loading periods…' : 'Select audit period'}</option>
          {items.map((p) => (
            <option key={p.period_id} value={p.period_id}>
              {p.name} ({p.status})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
          onClick={() => refresh()}
        >
          Refresh
        </button>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
          onClick={() => setCreateOpen((v) => !v)}
        >
          New period
        </button>
      </div>

      {createOpen ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Name</label>
              <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Starts</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Ends</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={create}
              disabled={!name.trim() || !startsAt || !endsAt}
            >
              Create
            </button>
            <button type="button" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div className="text-sm text-red-700">{error}</div> : null}
    </div>
  );
}

