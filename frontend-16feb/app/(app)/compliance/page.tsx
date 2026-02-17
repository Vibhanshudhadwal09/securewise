'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, FileText, Shield, Zap } from 'lucide-react';
import FrameworkSelector, { type FrameworkName } from '@/components/FrameworkSelector';
import { AuditPeriodSelector } from '@/components/grc/AuditPeriodSelector';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { SectionHeader } from '@/components/SectionHeader';

type FrameworkId = 'iso27001' | 'soc2';

type Metrics = {
  total_controls?: number | null;
  submitted?: number | null;
  missing?: number | null;
  coverage_pct?: number | null;
  tested?: number | null;
  untested?: number | null;
  effectiveness_pct?: number | null;
  approved?: number | null;
  pending?: number | null;
  rejected?: number | null;
  reviewed_pct?: number | null;
  overdue?: number | null;
};

type ControlRow = {
  id?: string;
  control_id: string;
  framework: string;
  title: string;
  owner?: string | null;
  applicability?: string | null;
  evidence_status?: string | null;
  review_status?: string | null;
  test_status?: string | null;
  due_date?: string | null;
};

type ExpiringEvidence = {
  evidence_id: string;
  control_id: string;
  framework?: string | null;
  evidence_title?: string | null;
  expiration_date?: string | null;
};

type AutomationMetrics = {
  total_controls: number;
  automated_controls: number;
  automation_coverage: number;
  avg_effectiveness: number;
};

function readCookie(name: string): string | null {
  const cur = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export default function CompliancePage() {
  const [selectedFramework, setSelectedFramework] = useState<FrameworkName>('iso27001');
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiring, setExpiring] = useState<ExpiringEvidence[]>([]);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [automationMetrics, setAutomationMetrics] = useState<AutomationMetrics>({
    total_controls: 0,
    automated_controls: 0,
    automation_coverage: 0,
    avg_effectiveness: 0,
  });
  const [automationLoading, setAutomationLoading] = useState(false);

  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const framework = selectedFramework as FrameworkId;

  useEffect(() => {
    document.body.classList.add('full-width-content');
    return () => {
      document.body.classList.remove('full-width-content');
    };
  }, []);

  async function fetchComplianceData() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ framework, timeRange });
      const [mRes, cRes] = await Promise.all([
        fetch(`/api/compliance/metrics?${qs.toString()}`, {
          credentials: 'include',
          headers: { 'x-tenant-id': tenantId },
        }),
        fetch(`/api/compliance/controls-status?${qs.toString()}`, {
          credentials: 'include',
          headers: { 'x-tenant-id': tenantId },
        }),
      ]);

      const mJson = await mRes.json().catch(() => ({}));
      const cJson = await cRes.json().catch(() => ({}));

      if (!mRes.ok) throw new Error(mJson?.error || `Failed to load metrics (${mRes.status})`);
      if (!cRes.ok) throw new Error(cJson?.error || `Failed to load controls (${cRes.status})`);

      setMetrics(mJson || null);
      setControls(Array.isArray(cJson?.controls) ? cJson.controls : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load compliance workbench:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchComplianceData();
  }, [framework, timeRange, tenantId]);

  useEffect(() => {
    async function fetchAutomationMetrics() {
      setAutomationLoading(true);
      try {
        const res = await fetch(`/api/controls/automation-metrics?tenantId=${encodeURIComponent(tenantId)}`, {
          credentials: 'include',
          headers: { 'x-tenant-id': tenantId },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Failed to load automation metrics (${res.status})`);
        setAutomationMetrics({
          total_controls: Number(json?.total_controls || 0),
          automated_controls: Number(json?.automated_controls || 0),
          automation_coverage: Number(json?.automation_coverage || 0),
          avg_effectiveness: Number(json?.avg_effectiveness || 0),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load automation metrics:', err);
        setAutomationMetrics({ total_controls: 0, automated_controls: 0, automation_coverage: 0, avg_effectiveness: 0 });
      } finally {
        setAutomationLoading(false);
      }
    }
    fetchAutomationMetrics();
  }, [tenantId]);

  useEffect(() => {
    async function fetchExpiring() {
      setExpiringLoading(true);
      try {
        const res = await fetch(`/api/compliance/evidence-expiring?days=30&framework=${encodeURIComponent(framework)}`, {
          credentials: 'include',
          headers: { 'x-tenant-id': tenantId },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Failed to load expiring evidence (${res.status})`);
        const items = Array.isArray(json?.evidence) ? json.evidence : Array.isArray(json?.items) ? json.items : [];
        setExpiring(items);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load expiring evidence:', err);
        setExpiring([]);
      } finally {
        setExpiringLoading(false);
      }
    }
    fetchExpiring();
  }, [tenantId, framework]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mb-4 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-8">
      <div className="bg-danger-50 border-2 border-red-200 rounded-2xl p-6 max-w-2xl mx-auto">
        <h2 className="text-danger-600 text-xl font-bold mb-2">Error loading data</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-danger-600 text-white rounded-xl hover:bg-danger-700"
        >
          Retry
        </button>
      </div>
    </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <PageHeader
        title="Compliance Overview"
        description="Monitor audit readiness, coverage, and control status for the selected framework and audit period."
        icon={ClipboardCheck}
        breadcrumbs={[
          { label: 'GRC / Compliance' },
          { label: 'Compliance Overview' },
        ]}
        stats={[
          { label: 'Controls', value: metrics?.total_controls ?? controls.length },
          { label: 'Framework', value: String(selectedFramework || '').toUpperCase() },
        ]}
      />

      <div className="p-8 space-y-8 w-full">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <SectionHeader title="Audit Scope" subtitle="Choose framework, period, and time range for metrics" icon={Shield} color="blue" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Framework</div>
              <FrameworkSelector selected={selectedFramework} onChange={setSelectedFramework} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Audit period</div>
              <AuditPeriodSelector framework={framework} value={periodId} onChange={setPeriodId} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Time range</div>
              <select
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={() => fetchComplianceData()}
              disabled={loading}
              title="Recalculate metrics for the selected framework, audit period, and time range"
            >
              Refresh
            </button>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={!periodId}
              title="Export an auditor-ready package for the selected audit period"
              onClick={() => {
                if (!periodId) return;
                window.location.href = `/api/auditor-pack?framework=${encodeURIComponent(framework)}&periodId=${encodeURIComponent(periodId)}`;
              }}
            >
              Export Audit Packet
            </button>
            <a
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              href="/compliance/requests"
              title="View and manage evidence requests across controls in scope"
            >
              Evidence Requests
            </a>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Coverage"
            value={`${Number(metrics?.coverage_pct || 0)}%`}
            subtitle={`Submitted ${Number(metrics?.submitted || 0)} · Missing ${Number(metrics?.missing || 0)}`}
            icon={ClipboardCheck}
            color="blue"
            progress={Number(metrics?.coverage_pct || 0)}
          />
          <MetricCard
            title="Effectiveness"
            value={`${Number(metrics?.effectiveness_pct || 0)}%`}
            subtitle={`Tested ${Number(metrics?.tested || 0)} · Untested ${Number(metrics?.untested || 0)}`}
            icon={Shield}
            color="green"
            progress={Number(metrics?.effectiveness_pct || 0)}
          />
          <MetricCard
            title="Reviewed"
            value={`${Number(metrics?.reviewed_pct || 0)}%`}
            subtitle={`Pending ${Number(metrics?.pending || 0)} · Rejected ${Number(metrics?.rejected || 0)}`}
            icon={FileText}
            color="purple"
            progress={Number(metrics?.reviewed_pct || 0)}
          />
          <MetricCard
            title="Overdue"
            value={Number(metrics?.overdue || 0)}
            subtitle="Evidence overdue"
            icon={ClipboardCheck}
            color="orange"
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <SectionHeader
            title="Automation Coverage"
            subtitle="Controls continuously enforced by playbooks."
            icon={Zap}
            color="orange"
            action={
              <div className="text-sm font-semibold text-gray-900">
                {automationLoading ? '…' : `${automationMetrics.automation_coverage}%`}
              </div>
            }
          />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm text-gray-600">Total Controls</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">
                {automationLoading ? '—' : automationMetrics.total_controls}
              </div>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-sm text-gray-600">Automated Controls</div>
              <div className="mt-2 text-3xl font-semibold text-orange-600">
                {automationLoading ? '—' : automationMetrics.automated_controls}
              </div>
              <div className="mt-1 text-xs text-orange-700">
                ⚡ {automationLoading ? '—' : `${automationMetrics.automation_coverage}% coverage`}
              </div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="text-sm text-gray-600">Avg Effectiveness</div>
              <div className="mt-2 text-3xl font-semibold text-green-700">
                {automationLoading ? '—' : `${automationMetrics.avg_effectiveness}%`}
              </div>
              <div className="mt-1 text-xs text-green-700">Automated controls</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm text-gray-600">Manual Controls</div>
              <div className="mt-2 text-3xl font-semibold text-blue-700">
                {automationLoading
                  ? '—'
                  : Math.max(automationMetrics.total_controls - automationMetrics.automated_controls, 0)}
              </div>
              <div className="mt-1 text-xs text-blue-700">Requires manual testing</div>
            </div>
          </div>
        </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
        <SectionHeader
          title="Evidence expiring soon"
          subtitle="Evidence with an explicit expiration date approaching (next 30 days)."
          icon={FileText}
          color="orange"
          action={<div className="text-sm font-semibold text-gray-900">{expiringLoading ? '…' : String(expiring.length)}</div>}
        />
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-2">Control</th>
                <th className="px-4 py-2">Evidence</th>
                <th className="px-4 py-2">Expires</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expiringLoading ? (
                <tr><td className="px-4 py-3 text-gray-600" colSpan={4}>Loading…</td></tr>
              ) : expiring.length === 0 ? (
                <tr><td className="px-4 py-3 text-gray-600" colSpan={4}>No evidence expiring in the next 30 days.</td></tr>
              ) : (
                expiring.slice(0, 5).map((e) => {
                  const exp = e?.expiration_date ? new Date(String(e.expiration_date)) : null;
                  const days =
                    exp && Number.isFinite(exp.getTime())
                      ? Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;
                  return (
                    <tr
                      key={String(e.evidence_id || `${e.control_id}-${e.expiration_date || 'na'}`)}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-2">
                        <a className="font-mono text-xs text-primary-600 hover:text-primary-700" href={`/controls/${encodeURIComponent(String(e.control_id || ''))}`}>
                          {String(e.control_id || '')}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-gray-800">{String(e?.evidence_title || `${String(e.control_id || '')} evidence`)}</td>
                      <td className="px-4 py-2">
                        {e?.expiration_date ? (
                          <span
                            className={`rounded-full border px-2 py-1 text-xs ${
                              days != null && days <= 7
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : days != null && days <= 14
                                  ? 'border-orange-200 bg-orange-50 text-orange-800'
                                  : 'border-yellow-200 bg-yellow-50 text-yellow-800'
                            }`}
                          >
                            {String(e.expiration_date).slice(0, 10)}
                            {days != null ? ` · ${days}d` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          className="text-primary-600 hover:text-primary-700"
                          href={`/compliance/controls/${encodeURIComponent(String(e.control_id || ''))}/workbench?framework=${encodeURIComponent(
                            String(e.framework || framework)
                          )}&evidenceId=${encodeURIComponent(String(e.evidence_id || ''))}`}
                        >
                          Open Control
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {expiring.length > 5 ? <div className="mt-2 text-xs text-gray-600">Showing 5 of {expiring.length}.</div> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Controls</h2>
          <p className="mt-1 text-sm text-gray-600">Control status across evidence, review, and tests.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-5 py-3">Control</th>
                <th className="px-5 py-3">Applicability</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Evidence</th>
                <th className="px-5 py-3">Review</th>
                <th className="px-5 py-3">Test</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {controls.map((c) => {
                const evidenceStatus = String(c.evidence_status || 'missing').toLowerCase();
                const reviewStatus = String(c.review_status || 'missing').toLowerCase();
                const testStatus = String(c.test_status || 'untested').toLowerCase();
                const workbenchHref = periodId
                  ? `/compliance/controls/${encodeURIComponent(c.control_id)}/workbench?framework=${encodeURIComponent(
                      framework
                    )}&periodId=${encodeURIComponent(periodId)}`
                  : `/compliance/controls/${encodeURIComponent(c.control_id)}/workbench?framework=${encodeURIComponent(framework)}`;
                return (
                  <tr key={c.control_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900">{c.control_id}</div>
                      <div className="text-gray-700">{c.title}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs">
                        {String(c.applicability || 'in scope')}
                      </span>
                    </td>
                    <td className="px-5 py-3">{c.owner || '-'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          evidenceStatus === 'submitted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {evidenceStatus === 'submitted' ? 'Submitted' : 'Missing'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          reviewStatus === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : reviewStatus === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : reviewStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {reviewStatus === 'approved'
                          ? 'Approved'
                          : reviewStatus === 'rejected'
                            ? 'Rejected'
                            : reviewStatus === 'pending'
                              ? 'Pending'
                              : 'Missing'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          testStatus === 'passed'
                            ? 'bg-green-100 text-green-800'
                            : testStatus === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {testStatus === 'passed'
                          ? 'Passed'
                          : testStatus === 'failed'
                            ? 'Failed'
                            : testStatus === 'needs_review'
                              ? 'Needs Review'
                              : 'Untested'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-700">
                      {c.due_date ? String(c.due_date).slice(0, 10) : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          href={workbenchHref}
                          title="Open the Control Workbench to manage evidence, testing, risks, and audit readiness"
                        >
                          Open Control
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!controls.length ? (
                <tr>
                  <td className="px-5 py-6 text-gray-600" colSpan={8}>
                    No controls returned for this framework.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}

