'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, FileText, Shield, Zap } from 'lucide-react';
import FrameworkSelector, { type FrameworkName } from '@/components/FrameworkSelector';
import { AuditPeriodSelector } from '@/components/grc/AuditPeriodSelector';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Loading } from '@/components/ui/Loading';

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
  if (typeof document === 'undefined') return null;
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

  // Use full width 
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
    return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]"><Loading /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-6 max-w-2xl mx-auto backdrop-blur-md">
          <h2 className="text-red-500 text-xl font-bold mb-2">Error loading data</h2>
          <p className="text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
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

      <div className="p-8 space-y-8 w-full max-w-[1600px] mx-auto">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] backdrop-blur-md">
          <SectionHeader title="Audit Scope" subtitle="Choose framework, period, and time range for metrics" icon={Shield} color="blue" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Framework</div>
              <FrameworkSelector selected={selectedFramework} onChange={setSelectedFramework} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Audit period</div>
              <AuditPeriodSelector framework={framework} value={periodId} onChange={setPeriodId} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Time range</div>
              <select
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="24h" className="bg-[var(--bg-primary)]">Last 24 hours</option>
                <option value="7d" className="bg-[var(--bg-primary)]">Last 7 days</option>
                <option value="30d" className="bg-[var(--bg-primary)]">Last 30 days</option>
                <option value="90d" className="bg-[var(--bg-primary)]">Last 90 days</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors disabled:opacity-60"
              onClick={() => fetchComplianceData()}
              disabled={loading}
              title="Recalculate metrics for the selected framework, audit period, and time range"
            >
              Refresh
            </button>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-[0_0_10px_rgba(37,99,235,0.3)] disabled:opacity-60"
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
              className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors"
              href="/compliance/requests"
              title="View and manage evidence requests across controls in scope"
            >
              Evidence Requests
            </a>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
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

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] backdrop-blur-md">
          <SectionHeader
            title="Automation Coverage"
            subtitle="Controls continuously enforced by playbooks."
            icon={Zap}
            color="orange"
            action={
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {automationLoading ? '…' : `${automationMetrics.automation_coverage}%`}
              </div>
            }
          />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] p-4">
              <div className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Controls</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
                {automationLoading ? '—' : automationMetrics.total_controls}
              </div>
            </div>
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">Automated Controls</div>
              <div className="mt-2 text-3xl font-semibold text-orange-500">
                {automationLoading ? '—' : automationMetrics.automated_controls}
              </div>
              <div className="mt-1 text-xs text-orange-400/80">
                ⚡ {automationLoading ? '—' : `${automationMetrics.automation_coverage}% coverage`}
              </div>
            </div>
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
              <div className="text-xs font-bold text-green-400 uppercase tracking-wider">Avg Effectiveness</div>
              <div className="mt-2 text-3xl font-semibold text-green-500">
                {automationLoading ? '—' : `${automationMetrics.avg_effectiveness}%`}
              </div>
              <div className="mt-1 text-xs text-green-400/80">Automated controls</div>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Manual Controls</div>
              <div className="mt-2 text-3xl font-semibold text-blue-500">
                {automationLoading
                  ? '—'
                  : Math.max(automationMetrics.total_controls - automationMetrics.automated_controls, 0)}
              </div>
              <div className="mt-1 text-xs text-blue-400/80">Requires manual testing</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] backdrop-blur-md">
          <div className="border-b border-[var(--card-border)] px-5 py-4">
            <SectionHeader
              title="Evidence expiring soon"
              subtitle="Evidence with an explicit expiration date approaching (next 30 days)."
              icon={FileText}
              color="orange"
              action={<div className="text-sm font-semibold text-[var(--text-primary)]">{expiringLoading ? '…' : String(expiring.length)}</div>}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
              <thead className="bg-[rgba(15,23,42,0.6)] text-left text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                <tr>
                  <th className="px-4 py-3">Control</th>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {expiringLoading ? (
                  <tr><td className="px-4 py-3 text-[var(--text-secondary)]" colSpan={4}>Loading…</td></tr>
                ) : expiring.length === 0 ? (
                  <tr><td className="px-4 py-3 text-[var(--text-secondary)]" colSpan={4}>No evidence expiring in the next 30 days.</td></tr>
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
                        className="hover:bg-[rgba(59,130,246,0.05)] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <a className="font-mono text-xs text-[var(--accent-blue)] hover:text-[var(--accent-cyan)]" href={`/controls/${encodeURIComponent(String(e.control_id || ''))}`}>
                            {String(e.control_id || '')}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">{String(e?.evidence_title || `${String(e.control_id || '')} evidence`)}</td>
                        <td className="px-4 py-3">
                          {e?.expiration_date ? (
                            <span
                              className={`rounded-full border px-2 py-1 text-xs ${days != null && days <= 7
                                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                : days != null && days <= 14
                                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                                  : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                                }`}
                            >
                              {String(e.expiration_date).slice(0, 10)}
                              {days != null ? ` · ${days}d` : ''}
                            </span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            className="text-[var(--accent-blue)] hover:text-[var(--accent-cyan)] font-medium"
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
            {expiring.length > 5 ? <div className="p-4 text-xs text-[var(--text-tertiary)]">Showing 5 of {expiring.length}.</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] backdrop-blur-md">
          <div className="border-b border-[var(--card-border)] px-5 py-4">
            <SectionHeader title="Controls" subtitle="Control status across evidence, review, and tests." />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
              <thead className="bg-[rgba(15,23,42,0.6)] text-left text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
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
              <tbody className="divide-y divide-[var(--card-border)]">
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
                    <tr key={c.control_id} className="hover:bg-[rgba(59,130,246,0.05)] transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">{c.control_id}</div>
                        <div className="text-[var(--text-secondary)]">{c.title}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                          {String(c.applicability || 'in scope')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-secondary)]">{c.owner || '-'}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${evidenceStatus === 'submitted'
                            ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                            : 'bg-red-500/10 text-red-500 border border-red-500/30'
                            }`}
                        >
                          {evidenceStatus === 'submitted' ? 'Submitted' : 'Missing'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${reviewStatus === 'approved'
                            ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                            : reviewStatus === 'rejected'
                              ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                              : reviewStatus === 'pending'
                                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                                : 'bg-slate-500/10 text-slate-500 border border-[var(--card-border)]'
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
                          className={`rounded-full px-2 py-1 text-xs ${testStatus === 'passed'
                            ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                            : testStatus === 'failed'
                              ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                              : 'bg-slate-500/10 text-slate-500 border border-[var(--card-border)]'
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
                      <td className="px-5 py-3 text-xs text-[var(--text-tertiary)]">
                        {c.due_date ? String(c.due_date).slice(0, 10) : '-'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-colors"
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
                    <td className="px-5 py-6 text-[var(--text-secondary)]" colSpan={8}>
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
