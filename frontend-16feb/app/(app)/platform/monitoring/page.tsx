"use client";

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import MonitoringRuleWizard from '@/components/monitoring/MonitoringRuleWizard';
import AlertCard from '@/components/monitoring/AlertCard';
import RuleStatusCard from '@/components/monitoring/RuleStatusCard';
import AlertDetailsModal from '@/components/monitoring/AlertDetailsModal';
import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';
import { HelpButton } from '@/components/help/HelpPanel';
import HelpPanel from '@/components/help/HelpPanel';
import EmptyState from '@/components/help/EmptyState';
import { helpContent } from '@/config/helpContent';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/LoadingStates';
import { FadeIn } from '@/components/ui/Transitions';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  acknowledgeAlert,
  createMonitoringRule,
  deleteMonitoringRule,
  getExecutionHistory,
  getMonitoringAlerts,
  getMonitoringRules,
  resolveAlert,
  runMonitoringRule,
  updateMonitoringRule,
} from '@/lib/api/monitoring-templates';
import type { MonitoringAlert, MonitoringRule } from '@/types/monitoring';

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

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return String(value).replace('T', ' ').slice(0, 19);
}

export default function PlatformMonitoringPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || getCookie('sw_tenant') || 'demo-tenant';

  const { data: rulesData, mutate: mutateRules } = useSWR(['monitoring-rules', tenantId], () => getMonitoringRules(tenantId));
  const { data: alertsData, mutate: mutateAlerts } = useSWR(['monitoring-alerts', tenantId], () =>
    getMonitoringAlerts({ limit: 200 }, tenantId)
  );
  const { data: execData } = useSWR(['monitoring-executions', tenantId], () => getExecutionHistory(undefined, tenantId));

  const rules: MonitoringRule[] = Array.isArray(rulesData?.items) ? rulesData.items : [];
  const alerts: MonitoringAlert[] = Array.isArray(alertsData?.items) ? alertsData.items : [];
  const executions: any[] = Array.isArray(execData?.items) ? execData.items : [];
  const loading = !rulesData;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [tab, setTab] = useState('rules');
  const [selectedAlert, setSelectedAlert] = useState<MonitoringAlert | null>(null);
  const [editRule, setEditRule] = useState<MonitoringRule | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showHelp, setShowHelp] = useState(false);
  const toast = useToast();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const stats = useMemo(() => {
    const activeRules = rules.filter((r) => r.is_active).length;
    const openAlerts = alerts.filter((a) => a.status === 'open').length;
    const last24h = executions.filter((e) => {
      if (!e.started_at) return false;
      return new Date(e.started_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
    });
    const avgDuration = last24h.length
      ? Math.round(last24h.reduce((sum, e) => sum + Number(e.duration_ms || 0), 0) / last24h.length)
      : 0;
    return { activeRules, openAlerts, executed: last24h.length, avgDuration };
  }, [rules, alerts, executions]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [rules, categoryFilter, statusFilter]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      return true;
    });
  }, [alerts, severityFilter]);

  const refreshAll = () => {
    mutateRules();
    mutateAlerts();
  };

  const handleRunRule = async (ruleId: string) => {
    await runMonitoringRule(ruleId, tenantId);
    refreshAll();
  };

  const handleCreateRule = async (data: any) => {
    setCreating(true);
    try {
      await createMonitoringRule(data, tenantId);
      toast.success('Monitoring rule created!', 'Rule is now active and monitoring');
      setWizardOpen(false);
    } catch (error: any) {
      toast.error('Failed to create rule', error?.message || 'Please try again');
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRule = async (ruleId: string, active: boolean) => {
    setToggling(ruleId);
    try {
      await updateMonitoringRule(
        ruleId,
        { is_active: active, status: active ? 'active' : 'paused' },
        tenantId
      );
      toast.success(active ? 'Rule enabled' : 'Rule disabled');
      refreshAll();
    } catch (error: any) {
      toast.error('Failed to update rule status');
    } finally {
      setToggling(null);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this monitoring rule?')) return;

    setDeleting(ruleId);
    try {
      await deleteMonitoringRule(ruleId, tenantId);
      toast.success('Monitoring rule deleted');
      refreshAll();
    } catch (error: any) {
      toast.error('Failed to delete rule', error?.message || 'Please try again');
    } finally {
      setDeleting(null);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlert(alertId, undefined, tenantId);
    mutateAlerts();
  };

  const handleResolve = async (alertId: string) => {
    await resolveAlert(alertId, 'Resolved', tenantId);
    mutateAlerts();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Continuous Monitoring"
        description="Detect configuration drift and security changes automatically across your environment."
        icon={Activity}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Monitoring' },
        ]}
        stats={[
          { label: 'Active Rules', value: stats.activeRules },
          { label: 'Open Alerts', value: stats.openAlerts },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <HelpButton onClick={() => setShowHelp(true)} />
            <Button
              variant="primary"
              loading={creating}
              onClick={() => {
                setEditRule(null);
                setWizardOpen(true);
              }}
            >
              Create Rule
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active rules', value: stats.activeRules },
          { label: 'Open alerts', value: stats.openAlerts },
          { label: 'Rules executed (24h)', value: stats.executed },
          { label: 'Avg response time', value: `${stats.avgDuration} ms` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <MonitoringDashboard alerts={alerts} rules={rules} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="rules">Active Rules</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              <option value="security">Security</option>
              <option value="cloud">Cloud</option>
              <option value="access">Access</option>
              <option value="compliance">Compliance</option>
              <option value="endpoint">Endpoint</option>
            </select>
            <select
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <button
              type="button"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={refreshAll}
            >
              Refresh
            </button>
          </div>

          <FadeIn>
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : rules.length === 0 ? (
              <EmptyState
                type="monitoring"
                onAction={() => {
                  setEditRule(null);
                  setWizardOpen(true);
                }}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {filteredRules.map((rule) => (
                    <RuleStatusCard
                      key={rule.id}
                      name={rule.rule_name}
                      category={rule.category}
                      status={rule.status}
                      lastCheck={rule.last_checked_at}
                      nextCheck={rule.next_check_at}
                      onRun={() => handleRunRule(rule.id)}
                    />
                  ))}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Rule</th>
                        <th className="px-4 py-3 text-left font-medium">Category</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Last Check</th>
                        <th className="px-4 py-3 text-left font-medium">Next Check</th>
                        <th className="px-4 py-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRules.map((rule) => (
                        <tr key={rule.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-gray-900">{rule.rule_name}</td>
                          <td className="px-4 py-3 text-gray-600">{rule.category}</td>
                          <td className="px-4 py-3 text-gray-600">{rule.status}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(rule.last_checked_at)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(rule.next_check_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => handleRunRule(rule.id)}
                              >
                                Run now
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                  setEditRule(rule);
                                  setWizardOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                onClick={() => handleToggleRule(rule.id, !rule.is_active)}
                                disabled={toggling === rule.id}
                              >
                                {toggling === rule.id ? 'Updating...' : rule.is_active ? 'Pause' : 'Activate'}
                              </button>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={deleting === rule.id}
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </FadeIn>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                title={alert.rule_name}
                message={alert.message}
                severity={alert.severity}
                resource={alert.affected_resource}
                detectedAt={alert.detected_at}
                status={alert.status}
                onAcknowledge={() => handleAcknowledge(alert.id)}
                onResolve={() => handleResolve(alert.id)}
                onDetails={() => setSelectedAlert(alert)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Started</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Duration</th>
                  <th className="px-4 py-3 text-left font-medium">Issues</th>
                  <th className="px-4 py-3 text-left font-medium">Alerts</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec) => (
                  <tr key={exec.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-600">{formatDate(exec.started_at)}</td>
                    <td className="px-4 py-3 text-gray-600">{exec.status}</td>
                    <td className="px-4 py-3 text-gray-600">{exec.duration_ms || 0} ms</td>
                    <td className="px-4 py-3 text-gray-600">{exec.issues_found || 0}</td>
                    <td className="px-4 py-3 text-gray-600">{exec.alerts_created || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <MonitoringRuleWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        tenantId={tenantId}
        mode={editRule ? 'edit' : 'create'}
        initialRule={editRule}
        onCreate={handleCreateRule}
        onCreated={() => {
          setEditRule(null);
          refreshAll();
        }}
      />

      <AlertDetailsModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />

      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        content={helpContent.continuousMonitoring}
        title="Continuous Monitoring Help"
      />
    </div>
    </div>
  );
}
