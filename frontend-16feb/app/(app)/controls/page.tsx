'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, AlertCircle, Shield, Search, ChevronDown, ExternalLink } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import CrossFrameworkMappings from '@/components/controls/CrossFrameworkMappings';
import { Loading } from '@/components/ui/Loading';

type FrameworkId = 'soc2' | 'iso27001';

type ControlRow = {
  control_id: string;
  title: string;
  enforceability: string | null;
  evidence_status: string | null;
  last_evidence_at: string | null;
  stale: boolean;
  category?: string | null;
  implementation_status?: string | null;
  implementation_notes?: string | null;
  owner_email?: string | null;
  updated_at?: string | null;
};

async function fetchJson(path: string, tenantId: string) {
  const res = await fetch(path, {
    method: 'GET',
    credentials: 'include',
    headers: { 'x-tenant-id': tenantId },
    cache: 'no-store',
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
  return j;
}

function tscGroup(controlId: string): string {
  const s = String(controlId || '');
  const m = s.match(/^([A-Z]{1,3}\d+)(?:\..*)?$/);
  return m?.[1] || s.split('.')[0] || s;
}

function ImplTag({ status }: { status: any }) {
  const s = String(status || '');
  if (!s) return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">unknown</span>;

  const styles = {
    implemented: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  };

  const style = styles[s as keyof typeof styles] || styles.not_started;

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${style}`}>
      {s.replace('_', ' ')}
    </span>
  );
}

function EvidenceTag({ status, stale }: { status: any, stale: any }) {
  const s = String(status || '');

  if (stale) {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
        Stale
      </span>
    );
  }

  if (!s) return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">N/A</span>;

  const styles = {
    fresh: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    overdue: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    missing: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  };

  const style = styles[s as keyof typeof styles] || styles.missing;

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${style}`}>
      {s}
    </span>
  );
}

export default function ControlsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || 'demo-tenant';

  const [framework, setFramework] = useState<FrameworkId>((sp?.get('framework') as FrameworkId) || 'soc2');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string>('all');
  const [impl, setImpl] = useState<string>('all');
  const [mappingControlId, setMappingControlId] = useState<string>('');

  const apiUrl = useMemo(() => {
    const qs = new URLSearchParams({
      tenantId,
      framework,
      slaHours: String(sp?.get('slaHours') || 72),
      enforceability: String(sp?.get('enforceability') || 'all'),
      staleOnly: String(sp?.get('staleOnly') || 'false'),
    });
    return `/api/controls?${qs.toString()}`;
  }, [tenantId, framework, sp]);

  const { data, error, isLoading, mutate } = useSWR<{ items: ControlRow[] }>(apiUrl, (u) => fetchJson(u, tenantId), {
    revalidateOnFocus: false,
  });

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const r of items) set.add(tscGroup(r.control_id));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((r) => {
      if (group !== 'all' && tscGroup(r.control_id) !== group) return false;
      if (impl !== 'all' && String(r.implementation_status || '') !== impl) return false;
      if (!qq) return true;
      return (
        String(r.control_id || '').toLowerCase().includes(qq) ||
        String(r.title || '').toLowerCase().includes(qq) ||
        String(r.owner_email || '').toLowerCase().includes(qq)
      );
    });
  }, [items, q, group, impl]);

  useEffect(() => {
    if (!mappingControlId && filtered.length > 0) {
      setMappingControlId(String(filtered[0].control_id));
    }
  }, [filtered, mappingControlId]);

  const metrics = useMemo(() => {
    const total = items.length;
    const implemented = items.filter((r) => String(r.implementation_status || '') === 'implemented').length;
    const inProgress = items.filter((r) => String(r.implementation_status || '') === 'in_progress').length;
    const notStarted = items.filter((r) => String(r.implementation_status || '') === 'not_started').length;
    const coveragePct = total ? Math.round((implemented / total) * 100) : 0;
    return { total, implemented, inProgress, notStarted, coveragePct };
  }, [items]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <PageHeader
        title="Controls"
        description="Browse controls for the selected framework and open the Control Workbench to perform compliance actions."
        icon={Shield}
        breadcrumbs={[
          { label: 'GRC / Compliance' },
          { label: 'Controls' },
        ]}
        stats={[
          { label: 'Total Controls', value: metrics.total },
          { label: 'Frameworks', value: 2 },
        ]}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => mutate()}
              disabled={isLoading}
              className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => router.push(`/compliance?tenantId=${encodeURIComponent(tenantId)}`)}
              className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Compliance Overview
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Implemented"
            value={metrics.implemented}
            subtitle="Ready for audit"
            icon={CheckCircle}
            color="green"
            progress={metrics.coveragePct}
          />
          <MetricCard
            title="In Progress"
            value={metrics.inProgress}
            subtitle="Being configured"
            icon={Clock}
            color="blue"
            progress={metrics.total ? Math.round((metrics.inProgress / metrics.total) * 100) : 0}
          />
          <MetricCard
            title="Not Started"
            value={metrics.notStarted}
            subtitle="Needs attention"
            icon={AlertCircle}
            color="orange"
            progress={metrics.total ? Math.round((metrics.notStarted / metrics.total) * 100) : 0}
          />
          <MetricCard
            title="Coverage"
            value={`${metrics.coveragePct}%`}
            subtitle="Of required controls"
            icon={Shield}
            color="purple"
            progress={metrics.coveragePct}
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Framework</label>
            <div className="relative">
              <select
                value={framework}
                onChange={(e) => {
                  const v = e.target.value as FrameworkId;
                  setFramework(v);
                  const next = new URLSearchParams(sp?.toString() || '');
                  next.set('framework', String(v));
                  router.push(`/controls?${next.toString()}`);
                }}
                className="w-full appearance-none bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="soc2">SOC 2 Type II (TSC)</option>
                <option value="iso27001">ISO 27001:2022</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              {framework === 'soc2' ? 'Trust Service Criteria' : 'Category'}
            </label>
            <div className="relative">
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full appearance-none bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="all">All</option>
                {groups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Implementation Status</label>
            <div className="relative">
              <select
                value={impl}
                onChange={(e) => setImpl(e.target.value)}
                className="w-full appearance-none bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="all">All</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="implemented">Implemented</option>
                <option value="blocked">Blocked</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search ID / title / owner..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        {/* Mappings */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Cross-Framework Mappings</h3>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <select
                value={mappingControlId || ''}
                onChange={(e) => setMappingControlId(e.target.value)}
                className="w-full appearance-none bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                <option value="" disabled>Select a control to view mappings</option>
                {filtered.map((r) => (
                  <option key={r.control_id} value={r.control_id}>
                    {r.control_id} — {r.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>

            {mappingControlId ? (
              <CrossFrameworkMappings framework={framework} controlId={mappingControlId} tenantId={tenantId} />
            ) : (
              <p className="text-[var(--text-secondary)] text-sm">Select a control to see related frameworks.</p>
            )}
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300">Controls unavailable</h4>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {String((error as any)?.message || error)}
              </p>
            </div>
          </div>
        ) : null}

        {/* Table */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Controls List</h3>
            <span className="text-sm text-[var(--text-secondary)] font-medium bg-[var(--bg-secondary)] px-3 py-1 rounded-full">
              {filtered.length} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium border-b border-[var(--card-border)]">
                <tr>
                  <th className="px-6 py-3">Control</th>
                  <th className="px-6 py-3">{framework === 'soc2' ? 'TSC' : 'Group'}</th>
                  <th className="px-6 py-3">Implementation</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Evidence</th>
                  <th className="px-6 py-3">Updated</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loading />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                      No controls found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.control_id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-[var(--accent-blue)]">
                            {r.control_id}
                          </span>
                          <span className="text-[var(--text-secondary)] text-xs mt-0.5 line-clamp-1 group-hover:text-[var(--text-primary)] transition-colors">
                            {r.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--card-border)]">
                          {tscGroup(String(r.control_id))}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ImplTag status={r.implementation_status} />
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">
                        {r.owner_email || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <EvidenceTag status={r.evidence_status} stale={r.stale} />
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">
                        {r.updated_at ? String(r.updated_at).slice(0, 10) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            router.push(
                              `/compliance/controls/${encodeURIComponent(String(r.control_id))}/workbench?framework=${encodeURIComponent(framework)}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--bg-tertiary)] border border-[var(--card-border)] transition-colors"
                        >
                          Open
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

