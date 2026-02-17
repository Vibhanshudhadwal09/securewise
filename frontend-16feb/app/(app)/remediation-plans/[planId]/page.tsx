'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

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

function fmtDate(d: any) {
  if (!d) return '-';
  return String(d).slice(0, 10);
}

export default function RemediationPlanDetailPage() {
  const params = useParams() as any;
  const planId = String(params?.planId || '');
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newTask, setNewTask] = useState<any>({ title: '', assigned_to: '', due_date: '' });
  const [status, setStatus] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJson(`/api/remediation-plans/${encodeURIComponent(planId)}`, tenantId);
      setData(j);
      setStatus(String(j?.plan?.status || 'planned'));
    } catch (e) {
      console.error('Failed to load plan:', e);
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!planId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, tenantId]);

  async function updateStatus() {
    setBusy(true);
    try {
      const res = await fetch(`/api/remediation-plans/${encodeURIComponent(planId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ status, comment: comment || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      setComment('');
      await load();
    } catch (e) {
      console.error('Failed to update status:', e);
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  }

  async function addTask() {
    setBusy(true);
    try {
      if (!String(newTask.title || '').trim()) throw new Error('Task title is required');
      const res = await fetch(`/api/remediation-plans/${encodeURIComponent(planId)}/tasks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          title: String(newTask.title || '').trim(),
          assigned_to: String(newTask.assigned_to || '').trim() || undefined,
          due_date: String(newTask.due_date || '').trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      setNewTask({ title: '', assigned_to: '', due_date: '' });
      await load();
    } catch (e) {
      console.error('Failed to add task:', e);
      alert(e instanceof Error ? e.message : 'Failed to add task');
    } finally {
      setBusy(false);
    }
  }

  async function markTask(taskId: string, nextStatus: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/remediation-plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ status: nextStatus }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      await load();
    } catch (e) {
      console.error('Failed to update task:', e);
      alert(e instanceof Error ? e.message : 'Failed to update task');
    } finally {
      setBusy(false);
    }
  }

  const plan = data?.plan;
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const updates = Array.isArray(data?.updates) ? data.updates : [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Remediation plan</h1>
          <p className="text-sm text-gray-600">
            <a className="text-blue-700 underline" href="/remediation-plans">
              ← Back to plans
            </a>
          </p>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {loading ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">Loading…</div>
      ) : !plan ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">Plan not found.</div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">{String(plan.title || '')}</div>
            {plan.description ? <div className="mt-1 text-sm text-gray-700">{String(plan.description)}</div> : null}
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
              <div>
                <div className="text-xs text-gray-600">Type</div>
                <div className="font-mono text-xs">{String(plan.plan_type || '')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Priority</div>
                <div>{String(plan.priority || 'medium')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Owner</div>
                <div>{String(plan.owner || '-')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Due</div>
                <div>{fmtDate(plan.due_date)}</div>
              </div>
            </div>
            {plan.related_control_id || plan.related_id ? (
              <div className="mt-3 text-sm text-gray-700">
                Related: {plan.related_control_id ? <span className="font-mono">{String(plan.related_control_id)}</span> : null}
                {plan.related_control_id && plan.related_id ? <span className="mx-2">·</span> : null}
                {plan.related_id ? <span className="font-mono">{String(plan.related_id)}</span> : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-900">Status</div>
              <div className="flex items-center gap-2">
                <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="planned">planned</option>
                  <option value="in_progress">in_progress</option>
                  <option value="blocked">blocked</option>
                  <option value="completed">completed</option>
                  <option value="cancelled">cancelled</option>
                </select>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={updateStatus}>
                  Update
                </button>
              </div>
            </div>
            <div className="mt-2">
              <label className="text-xs font-medium text-gray-700">Comment (optional)</label>
              <input className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Why are you changing the status?" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Tasks</div>
              <div className="mt-3 space-y-2">
                {!tasks.length ? <div className="text-sm text-gray-600">No tasks yet.</div> : null}
                {tasks.map((t: any) => (
                  <div key={String(t.id)} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-900">{String(t.title || '')}</div>
                        <div className="text-xs text-gray-600">
                          assigned: {String(t.assigned_to || '-')} · due: {fmtDate(t.due_date)} · status: {String(t.status || 'pending')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {String(t.status) !== 'completed' ? (
                          <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs" disabled={busy} onClick={() => markTask(String(t.id), 'completed')}>
                            Mark done
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 p-3">
                <div className="text-sm font-semibold text-gray-900">Add task</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask((p: any) => ({ ...p, title: e.target.value }))} />
                  <input className="rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="assigned_to (email)" value={newTask.assigned_to} onChange={(e) => setNewTask((p: any) => ({ ...p, assigned_to: e.target.value }))} />
                  <input type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={newTask.due_date} onChange={(e) => setNewTask((p: any) => ({ ...p, due_date: e.target.value }))} />
                  <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy} onClick={addTask}>
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Updates</div>
              <div className="mt-3 space-y-2">
                {!updates.length ? <div className="text-sm text-gray-600">No updates yet.</div> : null}
                {updates.slice(0, 25).map((u: any) => (
                  <div key={String(u.id)} className="rounded-lg border border-gray-200 p-3 text-sm">
                    <div className="text-xs text-gray-600">
                      {String(u.update_type || '')} · {String(u.created_at || '').replace('T', ' ').replace('Z', '')}
                    </div>
                    <div className="mt-1 text-gray-900">
                      {u.old_status || u.new_status ? (
                        <span className="font-mono text-xs">
                          {String(u.old_status || '')}
                          {u.old_status && u.new_status ? ' → ' : ''}
                          {String(u.new_status || '')}
                        </span>
                      ) : null}
                      {u.comment ? <div className="mt-1">{String(u.comment)}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

