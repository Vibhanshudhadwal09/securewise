'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import EvidenceWizard from '@/components/evidence/EvidenceWizard';
import EvidenceAutomationCard from '@/components/evidence/EvidenceAutomationCard';
import { HelpButton } from '@/components/help/HelpPanel';
import HelpPanel from '@/components/help/HelpPanel';
import EmptyState from '@/components/help/EmptyState';
import { helpContent } from '@/config/helpContent';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/LoadingStates';
import { FadeIn, SlideIn } from '@/components/ui/Transitions';
import { Button } from '@/components/ui/button';
import { createEvidenceAutomation } from '@/lib/api/evidence-templates';
import { Database } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(String(json?.error || `HTTP ${res.status}`)), { status: res.status, body: json });
  return json;
}

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

function getRuleCategory(rule: any) {
  const cfg = rule?.collection_config || {};
  const service = String(cfg.service || cfg.provider || '').toLowerCase();
  if (service === 'aws') return 'aws';
  if (service === 'azure') return 'azure';
  if (service === 'gcp') return 'custom';
  if (['okta', 'slack', 'google', 'github', 'microsoft365'].includes(service)) return 'saas';
  if (String(rule.collection_method || '') === 'script' || String(rule.collection_method || '') === 'tls_check') return 'custom';
  return 'custom';
}

export default function PlatformEvidenceAutomationPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || getCookie('sw_tenant') || 'demo-tenant';

  const { data, error, mutate } = useSWR('/api/evidence-collection/rules', (u) => fetchJson(u, tenantId));
  const { data: jobsData, mutate: mutateJobs } = useSWR('/api/evidence-collection/jobs?limit=200', (u) => fetchJson(u, tenantId));

  const rules: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];
  const jobs: any[] = Array.isArray((jobsData as any)?.items) ? (jobsData as any).items : [];
  const loading = !data && !error;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showHelp, setShowHelp] = useState(false);
  const toast = useToast();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const latestJobsByRule = useMemo(() => {
    const m = new Map<string, any>();
    for (const j of jobs) {
      const rid = String(j.rule_id || '');
      if (!rid) continue;
      if (!m.has(rid)) m.set(rid, j);
    }
    return m;
  }, [jobs]);

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((r) => {
      if (category !== 'all' && getRuleCategory(r) !== category) return false;
      if (!q) return true;
      return String(r.rule_name || '').toLowerCase().includes(q);
    });
  }, [rules, query, category]);

  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.is_active).length;
    const successJobs = jobs.filter((j) => String(j.job_status || '') === 'success');
    const successRate = jobs.length ? Math.round((successJobs.length / jobs.length) * 100) : 0;
    const collected = jobs.reduce((sum, j) => sum + Number(j.evidence_collected_count || 0), 0);
    return { total, active, collected, successRate };
  }, [rules, jobs]);

  async function runRule(ruleId: string) {
    await fetch(`/api/evidence-collection/rules/${encodeURIComponent(ruleId)}/run`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-tenant-id': tenantId },
    }).catch(() => null);
    mutateJobs();
    mutate();
  }

  async function deleteCollection(ruleId: string) {
    const res = await fetch(`/api/evidence-collection/rules/${encodeURIComponent(ruleId)}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'x-tenant-id': tenantId },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(String((json as any)?.error || `HTTP ${res.status}`));
    }
    return json;
  }

  const handleCreate = async (data: any) => {
    setCreating(true);
    try {
      await createEvidenceAutomation(data, tenantId);
      await mutate();
      await mutateJobs();
    } catch (error: any) {
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    setDeleting(id);
    try {
      await deleteCollection(id);
      await mutate();
      await mutateJobs();
      toast.success('Collection deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete collection', error?.message || 'Please try again');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Evidence Automation"
        description="Collect evidence with guided templates and zero configuration complexity."
        icon={Database}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Evidence Automation' },
        ]}
        stats={[
          { label: 'Total Automations', value: stats.total },
          { label: 'Active Collections', value: stats.active },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <HelpButton onClick={() => setShowHelp(true)} />
            <Button variant="primary" loading={creating} onClick={() => setWizardOpen(true)}>
              Create Collection
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

      <FadeIn>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load evidence automations.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total automations', value: stats.total },
            { label: 'Active collections', value: stats.active },
            { label: 'Evidence collected (30d)', value: stats.collected },
            { label: 'Success rate', value: `${stats.successRate}%` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">{stat.label}</div>
              <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="flex-1 min-w-[220px] rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Search automations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {['all', 'aws', 'azure', 'saas', 'custom'].map((c) => (
            <button
              key={c}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${
                category === c ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
              }`}
              onClick={() => setCategory(c)}
            >
              {c === 'all' ? 'All' : c.toUpperCase()}
            </button>
          ))}
        </div>

        {rules.length === 0 ? (
          <EmptyState type="evidence" onAction={() => setWizardOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRules.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
                No automations match the current filters.
              </div>
            ) : (
              filteredRules.map((rule, index) => {
                const job = latestJobsByRule.get(String(rule.id));
                return (
                  <SlideIn key={rule.id} delay={index * 50} direction="up">
                    <EvidenceAutomationCard
                      name={rule.rule_name}
                      method={rule.collection_method}
                      description={rule.rule_description}
                      templateId={rule.template_id}
                      schedule={rule.schedule_type}
                      lastRun={formatDate(job?.started_at)}
                      status={rule.is_active ? 'active' : 'paused'}
                      onRun={() => runRule(String(rule.id))}
                      onDelete={() => handleDelete(String(rule.id))}
                      deleting={deleting === String(rule.id)}
                    />
                  </SlideIn>
                );
              })
            )}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={5} columns={5} />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Method</th>
                  <th className="px-4 py-3 text-left font-medium">Controls</th>
                  <th className="px-4 py-3 text-left font-medium">Schedule</th>
                  <th className="px-4 py-3 text-left font-medium">Last Run</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => {
                  const job = latestJobsByRule.get(String(rule.id));
                  const controls = Array.isArray(rule.control_ids) ? rule.control_ids : [];
                  return (
                    <tr key={`row-${rule.id}`} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-900">{rule.rule_name}</td>
                      <td className="px-4 py-3 text-gray-600">{rule.collection_method}</td>
                      <td className="px-4 py-3 text-gray-600">{controls.length || '0'}</td>
                      <td className="px-4 py-3 text-gray-600">{rule.schedule_type || 'manual'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(job?.started_at)}</td>
                      <td className="px-4 py-3 text-gray-600">{rule.is_active ? 'Active' : 'Paused'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                            onClick={() => runRule(String(rule.id))}
                          >
                            Run now
                          </button>
                          <button type="button" className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                            Edit
                          </button>
                          <button type="button" className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">
                            View history
                          </button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={deleting === String(rule.id)}
                            onClick={() => handleDelete(String(rule.id))}
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
          )}
        </div>
      </FadeIn>

      <EvidenceWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        tenantId={tenantId}
        onCreate={handleCreate}
      />

      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        content={helpContent.evidenceAutomation}
        title="Evidence Automation Help"
      />
    </div>
    </div>
  );
}
