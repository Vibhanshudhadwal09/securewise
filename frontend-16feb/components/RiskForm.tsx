'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export type RiskCategory = 'security' | 'operational' | 'financial' | 'compliance' | 'strategic';
export type RiskStatusUi = 'open' | 'in_progress' | 'mitigated' | 'accepted' | 'closed';
export type RiskTreatment = 'avoid' | 'mitigate' | 'transfer' | 'accept';

export type RiskFormValue = {
  title: string;
  description: string;
  category: RiskCategory;
  status: RiskStatusUi;
  inherentLikelihood: number;
  inherentImpact: number;
  residualLikelihood?: number | null;
  residualImpact?: number | null;
  owner: string;
  strategy: RiskTreatment;
  treatmentPlan?: string;
  targetDate?: string;
  affectedAssets?: string[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function score(l?: number | null, i?: number | null) {
  const ll = Number(l || 0);
  const ii = Number(i || 0);
  if (!ll || !ii) return 0;
  return ll * ii;
}

function level(s: number): 'low' | 'medium' | 'high' | 'critical' {
  if (s >= 16) return 'critical';
  if (s >= 10) return 'high';
  if (s >= 5) return 'medium';
  return 'low';
}

function levelClasses(lvl: ReturnType<typeof level>) {
  if (lvl === 'critical') return 'bg-red-700 text-white';
  if (lvl === 'high') return 'bg-orange-100 text-orange-900 border border-orange-200';
  if (lvl === 'medium') return 'bg-yellow-100 text-yellow-900 border border-yellow-200';
  return 'bg-green-100 text-green-900 border border-green-200';
}

export function RiskForm(props: {
  mode: 'create' | 'edit';
  initial?: Partial<RiskFormValue>;
  onCancel: () => void;
  onSubmit: (value: RiskFormValue) => Promise<void>;
}) {
  const [value, setValue] = useState<RiskFormValue>(() => ({
    title: props.initial?.title || '',
    description: props.initial?.description || '',
    category: (props.initial?.category as any) || 'security',
    status: (props.initial?.status as any) || 'open',
    inherentLikelihood: clamp(Number(props.initial?.inherentLikelihood || 3), 1, 5),
    inherentImpact: clamp(Number(props.initial?.inherentImpact || 3), 1, 5),
    residualLikelihood: props.initial?.residualLikelihood ?? null,
    residualImpact: props.initial?.residualImpact ?? null,
    owner: props.initial?.owner || '',
    strategy: (props.initial?.strategy as any) || 'mitigate',
    treatmentPlan: props.initial?.treatmentPlan || '',
    targetDate: props.initial?.targetDate || '',
    affectedAssets: Array.isArray(props.initial?.affectedAssets) ? props.initial!.affectedAssets : [],
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const draftKey = useMemo(() => `sw_risk_draft_${props.mode}`, [props.mode]);
  const autosaveRef = useRef<number | null>(null);

  const inherentScore = score(value.inherentLikelihood, value.inherentImpact);
  const residualScore = score(value.residualLikelihood ?? null, value.residualImpact ?? null);
  const inherentLevel = level(inherentScore);
  const residualLevel = level(residualScore || inherentScore);

  const reductionPct = useMemo(() => {
    if (!inherentScore) return 0;
    const base = inherentScore;
    const after = residualScore || base;
    return Math.round(((base - after) / base) * 100);
  }, [inherentScore, residualScore]);

  function validate(next: RiskFormValue) {
    const e: Record<string, string> = {};
    if (!next.title.trim()) e.title = 'Title is required';
    if (next.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (!next.description.trim()) e.description = 'Description is required';
    if (!next.category) e.category = 'Category is required';
    if (!next.owner.trim()) e.owner = 'Owner email is required';
    if (next.owner && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.owner)) e.owner = 'Owner must be a valid email';
    if (!next.inherentLikelihood) e.inherentLikelihood = 'Likelihood is required';
    if (!next.inherentImpact) e.inherentImpact = 'Impact is required';
    return e;
  }

  function update<K extends keyof RiskFormValue>(k: K, v: RiskFormValue[K]) {
    setValue((cur) => {
      const next = { ...cur, [k]: v } as RiskFormValue;
      setErrors(validate(next));
      return next;
    });
  }

  useEffect(() => {
    // Load draft if present (create only)
    if (props.mode !== 'create') return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setValue((cur) => ({ ...cur, ...parsed }));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    // Auto-save draft (create only)
    if (props.mode !== 'create') return;
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify(value));
      } catch {
        // ignore
      }
    }, 800);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
  }, [value, draftKey, props.mode]);

  async function submit() {
    const e = validate(value);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await props.onSubmit(value);
      if (props.mode === 'create') {
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        submit();
      }}
      className="space-y-6"
    >
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold">Basic Information</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Title *</label>
            <input
              value={value.title}
              onChange={(e) => update('title', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="e.g., Unauthorized database access"
            />
            {errors.title ? <div className="mt-1 text-xs text-red-700">{errors.title}</div> : null}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Description *</label>
            <textarea
              value={value.description}
              onChange={(e) => update('description', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="What could happen, why it matters, and context."
            />
            {errors.description ? <div className="mt-1 text-xs text-red-700">{errors.description}</div> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Category *</label>
            <select
              value={value.category}
              onChange={(e) => update('category', e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="security">security</option>
              <option value="operational">operational</option>
              <option value="financial">financial</option>
              <option value="compliance">compliance</option>
              <option value="strategic">strategic</option>
            </select>
            {errors.category ? <div className="mt-1 text-xs text-red-700">{errors.category}</div> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={value.status}
              onChange={(e) => update('status', e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="open">open</option>
              <option value="in_progress">in_progress</option>
              <option value="mitigated">mitigated</option>
              <option value="accepted">accepted</option>
              <option value="closed">closed</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold">Inherent Risk Assessment</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Likelihood *</label>
            <select
              value={value.inherentLikelihood}
              onChange={(e) => update('inherentLikelihood', Number(e.target.value) as any)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value={1}>1 — Rare (&lt;10%)</option>
              <option value={2}>2 — Unlikely (10–25%)</option>
              <option value={3}>3 — Possible (25–50%)</option>
              <option value={4}>4 — Likely (50–75%)</option>
              <option value={5}>5 — Almost Certain (&gt;75%)</option>
            </select>
            {errors.inherentLikelihood ? <div className="mt-1 text-xs text-red-700">{errors.inherentLikelihood}</div> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Impact *</label>
            <select
              value={value.inherentImpact}
              onChange={(e) => update('inherentImpact', Number(e.target.value) as any)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value={1}>1 — Negligible (&lt;$10K)</option>
              <option value={2}>2 — Minor ($10K–$100K)</option>
              <option value={3}>3 — Moderate ($100K–$1M)</option>
              <option value={4}>4 — Major ($1M–$10M)</option>
              <option value={5}>5 — Catastrophic (&gt;$10M)</option>
            </select>
            {errors.inherentImpact ? <div className="mt-1 text-xs text-red-700">{errors.inherentImpact}</div> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Risk Score</label>
            <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-sm font-semibold">{inherentScore}</div>
              <div className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${levelClasses(inherentLevel)}`}>
                {inherentLevel}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold">Residual Risk (After Controls)</h3>
        <div className="mt-2 text-sm text-gray-600">
          Optional. If set, we’ll show risk reduction vs inherent score.
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Residual Likelihood</label>
            <select
              value={value.residualLikelihood ?? ''}
              onChange={(e) => update('residualLikelihood', e.target.value ? Number(e.target.value) : (null as any))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Residual Impact</label>
            <select
              value={value.residualImpact ?? ''}
              onChange={(e) => update('residualImpact', e.target.value ? Number(e.target.value) : (null as any))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Residual Score</label>
            <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-sm font-semibold">{residualScore || '-'}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${levelClasses(residualLevel)}`}>
                  {residualLevel}
                </div>
                {residualScore ? (
                  <div className="text-xs text-gray-600">Reduction: {reductionPct}%</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold">Risk Treatment</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Owner Email *</label>
            <input
              value={value.owner}
              onChange={(e) => update('owner', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="owner@company.com"
            />
            {errors.owner ? <div className="mt-1 text-xs text-red-700">{errors.owner}</div> : null}
          </div>
          <div>
            <label className="text-sm font-medium">Risk Treatment *</label>
            <select
              value={value.strategy}
              onChange={(e) => update('strategy', e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="avoid">avoid</option>
              <option value="mitigate">mitigate</option>
              <option value="transfer">transfer</option>
              <option value="accept">accept</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Treatment Plan</label>
            <textarea
              value={value.treatmentPlan || ''}
              onChange={(e) => update('treatmentPlan', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="Plan, action items, and notes."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Target Date</label>
            <input
              type="date"
              value={value.targetDate || ''}
              onChange={(e) => update('targetDate', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Affected Assets (optional)</label>
            <textarea
              value={(value.affectedAssets || []).join('\n')}
              onChange={(e) => update('affectedAssets', e.target.value.split(/[,\\n]/).map((s) => s.trim()).filter(Boolean))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={3}
              placeholder={"One per line (or comma-separated)\nExample: db/prod-postgres\nservice/auth"}
            />
            <div className="mt-1 text-xs text-gray-600">Paste asset IDs or names; later we can replace with a picker.</div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {props.mode === 'create' ? (
          <button
            type="button"
            onClick={() => {
              try {
                window.localStorage.setItem(draftKey, JSON.stringify(value));
                window.alert('Draft saved.');
              } catch {
                window.alert('Failed to save draft.');
              }
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold"
          >
            Save Draft
          </button>
        ) : null}
        <button type="button" onClick={props.onCancel} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden="true" />
          ) : null}
          {props.mode === 'create' ? (saving ? 'Creating…' : 'Create Risk') : (saving ? 'Saving…' : 'Save Changes')}
        </button>
      </div>
    </form>
  );
}

