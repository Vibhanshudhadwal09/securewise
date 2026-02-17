'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { FrameworkId } from './AuditPeriodSelector';

export type WorkbenchControlRow = {
  control_id: string;
  title: string;
  enforceability: string;
  applicability: { status: 'in_scope' | 'not_applicable'; rationale: string | null };
  ownership: { owner_id: string | null; approver_id: string | null; review_frequency_days: number };
  evidence: { status: 'submitted' | 'missing'; evidence_id: string | null; captured_at: string | null; asset_id: string | null; request_id: string | null };
  review: { status: 'accepted' | 'rejected' | 'pending' | 'missing'; decision: string | null; comment: string | null; created_at: string | null };
  test: { status: 'pass' | 'fail' | 'needs_review' | 'untested'; run_id: string | null; executed_at: string | null };
};

function readCookie(name: string): string | null {
  const cur = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function ControlWorkbenchDrawer(props: {
  open: boolean;
  onClose: () => void;
  framework: FrameworkId;
  periodId: string;
  control: WorkbenchControlRow | null;
  onUpdated?: () => void; // refresh parent table
}) {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const controlId = props.control?.control_id || '';

  const [tab, setTab] = useState<'status' | 'evidence' | 'tests'>('status');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Applicability
  const [appStatus, setAppStatus] = useState<'in_scope' | 'not_applicable'>('in_scope');
  const [rationale, setRationale] = useState('');

  // Ownership
  const [ownerId, setOwnerId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [reviewFreqDays, setReviewFreqDays] = useState<number>(90);

  // Evidence
  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [evidenceType, setEvidenceType] = useState<'config_snapshot' | 'scan_result' | 'log'>('log');
  const [evidenceSource, setEvidenceSource] = useState('manual');
  const [evidenceAssetId, setEvidenceAssetId] = useState('');
  const [evidenceArtifactJson, setEvidenceArtifactJson] = useState('{"summary":"Evidence uploaded from control workbench"}');
  const [evidenceExpirationDate, setEvidenceExpirationDate] = useState<string>('');
  const [reviewDecision, setReviewDecision] = useState<'accepted' | 'rejected'>('accepted');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewEvidenceId, setReviewEvidenceId] = useState<string>('');

  // Tests
  const [tests, setTests] = useState<any[]>([]);
  const [newTestName, setNewTestName] = useState('');
  const [newTestDesc, setNewTestDesc] = useState('');
  const [runStatus, setRunStatus] = useState<'pass' | 'fail' | 'needs_review'>('pass');
  const [runNotes, setRunNotes] = useState('');
  const [runTestId, setRunTestId] = useState('');
  const [linkRunId, setLinkRunId] = useState('');
  const [linkEvidenceId, setLinkEvidenceId] = useState('');

  useEffect(() => {
    if (!props.open || !props.control) return;
    setError(null);
    setTab('status');
    setAppStatus(props.control.applicability.status);
    setRationale(props.control.applicability.rationale || '');
    setOwnerId(props.control.ownership.owner_id || '');
    setApproverId(props.control.ownership.approver_id || '');
    setReviewFreqDays(props.control.ownership.review_frequency_days || 90);
    setEvidenceAssetId(props.control.evidence.asset_id || '');
    setReviewEvidenceId(props.control.evidence.evidence_id || '');
    setEvidenceExpirationDate('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, controlId]);

  async function fetchEvidence() {
    setError(null);
    const url = `/api/evidence/by-control?framework=${encodeURIComponent(props.framework)}&periodId=${encodeURIComponent(props.periodId)}&controlId=${encodeURIComponent(controlId)}&limit=50`;
    const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Failed to load evidence (${res.status})`);
    const items = Array.isArray(json?.items) ? json.items : [];
    setEvidenceItems(items);
    if (!reviewEvidenceId && items[0]?.evidence_id) setReviewEvidenceId(String(items[0].evidence_id));
  }

  async function fetchTests() {
    setError(null);
    const url = `/api/control-tests?framework=${encodeURIComponent(props.framework)}&controlId=${encodeURIComponent(controlId)}`;
    const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Failed to load tests (${res.status})`);
    const items = Array.isArray(json?.items) ? json.items : [];
    setTests(items);
    if (!runTestId && items[0]?.test_id) setRunTestId(String(items[0].test_id));
  }

  useEffect(() => {
    if (!props.open || !props.control) return;
    if (tab === 'evidence') fetchEvidence().catch((e) => setError(String((e as any)?.message || e)));
    if (tab === 'tests') fetchTests().catch((e) => setError(String((e as any)?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, props.open, controlId]);

  async function postJson(path: string, body: any) {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || json?.message || `Request failed (${res.status})`);
    return json;
  }

  async function patchJson(path: string, body: any) {
    const res = await fetch(path, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || json?.message || `Request failed (${res.status})`);
    return json;
  }

  async function saveStatus() {
    setBusy(true);
    setError(null);
    try {
      await postJson('/api/control-applicability/set', {
        framework: props.framework,
        periodId: props.periodId,
        controlId,
        status: appStatus,
        rationale: rationale || undefined,
      });
      await postJson('/api/control-ownership/upsert', {
        framework: props.framework,
        controlId,
        ownerId: ownerId || undefined,
        approverId: approverId || undefined,
        reviewFrequencyDays: Number(reviewFreqDays || 90),
      });
      props.onUpdated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to save.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadEvidence() {
    setBusy(true);
    setError(null);
    try {
      let artifact: any = {};
      try { artifact = JSON.parse(evidenceArtifactJson || '{}'); } catch { artifact = { raw: evidenceArtifactJson }; }
      await postJson('/api/evidence', {
        framework: props.framework,
        periodId: props.periodId,
        requestId: props.control?.evidence?.request_id || undefined,
        controlId,
        assetId: evidenceAssetId || 'risk_register',
        type: evidenceType,
        source: evidenceSource || 'manual',
        artifact,
        provenance: { summary: artifact?.summary || 'Evidence upload' },
        expirationDate: evidenceExpirationDate || undefined,
      });
      await fetchEvidence();
      props.onUpdated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to upload evidence.');
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    setBusy(true);
    setError(null);
    try {
      const evidenceId = reviewEvidenceId || props.control?.evidence?.evidence_id;
      if (!evidenceId) throw new Error('No evidence selected for review.');
      await postJson('/api/evidence-reviews', {
        evidenceId,
        periodId: props.periodId,
        decision: reviewDecision,
        comment: reviewComment || undefined,
      });
      await fetchEvidence();
      props.onUpdated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to submit review.');
    } finally {
      setBusy(false);
    }
  }

  async function createTest() {
    setBusy(true);
    setError(null);
    try {
      await postJson('/api/control-tests', { framework: props.framework, controlId, name: newTestName, description: newTestDesc || undefined });
      setNewTestName('');
      setNewTestDesc('');
      await fetchTests();
      props.onUpdated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to create test.');
    } finally {
      setBusy(false);
    }
  }

  async function createRun() {
    setBusy(true);
    setError(null);
    try {
      if (!runTestId) throw new Error('Select a test first.');
      const out = await postJson('/api/control-test-runs', { testId: runTestId, periodId: props.periodId, status: runStatus, notes: runNotes || undefined });
      setRunNotes('');
      setLinkRunId(String(out.run_id || ''));
      props.onUpdated?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to create test run.');
    } finally {
      setBusy(false);
    }
  }

  async function linkEvidence() {
    setBusy(true);
    setError(null);
    try {
      if (!linkRunId) throw new Error('Run ID is required.');
      if (!linkEvidenceId) throw new Error('Evidence ID is required.');
      await postJson(`/api/control-test-runs/${encodeURIComponent(linkRunId)}/link-evidence`, { evidenceId: linkEvidenceId });
    } catch (e: any) {
      setError(e?.message || 'Failed to link evidence.');
    } finally {
      setBusy(false);
    }
  }

  if (!props.open || !props.control) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={props.onClose} aria-hidden />
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <div className="text-sm text-gray-600">{props.framework.toUpperCase()} · {props.control.control_id}</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{props.control.title}</div>
            <div className="mt-1 text-sm text-gray-600">Enforceability: {props.control.enforceability}</div>
          </div>
          <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" onClick={props.onClose}>Close</button>
        </div>

        <div className="flex gap-2 border-b border-gray-100 p-4">
          {(['status', 'evidence', 'tests'] as const).map((k) => (
            <button
              key={k}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === k ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setTab(k)}
            >
              {k === 'status' ? 'Status' : k === 'evidence' ? 'Evidence' : 'Tests'}
            </button>
          ))}
        </div>

        {error ? <div className="px-5 pt-4 text-sm text-red-700">{error}</div> : null}

        {tab === 'status' ? (
          <div className="p-5">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Applicability</div>
              <div className="mt-2 flex gap-2">
                <button className={`rounded-lg px-3 py-2 text-sm ${appStatus === 'in_scope' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`} onClick={() => setAppStatus('in_scope')}>In scope</button>
                <button className={`rounded-lg px-3 py-2 text-sm ${appStatus === 'not_applicable' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`} onClick={() => setAppStatus('not_applicable')}>Not applicable</button>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium text-gray-700">Rationale (required for Not applicable)</label>
                <textarea className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm" rows={3} value={rationale} onChange={(e) => setRationale(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Ownership</div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Owner</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="user@company.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Approver</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={approverId} onChange={(e) => setApproverId(e.target.value)} placeholder="user@company.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Review frequency (days)</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={reviewFreqDays} onChange={(e) => setReviewFreqDays(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={saveStatus} disabled={busy || (appStatus === 'not_applicable' && !rationale.trim())}>
                Save
              </button>
            </div>
          </div>
        ) : null}

        {tab === 'evidence' ? (
          <div className="p-5">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Evidence (period-bound)</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Captured</th>
                      <th className="px-3 py-2">Asset</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Expiration</th>
                      <th className="px-3 py-2">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {evidenceItems.map((e) => (
                      <tr key={e.evidence_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-xs">{String(e.captured_at || '')}</td>
                        <td className="px-3 py-2">{String(e.asset_id || '')}</td>
                        <td className="px-3 py-2">{String(e.type || '')}</td>
                        <td className="px-3 py-2">
                          {e?.expiration_date ? (
                            <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs text-yellow-800">
                              {String(e.expiration_date).slice(0, 10)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{e.review?.decision ? String(e.review.decision) : 'pending'}</td>
                      </tr>
                    ))}
                    {!evidenceItems.length ? (
                      <tr><td className="px-3 py-3 text-gray-600" colSpan={5}>No evidence for this control in the selected period.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Upload evidence</div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Asset</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={evidenceAssetId} onChange={(e) => setEvidenceAssetId(e.target.value)} placeholder="endpoints/..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Type</label>
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as any)}>
                    <option value="log">log</option>
                    <option value="config_snapshot">config_snapshot</option>
                    <option value="scan_result">scan_result</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Source</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={evidenceSource} onChange={(e) => setEvidenceSource(e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium text-gray-700">Expiration Date (optional)</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={evidenceExpirationDate}
                  onChange={(e) => setEvidenceExpirationDate(e.target.value)}
                />
                <div className="mt-1 text-xs text-gray-500">When does this evidence expire? Leave blank if it doesn't expire.</div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium text-gray-700">Artifact (JSON)</label>
                <textarea className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono text-xs" rows={6} value={evidenceArtifactJson} onChange={(e) => setEvidenceArtifactJson(e.target.value)} />
              </div>
              <div className="mt-3">
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={uploadEvidence} disabled={busy}>
                  Upload
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Review latest evidence</div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Evidence</label>
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={reviewEvidenceId} onChange={(e) => setReviewEvidenceId(e.target.value)}>
                    <option value="">Select evidence</option>
                    {evidenceItems.map((e) => (
                      <option key={e.evidence_id} value={e.evidence_id}>{String(e.evidence_id).slice(0, 8)}…</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Decision</label>
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={reviewDecision} onChange={(e) => setReviewDecision(e.target.value as any)}>
                    <option value="accepted">accepted</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Comment</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="optional" />
                </div>
              </div>
              <div className="mt-3">
                <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={submitReview} disabled={busy || !reviewEvidenceId}>
                  Submit review
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'tests' ? (
          <div className="p-5">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Tests</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Test</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tests.map((t) => (
                      <tr key={t.test_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{t.name}</div>
                          <div className="text-xs text-gray-600">{t.description || ''}</div>
                          <div className="text-xs font-mono text-gray-500">{t.test_id}</div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{String(t.created_at || '')}</td>
                      </tr>
                    ))}
                    {!tests.length ? <tr><td className="px-3 py-3 text-gray-600" colSpan={2}>No tests defined for this control.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Create test</div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Name</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Description</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={newTestDesc} onChange={(e) => setNewTestDesc(e.target.value)} />
                </div>
              </div>
              <div className="mt-3">
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={createTest} disabled={busy || !newTestName.trim()}>
                  Create test
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Create test run</div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Test</label>
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={runTestId} onChange={(e) => setRunTestId(e.target.value)}>
                    <option value="">Select test</option>
                    {tests.map((t) => (
                      <option key={t.test_id} value={t.test_id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Status</label>
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={runStatus} onChange={(e) => setRunStatus(e.target.value as any)}>
                    <option value="pass">pass</option>
                    <option value="fail">fail</option>
                    <option value="needs_review">needs_review</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Notes</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={runNotes} onChange={(e) => setRunNotes(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={createRun} disabled={busy || !runTestId}>
                  Create run
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Link evidence to run</div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Run ID</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" value={linkRunId} onChange={(e) => setLinkRunId(e.target.value)} placeholder="run uuid" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Evidence ID</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" value={linkEvidenceId} onChange={(e) => setLinkEvidenceId(e.target.value)} placeholder="evidence uuid" />
                </div>
              </div>
              <div className="mt-3">
                <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60" onClick={linkEvidence} disabled={busy}>
                  Link
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

