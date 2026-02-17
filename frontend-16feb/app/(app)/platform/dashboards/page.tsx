"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import KPICard, { type KPIData, type KPIStatus, type KPITrend } from '@/components/dashboards/KPICard';
import PostureScoreCard from '@/components/dashboards/PostureScoreCard';
import ComplianceBreakdownChart from '@/components/dashboards/ComplianceBreakdownChart';
import SecurityPostureTrendChart from '@/components/dashboards/SecurityPostureTrendChart';
import { HelpButton } from '@/components/help/HelpPanel';
import HelpPanel from '@/components/help/HelpPanel';
import EmptyState from '@/components/help/EmptyState';
import Tooltip from '@/components/help/Tooltip';
import { helpContent } from '@/config/helpContent';
import {
  calculateAllComplianceScores,
  calculateAllKPIs,
  calculateSecurityPosture,
  getExecutiveDashboard,
} from '@/lib/api/dashboards';

type ExecutiveDashboardPayload = {
  kpis?: any[];
  security_posture?: any;
  compliance_posture?: any;
  updated_at?: string;
  generated_at?: string;
};

function readCookie(name: string): string | null {
  const parts = String(document.cookie || '').split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.split('=').slice(1).join('='));
  } catch {
    return hit.split('=').slice(1).join('=');
  }
}

function toNumber(v: any): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function resolveScore(input: any): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return input;
  if (typeof input === 'string') return toNumber(input);
  if (typeof input === 'object') {
    return (
      toNumber(input.score) ??
      toNumber(input.overall_score) ??
      toNumber(input.overall_compliance_score) ??
      toNumber(input.readiness_score) ??
      toNumber(input.value) ??
      toNumber(input.percent) ??
      toNumber(input.percentage) ??
      toNumber(input.pct) ??
      null
    );
  }
  return null;
}

function normalizeStatus(raw: any): KPIStatus | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).toLowerCase();
  if (s.includes('good') || s.includes('ok') || s.includes('healthy') || s.includes('green')) return 'good';
  if (s.includes('warn') || s.includes('risk') || s.includes('yellow')) return 'warning';
  if (s.includes('crit') || s.includes('high') || s.includes('red')) return 'critical';
  return null;
}

function normalizeTrend(raw: any, changePct?: number | null): KPITrend | null {
  if (raw !== null && raw !== undefined) {
    const s = String(raw).toLowerCase();
    if (s.includes('up') || s.includes('increase') || s.includes('positive')) return 'up';
    if (s.includes('down') || s.includes('decrease') || s.includes('negative')) return 'down';
    if (s.includes('stable') || s.includes('flat') || s.includes('neutral')) return 'stable';
  }
  if (changePct === null || changePct === undefined) return null;
  if (changePct > 0) return 'up';
  if (changePct < 0) return 'down';
  return 'stable';
}

function normalizeKpi(raw: any): KPIData {
  const changePct = toNumber(
    raw?.change_pct ??
      raw?.changePct ??
      raw?.delta_pct ??
      raw?.deltaPercent ??
      raw?.delta ??
      raw?.change_percentage
  );
  return {
    id: raw?.id || raw?.key || undefined,
    name: raw?.name || raw?.kpi_name || raw?.title || undefined,
    label: raw?.label || raw?.display_name || raw?.displayName || raw?.kpi_name || undefined,
    value: raw?.value ?? raw?.latest_value ?? raw?.current_value ?? raw?.metric ?? raw?.count ?? raw?.score ?? null,
    unit: raw?.unit || raw?.units || undefined,
    trend: normalizeTrend(raw?.trend ?? raw?.direction, changePct),
    changePct,
    status: normalizeStatus(raw?.status ?? raw?.health ?? raw?.state),
    description: raw?.description || raw?.detail || raw?.kpi_category || undefined,
  };
}

function formatTimestamp(value?: string | null) {
  if (!value) return null;
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export default function ExecutiveDashboardPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || readCookie('sw_tenant') || 'demo-tenant';

  const [data, setData] = useState<ExecutiveDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendDays, setTrendDays] = useState(90);
  const [showHelp, setShowHelp] = useState(false);

  const load = async (opts: { showLoading?: boolean } = {}) => {
    const showLoading = opts.showLoading !== false;
    if (showLoading) setLoading(true);
    setRefreshing(!showLoading);
    setError(null);
    try {
      const json = (await getExecutiveDashboard(tenantId)) as ExecutiveDashboardPayload;
      setData(json || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load executive dashboard');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCalculateAll = async () => {
    setCalculating(true);
    setError(null);
    try {
      await Promise.all([
        calculateAllKPIs(tenantId),
        calculateSecurityPosture(tenantId),
        calculateAllComplianceScores(tenantId),
      ]);
      await load({ showLoading: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to calculate metrics');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    load({ showLoading: true });
  }, [tenantId]);

  const kpis = useMemo(() => {
    const raw = Array.isArray(data?.kpis) ? data?.kpis : Array.isArray((data as any)?.items) ? (data as any)?.items : [];
    return raw.map(normalizeKpi);
  }, [data]);

  const securityScore = resolveScore(
    data?.security_posture ?? (data as any)?.security_posture_score ?? (data as any)?.security_score ?? (data as any)?.security
  );
  const complianceScore = resolveScore(
    data?.compliance_posture ?? (data as any)?.compliance_posture_score ?? (data as any)?.compliance_score ?? (data as any)?.compliance
  );
  const updatedAt = formatTimestamp(data?.updated_at || data?.generated_at || null);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-600">High-level KPIs and posture metrics for SecureWise.</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton onClick={() => setShowHelp(true)} />
          {updatedAt ? <span className="text-xs text-gray-500">Updated: {updatedAt} UTC</span> : null}
          <button
            className="px-3 py-2 text-sm rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            onClick={handleCalculateAll}
            disabled={loading || refreshing || calculating}
          >
            {calculating ? 'Calculating...' : 'Calculate All Metrics'}
          </button>
          <button
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            onClick={() => load({ showLoading: false })}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PostureScoreCard score={securityScore ?? 0} type="security" />
        <PostureScoreCard score={complianceScore ?? 0} type="compliance" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Key performance indicators</h2>
          <span className="text-xs text-gray-500">{kpis.length} KPIs</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`kpi-skel-${idx}`} className="h-32 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : kpis.length === 0 ? (
          <EmptyState
            type="default"
            title="No KPI data yet"
            description="Run calculations to populate executive KPIs and trends."
            actionLabel="Calculate Metrics"
            onAction={handleCalculateAll}
            showQuickStart={false}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
              <Tooltip key={`${kpi.id || kpi.name || kpi.label || 'kpi'}-${idx}`} content={helpContent.dashboard.kpis.content}>
                <div>
                  <KPICard kpi={kpi} />
                </div>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Trends</h2>
          <div className="flex items-center gap-2">
            {[
              { label: 'Last 7d', value: 7 },
              { label: 'Last 30d', value: 30 },
              { label: 'Last 90d', value: 90 },
              { label: 'Last 180d', value: 180 },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTrendDays(opt.value)}
                className={`px-3 py-1.5 text-xs rounded-full border transition ${
                  trendDays === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium text-gray-700">Security posture trend</div>
            <SecurityPostureTrendChart days={trendDays} tenantId={tenantId} />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium text-gray-700">Compliance breakdown</div>
            <ComplianceBreakdownChart tenantId={tenantId} />
          </div>
        </div>
      </div>

      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        content={helpContent.dashboard}
        title="Executive Dashboard Help"
      />
    </div>
  );
}
