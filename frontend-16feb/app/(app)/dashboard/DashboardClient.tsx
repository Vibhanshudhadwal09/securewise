'use client';
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button as AntButton,
  Card,
  Col,
  Divider,
  Drawer,
  Dropdown,
  Input,
  InputNumber,
  Row,
  Skeleton,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import {
  LogoutOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { Heatmap } from './heatmap';
import { useShell } from '../../../components/layout/AppShell';
import { SecuritySignalsKpiTiles } from '../../../components/security-signals/SecuritySignalsKpiTiles';
import { SecuritySignalsTimelineChart } from '../../../components/security-signals/SecuritySignalsTimeline';
import { SecuritySignalsAlertsTable } from '../../../components/security-signals/SecuritySignalsAlertsTable';
import { HelpButton } from '@/components/help/HelpPanel';
import HelpPanel from '@/components/help/HelpPanel';
import EmptyState from '@/components/help/EmptyState';
import { helpContent } from '@/config/helpContent';
import { useToast } from '@/components/ui/Toast';
import { KpiSkeleton } from '@/components/ui/LoadingStates';
import { FadeIn } from '@/components/ui/Transitions';
import { Button } from '@/components/Button';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { SectionHeader } from '@/components/SectionHeader';
import { Activity, AlertTriangle, CheckCircle, FileText, Shield } from 'lucide-react';

type Enforceability = 'all' | 'realtime_enforceable' | 'procedural_attestation';
type RangePreset = '1h' | '24h' | '7d' | '30d';

type Tenant = { tenant_id: string; name: string };

type SecuritySignalsSummary = {
  alertsTotal: number;
  severity: { critical: number; high: number; medium: number; low: number };
  cisFailures: number;
  mitreTactics: number;
  evidenceFreshnessHours?: number | null;
  partial: boolean;
};

type SecuritySignalsTimeline = {
  interval: '1h' | '6h' | '1d';
  points: Array<{ ts: string; count: number }>;
  partial: boolean;
};

type SecuritySignalsAlertItem = {
  timestamp: string;
  agent: string;
  severity: number;
  rule: string;
  frameworks: string[];
  mitre: string[];
  message: string;
};

type SecuritySignalsAlertsPage = {
  items: SecuritySignalsAlertItem[];
  nextCursor: string | null;
  partial: boolean;
};

type SecuritySignalsCompliance = {
  framework: 'CIS' | 'PCI' | 'GDPR';
  failures: Array<{ control: string; count: number }>;
  partial: boolean;
};

type SecuritySignalsHealth = {
  opensearch: 'healthy' | 'warning' | 'unhealthy';
  latencyMs: number | null;
  partial: boolean;
};

type EvidenceLedgerItem = {
  control_id: string;
  asset_id: string;
  source: string;
  captured_at: string;
  expires_at: string | null;
  raw_ref: { index: string; docId: string } | null;
  summary: string;
};

type CoverageControl = {
  control_id: string;
  name: string;
  enforceability: string;
  has_evidence: boolean;
  last_evidence_at?: string | null;
  evidence_age_hours?: number | null;
  is_stale?: boolean;
};

type StaleEvidenceRow = {
  control_id: string;
  asset_id: string;
  source: string;
  captured_at: string;
  age_hours: number;
};

function getCookie(name: string): string | null {
  const parts = String(document.cookie || '').split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.split('=').slice(1).join('='));
  } catch {
    return hit.split('=').slice(1).join('=');
  }
}

function setCookie(name: string, value: string) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; samesite=lax`;
}

function severityColor(level: number | undefined): string {
  const n = Number(level || 0);
  if (n >= 12) return 'red';
  if (n >= 8) return 'volcano';
  if (n >= 5) return 'gold';
  if (n >= 3) return 'blue';
  return 'default';
}

function isoLabel(ts: any): string {
  const s = String(ts || '');
  if (!s) return '';
  // Keep compact; signals store often returns ISO strings.
  try {
    const d = new Date(s);
    if (Number.isFinite(d.getTime())) return d.toISOString().replace('T', ' ').replace('Z', '');
  } catch {
    // ignore
  }
  return s;
}

async function fetchJson(path: string, tenantId: string) {
  const res = await fetch(path, {
    method: 'GET',
    credentials: 'include',
    headers: { 'x-tenant-id': tenantId },
    cache: 'no-store',
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = j?.error || j?.message || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return j;
}

export function DashboardClient(props: {
  initialTenantId: string;
  initialSlaHours: number;
  initialEnforceability: Enforceability;
  initialStaleOnly: boolean;
  initialQ: string;
  initialRange: RangePreset;
  initialEvidencePreview?: any[];
}) {
  const router = useRouter();
  const { reportPartial } = useShell();
  // tenantId/range come from URL (TopBar keeps them synced)
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || props.initialTenantId || 'demo-tenant';
  const range = (sp?.get('range') as any) || props.initialRange || '24h';

  const [slaHours, setSlaHours] = useState<number>(props.initialSlaHours || 72);
  const [enforceability, setEnforceability] = useState<Enforceability>(props.initialEnforceability || 'all');
  const [staleOnly, setStaleOnly] = useState<boolean>(Boolean(props.initialStaleOnly));
  const [q, setQ] = useState<string>(props.initialQ || '');

  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});

  const [wazuhManagerHealthy, setWazuhManagerHealthy] = useState<boolean>(false);
  const [wazuhAgents, setWazuhAgents] = useState<any[]>([]);
  const [grcSignals, setGrcSignals] = useState<any>(null);
  const [alertQ, setAlertQ] = useState<string>('');
  const [selectedAlert, setSelectedAlert] = useState<SecuritySignalsAlertItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState(false);
  const toast = useToast();
  const [calculating, setCalculating] = useState(false);

  const [coverage, setCoverage] = useState<any>(null);
  const [stale, setStale] = useState<any>(null);

  const ssQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tenantId', tenantId);
    p.set('range', range);
    return p.toString();
  }, [tenantId, range]);

  const ssFetcher = (url: string) => fetchJson(url, tenantId);

  const { data: ssHealth, error: ssHealthErr, isLoading: ssHealthLoading } = useSWR<SecuritySignalsHealth>(
    tenantId ? `/api/security-signals/health?tenantId=${encodeURIComponent(tenantId)}` : null,
    ssFetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const { data: ssSummary, error: ssSummaryErr, isLoading: ssSummaryLoading } = useSWR<SecuritySignalsSummary>(
    tenantId ? `/api/security-signals/summary?${ssQuery}` : null,
    ssFetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const { data: ssTimeline, error: ssTimelineErr, isLoading: ssTimelineLoading } = useSWR<SecuritySignalsTimeline>(
    tenantId ? `/api/security-signals/timeline?${ssQuery}` : null,
    ssFetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const { data: ssComplianceCis, error: ssComplianceCisErr, isLoading: ssComplianceCisLoading } = useSWR<SecuritySignalsCompliance>(
    tenantId ? `/api/security-signals/compliance?${ssQuery}&framework=CIS` : null,
    ssFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const { data: ssCompliancePci, error: ssCompliancePciErr, isLoading: ssCompliancePciLoading } = useSWR<SecuritySignalsCompliance>(
    tenantId ? `/api/security-signals/compliance?${ssQuery}&framework=PCI` : null,
    ssFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const { data: ssComplianceGdpr, error: ssComplianceGdprErr, isLoading: ssComplianceGdprLoading } = useSWR<SecuritySignalsCompliance>(
    tenantId ? `/api/security-signals/compliance?${ssQuery}&framework=GDPR` : null,
    ssFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const { data: evidenceLedger, error: evidenceLedgerErr, isLoading: evidenceLedgerLoading } = useSWR<{ items: EvidenceLedgerItem[] }>(
    tenantId ? `/api/evidence?tenantId=${encodeURIComponent(tenantId)}&limit=10` : null,
    ssFetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: false,
      fallbackData: { items: (props.initialEvidencePreview || []) as EvidenceLedgerItem[] },
    }
  );

  const [alertsDrill, setAlertsDrill] = useState<{
    severityBand?: 'critical' | 'high' | 'medium' | 'low';
    framework?: 'CIS' | 'PCI' | 'GDPR';
    fromTs?: string;
    toTs?: string;
  }>({});

  const alertsGetKey = (pageIndex: number, previousPageData: SecuritySignalsAlertsPage | null) => {
    if (!tenantId) return null;
    if (previousPageData && !previousPageData.nextCursor) return null;
    const cursor = pageIndex === 0 ? '' : `&cursor=${encodeURIComponent(String(previousPageData?.nextCursor || ''))}`;
    return `/api/security-signals/alerts?${ssQuery}&limit=50${cursor}`;
  };

  const { data: ssAlertsPages, error: ssAlertsErr, isLoading: ssAlertsLoading, size: ssAlertsSize, setSize: setSsAlertsSize } =
    useSWRInfinite<SecuritySignalsAlertsPage>(alertsGetKey as any, ssFetcher as any, { refreshInterval: 30_000, revalidateOnFocus: false });

  const ssAlerts = useMemo(() => {
    const pages = (ssAlertsPages || []) as any[];
    return pages.flatMap((p) => (p?.items || []) as SecuritySignalsAlertItem[]);
  }, [ssAlertsPages]);

  const ssAlertsHasMore = useMemo(() => {
    const last = (ssAlertsPages || [])[Math.max(0, (ssAlertsPages || []).length - 1)] as any;
    return Boolean(last?.nextCursor);
  }, [ssAlertsPages]);

  const ssPartial = Boolean(
    ssHealth?.partial ||
      ssSummary?.partial ||
      ssTimeline?.partial ||
      (ssAlertsPages || []).some((p: any) => Boolean(p?.partial)) ||
      ssComplianceCis?.partial ||
      ssCompliancePci?.partial ||
      ssComplianceGdpr?.partial
  );
  const loadingKpis = Boolean(ssSummaryLoading);

  useEffect(() => {
    reportPartial('dashboard.securitySignals', ssPartial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ssPartial]);

  const urlQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tenantId', tenantId);
    p.set('slaHours', String(slaHours));
    p.set('enforceability', enforceability);
    p.set('staleOnly', String(staleOnly));
    if (q.trim()) p.set('q', q.trim());
    p.set('range', range);
    return p.toString();
  }, [tenantId, slaHours, enforceability, staleOnly, q, range]);

  function syncUrl() {
    router.replace(`/dashboard?${urlQuery}`);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null);
    router.push('/login');
  }

  async function refreshAll() {
    setLoading(true);
    setErr(null);
    setSectionErrors({});
    try {
      const results = await Promise.allSettled([
        fetchJson(`/api/metrics/iso-coverage?slaHours=${encodeURIComponent(String(slaHours))}`, tenantId),
        fetchJson(`/api/metrics/evidence-stale?slaHours=${encodeURIComponent(String(slaHours))}`, tenantId),
        fetchJson('/api/wazuh/manager/health', tenantId),
        fetchJson('/api/wazuh/agents', tenantId),
        fetchJson(`/api/integrations/wazuh-indexer/grc-signals?range=${encodeURIComponent(range)}&slaHours=${encodeURIComponent(String(slaHours))}`, tenantId),
      ]);

      const [isoCoverage, staleEvidence, managerHealth, agents, signals] = results;

      const errs: Record<string, string> = {};
      function unwrap<T>(key: string, r: PromiseSettledResult<T>): T | null {
        if (r.status === 'fulfilled') return r.value;
        errs[key] = String((r.reason as any)?.message || r.reason || 'error');
        return null;
      }

      const covJson: any = unwrap('iso-coverage', isoCoverage);
      const staleJson: any = unwrap('evidence-stale', staleEvidence);
      const mgrHealth: any = unwrap('manager-health', managerHealth);
      const agentsJson: any = unwrap('agents', agents);
      const signalsJson: any = unwrap('grc-signals', signals);

      if (covJson) setCoverage(covJson);
      if (staleJson) setStale(staleJson);

      setWazuhManagerHealthy(Boolean(mgrHealth));
      setWazuhAgents((agentsJson?.items || []) as any[]);
      setGrcSignals(signalsJson?.data || signalsJson);

      setSectionErrors(errs);
      // Only show a top-level error if core GRC endpoints fail.
      const coreErr = errs['iso-coverage'] || errs['evidence-stale'];
      setErr(coreErr ? `Core metrics unavailable: ${coreErr}` : null);
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      setErr(String(e?.message || e || 'Failed to load dashboard'));
    }
  }

  const handleCalculateMetrics = async () => {
    setCalculating(true);
    try {
      // existing calculation logic
      await refreshAll();
      toast.success('Metrics calculated successfully!', 'All compliance metrics have been updated');
    } catch (error: any) {
      toast.error('Failed to calculate metrics', error?.message);
    } finally {
      setCalculating(false);
    }
  };

  // Initial + on core filters change.
  useEffect(() => {
    syncUrl();
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, slaHours, enforceability, staleOnly, q, range]);

  const agentTotals = useMemo(() => {
    const total = wazuhAgents.length;
    const active = wazuhAgents.filter((a) => String(a?.status || '').toLowerCase() === 'active').length;
    const disconnected = wazuhAgents.filter((a) => String(a?.status || '').toLowerCase() === 'disconnected').length;
    return { total, active, disconnected };
  }, [wazuhAgents]);

  const controls: CoverageControl[] = useMemo(() => (coverage?.by_control || []) as CoverageControl[], [coverage]);
  const filteredControls = useMemo(() => {
    return controls.filter((c) => {
      if (enforceability !== 'all' && c.enforceability !== enforceability) return false;
      if (staleOnly && !c.is_stale) return false;
      if (q.trim()) {
        const hay = `${c.control_id} ${c.name}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [controls, enforceability, staleOnly, q]);

  const staleRows: StaleEvidenceRow[] = useMemo(() => ((stale?.items || []) as StaleEvidenceRow[]).slice(0, 200), [stale]);

  const exportCoverage = useMemo(
    () =>
      `/api/metrics/iso-coverage.csv?slaHours=${encodeURIComponent(String(slaHours))}&tenantId=${encodeURIComponent(tenantId)}&enforceability=${encodeURIComponent(enforceability)}&staleOnly=${encodeURIComponent(String(staleOnly))}&q=${encodeURIComponent(q)}`,
    [slaHours, tenantId, enforceability, staleOnly, q]
  );
  const exportStale = useMemo(
    () =>
      `/api/metrics/evidence-stale.csv?slaHours=${encodeURIComponent(String(slaHours))}&tenantId=${encodeURIComponent(tenantId)}&enforceability=${encodeURIComponent(enforceability)}&staleOnly=${encodeURIComponent(String(staleOnly))}&q=${encodeURIComponent(q)}`,
    [slaHours, tenantId, enforceability, staleOnly, q]
  );

  const timelineData = useMemo(() => {
    const items = (ssTimeline?.points || []) as any[];
    return items.map((i: any) => ({
      ts: String(i.ts || ''),
      label: dayjs(String(i.ts || '')).isValid()
        ? dayjs(String(i.ts || '')).format(range === '1h' ? 'HH:mm' : 'MM-DD HH:mm')
        : isoLabel(i.ts || ''),
      count: Number(i.count || 0),
    }));
  }, [ssTimeline, range]);

  const severityPie = useMemo(() => {
    const sev = ssSummary?.severity || null;
    if (!sev) return [];
    return [
      { band: 'critical', count: Number(sev.critical || 0) },
      { band: 'high', count: Number(sev.high || 0) },
      { band: 'medium', count: Number(sev.medium || 0) },
      { band: 'low', count: Number(sev.low || 0) },
    ].filter((x) => x.count > 0);
  }, [ssSummary]);
  const signals = useMemo(() => grcSignals || null, [grcSignals]);
  const topRiskyAgent = useMemo(() => '-', []);

  const filteredAlerts = useMemo(() => {
    const q2 = alertQ.trim().toLowerCase();
    let items = ssAlerts.slice();

    if (alertsDrill.severityBand) {
      items = items.filter((a) => {
        const n = Number(a.severity || 0);
        if (alertsDrill.severityBand === 'critical') return n >= 12;
        if (alertsDrill.severityBand === 'high') return n >= 8 && n < 12;
        if (alertsDrill.severityBand === 'medium') return n >= 4 && n < 8;
        return n < 4;
      });
    }
    if (alertsDrill.framework) {
      items = items.filter((a) => (a.frameworks || []).includes(alertsDrill.framework as any));
    }
    if (alertsDrill.fromTs && alertsDrill.toTs) {
      const from = new Date(alertsDrill.fromTs).getTime();
      const to = new Date(alertsDrill.toTs).getTime();
      if (Number.isFinite(from) && Number.isFinite(to)) {
        items = items.filter((a) => {
          const t = new Date(String(a.timestamp || '')).getTime();
          return Number.isFinite(t) && t >= from && t < to;
        });
      }
    }
    if (q2) {
      items = items.filter((a) => {
        const hay = `${a.timestamp} ${a.agent} ${a.rule} ${(a.frameworks || []).join(' ')} ${(a.mitre || []).join(' ')} ${a.message}`.toLowerCase();
        return hay.includes(q2);
      });
    }
    return items;
  }, [ssAlerts, alertQ, alertsDrill]);

  const alertsColumns: TableColumnsType<SecuritySignalsAlertItem> = useMemo(
    () => [
      {
        title: 'Timestamp',
        dataIndex: 'timestamp',
        width: 210,
        sorter: (a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
        render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{isoLabel(v)}</Typography.Text>,
      },
      {
        title: 'Agent',
        dataIndex: 'agent',
        width: 200,
        render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(v || '-')}</Typography.Text>,
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        width: 110,
        sorter: (a, b) => Number(a?.severity || 0) - Number(b?.severity || 0),
        render: (v) => <Tag color={severityColor(Number(v))}>{String(v ?? '') || '-'}</Tag>,
      },
      {
        title: 'Rule',
        dataIndex: 'rule',
        width: 320,
        render: (v) => <Typography.Text>{String(v || '').slice(0, 90)}</Typography.Text>,
      },
      {
        title: 'Frameworks',
        dataIndex: 'frameworks',
        width: 160,
        render: (v: any) => {
          const arr = Array.isArray(v) ? v : [];
          return arr.length ? (
            <Space wrap size={[4, 4]}>
              {arr.slice(0, 4).map((x: string) => (
                <Tag key={x}>{x}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          );
        },
      },
      {
        title: 'Message',
        dataIndex: 'message',
        render: (v: any) => {
          const msg = String(v || '');
          return (
            <Tooltip title={msg} placement="topLeft">
              <Typography.Text>{msg.slice(0, 140)}</Typography.Text>
            </Tooltip>
          );
        },
      },
    ],
    []
  );

  const controlsColumns: TableColumnsType<CoverageControl> = useMemo(
    () => [
      {
        title: 'Control',
        dataIndex: 'control_id',
        width: 160,
        sorter: (a, b) => String(a.control_id).localeCompare(String(b.control_id)),
        render: (v, rec) => (
          <div>
            <Typography.Link href={`/controls/${encodeURIComponent(String(rec.control_id))}?tenantId=${encodeURIComponent(tenantId)}`}>
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(v)}</span>
            </Typography.Link>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{rec.name}</div>
          </div>
        ),
      },
      {
        title: 'Enforceability',
        dataIndex: 'enforceability',
        width: 180,
        filters: [
          { text: 'realtime', value: 'realtime_enforceable' },
          { text: 'procedural', value: 'procedural_attestation' },
        ],
        onFilter: (v, r) => String(r.enforceability) === String(v),
        render: (v) => <Tag>{String(v || '')}</Tag>,
      },
      {
        title: 'Evidence',
        dataIndex: 'has_evidence',
        width: 120,
        render: (v) => (v ? <Tag color="green">yes</Tag> : <Tag>no</Tag>),
      },
      {
        title: 'Last evidence',
        dataIndex: 'last_evidence_at',
        width: 220,
        sorter: (a, b) => String(a.last_evidence_at || '').localeCompare(String(b.last_evidence_at || '')),
        render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>{isoLabel(v)}</Typography.Text>,
      },
      {
        title: 'Age (h)',
        dataIndex: 'evidence_age_hours',
        width: 110,
        sorter: (a, b) => Number(a.evidence_age_hours || 0) - Number(b.evidence_age_hours || 0),
        render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{v ?? '-'}</Typography.Text>,
      },
      {
        title: 'Stale',
        dataIndex: 'is_stale',
        width: 90,
        render: (v) => (v ? <Tag color="red">yes</Tag> : <Tag>no</Tag>),
      },
    ],
    [tenantId]
  );

  const staleColumns: TableColumnsType<StaleEvidenceRow> = useMemo(
    () => [
      { title: 'control_id', dataIndex: 'control_id', width: 140, render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(v)}</Typography.Text> },
      { title: 'asset_id', dataIndex: 'asset_id', width: 180, render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(v)}</Typography.Text> },
      { title: 'source', dataIndex: 'source', width: 180 },
      { title: 'captured_at', dataIndex: 'captured_at', width: 220, render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>{isoLabel(v)}</Typography.Text> },
      { title: 'age_hours', dataIndex: 'age_hours', width: 120, sorter: (a, b) => Number(a.age_hours || 0) - Number(b.age_hours || 0) },
    ],
    []
  );

  const userMenu: MenuProps['items'] = [
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: () => void logout(),
    },
  ];

  const coveragePct = Math.round(Number(coverage?.coverage_pct?.any_evidence || 0));
  const controlsTotal = Number(coverage?.totals?.total || 0);
  const openFindings = Number(ssSummary?.severity?.high || 0) + Number(ssSummary?.severity?.critical || 0);
  const auditReadiness = Math.min(100, Math.max(0, coveragePct || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Compliance Dashboard"
        description="Monitor your security posture and compliance status in real-time."
        icon={Shield}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard' },
        ]}
        stats={[
          { label: 'Last Updated', value: 'Just now' },
          { label: 'Connected Sources', value: wazuhAgents.length },
        ]}
      />

      <div className="p-8 space-y-8">
        <div>
          <SectionHeader title="Key Metrics" subtitle="Overview of compliance and security posture" icon={Activity} color="blue" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Risk Score"
              value={coveragePct || 0}
              subtitle="Controls with evidence"
              icon={Shield}
              color="blue"
              progress={coveragePct || 0}
            />
            <MetricCard
              title="Compliant Controls"
              value={`${Number(coverage?.totals?.with_evidence || 0)}/${controlsTotal}`}
              subtitle="Verified controls"
              icon={CheckCircle}
              color="green"
              progress={coveragePct || 0}
              badge={coveragePct >= 80 ? 'On Track' : 'Needs Attention'}
            />
            <MetricCard
              title="Open Findings"
              value={openFindings || 0}
              subtitle="High & critical"
              icon={AlertTriangle}
              color="orange"
            />
            <MetricCard
              title="Audit Readiness"
              value={`${auditReadiness}%`}
              subtitle="Evidence coverage"
              icon={FileText}
              color="purple"
              progress={auditReadiness}
            />
          </div>
        </div>

        <div className="space-y-6">
          <Row gutter={[12, 12]}>
        <Col span={24}>
          <div style={{ position: 'sticky', top: 90, zIndex: 10 }}>
            <Card bodyStyle={{ padding: 14 }}>
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} md={10}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Text type="secondary">Control search</Typography.Text>
                    <Input.Search value={q} onChange={(e) => setQ(e.target.value)} allowClear placeholder="A.8.9 or logging" />
                  </Space>
                </Col>

                <Col xs={24} md={4}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Text type="secondary">Stale only</Typography.Text>
                    <Switch checked={staleOnly} onChange={(v) => setStaleOnly(v)} />
                  </Space>
                </Col>

                <Col xs={24} md={6}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Text type="secondary">Evidence SLA (hours)</Typography.Text>
                    <InputNumber min={1} max={24 * 30} value={slaHours} onChange={(v) => setSlaHours(Number(v || 72))} style={{ width: '100%' }} />
                  </Space>
                </Col>

                <Col span={24}>
                  <Tabs
                    activeKey={enforceability}
                    onChange={(k) => setEnforceability(k as Enforceability)}
                    items={[
                      { key: 'all', label: 'All' },
                      { key: 'realtime_enforceable', label: 'Realtime' },
                      { key: 'procedural_attestation', label: 'Procedural' },
                    ]}
                  />
                </Col>

                <Col span={24}>
                  <Space wrap>
                    <HelpButton onClick={() => setShowHelp(true)} />
                    <Button variant="primary" loading={calculating} onClick={handleCalculateMetrics}>
                      Calculate All Metrics
                    </Button>
                    <AntButton type="primary" href={`/api/reports/auditor-pack.pdf?slaHours=${encodeURIComponent(String(slaHours))}`}>
                      Download Auditor Pack (PDF)
                    </AntButton>
                    <AntButton href={exportCoverage}>Export coverage CSV</AntButton>
                    <AntButton href={exportStale}>Export stale evidence CSV</AntButton>
                    <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
                      <AntButton>Account</AntButton>
                    </Dropdown>
                    <Tooltip title="Refresh">
                      <AntButton icon={<ReloadOutlined />} onClick={() => void refreshAll()} />
                    </Tooltip>
                  </Space>
                </Col>
              </Row>
            </Card>
          </div>
        </Col>

        <Col span={24}>
          <FadeIn>
            <Row gutter={[12, 12]}>
              <Col span={24}>
                <Spin spinning={loading}>
                  {err ? (
                    <Alert type="error" message="Failed to load dashboard" description={err} showIcon />
                  ) : Object.keys(sectionErrors).length ? (
                    <Alert
                      type="warning"
                      message="Some data sources are unavailable"
                      description={Object.entries(sectionErrors)
                        .slice(0, 4)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' • ')}
                      showIcon
                    />
                  ) : null}
                </Spin>
              </Col>
              {/* rest of content continues below */}

              <Col span={24}>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Signals"
                        value={ssHealthLoading ? 'checking...' : String(ssHealth?.opensearch || (ssHealthErr ? 'unhealthy' : 'warning'))}
                        valueStyle={{ color: ssHealth?.opensearch === 'healthy' ? '#3f8600' : ssHealth?.opensearch === 'warning' ? '#d48806' : '#cf1322' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="Telemetry"
                        value={wazuhManagerHealthy ? 'healthy' : 'unreachable'}
                        valueStyle={{ color: wazuhManagerHealthy ? '#3f8600' : '#cf1322' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      {ssSummaryLoading ? <Skeleton active paragraph={false} /> : <Statistic title={`Total alerts (${range})`} value={Number(ssSummary?.alertsTotal || 0)} />}
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic title="Top risky asset" value={topRiskyAgent} />
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic title="Agents total" value={agentTotals.total} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic title="Agents active" value={agentTotals.active} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic title="Agents disconnected" value={agentTotals.disconnected} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic title="Controls total" value={Number(coverage?.totals?.total || 0)} />
                    </Card>
                  </Col>

                  <Col span={24}>
                    {loadingKpis ? (
                      <div className="grid grid-cols-4 gap-4">
                        <KpiSkeleton count={4} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-4">
                          <SecuritySignalsKpiTiles
                            summary={ssSummary as any}
                            loading={Boolean(ssSummaryLoading)}
                            rangeLabel={String(range)}
                            onClickSeverity={(band) => setAlertsDrill({ severityBand: band })}
                            onClickFramework={(fw) => setAlertsDrill({ framework: fw })}
                          />
                        </div>
                      </div>
                    )}
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          router.push(
                            `/controls?tenantId=${encodeURIComponent(tenantId)}&staleOnly=true&slaHours=${encodeURIComponent(String(slaHours))}`
                          )
                        }
                      >
                        <Statistic title="Controls degraded" value={Number(signals?.controlsDegraded || 0)} />
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <div
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          router.push(
                            `/controls?tenantId=${encodeURIComponent(tenantId)}&staleOnly=true&slaHours=${encodeURIComponent(String(slaHours))}`
                          )
                        }
                      >
                        <Statistic title="Stale evidence controls" value={Number(signals?.staleEvidenceControls || 0)} />
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic title="Coverage (any evidence)" value={Number(coverage?.coverage_pct?.any_evidence || 0)} suffix="%" />
                    </Card>
                  </Col>
                </Row>
              </Col>

              <Col span={24}>
                <Row gutter={[12, 12]}>
                  <Col span={24}>
                    <Card title="Security Signals" extra={<Tag>{range}</Tag>}>
                      {(ssPartial ||
                        ssHealthErr ||
                        ssSummaryErr ||
                        ssTimelineErr ||
                        ssAlertsErr ||
                        ssComplianceCisErr ||
                        ssCompliancePciErr ||
                        ssComplianceGdprErr) ? (
                        <Alert
                          type="warning"
                          showIcon
                          style={{ marginBottom: 12 }}
                          message={ssPartial ? 'Partial security-signal data (showing what is available)' : 'Some security-signal panels are unavailable'}
                          description={[
                            ssHealthErr ? `Health: ${String((ssHealthErr as any)?.message || ssHealthErr)}` : null,
                            ssSummaryErr ? `Summary: ${String((ssSummaryErr as any)?.message || ssSummaryErr)}` : null,
                            ssTimelineErr ? `Timeline: ${String((ssTimelineErr as any)?.message || ssTimelineErr)}` : null,
                            ssAlertsErr ? `Alerts: ${String((ssAlertsErr as any)?.message || ssAlertsErr)}` : null,
                            ssComplianceCisErr ? `CIS: ${String((ssComplianceCisErr as any)?.message || ssComplianceCisErr)}` : null,
                            ssCompliancePciErr ? `PCI: ${String((ssCompliancePciErr as any)?.message || ssCompliancePciErr)}` : null,
                            ssComplianceGdprErr ? `GDPR: ${String((ssComplianceGdprErr as any)?.message || ssComplianceGdprErr)}` : null,
                          ].filter(Boolean).join(' • ')}
                        />
                      ) : null}
                      <Row gutter={[12, 12]}>
                        <Col xs={24} lg={12}>
                          <SecuritySignalsTimelineChart
                            title="Signal trend"
                            range={String(range)}
                            timeline={ssTimeline as any}
                            loading={Boolean(ssTimelineLoading)}
                            onBucketClick={(fromIso, toIso) => setAlertsDrill((prev) => ({ ...prev, fromTs: fromIso, toTs: toIso }))}
                          />
                        </Col>
                        <Col xs={24} lg={6}>
                          <Card size="small" title="Severity distribution" bodyStyle={{ padding: 6 }}>
                            {ssSummaryLoading ? (
                              <Skeleton active />
                            ) : (
                              <Pie
                                data={severityPie}
                                angleField="count"
                                colorField="band"
                                innerRadius={0.55}
                                height={240}
                                legend={{ position: 'bottom' }}
                                label={{ type: 'inner', content: '{percentage}', style: { fontSize: 10 } }}
                                onReady={(plot) => {
                                  plot.on('element:click', (evt: any) => {
                                    const band = String(evt?.data?.data?.band || '');
                                    if (band === 'critical' || band === 'high' || band === 'medium' || band === 'low') {
                                      setAlertsDrill((prev) => ({ ...prev, severityBand: band as any }));
                                    }
                                  });
                                }}
                              />
                            )}
                          </Card>
                        </Col>
                        <Col xs={24} lg={6}>
                          <Card size="small" title="Compliance failures (top)" bodyStyle={{ padding: 10 }}>
                            {(ssComplianceCisLoading || ssCompliancePciLoading || ssComplianceGdprLoading) ? (
                              <Skeleton active />
                            ) : (
                              <Row gutter={[8, 8]}>
                                <Col span={24}>
                                  <Typography.Text strong>CIS</Typography.Text>
                                  <div style={{ marginTop: 6 }}>
                                    {(ssComplianceCis?.failures || []).slice(0, 6).map((x) => (
                                      <Tag key={`cis-${x.control}`} style={{ marginBottom: 6 }}>
                                        {x.control} • {x.count}
                                      </Tag>
                                    ))}
                                    {(!ssComplianceCis?.failures || ssComplianceCis.failures.length === 0) ? (
                                      <Typography.Text type="secondary">No CIS tags detected.</Typography.Text>
                                    ) : null}
                                  </div>
                                </Col>
                                <Col span={24}>
                                  <Typography.Text strong>PCI DSS</Typography.Text>
                                  <div style={{ marginTop: 6 }}>
                                    {(ssCompliancePci?.failures || []).slice(0, 6).map((x) => (
                                      <Tag key={`pci-${x.control}`} style={{ marginBottom: 6 }}>
                                        {x.control} • {x.count}
                                      </Tag>
                                    ))}
                                    {(!ssCompliancePci?.failures || ssCompliancePci.failures.length === 0) ? (
                                      <Typography.Text type="secondary">No PCI tags detected.</Typography.Text>
                                    ) : null}
                                  </div>
                                </Col>
                                <Col span={24}>
                                  <Typography.Text strong>GDPR</Typography.Text>
                                  <div style={{ marginTop: 6 }}>
                                    {(ssComplianceGdpr?.failures || []).slice(0, 6).map((x) => (
                                      <Tag key={`gdpr-${x.control}`} style={{ marginBottom: 6 }}>
                                        {x.control} • {x.count}
                                      </Tag>
                                    ))}
                                    {(!ssComplianceGdpr?.failures || ssComplianceGdpr.failures.length === 0) ? (
                                      <Typography.Text type="secondary">No GDPR tags detected.</Typography.Text>
                                    ) : null}
                                  </div>
                                </Col>
                              </Row>
                            )}
                          </Card>
                        </Col>
                      </Row>

                      <Divider />

                      <Row gutter={[12, 12]}>
                        <Col span={24}>
                          <Card size="small" title="Control health (heuristic)" bodyStyle={{ padding: 10 }}>
                            {(signals?.topControlIssues || []).length ? (
                              <Table
                                rowKey={(r: any) => String(r.controlKey)}
                                size="small"
                                pagination={false}
                                columns={[
                                  {
                                    title: 'Control',
                                    dataIndex: 'controlKey',
                                    width: 160,
                                    render: (v: any) => (
                                      <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(v)}</Typography.Text>
                                    ),
                                  },
                                  { title: 'Count', dataIndex: 'count', width: 80 },
                                  { title: 'Reason', dataIndex: 'reason' },
                                ]}
                                dataSource={(signals?.topControlIssues || []).slice(0, 10)}
                              />
                            ) : (
                              <EmptyState
                                type="default"
                                title="No control signals"
                                description="No control signals derived for this range."
                                actionLabel="Refresh dashboard"
                                onAction={() => void refreshAll()}
                                showQuickStart={false}
                                className="min-h-0 py-6"
                              />
                            )}
                          </Card>
                        </Col>
                      </Row>

                      <Divider />

                      <Row gutter={[12, 12]} align="middle">
                        <Col span={24}>
                          {(alertsDrill.severityBand || alertsDrill.framework || (alertsDrill.fromTs && alertsDrill.toTs)) ? (
                            <div style={{ marginBottom: 10 }}>
                              <Space wrap>
                                <Tag color="gold">Drill-down active</Tag>
                                {alertsDrill.severityBand ? <Tag>Severity: {alertsDrill.severityBand}</Tag> : null}
                                {alertsDrill.framework ? <Tag>Framework: {alertsDrill.framework}</Tag> : null}
                                {alertsDrill.fromTs && alertsDrill.toTs ? (
                                  <Tag>
                                    Time: {isoLabel(alertsDrill.fromTs)} → {isoLabel(alertsDrill.toTs)}
                                  </Tag>
                                ) : null}
                                <AntButton size="small" onClick={() => setAlertsDrill({})}>
                                  Clear
                                </AntButton>
                              </Space>
                            </div>
                          ) : null}

                          <SecuritySignalsAlertsTable
                            items={filteredAlerts}
                            loading={Boolean(ssAlertsLoading)}
                            hasMore={Boolean(ssAlertsHasMore)}
                            onLoadMore={() => void setSsAlertsSize(ssAlertsSize + 1)}
                            search={alertQ}
                            onSearchChange={setAlertQ}
                            onRowClick={(rec) => {
                              setSelectedAlert(rec);
                              setDrawerOpen(true);
                            }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>

                  <Col span={24}>
                    <Card
                      title="Evidence ledger (latest 10)"
                      extra={
                        <Typography.Link href={`/evidence?tenantId=${encodeURIComponent(tenantId)}`}>
                          View all
                        </Typography.Link>
                      }
                    >
                      {evidenceLedgerErr ? (
                        <Alert type="warning" showIcon message="Evidence ledger unavailable" description={String((evidenceLedgerErr as any)?.message || evidenceLedgerErr)} />
                      ) : evidenceLedgerLoading ? (
                        <Skeleton active />
                      ) : (
                        <Table<EvidenceLedgerItem>
                          rowKey={(_, i) => String(i)}
                          size="small"
                          pagination={false}
                          dataSource={(evidenceLedger?.items || []).slice(0, 10)}
                          columns={[
                            {
                              title: 'captured_at',
                              dataIndex: 'captured_at',
                              width: 220,
                              render: (v) => (
                                <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>
                                  {isoLabel(v)}
                                </Typography.Text>
                              ),
                            },
                            {
                              title: 'control_id',
                              dataIndex: 'control_id',
                              width: 120,
                              render: (v) => (
                                <Typography.Link
                                  href={`/evidence?tenantId=${encodeURIComponent(tenantId)}&controlId=${encodeURIComponent(String(v || ''))}`}
                                >
                                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(v || '')}</span>
                                </Typography.Link>
                              ),
                            },
                            {
                              title: 'asset_id',
                              dataIndex: 'asset_id',
                              width: 220,
                              render: (v) => (
                                <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>
                                  {String(v || '')}
                                </Typography.Text>
                              ),
                            },
                            { title: 'summary', dataIndex: 'summary', render: (v) => <Typography.Text>{String(v || '').slice(0, 120)}</Typography.Text> },
                          ]}
                        />
                      )}
                    </Card>
                  </Col>

                  <Col span={24}>
                    <Card title="ISO family heatmap">
                      <Heatmap rollup={coverage?.family_rollup || {}} />
                    </Card>
                  </Col>

                  <Col span={24}>
                    <Card title={`Stale Evidence (top ${staleRows.length})`}>
                      <Table<StaleEvidenceRow>
                        rowKey={(_, i) => String(i)}
                        columns={staleColumns}
                        dataSource={staleRows}
                        size="small"
                        pagination={{ pageSize: 25, showSizeChanger: true }}
                      />
                    </Card>
                  </Col>

                  <Col span={24}>
                    <Card title={`Coverage by Control (filtered: ${filteredControls.length})`}>
                      <Table<CoverageControl>
                        rowKey={(r) => r.control_id}
                        columns={controlsColumns}
                        dataSource={filteredControls}
                        size="small"
                        pagination={{ pageSize: 25, showSizeChanger: true }}
                      />
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>
          </FadeIn>
        </Col>
      </Row>

      <Drawer
        title="Signal details"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
        destroyOnClose
        extra={
          <Space>
            <AntButton
              onClick={async () => {
                if (!selectedAlert) return;
                await navigator.clipboard.writeText(JSON.stringify(selectedAlert, null, 2)).catch(() => null);
                message.success('Copied JSON');
              }}
            >
              Copy JSON
            </AntButton>
          </Space>
        }
      >
        {!selectedAlert ? (
          <Typography.Text type="secondary">No signal selected.</Typography.Text>
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Typography.Text type="secondary">Timestamp</Typography.Text>
                  <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{isoLabel(selectedAlert.timestamp)}</div>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Severity</Typography.Text>
                  <div>
                    <Tag color={severityColor(selectedAlert?.severity)}>{String(selectedAlert?.severity ?? '-')}</Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Agent</Typography.Text>
                  <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{selectedAlert?.agent || '-'}</div>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary">Rule</Typography.Text>
                  <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{selectedAlert?.rule || '-'}</div>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Message">
              <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{selectedAlert.message || ''}</Typography.Paragraph>
            </Card>

            <Card size="small" title="Raw event payload">
              <Typography.Text type="secondary">Raw event payload (may include original tool names).</Typography.Text>
              <pre style={{ margin: '10px 0 0 0', fontSize: 12, overflowX: 'auto' }}>{JSON.stringify(selectedAlert, null, 2)}</pre>
            </Card>
          </Space>
        )}
      </Drawer>

      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        content={helpContent.dashboard}
        title="Dashboard Help"
      />
    </div>
    </div>
    </div>
  );
}

