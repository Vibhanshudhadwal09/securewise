'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Code,
  Download,
  FileText,
  Flame,
  Info,
  Link2,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type TimeRange = '24h' | '7d' | '30d' | '90d';
type Severity = 'critical' | 'high' | 'medium' | 'low';
type AssetCriticality = 'production' | 'development' | 'pii' | 'internet_facing';
type Exploitability = 'active_exploit' | 'cve_present' | 'theoretical';

type SCAResult = {
  policy_id?: string;
  policy_name?: string;
  name?: string;
  agent_id?: string;
  agent_name?: string;
  pass?: number;
  fail?: number;
  invalid?: number;
  score?: number;
  score_pct?: number;
  last_scan?: string;
  checks?: any[];
  rules?: any[];
};

type ControlFinding = {
  id: string;
  title: string;
  status: 'pass' | 'fail' | 'unknown';
  severity: Severity;
  policy: string;
  agent: string;
  rationale?: string;
  remediation?: string;
  last_scan?: string;
};

type ControlMapping = {
  cis_control: string;
  cis_title?: string;
  iso27001?: string[];
  nist_csf?: string[];
  nist_800_53?: string[];
  soc2?: string[];
  pci_dss?: string[];
  compliance_impact?: 'high' | 'medium' | 'low';
};

type RiskException = {
  id: string;
  control_id: string;
  exception_type: string;
  justification: string;
  owner: string;
  approver: string;
  expiry_date: string;
  status: string;
};

type RemediationPlanItem = {
  id: string;
  control_id: string;
  title: string;
  root_cause: string;
  impact_score: number;
  automation_eligible: boolean;
  remediation_script?: string | null;
  estimated_effort: 'low' | 'medium' | 'high';
};

type PostureHistory = {
  date: string;
  compliance_score: number;
  risk_score: number;
  new_failures: number;
  resolved_issues: number;
  regressed_controls: string[];
};

type PolicyEvent = {
  id: string;
  policy: string;
  description: string;
  type: 'violation' | 'remediated' | 'detected';
  timestamp: string;
  auto_remediated?: boolean;
};

const TIME_RANGES: TimeRange[] = ['24h', '7d', '30d', '90d'];
const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function normalizeSeverity(value: any, fallback: Severity = 'medium'): Severity {
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
  return fallback;
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'Unknown';
  return dt.toLocaleString();
}

function calculateComplianceScore(results: SCAResult[]) {
  let totalChecks = 0;
  let totalPass = 0;
  results.forEach((result) => {
    const pass = Number(result.pass || 0);
    const fail = Number(result.fail || 0);
    totalChecks += pass + fail;
    totalPass += pass;
  });
  if (totalChecks === 0) return 0;
  return Math.round((totalPass / totalChecks) * 100);
}

function extractControls(results: SCAResult[]): ControlFinding[] {
  const controls: ControlFinding[] = [];
  results.forEach((result) => {
    const checks = Array.isArray(result.checks)
      ? result.checks
      : Array.isArray(result.rules)
      ? result.rules
      : [];

    if (checks.length === 0) {
      const score = Number(result.score ?? result.score_pct ?? 0);
      const status = score >= 85 ? 'pass' : 'fail';
      controls.push({
        id: String(result.policy_id || result.policy_name || result.name || 'policy'),
        title: String(result.policy_name || result.name || 'Configuration policy'),
        status,
        severity: status === 'fail' ? (score < 50 ? 'critical' : score < 70 ? 'high' : 'medium') : 'low',
        policy: String(result.policy_name || result.name || 'Policy'),
        agent: String(result.agent_name || result.agent_id || 'Unknown'),
        last_scan: result.last_scan,
      });
      return;
    }

    checks.forEach((check: any) => {
      const rawStatus = String(check?.result || check?.status || check?.passed || '').toLowerCase();
      const status = rawStatus.includes('pass') || rawStatus === 'true' ? 'pass' : rawStatus.includes('fail') ? 'fail' : 'unknown';
      controls.push({
        id: String(check?.id || check?.rule_id || check?.check_id || check?.title || 'control'),
        title: String(check?.title || check?.description || check?.reason || 'Configuration control'),
        status,
        severity: normalizeSeverity(check?.severity || check?.level, status === 'fail' ? 'high' : 'low'),
        policy: String(result.policy_name || result.name || 'Policy'),
        agent: String(result.agent_name || result.agent_id || 'Unknown'),
        rationale: String(check?.rationale || check?.reason || ''),
        remediation: String(check?.remediation || check?.fix || ''),
        last_scan: result.last_scan,
      });
    });
  });

  return controls;
}

function computeRiskScore(opts: {
  severity: Severity;
  assetCriticality: AssetCriticality;
  exploitability: Exploitability;
}) {
  const severityFactor = { critical: 9.2, high: 8.2, medium: 6.2, low: 3.5 }[opts.severity];
  const assetFactor = {
    production: 8.5,
    development: 4.5,
    pii: 9.3,
    internet_facing: 8.0,
  }[opts.assetCriticality];
  const exploitFactor = { active_exploit: 8.2, cve_present: 7.0, theoretical: 4.2 }[opts.exploitability];
  const score = Math.round((severityFactor * 0.5 + assetFactor * 0.3 + exploitFactor * 0.2) * 10) / 10;
  const rating: Severity = score >= 8.5 ? 'critical' : score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low';
  return { score, rating, severityFactor, assetFactor, exploitFactor };
}

export default function ConfigurationAssessmentPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [scaResults, setScaResults] = useState<SCAResult[]>([]);
  const [controls, setControls] = useState<ControlFinding[]>([]);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [controlMapping, setControlMapping] = useState<ControlMapping | null>(null);
  const [exceptions, setExceptions] = useState<RiskException[]>([]);
  const [remediationPlan, setRemediationPlan] = useState<RemediationPlanItem[]>([]);
  const [postureHistory, setPostureHistory] = useState<PostureHistory[]>([]);
  const [policyEvents, setPolicyEvents] = useState<PolicyEvent[]>([]);
  const [ccmEnabled, setCcmEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [exceptionType, setExceptionType] = useState('accept_risk');
  const [exceptionJustification, setExceptionJustification] = useState('');
  const [exceptionOwner, setExceptionOwner] = useState('');
  const [exceptionApprover, setExceptionApprover] = useState('');
  const [exceptionExpiry, setExceptionExpiry] = useState('');
  const [exceptionSubmitting, setExceptionSubmitting] = useState(false);
  const [exceptionError, setExceptionError] = useState<string | null>(null);

  const [assetCriticality, setAssetCriticality] = useState<AssetCriticality>('production');
  const [exploitability, setExploitability] = useState<Exploitability>('cve_present');

  const complianceScore = useMemo(() => calculateComplianceScore(scaResults), [scaResults]);
  const selectedControl = useMemo(() => controls.find((c) => c.id === selectedControlId) || controls[0], [controls, selectedControlId]);
  const riskScore = useMemo(
    () =>
      computeRiskScore({
        severity: selectedControl?.severity || 'medium',
        assetCriticality,
        exploitability,
      }),
    [selectedControl, assetCriticality, exploitability]
  );

  const failCount = useMemo(() => controls.filter((c) => c.status === 'fail').length, [controls]);
  const passCount = useMemo(() => controls.filter((c) => c.status === 'pass').length, [controls]);

  const fetchJson = useCallback(
    async <T,>(input: RequestInfo, init: RequestInit = {}): Promise<T> => {
      const headers = { 'x-tenant-id': tenantId, ...(init.headers || {}) };
      const res = await fetch(input, {
        ...init,
        credentials: 'include',
        headers,
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (json as any)?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return json as T;
    },
    [tenantId]
  );

  const loadBaseData = useCallback(async () => {
    setError(null);
    const [scaRes, historyRes, exceptionsRes, ccmRes, eventsRes] = await Promise.allSettled([
      fetchJson<{ results: SCAResult[] }>('/api/wazuh/sca'),
      fetchJson<{ items: PostureHistory[] }>('/api/configuration-assessment/posture-history?days=30'),
      fetchJson<{ items: RiskException[] }>('/api/configuration-assessment/exceptions'),
      fetchJson<{ enabled: boolean }>('/api/configuration-assessment/ccm-status'),
      fetchJson<{ items: any[] }>(`/api/security-signals/alerts?range=${timeRange}&kind=policy&limit=12`),
    ]);

    if (scaRes.status === 'fulfilled') {
      const results = Array.isArray(scaRes.value.results) ? scaRes.value.results : [];
      setScaResults(results);
      const findings = extractControls(results);
      setControls(findings);
      setSelectedControlId(findings[0]?.id || null);
    } else {
      setScaResults([]);
      setControls([]);
      setSelectedControlId(null);
      setError((scaRes.reason as any)?.message || 'Failed to load SCA results');
    }

    if (historyRes.status === 'fulfilled') {
      setPostureHistory(Array.isArray(historyRes.value.items) ? historyRes.value.items : []);
    } else {
      setPostureHistory([]);
    }

    if (exceptionsRes.status === 'fulfilled') {
      setExceptions(Array.isArray(exceptionsRes.value.items) ? exceptionsRes.value.items : []);
    } else {
      setExceptions([]);
    }

    if (ccmRes.status === 'fulfilled') {
      setCcmEnabled(Boolean(ccmRes.value.enabled));
    } else {
      setCcmEnabled(false);
    }

    if (eventsRes.status === 'fulfilled') {
      const mappedEvents: PolicyEvent[] = (eventsRes.value.items || []).map((item: any, index: number) => ({
        id: String(item?.ruleId || item?.timestamp || index),
        policy: String(item?.rule || item?.message || 'Policy event'),
        description: String(item?.message || item?.rule || 'Policy event detected'),
        type: item?.action === 'remediated' ? 'remediated' : item?.action === 'violation' ? 'violation' : 'detected',
        timestamp: String(item?.timestamp || new Date().toISOString()),
        auto_remediated: Boolean(item?.action === 'remediated'),
      }));
      setPolicyEvents(mappedEvents);
    } else {
      setPolicyEvents([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [fetchJson, timeRange]);

  useEffect(() => {
    setLoading(true);
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    if (!selectedControl?.id) {
      setControlMapping(null);
      return;
    }
    fetchJson<ControlMapping>(`/api/configuration-assessment/control-mappings/${encodeURIComponent(selectedControl.id)}`)
      .then((mapping) => setControlMapping(mapping))
      .catch(() => setControlMapping(null));
  }, [fetchJson, selectedControl?.id]);

  useEffect(() => {
    const failingControls = controls.filter((c) => c.status === 'fail').map((c) => c.id);
    if (failingControls.length === 0) {
      setRemediationPlan([]);
      return;
    }
    const query = encodeURIComponent(failingControls.slice(0, 20).join(','));
    fetchJson<{ items: RemediationPlanItem[] }>(`/api/configuration-assessment/remediation-plan?control_ids=${query}&limit=12`)
      .then((res) => setRemediationPlan(Array.isArray(res.items) ? res.items : []))
      .catch(() => setRemediationPlan([]));
  }, [fetchJson, controls]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadBaseData();
  }

  async function handleSubmitException() {
    if (!selectedControl?.id) return;
    try {
      setExceptionSubmitting(true);
      setExceptionError(null);
      if (!exceptionJustification || !exceptionOwner || !exceptionApprover || !exceptionExpiry) {
        setExceptionError('Please complete all required fields before submitting.');
        setExceptionSubmitting(false);
        return;
      }
      const payload = {
        control_id: selectedControl.id,
        exception_type: exceptionType,
        justification: exceptionJustification,
        owner: exceptionOwner,
        approver: exceptionApprover,
        expiry_date: exceptionExpiry,
        submit: true,
      };
      await fetchJson('/api/configuration-assessment/exceptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setExceptionDialogOpen(false);
      setExceptionJustification('');
      setExceptionOwner('');
      setExceptionApprover('');
      setExceptionExpiry('');
      const data = await fetchJson<{ items: RiskException[] }>('/api/configuration-assessment/exceptions');
      setExceptions(data.items || []);
    } catch (err: any) {
      setExceptionError(err?.message || 'Failed to submit exception');
    } finally {
      setExceptionSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8">Loading configuration assessment...</div>;
  }

  const postureTrend = postureHistory.map((row) => ({
    ...row,
    dateLabel: format(new Date(row.date), 'MMM d'),
  }));

  const policyScore = complianceScore || 0;
  const openExceptions = exceptions.filter((e) => e.status === 'pending' || e.status === 'pending_approval').length;
  const expiredExceptions = exceptions.filter((e) => e.status === 'expired').length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Configuration Assessment</h1>
          <p className="text-gray-600 mt-2">Control-based risk management across CIS, ISO 27001, and NIST</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Executive Brief
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-medium">Unable to load configuration assessment.</p>
          <p className="text-xs mt-1">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Compliance Score</p>
              <p className="text-3xl font-bold text-blue-600">{policyScore}%</p>
              <p className="text-xs text-gray-500 mt-1">CIS baseline coverage</p>
            </div>
            <Shield className="w-9 h-9 text-blue-600" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed Controls</p>
              <p className="text-3xl font-bold text-red-600">{failCount}</p>
              <p className="text-xs text-gray-500 mt-1">Require remediation</p>
            </div>
            <AlertTriangle className="w-9 h-9 text-red-600" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Passed Controls</p>
              <p className="text-3xl font-bold text-green-600">{passCount}</p>
              <p className="text-xs text-gray-500 mt-1">Stable posture</p>
            </div>
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Exceptions Active</p>
              <p className="text-3xl font-bold text-orange-600">{exceptions.length}</p>
              <p className="text-xs text-gray-500 mt-1">Pending approvals: {openExceptions}</p>
            </div>
            <FileText className="w-9 h-9 text-orange-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Control Findings</h2>
              <p className="text-xs text-gray-500">CIS checks mapped to assets</p>
            </div>
            <Badge variant="info">{controls.length} controls</Badge>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {controls.map((control) => (
              <button
                key={control.id}
                type="button"
                onClick={() => setSelectedControlId(control.id)}
                className={cn(
                  'w-full text-left border rounded-lg p-3 hover:bg-gray-50 transition',
                  selectedControl?.id === control.id && 'border-blue-400 bg-blue-50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{control.id}</span>
                  <Badge variant={control.status === 'pass' ? 'success' : control.status === 'fail' ? 'danger' : 'warning'}>
                    {control.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{control.title}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{control.agent}</span>
                  <span className={cn('px-2 py-0.5 rounded', SEVERITY_COLORS[control.severity])}>{control.severity}</span>
                </div>
              </button>
            ))}
            {controls.length === 0 && <p className="text-sm text-gray-500">No configuration checks available.</p>}
          </div>
        </Card>

        <div className="xl:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{selectedControl?.title || 'Select a control'}</h2>
                <p className="text-sm text-gray-600 mt-1">Control ID: {selectedControl?.id || '-'}</p>
              </div>
              <div className="text-right">
                <Badge variant={selectedControl?.status === 'pass' ? 'success' : 'danger'}>
                  {selectedControl?.status || 'unknown'}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">Last scan: {formatDate(selectedControl?.last_scan)}</p>
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mt-6 flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="mappings">Framework Mappings</TabsTrigger>
                <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
                <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
                <TabsTrigger value="remediation">Remediation</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Control context</h3>
                    <p className="text-sm text-gray-600">{selectedControl?.rationale || 'No rationale provided.'}</p>
                    <div className="mt-3 text-xs text-gray-500">
                      Policy: {selectedControl?.policy || 'Unknown'} | Agent: {selectedControl?.agent || 'Unknown'}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2">Remediation hint</h3>
                    <p className="text-sm text-gray-600">{selectedControl?.remediation || 'No remediation details provided.'}</p>
                    <div className="mt-3 text-xs text-gray-500">Status: {selectedControl?.status || 'Unknown'}</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mappings" className="mt-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-blue-900">CIS Control {controlMapping?.cis_control || selectedControl?.id}</span>
                    </div>
                    <p className="text-sm text-gray-700">{controlMapping?.cis_title || selectedControl?.title}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {controlMapping?.iso27001?.length ? (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="neutral">ISO 27001:2022</Badge>
                        </div>
                        <div className="space-y-2">
                          {controlMapping.iso27001.map((ctrl) => (
                            <div key={ctrl} className="flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-mono">{ctrl}</span>
                              {controlMapping.compliance_impact && (
                                <Badge variant={controlMapping.compliance_impact === 'high' ? 'danger' : 'warning'} className="text-xs">
                                  {controlMapping.compliance_impact} impact
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {controlMapping?.nist_csf?.length ? (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="neutral">NIST CSF 2.0</Badge>
                        </div>
                        <div className="space-y-2">
                          {controlMapping.nist_csf.map((ctrl) => (
                            <div key={ctrl} className="flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-mono">{ctrl}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {controlMapping?.nist_800_53?.length ? (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="neutral">NIST 800-53</Badge>
                        </div>
                        <div className="space-y-2">
                          {controlMapping.nist_800_53.map((ctrl) => (
                            <div key={ctrl} className="flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-mono">{ctrl}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {controlMapping?.soc2?.length ? (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="neutral">SOC 2 Type II</Badge>
                        </div>
                        <div className="space-y-2">
                          {controlMapping.soc2.map((ctrl) => (
                            <div key={ctrl} className="flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-mono">{ctrl}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {controlMapping?.pci_dss?.length ? (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="neutral">PCI DSS</Badge>
                        </div>
                        <div className="space-y-2">
                          {controlMapping.pci_dss.map((ctrl) => (
                            <div key={ctrl} className="flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-mono">{ctrl}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="font-semibold text-orange-900">Multi-framework impact</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Resolving this finding improves posture across mapped frameworks and reduces audit risk.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="risk" className="mt-6">
                <Card className="border-l-4 border-l-red-500">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold">Business Risk Analysis</h3>
                      <Badge variant={riskScore.rating === 'critical' ? 'danger' : riskScore.rating === 'high' ? 'warning' : 'info'}>
                        {riskScore.rating.toUpperCase()} RISK
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">Compliance Score</div>
                        <div className="text-4xl font-bold text-blue-600">{complianceScore}%</div>
                        <div className="text-xs text-gray-500 mt-1">Technical Compliance</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-sm text-gray-600 mb-2">Business Risk Score</div>
                        <div className="text-4xl font-bold text-red-600">{riskScore.score}</div>
                        <div className="text-xs text-gray-500 mt-1">Out of 10</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Asset criticality</label>
                        <select
                          className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                          value={assetCriticality}
                          onChange={(e) => setAssetCriticality(e.target.value as AssetCriticality)}
                        >
                          <option value="production">Production system</option>
                          <option value="pii">Contains PII</option>
                          <option value="internet_facing">Internet-facing</option>
                          <option value="development">Development</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Exploitability</label>
                        <select
                          className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                          value={exploitability}
                          onChange={(e) => setExploitability(e.target.value as Exploitability)}
                        >
                          <option value="active_exploit">Active exploit</option>
                          <option value="cve_present">CVE present</option>
                          <option value="theoretical">Theoretical</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Severity factor</span>
                          <span className="font-bold text-red-600">{riskScore.severityFactor.toFixed(1)} / 10</span>
                        </div>
                        <Progress value={(riskScore.severityFactor / 10) * 100} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{failCount} failed controls driving severity</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Asset criticality</span>
                          <span className="font-bold text-orange-600">{riskScore.assetFactor.toFixed(1)} / 10</span>
                        </div>
                        <Progress value={(riskScore.assetFactor / 10) * 100} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">Selected asset profile</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Exploitability</span>
                          <span className="font-bold text-yellow-600">{riskScore.exploitFactor.toFixed(1)} / 10</span>
                        </div>
                        <Progress value={(riskScore.exploitFactor / 10) * 100} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">Threat intelligence indicators</p>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-red-900">Risk Heat Index: {riskScore.rating.toUpperCase()}</span>
                      </div>
                      <p className="text-sm text-gray-700">Prioritize remediation for controls with high impact and exploitability.</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="exceptions" className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Active Risk Exceptions</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{openExceptions} Pending</Badge>
                    <Badge variant="neutral">{expiredExceptions} Expired</Badge>
                    <Button size="sm" onClick={() => setExceptionDialogOpen(true)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Create exception
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {exceptions.length === 0 ? (
                    <div className="text-sm text-gray-500">No active exceptions.</div>
                  ) : (
                    exceptions.map((exception) => (
                      <div key={exception.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{exception.control_id}</span>
                            <Badge
                              variant={
                                exception.status === 'approved'
                                  ? 'success'
                                  : exception.status === 'expired'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {exception.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{exception.justification}</p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>Owner: {exception.owner}</span>
                            <span>Expires: {exception.expiry_date ? formatDate(exception.expiry_date) : 'N/A'}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="remediation" className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Intelligent Remediation Planner</h3>
                  <Button>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate optimized plan
                  </Button>
                </div>

                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-blue-900">Posture improvement forecast</span>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Fix top {Math.min(remediationPlan.length, 12)} controls:</span>
                      <span className="font-bold text-blue-600">{policyScore}% to {Math.min(100, policyScore + 25)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estimated effort:</span>
                      <span className="font-bold">2-3 days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Automation available:</span>
                      <span className="font-bold text-green-600">
                        {remediationPlan.filter((item) => item.automation_eligible).length} of {remediationPlan.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {remediationPlan.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold',
                              i < 3 ? 'bg-red-600' : i < 6 ? 'bg-orange-600' : 'bg-yellow-600'
                            )}
                          >
                            {i + 1}
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold">{item.control_id}</span>
                            <Badge variant={item.impact_score >= 7 ? 'danger' : 'warning'}>+{item.impact_score}% impact</Badge>
                            {item.automation_eligible && (
                              <Badge variant="success">
                                <Zap className="w-3 h-3 mr-1" />
                                Auto-fix available
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-gray-700 mb-2">{item.title}</p>

                          <div className="flex gap-3 text-xs text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Wrench className="w-3 h-3" />
                              Effort: {item.estimated_effort}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Root cause: {item.root_cause}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {item.automation_eligible && (
                              <Button size="sm">
                                <Play className="w-4 h-4 mr-2" />
                                Auto-remediate
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Code className="w-4 h-4 mr-2" />
                              View script
                            </Button>
                            <Button size="sm" variant="ghost">
                              <BookOpen className="w-4 h-4 mr-2" />
                              Guide
                            </Button>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <Checkbox />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {remediationPlan.length === 0 && <div className="text-sm text-gray-500">No remediation plan available.</div>}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button>
                    <Play className="w-4 h-4 mr-2" />
                    Run selected
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export runbook
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Security Posture Trend</h3>
                <p className="text-xs text-gray-500">Compliance score and risk score history</p>
              </div>
              <div className="flex gap-2">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-md border',
                      timeRange === range ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={postureTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="compliance_score" stroke="#3b82f6" strokeWidth={3} name="Compliance Score (%)" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="risk_score" stroke="#ef4444" strokeWidth={3} name="Risk Score (0-10)" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-900">New Failures</span>
                </div>
                <div className="text-3xl font-bold text-red-600">
                  {postureHistory.reduce((sum, row) => sum + (row.new_failures || 0), 0)}
                </div>
                <p className="text-xs text-gray-600 mt-1">Last 30 days</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-900">Resolved</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {postureHistory.reduce((sum, row) => sum + (row.resolved_issues || 0), 0)}
                </div>
                <p className="text-xs text-gray-600 mt-1">Last 30 days</p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-orange-900">Regressed</span>
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  {postureHistory.reduce((sum, row) => sum + (row.regressed_controls?.length || 0), 0)}
                </div>
                <p className="text-xs text-gray-600 mt-1">Last 30 days</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Continuous Controls Monitoring</h3>
                <p className="text-sm text-gray-600">Real-time policy enforcement and drift detection</p>
              </div>
              <Badge variant={ccmEnabled ? 'success' : 'neutral'}>{ccmEnabled ? 'Active' : 'Inactive'}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-sm text-gray-600 mb-2">Enforced policies</div>
                <div className="text-3xl font-bold text-green-600">{ccmEnabled ? 28 : 0}</div>
                <p className="text-xs text-gray-500 mt-1">Auto-remediation active</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-600 mb-2">Monitoring only</div>
                <div className="text-3xl font-bold text-blue-600">{ccmEnabled ? 45 : 0}</div>
                <p className="text-xs text-gray-500 mt-1">Alert on drift</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Manual review</div>
                <div className="text-3xl font-bold text-gray-600">{ccmEnabled ? 93 : 0}</div>
                <p className="text-xs text-gray-500 mt-1">Periodic assessment</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-3">Recent policy events</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {policyEvents.length === 0 ? (
                  <div className="text-sm text-gray-500">No recent policy events.</div>
                ) : (
                  policyEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          event.type === 'violation' && 'bg-red-500',
                          event.type === 'remediated' && 'bg-green-500',
                          event.type === 'detected' && 'bg-yellow-500'
                        )}
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{event.policy}</span>
                          <Badge
                            variant={
                              event.type === 'violation' ? 'danger' : event.type === 'remediated' ? 'success' : 'warning'
                            }
                          >
                            {event.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{event.description}</p>
                      </div>

                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>

                      {event.auto_remediated && (
                        <Badge variant="success" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          Auto-fixed
                        </Badge>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {!ccmEnabled && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">Enable continuous monitoring</span>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  Move from periodic assessments to real-time control enforcement. Automatically detect and remediate configuration drift.
                </p>
                <Button>
                  <Shield className="w-4 h-4 mr-2" />
                  Enable CCM
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage risk exception</DialogTitle>
            <DialogDescription>Document risk acceptance, compensating controls, or remediation plans.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {exceptionError && (
              <div className="text-sm text-red-600 border border-red-200 rounded-lg p-2 bg-red-50">{exceptionError}</div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Exception type</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={exceptionType}
                onChange={(e) => setExceptionType(e.target.value)}
              >
                <option value="accept_risk">Accept risk</option>
                <option value="compensating_control">Compensating control</option>
                <option value="false_positive">False positive</option>
                <option value="planned_remediation">Planned remediation</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Business justification</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[110px]"
                placeholder="Explain why this risk is being accepted or how it is mitigated..."
                value={exceptionJustification}
                onChange={(e) => setExceptionJustification(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Risk owner</label>
                <Input value={exceptionOwner} onChange={(e) => setExceptionOwner(e.target.value)} placeholder="CISO, IT Director, etc." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Approver</label>
                <Input value={exceptionApprover} onChange={(e) => setExceptionApprover(e.target.value)} placeholder="CEO, CFO, Board" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Exception expiry date</label>
              <Input type="date" value={exceptionExpiry} onChange={(e) => setExceptionExpiry(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Exception requires re-approval after this date.</p>
            </div>

            {riskScore.score > 7 && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-900">High-risk exception</span>
                </div>
                <p className="text-sm text-gray-700">
                  This control has a risk score of {riskScore.score}/10. Executive approval required.
                </p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitException} disabled={exceptionSubmitting}>
              {exceptionSubmitting ? 'Submitting...' : 'Submit for approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
