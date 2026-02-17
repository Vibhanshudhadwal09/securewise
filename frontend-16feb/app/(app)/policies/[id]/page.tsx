'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { SubmitForApprovalButton } from '../../../../components/common/SubmitForApprovalButton';

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

function fmtDate(d: any) {
  if (!d) return '-';
  return String(d).slice(0, 10);
}

function pill(color: string, text: string) {
  return <span className={`rounded-full border px-2 py-1 text-xs ${color}`}>{text}</span>;
}

function vStatus(status: string) {
  const s = String(status || 'draft');
  if (s === 'published') return pill('border-green-200 bg-green-50 text-green-800', s);
  if (s === 'approved') return pill('border-blue-200 bg-blue-50 text-blue-800', s);
  if (s === 'in_review') return pill('border-yellow-200 bg-yellow-50 text-yellow-800', 'in review');
  if (s === 'superseded') return pill('border-gray-200 bg-gray-50 text-gray-700', s);
  return pill('border-gray-200 bg-white text-gray-800', s);
}

export default function PolicyDetailPage() {
  const params = useParams() as any;
  const policyId = String(params?.id || '');
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [newVersion, setNewVersion] = useState<any>({ version_number: '', document_url: '', change_summary: '', document_content: '' });

  const [linkControl, setLinkControl] = useState<any>({ control_id: '', mapping_notes: '' });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJson(`/api/policies/${encodeURIComponent(policyId)}`, tenantId);
      setData(j);
    } catch (e) {
      console.error('Failed to load policy:', e);
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

  async function createVersion() {
    setBusy(true);
    try {
      const payload: any = {
        version_number: String(newVersion.version_number || '').trim(),
        document_url: String(newVersion.document_url || '').trim() || undefined,
        change_summary: String(newVersion.change_summary || '').trim() || undefined,
        document_content: String(newVersion.document_content || '').trim() || undefined,
      };
      if (!payload.version_number) throw new Error('Version number is required');

      const res = await fetch(`/api/policies/${encodeURIComponent(policyId)}/versions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));

      setNewVersionOpen(false);
      setNewVersion({ version_number: '', document_url: '', change_summary: '', document_content: '' });
      await load();
    } catch (e) {
      console.error('Failed to create version:', e);
      alert(e instanceof Error ? e.message : 'Failed to create version');
    } finally {
      setBusy(false);
    }
  }

  async function publishVersion(versionId: string) {
    if (!confirm('Publish this version? It will become the current published policy.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/policies/${encodeURIComponent(policyId)}/versions/${encodeURIComponent(versionId)}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      await load();
    } catch (e) {
      console.error('Failed to publish version:', e);
      alert(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setBusy(false);
    }
  }

  async function linkControlToPolicy() {
    setBusy(true);
    try {
      const payload: any = {
        control_id: String(linkControl.control_id || '').trim(),
        mapping_notes: String(linkControl.mapping_notes || '').trim() || undefined,
      };
      if (!payload.control_id) throw new Error('Control ID is required');

      const res = await fetch(`/api/policies/${encodeURIComponent(policyId)}/controls`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));

      setLinkControl({ control_id: '', mapping_notes: '' });
      await load();
    } catch (e) {
      console.error('Failed to link control:', e);
      alert(e instanceof Error ? e.message : 'Failed to link control');
    } finally {
      setBusy(false);
    }
  }

  const policy = data?.policy;
  const versions = Array.isArray(data?.versions) ? data.versions : [];
  const mappings = Array.isArray(data?.control_mappings) ? data.control_mappings : [];
  const stats = data?.attestation_stats || { total: 0, unique_users: 0 };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Policy</h1>
          <p className="text-sm text-gray-600">
            <a className="text-blue-700 underline" href="/policies">
              ← Back to policies
            </a>
          </p>
        </div>
        {policy ? (
          <div className="flex flex-wrap gap-2">
            <SubmitForApprovalButton
              entityType="policy"
              entityId={String(policy.id)}
              entityTitle={String(policy.title || 'Policy')}
              entityDescription={String(policy.description || '')}
              tenantId={tenantId}
            />
            <a className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium" href={`/policies/${encodeURIComponent(String(policy.id))}/attest`}>
              Attest
            </a>
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => setNewVersionOpen(true)}>
              New version
            </button>
          </div>
        ) : null}
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {loading ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">Loading…</div>
      ) : !policy ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">Policy not found.</div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">{String(policy.title || '')}</div>
            {policy.description ? <div className="mt-1 text-sm text-gray-700">{String(policy.description)}</div> : null}
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4 text-sm">
              <div>
                <div className="text-xs text-gray-600">Policy #</div>
                <div className="font-mono text-xs">{String(policy.policy_number || '-')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Category</div>
                <div>{String(policy.category || 'other')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Owner</div>
                <div>{String(policy.owner || '-')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Status</div>
                <div>{String(policy.status || 'draft')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Effective</div>
                <div>{fmtDate(policy.effective_date)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Next review</div>
                <div>{fmtDate(policy.next_review_date)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Review frequency</div>
                <div>{String(policy.review_frequency_days || 365)} days</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Attestations</div>
                <div>
                  {Number(stats.unique_users || 0)} users ({Number(stats.total || 0)} total)
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-x-auto">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Versions</div>
              </div>
              <table className="mt-3 min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-4 py-2">Version</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!versions.length ? (
                    <tr>
                      <td className="px-4 py-3 text-gray-600" colSpan={4}>
                        No versions yet.
                      </td>
                    </tr>
                  ) : (
                    versions.map((v: any) => (
                      <tr key={String(v.id)} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs">{String(v.version_number || '')}</td>
                        <td className="px-4 py-2">{vStatus(String(v.status || 'draft'))}</td>
                        <td className="px-4 py-2 text-xs text-gray-600">{String(v.created_at || '').replace('T', ' ').replace('Z', '')}</td>
                        <td className="px-4 py-2">
                          {String(v.status || '') !== 'published' ? (
                            <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs disabled:opacity-60" disabled={busy} onClick={() => publishVersion(String(v.id))}>
                              Publish
                            </button>
                          ) : (
                            <span className="text-xs text-gray-600">Current</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {versions[0]?.document_url ? (
                <div className="mt-3 text-xs">
                  Latest doc:{" "}
                  <a className="text-blue-700 underline" href={String(versions[0].document_url)} target="_blank" rel="noreferrer">
                    open
                  </a>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Linked controls</div>
              <div className="mt-3 space-y-2">
                {!mappings.length ? <div className="text-sm text-gray-600">No linked controls.</div> : null}
                {mappings.map((m: any) => (
                  <div key={String(m.id)} className="rounded-lg border border-gray-200 p-3">
                    <div className="font-mono text-xs text-gray-900">{String(m.control_id || '')}</div>
                    {m.mapping_notes ? <div className="mt-1 text-xs text-gray-600">{String(m.mapping_notes)}</div> : null}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-gray-200 p-3">
                <div className="text-sm font-semibold text-gray-900">Link control</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" placeholder="Control ID (e.g. A.5.12)" value={linkControl.control_id} onChange={(e) => setLinkControl((p: any) => ({ ...p, control_id: e.target.value }))} />
                  <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Notes (optional)" value={linkControl.mapping_notes} onChange={(e) => setLinkControl((p: any) => ({ ...p, mapping_notes: e.target.value }))} />
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={linkControlToPolicy}>
                    Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {newVersionOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 p-4">
                  <div className="text-sm font-semibold text-gray-900">Create new version</div>
                  <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" onClick={() => setNewVersionOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Version *</label>
                      <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" value={newVersion.version_number} onChange={(e) => setNewVersion((p: any) => ({ ...p, version_number: e.target.value }))} placeholder="1.0" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Document URL (optional)</label>
                      <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={newVersion.document_url} onChange={(e) => setNewVersion((p: any) => ({ ...p, document_url: e.target.value }))} placeholder="https://..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Change summary</label>
                    <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={newVersion.change_summary} onChange={(e) => setNewVersion((p: any) => ({ ...p, change_summary: e.target.value }))} placeholder="What changed?" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Document content (optional)</label>
                    <textarea className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm" rows={8} value={newVersion.document_content} onChange={(e) => setNewVersion((p: any) => ({ ...p, document_content: e.target.value }))} placeholder="Paste policy text here..." />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4">
                  <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium" onClick={() => setNewVersionOpen(false)}>
                    Cancel
                  </button>
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={createVersion}>
                    Create
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

