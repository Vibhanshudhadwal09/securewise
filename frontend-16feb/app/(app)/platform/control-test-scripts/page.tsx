"use client";

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import {
  createControlTestScript,
  deleteControlTestScript,
  executeControlTest,
  getControlTestScripts,
  getControlTestTemplates,
  getLatestTestResult,
  getTestExecutions,
  updateControlTestScript,
} from '@/lib/api/control-test-templates';
import type { ControlTestExecution, ControlTestScript, ControlTestTemplate } from '@/types/control-tests';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ControlTestWizard from '@/components/control-tests/ControlTestWizard';
import CategoryIcon from '@/components/control-tests/CategoryIcon';
import DifficultyBadge from '@/components/control-tests/DifficultyBadge';
import TestTemplateCard from '@/components/control-tests/TestTemplateCard';
import TestResultCard from '@/components/control-tests/TestResultCard';
import ExecutionTimeline from '@/components/control-tests/ExecutionTimeline';
import TestDetailsModal from '@/components/control-tests/TestDetailsModal';
import ExecutionDetailsModal from '@/components/control-tests/ExecutionDetailsModal';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Loader2, XCircle, ClipboardCheck } from 'lucide-react';
import { HelpButton } from '@/components/help/HelpPanel';
import HelpPanel from '@/components/help/HelpPanel';
import EmptyState from '@/components/help/EmptyState';
import { helpContent } from '@/config/helpContent';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/LoadingStates';
import { FadeIn } from '@/components/ui/Transitions';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';

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

function statusBadge(status?: string) {
  if (status === 'passed') return <Badge className="bg-green-50 text-green-700 border-green-200">Passed</Badge>;
  if (status === 'failed') return <Badge className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
  if (status === 'running') return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Running</Badge>;
  return <Badge className="bg-gray-50 text-gray-600 border-gray-200">Never run</Badge>;
}

function statusIcon(status?: string) {
  if (status === 'passed') return <CheckCircle size={14} className="text-green-500" />;
  if (status === 'failed') return <XCircle size={14} className="text-red-500" />;
  if (status === 'running') return <Loader2 size={14} className="text-blue-500 animate-spin" />;
  return <Circle size={14} className="text-gray-400" />;
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return String(value).replace('T', ' ').slice(0, 19);
}

export default function ControlTestScriptsPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || getCookie('sw_tenant') || 'demo-tenant';

  const { data: scriptsData, mutate: mutateScripts } = useSWR(['control-tests', tenantId], () => getControlTestScripts(tenantId));
  const { data: executionsData, mutate: mutateExecutions } = useSWR(['control-test-exec', tenantId], () =>
    getTestExecutions(undefined, 200, tenantId)
  );
  const { data: templatesData } = useSWR(['control-test-templates', tenantId], () =>
    getControlTestTemplates(undefined, tenantId)
  );

  const scripts: ControlTestScript[] = Array.isArray(scriptsData?.items) ? scriptsData.items : [];
  const executions: ControlTestExecution[] = Array.isArray(executionsData?.items) ? executionsData.items : [];
  const templates: ControlTestTemplate[] = Array.isArray(templatesData?.items) ? templatesData.items : [];
  const loading = !scriptsData;

  const [tab, setTab] = useState('active');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editScript, setEditScript] = useState<ControlTestScript | null>(null);
  const [selectedScript, setSelectedScript] = useState<ControlTestScript | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ControlTestExecution | null>(null);
  const [quickTemplate, setQuickTemplate] = useState<ControlTestTemplate | null>(null);
  const [templateCategory, setTemplateCategory] = useState('all');
  const [templateDifficulty, setTemplateDifficulty] = useState('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const toast = useToast();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const stats = useMemo(() => {
    const now = Date.now();
    const last30 = executions.filter((e) => new Date(e.started_at).getTime() > now - 30 * 24 * 60 * 60 * 1000);
    const passed = last30.filter((e) => e.test_result === 'pass' || e.status === 'passed').length;
    const failed = last30.filter((e) => e.test_result === 'fail' || e.status === 'failed').length;
    const active = scripts.filter((s) => s.is_active).length;
    const successRate = passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0;
    return { active, passed, failed, successRate };
  }, [executions, scripts]);

  const templatesFiltered = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return templates.filter((t) => {
      if (templateCategory !== 'all' && t.category !== templateCategory) return false;
      if (templateDifficulty !== 'all' && t.difficulty !== templateDifficulty) return false;
      if (!q) return true;
      return t.template_name.toLowerCase().includes(q) || String(t.description || '').toLowerCase().includes(q);
    });
  }, [templates, templateCategory, templateDifficulty, templateSearch]);

  const refreshAll = () => {
    mutateScripts();
    mutateExecutions();
  };

  const handleCreateTest = async (data: any) => {
    setCreating(true);
    try {
      await createControlTestScript(data, tenantId);
      toast.success('Test script created!', 'Script is ready to run');
      setWizardOpen(false);
    } catch (error: any) {
      toast.error('Failed to create test script', error?.message || 'Please try again');
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const handleRunTest = async (scriptId: string) => {
    setRunning(scriptId);
    try {
      await executeControlTest(scriptId, tenantId);
      toast.success('Test executed successfully', 'Results have been recorded');
      refreshAll();
    } catch (error: any) {
      toast.error('Test execution failed', error?.message || 'Please check logs');
    } finally {
      setRunning(null);
    }
  };

  const handlePause = async (script: ControlTestScript) => {
    await updateControlTestScript(script.id, { is_active: !script.is_active }, tenantId);
    refreshAll();
  };

  const handleDeleteTest = async (scriptId: string) => {
    if (!confirm('Delete this test script?')) return;

    setDeleting(scriptId);
    try {
      await deleteControlTestScript(scriptId, tenantId);
      toast.success('Test script deleted');
      refreshAll();
    } catch (error: any) {
      toast.error('Failed to delete test', error?.message || 'Please try again');
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (script: ControlTestScript) => {
    await createControlTestScript(
      {
        ...script,
        script_name: `${script.script_name} Copy`,
        schedule_enabled: false,
        schedule_cron: undefined,
      },
      tenantId
    );
    refreshAll();
  };

  const handleLatestResult = async (scriptId: string) => {
    const res = await getLatestTestResult(scriptId, tenantId);
    if (res?.item) setSelectedExecution(res.item);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Control Test Scripts"
        description="Build automated control tests without writing code."
        icon={ClipboardCheck}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Control Test Scripts' },
        ]}
        stats={[
          { label: 'Active Tests', value: stats.active },
          { label: 'Success Rate', value: `${stats.successRate}%` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <HelpButton onClick={() => setShowHelp(true)} />
            <Button
              variant="primary"
              loading={creating}
              onClick={() => {
                setEditScript(null);
                setQuickTemplate(null);
                setWizardOpen(true);
              }}
            >
              Create Test Script
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Tests', value: stats.active },
          { label: 'Tests Passed (30d)', value: stats.passed },
          { label: 'Tests Failed (30d)', value: stats.failed },
          { label: 'Success Rate', value: `${stats.successRate}%` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="active">Active Tests</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
          <TabsTrigger value="templates">Templates Library</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <FadeIn>
            {loading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : scripts.length === 0 ? (
              <EmptyState
                type="controlTests"
                onAction={() => {
                  setEditScript(null);
                  setQuickTemplate(null);
                  setWizardOpen(true);
                }}
              />
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Test Name</th>
                      <th className="px-4 py-3 text-left font-medium">Category</th>
                      <th className="px-4 py-3 text-left font-medium">Controls</th>
                      <th className="px-4 py-3 text-left font-medium">Last Run</th>
                      <th className="px-4 py-3 text-left font-medium">Next Run</th>
                      <th className="px-4 py-3 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scripts.map((script) => {
                      const latest = executions.find((e) => e.script_id === script.id);
                      return (
                        <tr key={script.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-gray-900">{script.script_name}</td>
                          <td className="px-4 py-3 text-gray-600 flex items-center gap-2">
                            <CategoryIcon category={script.category} className="text-gray-500" size={14} />
                            {script.category}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{script.control_ids?.length || 0}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex items-center gap-2">
                              {statusIcon(latest?.status)}
                              {statusBadge(latest?.status)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(script.next_run_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                loading={running === script.id}
                                onClick={() => handleRunTest(script.id)}
                              >
                                Run Test
                              </Button>
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => {
                                  setEditScript(script);
                                  setWizardOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => setSelectedScript(script)}
                              >
                                View History
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => handleLatestResult(script.id)}
                              >
                                Latest Result
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => handleDuplicate(script)}
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => handlePause(script)}
                              >
                                {script.is_active ? 'Pause' : 'Resume'}
                              </button>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={deleting === script.id}
                                onClick={() => handleDeleteTest(script.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </FadeIn>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ExecutionTimeline
            executions={executions}
            onSelect={(exec) => setSelectedExecution(exec)}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {executions.slice(0, 6).map((exec) => (
              <TestResultCard
                key={exec.id}
                name={exec.script_name}
                category={scripts.find((s) => s.id === exec.script_id)?.category || 'access_control'}
                status={exec.status}
                executedAt={exec.started_at}
                durationMs={exec.duration_ms}
                passCriteriaMet={exec.test_result === 'pass'}
                onView={() => setSelectedExecution(exec)}
                onRerun={() => handleRunTest(exec.script_id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              <option value="access_control">Access Control</option>
              <option value="data_protection">Data Protection</option>
              <option value="network_security">Network Security</option>
              <option value="endpoint_security">Endpoint Security</option>
            </select>
            <select
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={templateDifficulty}
              onChange={(e) => setTemplateDifficulty(e.target.value)}
            >
              <option value="all">All difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
            <input
              className="flex-1 min-w-[220px] rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Search templates"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templatesFiltered.map((template) => (
              <TestTemplateCard
                key={template.template_id}
                template={template}
                onUse={() => {
                  setWizardOpen(true);
                  setEditScript(null);
                  setQuickTemplate(template);
                }}
                onPreview={() => {}}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ControlTestWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        tenantId={tenantId}
        mode={editScript ? 'edit' : 'create'}
        initialScript={editScript}
        initialTemplate={quickTemplate}
        onCreate={handleCreateTest}
        onCreated={() => {
          setEditScript(null);
          setQuickTemplate(null);
          refreshAll();
        }}
      />

      <TestDetailsModal
        script={selectedScript}
        executions={executions.filter((e) => e.script_id === selectedScript?.id)}
        onClose={() => setSelectedScript(null)}
        onEdit={() => {
          if (selectedScript) {
            setEditScript(selectedScript);
            setWizardOpen(true);
          }
        }}
      />

      <ExecutionDetailsModal execution={selectedExecution} onClose={() => setSelectedExecution(null)} />

      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        content={helpContent.controlTests}
        title="Control Test Scripts Help"
      />
    </div>
    </div>
  );
}
