'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ClipboardList, Clock, FileText, Shield, TrendingUp } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { DataHealthBanner } from '@/components/dashboard/DataHealthBanner';
import { PriorityWorkQueue } from '@/components/dashboard/PriorityWorkQueue';
import { Loading } from '@/components/ui/Loading';

type DashboardData = {
  health: {
    partial: boolean;
    reasons: string[];
    sources: Array<{ name: string; status: string; lastSeen?: string }>;
  };
  kpis: {
    auditReadinessPct: number | null;
    coveragePct: number | null;
    evidenceHealth: {
      status: string;
      score: number | null;
      needsReview: number | null;
      expiringSoon: number | null;
      overdue: number | null;
    };
    securityPosture: {
      score: number | null;
      incidents24h: number | null;
      highSeverityPct: number | null;
    };
    controlsMissingEvidence: number | null;
    evidenceNeedsReview: number | null;
    evidenceExpiringSoon: number | null;
    overdueEvidence: number | null;
    controlsUntested: number | null;
    failedTests: number | null;
    openGaps: number | null;
    activeIncidents: number | null;
  };
  tables: {
    priorityWorkQueue: Array<{
      type: string;
      item_id: string;
      title: string;
      status: string;
      priority: string;
    }>;
  };
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function DashboardPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [framework, setFramework] = useState('iso27001');
  const [timeRange, setTimeRange] = useState('30d');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        tenantId,
        timeRange,
        framework,
      });
      const res = await fetch(`/api/dashboard/overview?${params.toString()}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);
      setData(json as DashboardData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [framework, tenantId, timeRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loading />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-secondary)]">{error || 'Failed to load dashboard data'}</div>
      </div>
    );
  }

  const { health, kpis, tables } = data;
  const dashValue = (value: number | null) => (value === null || value === undefined ? '—' : value);
  const isMissing = (value: number | null) => value === null || value === undefined;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] w-full mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Dashboard</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Operational view of compliance readiness, evidence health, and security posture.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="border border-[var(--card-border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--card-bg)] focus:outline-none focus:border-[var(--accent-blue)]"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
            >
              <option value="iso27001" className="bg-[var(--bg-primary)]">ISO 27001</option>
              <option value="soc2" className="bg-[var(--bg-primary)]">SOC 2</option>
            </select>
            <select
              className="border border-[var(--card-border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] bg-[var(--card-bg)] focus:outline-none focus:border-[var(--accent-blue)]"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7d" className="bg-[var(--bg-primary)]">Last 7 days</option>
              <option value="30d" className="bg-[var(--bg-primary)]">Last 30 days</option>
              <option value="90d" className="bg-[var(--bg-primary)]">Last 90 days</option>
            </select>
          </div>
        </div>

        {health?.partial ? <DataHealthBanner reasons={health.reasons} sources={health.sources} /> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <KpiCard
            title="Audit Readiness"
            value={isMissing(kpis.auditReadinessPct) ? '—' : `${kpis.auditReadinessPct}%`}
            status={isMissing(kpis.auditReadinessPct) ? 'partial' : 'neutral'}
            tooltip="Percent of in-scope controls with reviewed evidence and passing tests for the selected audit period"
            href="/compliance"
            actionTooltip="Open compliance overview"
            icon={Shield}
          />

          <KpiCard
            title="Coverage"
            value={isMissing(kpis.coveragePct) ? '—' : `${kpis.coveragePct}%`}
            status={isMissing(kpis.coveragePct) ? 'partial' : 'neutral'}
            tooltip="Percent of in-scope controls with at least one valid evidence item in the selected period"
            href="/compliance/controls"
            actionTooltip="View controls with evidence status"
            icon={FileText}
          />

          <KpiCard
            title="Evidence Health"
            value={kpis.evidenceHealth.score === null ? '—' : String(kpis.evidenceHealth.status || '').toUpperCase()}
            helper={kpis.evidenceHealth.score === null ? undefined : `Score: ${kpis.evidenceHealth.score}/100`}
            status={
              kpis.evidenceHealth.score === null
                ? 'partial'
                : kpis.evidenceHealth.status === 'good'
                  ? 'success'
                  : kpis.evidenceHealth.status === 'watch'
                    ? 'warning'
                    : 'danger'
            }
            tooltip="Health of evidence pipeline based on review backlog, expiry, and SLA breaches"
            href="/compliance/evidence-collection"
            actionTooltip="Open evidence collection"
            icon={Activity}
          />

          <KpiCard
            title="Security Posture"
            value={isMissing(kpis.securityPosture.score) ? '—' : `${kpis.securityPosture.score}/100`}
            helper={
              isMissing(kpis.securityPosture.incidents24h) ? undefined : `${kpis.securityPosture.incidents24h} incidents (24h)`
            }
            status={
              isMissing(kpis.securityPosture.score)
                ? 'partial'
                : kpis.securityPosture.score > 80
                  ? 'success'
                  : kpis.securityPosture.score > 60
                    ? 'warning'
                    : 'danger'
            }
            tooltip="Security posture summary based on incident volume and severity distribution"
            href="/incidents/dashboard"
            actionTooltip="View security incidents"
            icon={Shield}
          />
          {/* Merged second grid items */}
          <KpiCard
            title="Controls Missing Evidence"
            value={dashValue(kpis.controlsMissingEvidence)}
            status={isMissing(kpis.controlsMissingEvidence) ? 'partial' : 'neutral'}
            tooltip="In-scope controls with missing evidence for the audit period"
            href="/compliance/controls?filter=missing_evidence"
            icon={AlertTriangle}
          />

          <KpiCard
            title="Evidence Needs Review"
            value={dashValue(kpis.evidenceNeedsReview)}
            status={isMissing(kpis.evidenceNeedsReview) ? 'partial' : 'neutral'}
            tooltip="Collected evidence pending reviewer validation"
            href="/compliance/evidence-collection?status=needs_review"
            icon={ClipboardList}
          />

          <KpiCard
            title="Evidence Expiring Soon"
            value={dashValue(kpis.evidenceExpiringSoon)}
            helper="Next 30 days"
            status={isMissing(kpis.evidenceExpiringSoon) ? 'partial' : 'neutral'}
            tooltip="Evidence approaching expiration and likely needs renewal"
            href="/compliance/evidence-collection?filter=expiring_soon"
            icon={Clock}
          />

          <KpiCard
            title="Overdue Evidence"
            value={dashValue(kpis.overdueEvidence)}
            status={
              isMissing(kpis.overdueEvidence) ? 'partial' : kpis.overdueEvidence > 0 ? 'danger' : 'neutral'
            }
            tooltip="Evidence past SLA for review or renewal"
            href="/compliance/evidence-collection?filter=overdue"
            icon={AlertTriangle}
          />

          <KpiCard
            title="Controls Untested"
            value={dashValue(kpis.controlsUntested)}
            status={isMissing(kpis.controlsUntested) ? 'partial' : 'neutral'}
            tooltip="Controls without test results for the selected audit period"
            href="/control-testing?filter=untested"
            icon={AlertTriangle}
          />

          <KpiCard
            title="Failed Tests"
            value={dashValue(kpis.failedTests)}
            status={isMissing(kpis.failedTests) ? 'partial' : kpis.failedTests > 0 ? 'danger' : 'neutral'}
            tooltip="Controls with failing tests requiring remediation"
            href="/control-testing?filter=failed"
            icon={AlertTriangle}
          />

          <KpiCard
            title="Open Compliance Gaps"
            value={dashValue(kpis.openGaps)}
            status={isMissing(kpis.openGaps) ? 'partial' : 'neutral'}
            tooltip="Open gaps derived from missing evidence, failed tests, and policy gaps"
            href="/compliance-gaps?status=open"
            icon={AlertTriangle}
          />

          <KpiCard
            title="Active Incidents (24h)"
            value={dashValue(kpis.activeIncidents)}
            status={isMissing(kpis.activeIncidents) ? 'partial' : 'neutral'}
            tooltip="Incidents observed within the selected time range"
            href="/incidents/dashboard"
            icon={TrendingUp}
          />
        </div>

        <PriorityWorkQueue items={tables?.priorityWorkQueue || []} />
      </div>
    </div>
  );
}
