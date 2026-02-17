'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type TimeRange = '24h' | '7d' | '30d' | '90d';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type BadgeColor = 'green' | 'red' | 'orange' | 'blue';

interface DashboardMetrics {
  kpis: {
    total_incidents: number;
    critical_incidents: number;
    open_incidents: number;
    incidents_last_24h: number;
    compliance_score: number;
    coverage_pct: number;
    test_pass_rate: number;
    critical_findings: number;
    open_risks: number;
    open_gaps: number;
    evidence_pending: number;
    total_evidence: number;
    evidence_expiring: number;
  };
  incidents: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    resolved: number;
  };
  compliance: {
    score: number;
    coverage_pct: number;
    test_pass_rate: number;
  };
  frameworks: Array<{
    framework: string;
    total_controls: number;
    controls_with_evidence: number;
    coverage_pct: number;
  }>;
  activity_timeline: Array<{
    date: string;
    incident_count: number;
  }>;
}

interface Finding {
  id: string;
  title: string;
  severity: Severity;
  framework: string;
  asset: string;
  status: string;
  timestamp: string;
}

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  timestamp: string;
  status: string;
}

type MetricBadge = {
  text?: string;
  color: BadgeColor;
};

type MetricCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: MetricBadge;
  chips?: string[];
  delay?: number;
  trend?: number;
};

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

const TIME_RANGES: TimeRange[] = ['24h', '7d', '30d', '90d'];
const FRAMEWORK_COLORS = [
  'bg-gradient-to-r from-teal-400 to-teal-600',
  'bg-gradient-to-r from-blue-400 to-blue-600',
  'bg-gradient-to-r from-purple-400 to-purple-600',
  'bg-gradient-to-r from-orange-400 to-orange-600',
];

const FRAMEWORK_LABELS: Record<string, string> = {
  iso27001: 'ISO 27001',
  soc2: 'SOC 2',
  nist: 'NIST',
  cis: 'CIS',
  pci: 'PCI DSS',
  gdpr: 'GDPR',
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function normalizeFramework(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function formatFrameworkLabel(value: string): string {
  const key = normalizeFramework(value);
  return FRAMEWORK_LABELS[key] || value.toUpperCase();
}

function normalizeSeverity(value: any): Severity {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('critical')) return 'critical';
  if (raw.includes('high')) return 'high';
  if (raw.includes('medium')) return 'medium';
  if (raw.includes('low')) return 'low';
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    if (numeric >= 12) return 'critical';
    if (numeric >= 8) return 'high';
    if (numeric >= 4) return 'medium';
  }
  return 'low';
}

function formatRelativeTime(timestamp?: string | null): string {
  if (!timestamp) return 'just now';
  const dt = new Date(timestamp);
  if (Number.isNaN(dt.getTime())) return 'just now';
  return formatDistanceToNow(dt, { addSuffix: true });
}

const FadeIn = ({ children, delay = 0, className }: FadeInProps) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }} className={cn(className)}>
    {children}
  </motion.div>
);

const MetricCard = ({ icon: Icon, title, value, subtitle, badge, chips, delay = 0, trend }: MetricCardProps) => (
  <FadeIn delay={delay}>
    <motion.div whileHover={{ y: -4 }} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            badge?.color === 'green' && 'bg-green-100',
            badge?.color === 'red' && 'bg-red-100',
            badge?.color === 'orange' && 'bg-orange-100',
            badge?.color === 'blue' && 'bg-blue-100'
          )}
        >
          <Icon
            className={cn(
              'w-6 h-6',
              badge?.color === 'green' && 'text-green-600',
              badge?.color === 'red' && 'text-red-600',
              badge?.color === 'orange' && 'text-orange-600',
              badge?.color === 'blue' && 'text-blue-600'
            )}
          />
        </div>
        {typeof trend === 'number' && (
          <div className="flex items-center gap-1 text-xs">
            {trend >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            <span className={trend >= 0 ? 'text-green-600' : 'text-red-600'}>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="mb-2">
        <div className="text-sm text-gray-600 font-medium">{title}</div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <motion.span className="text-4xl font-bold" initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: delay + 0.2 }}>
          {value}
        </motion.span>
        {badge?.text && (
          <span
            className={cn(
              'px-2 py-1 text-xs font-medium rounded',
              badge.color === 'green' && 'bg-green-100 text-green-700',
              badge.color === 'red' && 'bg-red-100 text-red-700',
              badge.color === 'orange' && 'bg-orange-100 text-orange-700',
              badge.color === 'blue' && 'bg-blue-100 text-blue-700'
            )}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && <div className="text-xs text-gray-500 mb-3">{subtitle}</div>}

      {chips && chips.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {chips.map((chip) => (
            <span key={chip} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
              {chip}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  </FadeIn>
);

export default function CommandCenter() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [selectedFramework, setSelectedFramework] = useState('iso27001');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchJson = useCallback(
    async <T,>(url: string): Promise<T> => {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = body?.error || res.statusText || 'Request failed';
        throw new Error(message);
      }
      return res.json();
    },
    [tenantId]
  );

  const fetchDashboardData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        setError(null);
        if (!silent) setLoading(true);

        const [metricsResult, gapsResult, alertsResult] = await Promise.allSettled([
          fetchJson<DashboardMetrics>(`/api/dashboard/metrics?timeRange=${timeRange}`),
          fetchJson<{ gaps?: any[] }>(`/api/compliance-gaps?status=open&limit=10&sort_by=severity`),
          fetchJson<{ items?: any[] }>(`/api/security-signals/alerts?range=${timeRange}&limit=5`),
        ]);

        if (metricsResult.status === 'rejected') {
          throw metricsResult.reason;
        }

        const metricsData = metricsResult.value;
        setMetrics(metricsData);

        const gaps = gapsResult.status === 'fulfilled' ? gapsResult.value?.gaps || [] : [];
        const findingsData: Finding[] = gaps.slice(0, 5).map((gap: any, index: number) => ({
          id: String(gap.id || gap.control_id || gap.control_code || `gap-${index}`),
          title: String(gap.gap_description || gap.gap_type || 'Compliance gap'),
          severity: normalizeSeverity(gap.gap_severity || gap.severity || gap.priority),
          framework: formatFrameworkLabel(gap.framework || 'iso27001'),
          asset: String(gap.control_code || gap.control_id || 'N/A'),
          status: String(gap.status || 'open'),
          timestamp: String(gap.created_at || gap.updated_at || new Date().toISOString()),
        }));
        setFindings(findingsData);

        const alertsItems = alertsResult.status === 'fulfilled' ? alertsResult.value?.items || [] : [];
        const alertsData: AlertItem[] = alertsItems.slice(0, 5).map((alert: any, index: number) => ({
          id: `${alert.ruleId || alert.timestamp || index}`,
          title: String(alert.rule || alert.message || 'Security alert'),
          description: String(alert.message || alert.rule || 'Signal detected'),
          severity: normalizeSeverity(alert.severity),
          timestamp: String(alert.timestamp || new Date().toISOString()),
          status: 'Open',
        }));
        setAlerts(alertsData);

        setLastUpdated(new Date().toISOString());
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchJson, timeRange]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!metrics?.frameworks?.length) return;
    const available = metrics.frameworks.map((fw) => normalizeFramework(fw.framework));
    if (!available.includes(normalizeFramework(selectedFramework))) {
      setSelectedFramework(available[0] || 'iso27001');
    }
  }, [metrics, selectedFramework]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchDashboardData({ silent: true });
    setTimeout(() => setRefreshing(false), 500);
  }

  const activityTimeline = useMemo(() => {
    const list = metrics?.activity_timeline || [];
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [metrics]);

  const frameworkTabs = useMemo(() => {
    if (metrics?.frameworks?.length) {
      return metrics.frameworks.map((fw) => ({
        key: normalizeFramework(fw.framework),
        label: formatFrameworkLabel(fw.framework),
      }));
    }
    return [
      { key: 'iso27001', label: 'ISO 27001' },
      { key: 'soc2', label: 'SOC 2' },
      { key: 'nist', label: 'NIST' },
      { key: 'cis', label: 'CIS' },
    ];
  }, [metrics]);

  const findingsForFramework = useMemo(() => {
    if (!findings.length) return [];
    const selectedKey = normalizeFramework(selectedFramework);
    const filtered = findings.filter((finding) => normalizeFramework(finding.framework) === selectedKey);
    return filtered.length ? filtered : findings;
  }, [findings, selectedFramework]);

  const complianceScore = metrics?.compliance.score ?? 0;
  const scoreOutOfTen = (complianceScore / 10).toFixed(1);

  const auditReadiness = useMemo(() => {
    const coverage = metrics?.compliance.coverage_pct ?? 0;
    const tests = metrics?.compliance.test_pass_rate ?? 0;
    const pending = metrics?.kpis.evidence_pending ?? 0;
    const readinessScore = Math.round((coverage + tests) / 2);

    if (readinessScore >= 85 && pending < 25) {
      return { label: 'Ready', badge: { text: 'On Track', color: 'green' as BadgeColor } };
    }
    if (readinessScore >= 65) {
      return { label: 'In Progress', badge: { text: 'Needs Attention', color: 'orange' as BadgeColor } };
    }
    return { label: 'Not Ready', badge: { text: 'Action Required', color: 'red' as BadgeColor } };
  }, [metrics]);

  const coverageChips = useMemo(() => {
    if (!metrics?.frameworks?.length) return [];
    return metrics.frameworks.slice(0, 2).map((fw) => formatFrameworkLabel(fw.framework));
  }, [metrics]);

  const riskData = [
    { name: 'Critical', value: metrics?.incidents.critical || 0, color: '#EF4444' },
    { name: 'High', value: metrics?.incidents.high || 0, color: '#F59E0B' },
    { name: 'Medium', value: metrics?.incidents.medium || 0, color: '#FCD34D' },
    { name: 'Low', value: metrics?.incidents.low || 0, color: '#3B82F6' },
  ];

  const totalRisks = riskData.reduce((sum, item) => sum + item.value, 0);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <RefreshCw className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Unable to load command center</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            onClick={() => fetchDashboardData()}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <motion.header initial={{ y: -100 }} animate={{ y: 0 }} className="bg-[#0F172A] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                <Shield className="w-8 h-8 text-blue-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold">SecureWise Command Center</h1>
                <p className="text-sm text-gray-400">Real-time GRC and security posture overview</p>
              </div>
            </div>
          </div>

          <nav className="flex gap-6">
            <a href="/command-center" className="text-white font-medium border-b-2 border-blue-500 pb-1">
              Dashboard
            </a>
            <a href="/incidents" className="text-gray-400 hover:text-white transition-colors">
              Incidents
            </a>
            <a href="/risks" className="text-gray-400 hover:text-white transition-colors">
              Risks
            </a>
            <a href="/compliance" className="text-gray-400 hover:text-white transition-colors">
              Compliance
            </a>
            <a href="/reports" className="text-gray-400 hover:text-white transition-colors">
              Reports
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors relative"
              disabled={refreshing}
            >
              <RefreshCw className={cn('w-5 h-5', refreshing && 'animate-spin')} />
            </motion.button>

            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && (
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </motion.button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">A</span>
              </div>
              <span className="text-sm">Admin</span>
            </div>
          </div>
        </div>
      </motion.header>

      <FadeIn delay={0.1}>
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Period ongoing</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{formatRelativeTime(lastUpdated)}</span>
                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-green-500 rounded-full" />
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Overall score</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{scoreOutOfTen}</span>
                <span className="text-gray-400 text-lg">/10</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Stable
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Frameworks</div>
              <div className="flex gap-2">
                {frameworkTabs.map((fw) => {
                  const active = normalizeFramework(selectedFramework) === fw.key;
                  return (
                    <motion.button
                      key={fw.key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedFramework(fw.key)}
                      className={cn(
                        'px-3 py-1 text-sm font-medium rounded transition-all',
                        active ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      )}
                    >
                      {fw.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="p-6 space-y-6">
        <div>
          <FadeIn delay={0.2}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">Key metrics</h2>
              <div className="ml-auto flex gap-2">
                {TIME_RANGES.map((range) => (
                  <motion.button
                    key={range}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      'px-3 py-1 text-sm rounded transition-all',
                      timeRange === range ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    )}
                  >
                    {range}
                  </motion.button>
                ))}
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-4 gap-6">
            <MetricCard
              icon={Shield}
              title="Overall security posture"
              value={`${scoreOutOfTen}/10`}
              subtitle={`Updated ${formatRelativeTime(lastUpdated)}`}
              badge={{ text: 'Stable', color: 'green' }}
              delay={0.1}
              trend={2}
            />

            <MetricCard
              icon={CheckCircle}
              title="Compliance coverage"
              value={`${metrics?.compliance.coverage_pct || 0}%`}
              subtitle="Controls with evidence"
              chips={coverageChips}
              delay={0.2}
              badge={{ color: 'green' }}
            />

            <MetricCard
              icon={AlertTriangle}
              title="Critical findings open"
              value={metrics?.kpis.critical_findings || 0}
              badge={{ text: 'High', color: 'red' }}
              subtitle="Critical and high gaps + risks"
              delay={0.3}
              trend={-5}
            />

            <MetricCard
              icon={FileText}
              title="Audit readiness status"
              value={auditReadiness.label}
              badge={auditReadiness.badge}
              subtitle="Coverage and test pass rate"
              delay={0.4}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <FadeIn delay={0.5}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-bold mb-4">Risk exposure overview</h3>
              <div className="h-80 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={3} dataKey="value">
                      {riskData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-600">{totalRisks}</div>
                    <div className="text-sm text-gray-500">{totalRisks > 0 ? 'Total' : 'No data'}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {riskData.map((item, index) => (
                  <motion.div key={item.name} whileHover={{ x: 4 }} className="flex items-center gap-2 cursor-pointer">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="text-sm font-bold ml-auto">{item.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </FadeIn>

          <FadeIn delay={0.6}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Compliance coverage by framework</h3>
                <select className="text-sm border rounded px-3 py-1.5 bg-white hover:border-gray-400 transition-colors">
                  <option>Today</option>
                  <option>This Week</option>
                  <option>This Month</option>
                </select>
              </div>

              <div className="space-y-6">
                {metrics?.frameworks?.length ? (
                  metrics.frameworks.map((fw, i) => (
                    <motion.div key={fw.framework} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.1 }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium uppercase">{formatFrameworkLabel(fw.framework)}</span>
                        <span className="text-sm font-bold">{fw.coverage_pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fw.coverage_pct}%` }}
                          transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                          className={cn('h-2.5 rounded-full', FRAMEWORK_COLORS[i % FRAMEWORK_COLORS.length])}
                        />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No framework data available.</div>
                )}
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold mb-3">Trend</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityTimeline}>
                      <defs>
                        <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Area type="monotone" dataKey="incident_count" stroke="#F59E0B" strokeWidth={2} fill="url(#colorIncidents)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          </FadeIn>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <FadeIn delay={0.7}>
              <motion.div whileHover={{ y: -4 }} className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Priority findings</h3>
                    <motion.button whileHover={{ x: 4 }} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                      View all
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-y">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finding</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Framework</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impacted asset</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <AnimatePresence>
                        {findingsForFramework.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-6 text-sm text-gray-500">
                              No open findings for the selected framework.
                            </td>
                          </tr>
                        ) : (
                          findingsForFramework.map((finding, i) => (
                            <motion.tr
                              key={finding.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.8 + i * 0.05 }}
                              whileHover={{ backgroundColor: '#f9fafb' }}
                              className="cursor-pointer"
                            >
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{finding.title}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={cn(
                                    'px-2 py-1 text-xs font-bold uppercase rounded',
                                    finding.severity === 'critical' && 'bg-red-100 text-red-800',
                                    finding.severity === 'high' && 'bg-orange-100 text-orange-800',
                                    finding.severity === 'medium' && 'bg-yellow-100 text-yellow-800',
                                    finding.severity === 'low' && 'bg-blue-100 text-blue-800'
                                  )}
                                >
                                  {finding.severity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">{finding.framework}</td>
                              <td className="px-6 py-4 text-sm text-gray-700">{finding.asset}</td>
                            </motion.tr>
                          ))
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </FadeIn>

            <FadeIn delay={0.9}>
              <motion.div whileHover={{ y: -4 }} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Security signals</h3>
                  <select className="text-sm border rounded px-3 py-1.5 bg-white">
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                  </select>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityTimeline}>
                      <defs>
                        <linearGradient id="colorSignals" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#FCD34D" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="incident_count" stroke="#F59E0B" strokeWidth={3} fill="url(#colorSignals)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </FadeIn>
          </div>

          <FadeIn delay={0.8}>
            <motion.div whileHover={{ y: -4 }} className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Alerts</h3>
                <motion.button whileHover={{ x: 4 }} className="text-blue-400 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  View all
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {alerts.length === 0 ? (
                    <div className="text-sm text-gray-300">No alerts for the selected period.</div>
                  ) : (
                    alerts.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 + i * 0.1 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 cursor-pointer group"
                      >
                        <div className="flex gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                              alert.severity === 'critical' && 'bg-red-500',
                              alert.severity === 'high' && 'bg-orange-500',
                              alert.severity === 'medium' && 'bg-yellow-500',
                              alert.severity === 'low' && 'bg-blue-500'
                            )}
                          >
                            <AlertTriangle className="w-5 h-5 text-white" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium mb-1 group-hover:text-blue-300 transition-colors">{alert.title}</div>
                            <div className="text-xs text-gray-400 mb-2 line-clamp-2">{alert.description}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(alert.timestamp)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/20">
                <motion.div whileHover={{ scale: 1.05 }} className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="text-xs text-gray-400 mb-1">Open incidents</div>
                  <div className="text-2xl font-bold">{metrics?.kpis.open_incidents || 0}</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="text-xs text-gray-400 mb-1">Pending review</div>
                  <div className="text-2xl font-bold">{metrics?.kpis.evidence_pending || 0}</div>
                </motion.div>
              </div>
            </motion.div>
          </FadeIn>
        </div>

        <FadeIn delay={1.0}>
          <motion.div whileHover={{ y: -4 }} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-4 border-b">
                  <button className="px-4 py-2 text-sm font-bold border-b-2 border-blue-600 text-blue-600">Summary</button>
                  <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">GCO</button>
                  <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Details</button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export report
                </motion.button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-y">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Finding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Framework</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impacted asset</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {findingsForFramework.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-sm text-gray-500">
                        No findings available.
                      </td>
                    </tr>
                  ) : (
                    findingsForFramework.map((finding, i) => (
                      <motion.tr
                        key={finding.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.1 + i * 0.05 }}
                        whileHover={{ backgroundColor: '#f9fafb' }}
                        className="cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{finding.title}</td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'px-3 py-1 text-xs font-bold uppercase rounded',
                              finding.severity === 'critical' && 'bg-red-100 text-red-800',
                              finding.severity === 'high' && 'bg-orange-100 text-orange-800',
                              finding.severity === 'medium' && 'bg-yellow-100 text-yellow-800',
                              finding.severity === 'low' && 'bg-blue-100 text-blue-800'
                            )}
                          >
                            {finding.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{finding.framework}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{finding.asset}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">{finding.status}</span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </FadeIn>
      </div>
    </div>
  );
}
