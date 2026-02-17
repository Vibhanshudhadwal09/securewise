'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

function readCookie(name: string): string | null {
  const cur = document.cookie
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

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
  return json;
}

export default function PolicyAttestPage() {
  const params = useParams() as any;
  const policyId = String(params?.id || '');
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [published, setPublished] = useState<any>(null);

  const [form, setForm] = useState<any>({
    user_email: '',
    user_name: '',
    user_department: '',
    notes: '',
    confirm: false,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJson(`/api/policies/${encodeURIComponent(policyId)}`, tenantId);
      setPolicy(j?.policy || null);
      const versions = Array.isArray(j?.versions) ? j.versions : [];
      const pub = versions.find((v: any) => String(v.status || '') === 'published') || null;
      setPublished(pub);
    } catch (e) {
      console.error('Failed to load policy for attestation:', e);
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!policyId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId, tenantId]);

  async function submit() {
    if (!form.confirm) {
      alert('Please confirm you have read and understood this policy.');
      return;
    }
    if (!String(form.user_email || '').trim()) {
      alert('Email is required.');
      return;
    }
    try {
      const res = await fetch(`/api/policies/${encodeURIComponent(policyId)}/attest`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          user_email: String(form.user_email || '').trim(),
          user_name: String(form.user_name || '').trim() || undefined,
          user_department: String(form.user_department || '').trim() || undefined,
          notes: String(form.notes || '').trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      alert('Attestation recorded.');
      window.location.href = `/policies/${encodeURIComponent(policyId)}`;
    } catch (e) {
      console.error('Failed to attest:', e);
      alert(e instanceof Error ? e.message : 'Failed to attest');
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Policy attestation</h1>
        <p className="text-sm text-gray-600">
          <a className="text-blue-700 underline" href={`/policies/${encodeURIComponent(policyId)}`}>
            ← Back to policy
          </a>
        </p>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {loading ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">Loading…</div>
      ) : !policy ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">Policy not found.</div>
      ) : !published ? (
        <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-900 shadow-sm">
          This policy has no published version yet. Ask an admin to publish a version first.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">{String(policy.title || '')}</div>
            <div className="mt-1 text-sm text-gray-700">Version: <span className="font-mono">{String(published.version_number || '')}</span></div>
            {published.document_url ? (
              <div className="mt-2 text-sm">
                Document:{" "}
                <a className="text-blue-700 underline" href={String(published.document_url)} target="_blank" rel="noreferrer">
                  open
                </a>
              </div>
            ) : null}
          </div>

          {published.document_content ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Policy content</div>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">{String(published.document_content)}</pre>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">Your attestation</div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-700">Email *</label>
                <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.user_email} onChange={(e) => setForm((p: any) => ({ ...p, user_email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Name</label>
                <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.user_name} onChange={(e) => setForm((p: any) => ({ ...p, user_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Department</label>
                <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.user_department} onChange={(e) => setForm((p: any) => ({ ...p, user_department: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Notes (optional)</label>
                <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm((p: any) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={Boolean(form.confirm)} onChange={(e) => setForm((p: any) => ({ ...p, confirm: e.target.checked }))} />
              I have read and understood this policy.
            </label>

            <div className="mt-4 flex justify-end">
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={submit}>
                Attest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

