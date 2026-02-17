'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Search, Plus, Download, TrendingUp, Shield, Activity } from 'lucide-react';
import { type RiskCategory, type RiskStatusUi } from '../../../components/RiskForm';
import { RiskModal } from '../../../components/RiskModal';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';

interface Risk {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'closed' | 'accepted';
  owner: string;
  inherent: number;
  residual: number;
  controls: number;
  findings: number;
  review_date: string;
  likelihood: number;
  impact: number;
  category?: string;
  updated_at?: string;
}

type Tenant = { tenant_id: string; name: string };
type TimeRange = '24h' | '7d' | '30d' | '90d';

function readCookie(name: string): string | null {
  const cur = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}

function statusBadge(status: Risk['status']) {
  const cls =
    status === 'open' ? 'bg-red-50 text-red-700 border-red-200' :
    status === 'in_progress' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
    status === 'closed' ? 'bg-green-50 text-green-800 border-green-200' :
    'bg-blue-50 text-blue-800 border-blue-200';
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{status.replace('_', ' ')}</span>;
}

function heatColor(score: number) {
  if (score >= 20) return 'bg-red-100 border-red-200';
  if (score >= 12) return 'bg-orange-100 border-orange-200';
  if (score >= 6) return 'bg-yellow-100 border-yellow-200';
  return 'bg-green-100 border-green-200';
}

function riskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 16) return 'critical';
  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

function riskLevelClasses(lvl: ReturnType<typeof riskLevel>) {
  if (lvl === 'critical') return 'risk-critical';
  if (lvl === 'high') return 'risk-high';
  if (lvl === 'medium') return 'risk-medium';
  return 'risk-low';
}

function formatRiskId(id: string) {
  const s = String(id || '').replace(/[^a-fA-F0-9]/g, '');
  const short = (s || String(id || '')).slice(0, 6).toUpperCase();
  return `RISK-${short}`;
}

export default function RisksPage() {
  const router = useRouter();

  const [risks, setRisks] = useState<Risk[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<{ total: number; open: number; highCritical: number; averageScore: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [deepCheckLoading, setDeepCheckLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>('demo-tenant');
  const [tenants, setTenants] = useState<Tenant[]>([{ tenant_id: 'demo-tenant', name: 'Demo Tenant' }]);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RiskStatusUi | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<RiskCategory | 'all'>('all');
  const [filterOwner, setFilterOwner] = useState('');
  const [scoreMin, setScoreMin] = useState<string>('');
  const [scoreMax, setScoreMax] = useState<string>('');
  const [cellFilter, setCellFilter] = useState<{ impact: number; likelihood: number } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const filteredRisks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let arr = risks;
    if (filterStatus !== 'all') arr = arr.filter((r) => r.status === (filterStatus === 'mitigated' ? 'closed' : filterStatus));
    if (filterCategory !== 'all') arr = arr.filter((r) => String(r.category || '').toLowerCase() === filterCategory);
    if (filterOwner.trim()) arr = arr.filter((r) => String(r.owner || '').toLowerCase().includes(filterOwner.trim().toLowerCase()));
    if (cellFilter) arr = arr.filter((r) => Number(r.impact) === cellFilter.impact && Number(r.likelihood) === cellFilter.likelihood);
    if (q) arr = arr.filter((r) => r.title.toLowerCase().includes(q) || String(r.owner || '').toLowerCase().includes(q) || formatRiskId(r.id).toLowerCase().includes(q));
    const min = scoreMin ? Number(scoreMin) : null;
    const max = scoreMax ? Number(scoreMax) : null;
    if (min != null && Number.isFinite(min)) arr = arr.filter((r) => Number(r.residual || r.inherent || 0) >= min);
    if (max != null && Number.isFinite(max)) arr = arr.filter((r) => Number(r.residual || r.inherent || 0) <= max);
    return arr;
  }, [risks, searchQuery, filterStatus, filterCategory, filterOwner, scoreMin, scoreMax, cellFilter]);

  const stats = useMemo(() => {
    const total = filteredRisks.length;
    const open = filteredRisks.filter((r) => r.status === 'open').length;
    const inProgress = filteredRisks.filter((r) => r.status === 'in_progress').length;
    const closed = filteredRisks.filter((r) => r.status === 'closed').length;
    return { total, open, inProgress, closed };
  }, [filteredRisks]);

  const highCriticalCount = useMemo(() => filteredRisks.filter((r) => Number(r.residual || r.inherent || 0) >= 16).length, [filteredRisks]);
  const avgScore = useMemo(() => {
    const scores = filteredRisks.map((r) => Number(r.residual || r.inherent || 0)).filter((n) => Number.isFinite(n) && n > 0);
    if (!scores.length) return 0;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  }, [filteredRisks]);

  async function fetchJson(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    const timeoutMs = init.timeoutMs ?? 30_000;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const headers = new Headers(init.headers || {});
    headers.set('x-tenant-id', selectedTenant);
    if (token) headers.set('authorization', `Bearer ${token}`);

    const timeout = setTimeout(() => ac.abort(), timeoutMs);
    try {
      // eslint-disable-next-line no-console
      console.log('[Risks UI] fetch', { url, selectedTenant, timeRange });
      const res = await fetch(url, { ...init, headers, credentials: 'include', signal: ac.signal });
      const txt = await res.text();
      let json: any = null;
      try { json = txt ? JSON.parse(txt) : null; } catch { json = { raw: txt }; }
      // eslint-disable-next-line no-console
      console.log('[Risks UI] response', { url, status: res.status, ok: res.ok, json });
      if (!res.ok) {
        const msg = json?.error || json?.message || `Request failed (${res.status})`;
        throw Object.assign(new Error(msg), { status: res.status, body: json });
      }
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchRisks() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/risks?tenantId=${encodeURIComponent(selectedTenant)}&range=${encodeURIComponent(timeRange)}&q=${encodeURIComponent(searchQuery || '')}`;
      const data = await fetchJson(url, { method: 'GET' });
      const next: Risk[] = Array.isArray(data?.risks) ? data.risks : [];
      setRisks(next);
      // eslint-disable-next-line no-console
      console.log('[Risks UI] setRisks', { count: next.length });
    } catch (e: any) {
      if (String(e?.name) === 'AbortError') return;
      if (e?.status === 401) setError('You are not authenticated. Please log in.');
      else setError(e?.message || 'Failed to load risks.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchHeatmapData() {
    setError(null);
    try {
      const url = `/api/risks/heatmap?tenantId=${encodeURIComponent(selectedTenant)}&range=${encodeURIComponent(timeRange)}`;
      const data = await fetchJson(url, { method: 'GET' });
      setHeatmapData(data?.heatmap || {});
      // eslint-disable-next-line no-console
      console.log('[Risks UI] setHeatmapData', { keys: Object.keys(data?.heatmap || {}).length });
    } catch (e: any) {
      if (String(e?.name) === 'AbortError') return;
      if (e?.status === 401) setError('You are not authenticated. Please log in.');
      else setError(e?.message || 'Failed to load heatmap.');
    }
  }

  async function fetchMetrics() {
    setError(null);
    try {
      const url = `/api/risks/metrics?tenantId=${encodeURIComponent(selectedTenant)}&range=${encodeURIComponent(timeRange)}`;
      const data = await fetchJson(url, { method: 'GET' });
      setMetrics(data?.metrics || null);
    } catch (e: any) {
      if (String(e?.name) === 'AbortError') return;
      if (e?.status === 401) setError('You are not authenticated. Please log in.');
      else setError(e?.message || 'Failed to load metrics.');
    }
  }

  async function runDeepCheck() {
    setDeepCheckLoading(true);
    setError(null);
    try {
      const url = '/api/risks/deep-check';
      const payload = { tenantId: selectedTenant, timeRange, filters: { searchQuery } };
      const start = Date.now();
      // eslint-disable-next-line no-console
      console.log('[Deep Check] start', payload);
      const [data] = await Promise.all([
        fetchJson(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
      const next: Risk[] = Array.isArray(data?.risks) ? data.risks : [];
      setRisks(next);
      setHeatmapData(data?.heatmap || {});
      // eslint-disable-next-line no-console
      console.log('[Deep Check] complete', { ms: Date.now() - start, count: next.length, analysis: data?.analysis });
      window.alert(`Deep check completed! Found ${next.length} risks.`);
    } catch (e: any) {
      if (String(e?.name) === 'AbortError') return;
      const msg = e?.status === 401 ? 'You are not authenticated. Please log in.' : (e?.message || 'Deep check failed.');
      setError(msg);
      window.alert(msg);
    } finally {
      setDeepCheckLoading(false);
    }
  }

  useEffect(() => {
    const t = readCookie('sw_tenant') || 'demo-tenant';
    setSelectedTenant(t);
  }, []);

  useEffect(() => {
    // Best-effort; only works for admin users.
    fetch('/api/tenants', { headers: { 'x-tenant-id': selectedTenant }, credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) setTenants(rows);
      })
      .catch(() => null);
  }, [selectedTenant]);

  useEffect(() => {
    fetchRisks();
    fetchHeatmapData();
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant, timeRange]);

  function applyTenant(next: string) {
    document.cookie = `sw_tenant=${encodeURIComponent(next)}; path=/; samesite=lax`;
    setSelectedTenant(next);
  }

  async function exportRisks() {
    try {
      const res = await fetch('/api/exports/risks', { credentials: 'include', headers: { 'x-tenant-id': selectedTenant } });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `risk_register_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      window.alert(String(e?.message || 'Failed to export risks'));
    }
  }

  async function deleteRisk(id: string) {
    if (!confirm('Delete this risk? This cannot be undone.')) return;
    const res = await fetch(`/api/risks/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include', headers: { 'x-tenant-id': selectedTenant } });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
    await fetchRisks();
    await fetchHeatmapData();
    await fetchMetrics();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-gray-50">
      <style>{`
        .risk-score { display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px; font-weight:600; font-size:12px; }
        .risk-low { background:#d4edda; color:#155724; }
        .risk-medium { background:#fff3cd; color:#856404; }
        .risk-high { background:#ffe8cc; color:#7a3e00; }
        .risk-critical { background:#721c24; color:#fff; }
      `}</style>
      <PageHeader
        title="Risk Management"
        description="Identify, assess, and mitigate security and compliance risks across your organization."
        icon={AlertTriangle}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Risk' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditRisk(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl shadow-lg hover:from-primary-700 hover:to-primary-800 transition-all font-semibold"
            >
              <Plus className="h-5 w-5" />
              New Risk
            </button>
            <button
              type="button"
              onClick={exportRisks}
              className="inline-flex items-center gap-2 px-4 py-3 border border-gray-200 bg-white rounded-xl text-sm font-semibold shadow-card hover:shadow-card-hover transition-all"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total Risks" value={stats.total} subtitle="Across categories" icon={AlertTriangle} color="orange" />
          <MetricCard title="Open Risks" value={stats.open} subtitle="Needs action" icon={Shield} color="red" badge="High Priority" />
          <MetricCard title="Mitigated Risks" value={stats.closed} subtitle="This quarter" icon={TrendingUp} color="green" />
          <MetricCard title="Risk Score" value={avgScore} subtitle="Average residual" icon={Activity} color="orange" progress={Math.min(100, Math.round(avgScore * 5))} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-xs text-gray-600" aria-label="Tenant selector">
                <span className="mr-2">Tenant</span>
                <select
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={selectedTenant}
                  onChange={(e) => applyTenant(e.target.value)}
                >
                  {(tenants || []).map((t) => (
                    <option key={t.tenant_id} value={t.tenant_id}>
                      {t.name} ({t.tenant_id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-600" aria-label="Time range selector">
                <span className="mr-2">Range</span>
                <select
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                >
                  <option value="24h">24h</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                  <option value="90d">90d</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  fetchRisks();
                  fetchHeatmapData();
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-card disabled:opacity-60"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={runDeepCheck}
                disabled={deepCheckLoading}
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-card disabled:opacity-60"
                aria-label="Run deep check"
              >
                {deepCheckLoading ? 'Running…' : 'Deep Check'}
              </button>
            </div>
          </div>
        </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-600">High/Critical (≥16)</div>
          <div className="mt-1 text-2xl font-semibold">{highCriticalCount}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-600">Average Score</div>
          <div className="mt-1 text-2xl font-semibold">{avgScore}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-600">Backend Metrics</div>
          <div className="mt-1 text-sm text-gray-700">
            {metrics ? (
              <div className="space-y-1">
                <div>total: <span className="font-semibold">{metrics.total}</span></div>
                <div>open: <span className="font-semibold">{metrics.open}</span></div>
                <div>avg: <span className="font-semibold">{metrics.averageScore}</span></div>
              </div>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-600">Active Filters</div>
          <div className="mt-2 text-sm text-gray-700">
            {filterStatus !== 'all' || filterCategory !== 'all' || filterOwner.trim() || scoreMin || scoreMax || cellFilter ? (
              <div className="flex flex-wrap gap-2">
                {filterStatus !== 'all' ? <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">status: {filterStatus}</span> : null}
                {filterCategory !== 'all' ? <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">category: {filterCategory}</span> : null}
                {filterOwner.trim() ? <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">owner: {filterOwner.trim()}</span> : null}
                {scoreMin ? <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">min: {scoreMin}</span> : null}
                {scoreMax ? <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">max: {scoreMax}</span> : null}
                {cellFilter ? <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">I{cellFilter.impact}×L{cellFilter.likelihood}</span> : null}
                <button
                  type="button"
                  className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                  onClick={() => { setFilterStatus('all'); setFilterCategory('all'); setFilterOwner(''); setScoreMin(''); setScoreMax(''); setCellFilter(null); }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-gray-500">None</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="text-xs font-semibold text-gray-600">Status</label>
              <select className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="all">All</option>
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="mitigated">mitigated</option>
                <option value="accepted">accepted</option>
                <option value="closed">closed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Category</label>
              <select className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)}>
                <option value="all">All</option>
                <option value="security">security</option>
                <option value="operational">operational</option>
                <option value="financial">financial</option>
                <option value="compliance">compliance</option>
                <option value="strategic">strategic</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Owner</label>
              <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="email contains…" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Score Min</label>
              <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="0" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Score Max</label>
              <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="25" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search security signals (agent, rule, message...)"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-gray-300"
            aria-label="Search risks"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              <div className="font-semibold">Error</div>
              <div className="mt-1">{error}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold">Risks</h2>
            <p className="mt-1 text-sm text-gray-600">Tracked risks for the selected tenant and time range.</p>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Inherent</th>
                  <th className="px-5 py-3">Residual</th>
                  <th className="px-5 py-3">Reduction</th>
                  <th className="px-5 py-3">Controls</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-sm text-gray-600" colSpan={12}>
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading risks…
                      </span>
                    </td>
                  </tr>
                ) : filteredRisks.length === 0 ? (
                  <tr>
                    <td className="px-5 py-10 text-sm text-gray-700" colSpan={12}>
                      <div className="flex flex-col items-center gap-3 text-center">
                        <AlertTriangle className="h-5 w-5 text-gray-500" />
                        <div className="font-semibold">No risks found</div>
                        <div className="max-w-md text-gray-600">
                          Your tenant/time range returned no risks. Run a deep check to analyze latest findings and generate/update the risk register.
                        </div>
                        <button
                          type="button"
                          onClick={runDeepCheck}
                          disabled={deepCheckLoading}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {deepCheckLoading ? 'Running…' : 'Run Deep Check'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRisks.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-xs font-mono text-gray-600">{formatRiskId(r.id)}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          <button
                            type="button"
                            onClick={() => router.push(`/risks/${encodeURIComponent(r.id)}`)}
                            className="text-left hover:underline"
                          >
                            {r.title}
                          </button>
                        </div>
                        <div className="mt-0.5 text-xs font-mono text-gray-500">{r.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.category || '-'}</td>
                      <td className="px-5 py-4 text-sm">{statusBadge(r.status)}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.owner || '-'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        <span className={`risk-score ${riskLevelClasses(riskLevel(r.inherent || 0))}`}>{r.inherent || 0}</span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        <span className={`risk-score ${riskLevelClasses(riskLevel(r.residual || 0))}`}>{r.residual || 0}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {r.inherent && r.residual ? `${Math.max(0, r.inherent - r.residual)} (${Math.round(((r.inherent - r.residual) / r.inherent) * 100)}%)` : '-'}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.controls}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.updated_at ? String(r.updated_at).slice(0, 10) : '-'}</td>
                      <td className="px-5 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold"
                            onClick={() => router.push(`/risks/${encodeURIComponent(r.id)}`)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold"
                            onClick={() => router.push(`/risks/${encodeURIComponent(r.id)}/treatment`)}
                          >
                            Treatment
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold"
                            onClick={() => router.push(`/risks/${encodeURIComponent(r.id)}/chain`)}
                          >
                            Chain
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold"
                            onClick={() => {
                              setEditRisk(r);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                            onClick={() => deleteRisk(r.id).catch((e) => window.alert(String((e as any)?.message || 'Failed to delete risk')))}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold">Risk Heatmap</h2>
            <p className="mt-1 text-sm text-gray-600">Residual risk position (likelihood × impact)</p>
          </header>
          <div className="p-5">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 25 }).map((_, idx) => {
                const impact = 5 - Math.floor(idx / 5);
                const likelihood = (idx % 5) + 1;
                const key = `I${impact}xL${likelihood}`;
                const count = Number(heatmapData?.[key] || 0);
                const score = impact * likelihood;
                return (
                  <div
                    key={key}
                    className={`min-h-[68px] rounded-lg border p-2 ${heatColor(score)} ${cellFilter?.impact === impact && cellFilter?.likelihood === likelihood ? 'ring-2 ring-blue-400' : ''} cursor-pointer hover:opacity-90`}
                    aria-label={`Heatmap cell impact ${impact} likelihood ${likelihood}`}
                    onClick={() => setCellFilter({ impact, likelihood })}
                  >
                    <div className="text-[11px] text-gray-700">I{impact} × L{likelihood}</div>
                    <div className="mt-1 text-xs text-gray-600">({score})</div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">({count})</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-gray-600">
              Click a cell to filter risks to that residual position.
              {cellFilter ? (
                <button type="button" className="ml-2 font-semibold text-blue-700" onClick={() => setCellFilter(null)}>
                  Clear cell filter
                </button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-700">
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-green-200 bg-green-100" /> 1–5</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-yellow-200 bg-yellow-100" /> 6–11</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-orange-200 bg-orange-100" /> 12–19</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded border border-red-200 bg-red-100" /> 20–25</span>
            </div>
          </div>
        </section>
      </div>

      {formOpen ? (
        <RiskModal
          isOpen={formOpen}
          title={editRisk ? 'Edit Risk' : 'New Risk'}
          tenantId={selectedTenant}
          mode={editRisk ? 'edit' : 'create'}
          riskId={editRisk?.id}
          initial={
            editRisk
              ? {
                  title: editRisk.title,
                  description: (editRisk as any)?._raw?.description || '',
                  category: (editRisk.category as any) || 'security',
                  status: editRisk.status as any,
                  inherentImpact: (editRisk as any)?._raw?.inherent_impact || 3,
                  inherentLikelihood: (editRisk as any)?._raw?.inherent_likelihood || 3,
                  residualImpact: (editRisk as any)?._raw?.residual_impact ?? null,
                  residualLikelihood: (editRisk as any)?._raw?.residual_likelihood ?? null,
                  owner: editRisk.owner,
                  strategy: (editRisk as any)?._raw?.treatment_strategy || 'mitigate',
                  treatmentPlan: (editRisk as any)?._raw?.treatment_plan || '',
                  targetDate: (editRisk as any)?._raw?.target_date ? String((editRisk as any)._raw.target_date).slice(0, 10) : '',
                  affectedAssets: Array.isArray((editRisk as any)?._raw?.affected_assets) ? (editRisk as any)._raw.affected_assets : [],
                }
              : undefined
          }
          onClose={() => {
            setFormOpen(false);
            setEditRisk(null);
          }}
          onSuccess={async () => {
            setEditRisk(null);
            await fetchRisks();
            await fetchHeatmapData();
            await fetchMetrics();
          }}
        />
      ) : null}
    </div>
    </main>
  );
}
