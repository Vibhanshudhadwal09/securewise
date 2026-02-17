'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Flag, Shield, Wrench } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';

function readCookie(name: string): string | null {
  const cur = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
  return json;
}

type PlanRow = any;

function pill(color: string, text: string) {
  return <span className={`rounded-full border px-2 py-1 text-xs ${color}`}>{text}</span>;
}

function statusPill(status: string) {
  const s = String(status || 'planned');
  if (s === 'completed') return pill('border-green-200 bg-green-50 text-green-800', s);
  if (s === 'in_progress') return pill('border-blue-200 bg-blue-50 text-blue-800', 'in progress');
  if (s === 'blocked') return pill('border-red-200 bg-red-50 text-red-800', s);
  if (s === 'cancelled') return pill('border-gray-200 bg-gray-50 text-gray-700', s);
  return pill('border-gray-200 bg-white text-gray-800', s);
}

function priorityPill(priority: string) {
  const p = String(priority || 'medium');
  if (p === 'critical') return pill('border-red-200 bg-red-50 text-red-800', p);
  if (p === 'high') return pill('border-orange-200 bg-orange-50 text-orange-800', p);
  if (p === 'low') return pill('border-gray-200 bg-gray-50 text-gray-700', p);
  return pill('border-yellow-200 bg-yellow-50 text-yellow-800', p);
}

function fmtDate(d: any) {
  if (!d) return '-';
  const s = String(d);
  return s.slice(0, 10);
}

export default function RemediationPlansPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: '',
    controlId: '',
    assignedTo: '',
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);

  const totalPlans = plans.length;
  const inProgressPlans = plans.filter((p) => p?.status === 'in_progress').length;
  const blockedPlans = plans.filter((p) => p?.status === 'blocked').length;
  const completedPlans = plans.filter((p) => p?.status === 'completed').length;
  const [createForm, setCreateForm] = useState<any>({
    title: '',
    description: '',
    plan_type: 'general',
    related_control_id: '',
    related_id: '',
    priority: 'medium',
    owner: '',
    due_date: '',
    tasks: [{ title: '', assigned_to: '', due_date: '' }],
  });

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filters.status) qs.set('status', filters.status);
      if (filters.type) qs.set('type', filters.type);
      if (filters.priority) qs.set('priority', filters.priority);
      if (filters.controlId) qs.set('controlId', filters.controlId);
      if (filters.assignedTo) qs.set('assignedTo', filters.assignedTo);
      const json = await fetchJson(`/api/remediation-plans?${qs.toString()}`, tenantId);
      const items = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
      setPlans(items);
    } catch (e) {
      console.error('Failed to load remediation plans:', e);
      setError(e instanceof Error ? e.message : 'Failed to load plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filters.status, filters.type, filters.priority, filters.controlId, filters.assignedTo]);

  async function createPlan() {
    setCreateBusy(true);
    try {
      const tasks = (createForm.tasks || [])
        .map((t: any) => ({
          title: String(t.title || '').trim(),
          assigned_to: String(t.assigned_to || '').trim() || undefined,
          due_date: String(t.due_date || '').trim() || undefined,
        }))
        .filter((t: any) => t.title);

      const payload: any = {
        title: String(createForm.title || '').trim(),
        description: String(createForm.description || '').trim() || undefined,
        plan_type: String(createForm.plan_type || 'general'),
        related_control_id: String(createForm.related_control_id || '').trim() || undefined,
        related_id: String(createForm.related_id || '').trim() || undefined,
        priority: String(createForm.priority || 'medium'),
        owner: String(createForm.owner || '').trim() || undefined,
        due_date: String(createForm.due_date || '').trim() || undefined,
        tasks,
      };

      if (!payload.title) throw new Error('Title is required');
      if (!payload.plan_type) throw new Error('Type is required');
      if (payload.related_id === '') delete payload.related_id;

      const res = await fetch('/api/remediation-plans', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));

      setCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        plan_type: 'general',
        related_control_id: '',
        related_id: '',
        priority: 'medium',
        owner: '',
        due_date: '',
        tasks: [{ title: '', assigned_to: '', due_date: '' }],
      });
      await loadPlans();
    } catch (e) {
      console.error('Failed to create plan:', e);
      alert(e instanceof Error ? e.message : 'Failed to create plan');
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Remediation Action Plans"
        description="Track remediation plans, tasks, owners, and due dates across gaps, exceptions, and risks."
        icon={Wrench}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Remediation Plans' },
        ]}
        stats={[
          { label: 'Total Plans', value: totalPlans },
          { label: 'In Progress', value: inProgressPlans },
        ]}
        actions={
          <button className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setCreateOpen(true)}>
            Create plan
          </button>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="In Progress" value={inProgressPlans} subtitle="Active remediation" icon={Shield} color="orange" />
          <MetricCard title="Blocked" value={blockedPlans} subtitle="Needs attention" icon={Flag} color="red" />
          <MetricCard title="Completed" value={completedPlans} subtitle="Closed actions" icon={ClipboardCheck} color="green" />
          <MetricCard title="Total Plans" value={totalPlans} subtitle="All remediation plans" icon={Wrench} color="blue" />
        </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="planned">planned</option>
            <option value="in_progress">in_progress</option>
            <option value="blocked">blocked</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}>
            <option value="">All types</option>
            <option value="compliance_gap">compliance_gap</option>
            <option value="control_exception">control_exception</option>
            <option value="risk_mitigation">risk_mitigation</option>
            <option value="general">general</option>
          </select>
          <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}>
            <option value="">All priorities</option>
            <option value="critical">critical</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.controlId} onChange={(e) => setFilters((p) => ({ ...p, controlId: e.target.value }))} placeholder="Filter by control (e.g. A.5.12)" />
          <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.assignedTo} onChange={(e) => setFilters((p) => ({ ...p, assignedTo: e.target.value }))} placeholder="Tasks assigned to (email)" />
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Priority</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Progress</th>
              <th className="px-5 py-3">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td className="px-5 py-6 text-gray-600" colSpan={7}>
                  Loading…
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-gray-600" colSpan={7}>
                  No remediation plans found.
                </td>
              </tr>
            ) : (
              plans.map((p) => (
                <tr
                  key={String(p.id)}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => (window.location.href = `/remediation-plans/${encodeURIComponent(String(p.id))}`)}
                >
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900">{String(p.title || '')}</div>
                    <div className="text-xs text-gray-600">
                      {p.related_control_id ? <span className="font-mono">{String(p.related_control_id)}</span> : null}
                      {p.related_control_id && p.related_id ? <span className="mx-1">·</span> : null}
                      {p.related_id ? <span className="font-mono">{String(p.related_id).slice(0, 8)}…</span> : null}
                    </div>
                  </td>
                  <td className="px-5 py-3">{pill('border-gray-200 bg-white text-gray-800', String(p.plan_type || 'general'))}</td>
                  <td className="px-5 py-3">{priorityPill(String(p.priority || 'medium'))}</td>
                  <td className="px-5 py-3">{statusPill(String(p.status || 'planned'))}</td>
                  <td className="px-5 py-3">{String(p.owner || '-')}</td>
                  <td className="px-5 py-3">
                    {Number(p.completed_tasks || 0)} / {Number(p.total_tasks || 0)}
                  </td>
                  <td className="px-5 py-3">{fmtDate(p.due_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div className="text-sm font-semibold text-gray-900">Create remediation plan</div>
              <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" onClick={() => setCreateOpen(false)}>
                Close
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Title *</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={createForm.title} onChange={(e) => setCreateForm((p: any) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Type *</label>
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={createForm.plan_type} onChange={(e) => setCreateForm((p: any) => ({ ...p, plan_type: e.target.value }))}>
                    <option value="general">general</option>
                    <option value="compliance_gap">compliance_gap</option>
                    <option value="control_exception">control_exception</option>
                    <option value="risk_mitigation">risk_mitigation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700">Description</label>
                <textarea className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm" rows={3} value={createForm.description} onChange={(e) => setCreateForm((p: any) => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Priority</label>
                  <select className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={createForm.priority} onChange={(e) => setCreateForm((p: any) => ({ ...p, priority: e.target.value }))}>
                    <option value="critical">critical</option>
                    <option value="high">high</option>
                    <option value="medium">medium</option>
                    <option value="low">low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Owner</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={createForm.owner} onChange={(e) => setCreateForm((p: any) => ({ ...p, owner: e.target.value }))} placeholder="owner@company.com" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Due date</label>
                  <input type="date" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={createForm.due_date} onChange={(e) => setCreateForm((p: any) => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-700">Related control (optional)</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" value={createForm.related_control_id} onChange={(e) => setCreateForm((p: any) => ({ ...p, related_control_id: e.target.value }))} placeholder="A.5.12" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Related ID (optional UUID)</label>
                  <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" value={createForm.related_id} onChange={(e) => setCreateForm((p: any) => ({ ...p, related_id: e.target.value }))} placeholder="gap/exception/risk UUID" />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Initial tasks (optional)</div>
                  <button
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    onClick={() => setCreateForm((p: any) => ({ ...p, tasks: [...(p.tasks || []), { title: '', assigned_to: '', due_date: '' }] }))}
                  >
                    Add task
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {(createForm.tasks || []).map((t: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <input
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder="Task title"
                        value={t.title}
                        onChange={(e) =>
                          setCreateForm((p: any) => ({
                            ...p,
                            tasks: (p.tasks || []).map((x: any, i: number) => (i === idx ? { ...x, title: e.target.value } : x)),
                          }))
                        }
                      />
                      <input
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        placeholder="assigned_to (email)"
                        value={t.assigned_to}
                        onChange={(e) =>
                          setCreateForm((p: any) => ({
                            ...p,
                            tasks: (p.tasks || []).map((x: any, i: number) => (i === idx ? { ...x, assigned_to: e.target.value } : x)),
                          }))
                        }
                      />
                      <input
                        type="date"
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={t.due_date}
                        onChange={(e) =>
                          setCreateForm((p: any) => ({
                            ...p,
                            tasks: (p.tasks || []).map((x: any, i: number) => (i === idx ? { ...x, due_date: e.target.value } : x)),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4">
              <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={createBusy} onClick={createPlan}>
                {createBusy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}

