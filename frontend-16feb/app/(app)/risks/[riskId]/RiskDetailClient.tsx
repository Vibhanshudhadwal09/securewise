'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Edit, Link2, Trash2 } from 'lucide-react';
import { LinkedControlsSection } from '../../../../components/RiskControlMappings';
import { RiskForm, type RiskFormValue } from '../../../../components/RiskForm';
import { SubmitForApprovalButton } from '../../../../components/common/SubmitForApprovalButton';

function score(i?: number | null, l?: number | null) {
  const ii = Number(i || 0);
  const ll = Number(l || 0);
  if (!ii || !ll) return 0;
  return ii * ll;
}

function level(s: number): 'low' | 'medium' | 'high' | 'critical' {
  if (s >= 16) return 'critical';
  if (s >= 10) return 'high';
  if (s >= 5) return 'medium';
  return 'low';
}

function badge(lvl: ReturnType<typeof level>) {
  if (lvl === 'critical') return 'risk-critical';
  if (lvl === 'high') return 'risk-high';
  if (lvl === 'medium') return 'risk-medium';
  return 'risk-low';
}

function statusUi(s: string): 'open' | 'in_progress' | 'closed' | 'accepted' | 'mitigated' {
  const v = String(s || '').toLowerCase();
  if (v === 'accepted') return 'accepted';
  if (v === 'closed') return 'closed';
  if (v === 'mitigated') return 'mitigated';
  if (v === 'transferred' || v === 'in_progress') return 'in_progress';
  return 'open';
}

export function RiskDetailClient(props: { riskId: string; tenantId: string }) {
  const router = useRouter();
  const [risk, setRisk] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'assessment' | 'controls' | 'assets' | 'treatment'>('overview');
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/risks/${encodeURIComponent(props.riskId)}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': props.tenantId },
        cache: 'no-store',
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
      setRisk(j);
    } catch (e: any) {
      setError(String(e?.message || 'Failed to load risk'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.tenantId, props.riskId]);

  const inherentScore = useMemo(() => score(risk?.inherent_impact, risk?.inherent_likelihood), [risk]);
  const residualScore = useMemo(() => score(risk?.residual_impact, risk?.residual_likelihood) || inherentScore, [risk, inherentScore]);
  const reductionPct = useMemo(() => {
    if (!inherentScore) return 0;
    return Math.round(((inherentScore - residualScore) / inherentScore) * 100);
  }, [inherentScore, residualScore]);

  async function exportOne() {
    router.push('/risks');
  }

  async function del() {
    if (!confirm('Delete this risk? This cannot be undone.')) return;
    const res = await fetch(`/api/risks/${encodeURIComponent(props.riskId)}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'x-tenant-id': props.tenantId },
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
    router.push('/risks');
  }

  async function submitEdit(v: RiskFormValue) {
    const payload: any = {
      title: v.title,
      description: v.description,
      category: v.category,
      status: v.status,
      inherentImpact: v.inherentImpact,
      inherentLikelihood: v.inherentLikelihood,
      residualImpact: v.residualImpact || undefined,
      residualLikelihood: v.residualLikelihood || undefined,
      owner: v.owner,
      strategy: v.strategy,
      treatmentPlan: v.treatmentPlan || undefined,
      targetDate: v.targetDate || undefined,
      affectedAssets: v.affectedAssets || undefined,
    };
    const res = await fetch(`/api/risks/${encodeURIComponent(props.riskId)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': props.tenantId },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
    setEditOpen(false);
    await load();
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <style>{`
        .risk-score { display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px; font-weight:600; font-size:12px; }
        .risk-low { background:#d4edda; color:#155724; }
        .risk-medium { background:#fff3cd; color:#856404; }
        .risk-high { background:#ffe8cc; color:#7a3e00; }
        .risk-critical { background:#721c24; color:#fff; }
      `}</style>

      <div className="flex items-start justify-between gap-4">
        <div>
          <a href="/risks" className="text-sm font-semibold text-gray-700 hover:underline">← Back to Risk Register</a>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{risk?.title || 'Risk'}</h1>
            {risk ? <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold">{statusUi(risk.status)}</span> : null}
            {risk ? <span className={`risk-score ${badge(level(residualScore))}`}>{residualScore}</span> : null}
          </div>
          {risk?.description ? <p className="mt-2 max-w-4xl text-sm text-gray-600">{risk.description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {risk ? (
            <SubmitForApprovalButton
              entityType="risk"
              entityId={String(risk.id)}
              entityTitle={String(risk.title || 'Risk')}
              entityDescription={String(risk.description || '')}
              tenantId={props.tenantId}
              onSubmit={() => load()}
            />
          ) : null}
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" /> Edit
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold" onClick={exportOne}>
            <Download className="h-4 w-4" /> Export
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" onClick={() => del().catch((e) => alert(String((e as any)?.message || 'Failed to delete')))}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {loading ? <div className="mt-6 text-sm text-gray-600">Loading…</div> : null}
      {!loading && !risk ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">Risk not found.</div>
      ) : null}

      {risk ? (
        <>
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-gray-600">Category</div>
                <div className="mt-1 text-sm font-semibold">{risk.category || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Owner</div>
                <div className="mt-1 text-sm font-semibold">{risk.risk_owner || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Inherent → Residual</div>
                <div className="mt-1 text-sm font-semibold">
                  {inherentScore} → {residualScore} <span className="text-xs font-normal text-gray-600">({reductionPct}% reduction)</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Last Updated</div>
                <div className="mt-1 text-sm font-semibold">{risk.updated_at ? String(risk.updated_at).slice(0, 10) : '-'}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(['overview','assessment','controls','assets','treatment'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === k ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-800'}`}
              >
                {k}
              </button>
            ))}
          </div>

          {tab === 'overview' ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-gray-600">Treatment</div>
                  <div className="mt-1 text-sm font-semibold">{risk.treatment_strategy || '-'}</div>
                  {risk.treatment_plan ? <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{risk.treatment_plan}</div> : <div className="mt-2 text-sm text-gray-500">No treatment plan set.</div>}
                </div>
                <div>
                  <div className="text-xs text-gray-600">Target Date</div>
                  <div className="mt-1 text-sm font-semibold">{risk.target_date ? String(risk.target_date).slice(0, 10) : '-'}</div>
                  <div className="mt-4 text-xs text-gray-600">Linked Controls</div>
                  <div className="mt-1 text-sm font-semibold">{Array.isArray(risk.controls) ? risk.controls.length : 0}</div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'assessment' ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Inherent Likelihood</div>
                  <div className="mt-1 text-xl font-semibold">{risk.inherent_likelihood || '-'}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Inherent Impact</div>
                  <div className="mt-1 text-xl font-semibold">{risk.inherent_impact || '-'}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-xs text-gray-600">Inherent Score</div>
                  <div className="mt-1 text-xl font-semibold">{inherentScore}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {Array.from({ length: 25 }).map((_, idx) => {
                  const impact = 5 - Math.floor(idx / 5);
                  const likelihood = (idx % 5) + 1;
                  const s = impact * likelihood;
                  const isHere = Number(risk.residual_impact || risk.inherent_impact) === impact && Number(risk.residual_likelihood || risk.inherent_likelihood) === likelihood;
                  const bg = s >= 16 ? 'bg-red-100 border-red-200' : s >= 10 ? 'bg-orange-100 border-orange-200' : s >= 5 ? 'bg-yellow-100 border-yellow-200' : 'bg-green-100 border-green-200';
                  return (
                    <div key={`${impact}-${likelihood}`} className={`min-h-[56px] rounded-lg border p-2 ${bg} ${isHere ? 'ring-2 ring-blue-500' : ''}`}>
                      <div className="text-[11px] text-gray-700">I{impact}×L{likelihood}</div>
                      <div className="mt-1 text-xs text-gray-700">{s}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-gray-600">Highlighted cell is this risk’s residual position (or inherent if residual isn’t set).</div>
            </div>
          ) : null}

          {tab === 'controls' ? (
            <div className="mt-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold">Linked Controls</div>
                    <div className="mt-1 text-sm text-gray-600">Controls that mitigate/monitor/detect/prevent this risk.</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold">
                    <Link2 className="h-4 w-4" /> Manage
                  </div>
                </div>
              </div>
              <LinkedControlsSection tenantId={props.tenantId} riskId={String(risk.risk_id)} />
            </div>
          ) : null}

          {tab === 'assets' ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-base font-semibold">Affected Assets</div>
              <div className="mt-2 text-sm text-gray-700">
                {Array.isArray(risk.affected_assets) && risk.affected_assets.length ? (
                  <ul className="list-disc pl-5">
                    {risk.affected_assets.map((a: any) => <li key={String(a)} className="font-mono text-xs">{String(a)}</li>)}
                  </ul>
                ) : (
                  <span className="text-gray-500">No assets listed.</span>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'treatment' ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-base font-semibold">Treatment Plan</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{risk.treatment_plan || 'No treatment plan set.'}</div>
              <div className="mt-4 text-xs text-gray-600">Target date: {risk.target_date ? String(risk.target_date).slice(0, 10) : '-'}</div>
            </div>
          ) : null}
        </>
      ) : null}

      {editOpen && risk ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Edit Risk</div>
                <div className="text-xs text-gray-600">Required fields are marked with *</div>
              </div>
              <button type="button" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold" onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>
            <div className="px-6 py-5">
              <RiskForm
                mode="edit"
                initial={{
                  title: risk.title || '',
                  description: risk.description || '',
                  category: risk.category || 'security',
                  status: statusUi(risk.status) as any,
                  inherentImpact: Number(risk.inherent_impact || 3),
                  inherentLikelihood: Number(risk.inherent_likelihood || 3),
                  residualImpact: risk.residual_impact ?? null,
                  residualLikelihood: risk.residual_likelihood ?? null,
                  owner: risk.risk_owner || '',
                  strategy: risk.treatment_strategy || 'mitigate',
                  treatmentPlan: risk.treatment_plan || '',
                  targetDate: risk.target_date ? String(risk.target_date).slice(0, 10) : '',
                  affectedAssets: Array.isArray(risk.affected_assets) ? risk.affected_assets : [],
                }}
                onCancel={() => setEditOpen(false)}
                onSubmit={submitEdit}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

