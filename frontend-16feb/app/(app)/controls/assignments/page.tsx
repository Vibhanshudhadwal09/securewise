'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserCheck, Shield } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

type ControlRow = any;
type AssignmentRow = any;

function readCookie(name: string): string | null {
  const parts = String(document.cookie || '').split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.split('=').slice(1).join('='));
  } catch {
    return hit.split('=').slice(1).join('=');
  }
}

const users = [
  { id: 'grc@example.com', name: 'GRC Team' },
  { id: 'it-ops@example.com', name: 'IT Operations' },
  { id: 'security@example.com', name: 'Security Team' },
  { id: 'compliance@example.com', name: 'Compliance Team' },
  { id: 'auditor@example.com', name: 'Internal Auditor' },
];

function UserSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full appearance-none rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none disabled:opacity-50 transition-colors"
    >
      <option value="" className="bg-[var(--bg-primary)]">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id} className="bg-[var(--bg-primary)]">
          {u.name}
        </option>
      ))}
    </select>
  );
}

export default function ControlAssignmentsPage() {
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AssignmentRow>>({});
  const [loading, setLoading] = useState(false);

  const tenantId = useMemo(() => {
    return window.localStorage.getItem('tenant') || readCookie('sw_tenant') || 'demo-tenant';
  }, []);

  useEffect(() => {
    fetchControls();
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchControls() {
    try {
      const res = await fetch(`/api/controls?tenantId=${encodeURIComponent(tenantId)}&framework=iso27001`, {
        headers: { 'x-tenant-id': tenantId },
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data) ? data : [];
      setControls(items);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching controls:', err);
    }
  }

  async function fetchAssignments() {
    try {
      const res = await fetch('/api/control-assignments', {
        headers: { 'x-tenant-id': tenantId },
        credentials: 'include',
      });
      const data = (await res.json().catch(() => [])) as any[];
      const assignmentMap: Record<string, any> = {};
      for (const a of Array.isArray(data) ? data : []) {
        assignmentMap[String(a.control_id)] = a;
      }
      setAssignments(assignmentMap);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching assignments:', err);
    }
  }

  async function handleAssign(controlId: string, role: 'owner_user_id' | 'reviewer_user_id' | 'tester_user_id', userId: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/control-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        credentials: 'include',
        body: JSON.stringify({ control_id: controlId, [role]: userId || null }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(String((j as any)?.error || `HTTP ${res.status}`));
      }

      await fetchAssignments();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error assigning control:', err);
      alert('Failed to assign control');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <PageHeader
        title="Control Assignments"
        description="Assign owners, reviewers, and testers to controls. Evidence requests will be auto-created for owners."
        icon={UserCheck}
        breadcrumbs={[
          { label: 'GRC / Controls' },
          { label: 'Assignments' },
        ]}
        stats={[
          { label: 'Controls', value: controls.length },
          { label: 'Assigned', value: Object.keys(assignments).length },
        ]}
      />

      <div className="p-8 space-y-6 max-w-[1600px] mx-auto w-full">

        {/* Info Panel */}
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[var(--accent-blue)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">Assignment Rules</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { role: 'Owner', color: 'blue', desc: 'Responsible for providing evidence. Auto-creates an evidence request on assignment.' },
              { role: 'Reviewer', color: 'purple', desc: 'Reviews submitted evidence and approves or rejects it before it is recorded.' },
              { role: 'Tester', color: 'green', desc: 'Performs control testing to validate design and operating effectiveness.' },
            ].map(({ role, color, desc }) => (
              <div key={role} className={`rounded-lg border border-${color}-500/20 bg-${color}-500/5 p-4`}>
                <div className={`text-xs font-bold uppercase tracking-wider text-${color}-400 mb-1`}>{role}</div>
                <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Controls</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Select a user to assign them as owner, reviewer, or tester for each control.</p>
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--card-border)]">
              {controls.length} controls
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium border-b border-[var(--card-border)]">
                <tr>
                  <th className="px-6 py-3 text-xs uppercase tracking-wider">Control</th>
                  <th className="px-6 py-3 text-xs uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-xs uppercase tracking-wider">
                    <span className="text-blue-400">Owner</span>
                  </th>
                  <th className="px-6 py-3 text-xs uppercase tracking-wider">
                    <span className="text-purple-400">Reviewer</span>
                  </th>
                  <th className="px-6 py-3 text-xs uppercase tracking-wider">
                    <span className="text-green-400">Tester</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {controls.slice(0, 200).map((control: any) => {
                  const assignment = assignments[String(control.control_id)] || {};
                  return (
                    <tr key={String(control.control_id)} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                      <td className="px-6 py-3">
                        <span className="font-mono font-semibold text-[var(--accent-blue)] text-xs">
                          {String(control.control_id)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[var(--text-secondary)] text-xs group-hover:text-[var(--text-primary)] transition-colors line-clamp-1 max-w-[240px]">
                          {String(control.title || control.name || '')}
                        </span>
                      </td>
                      <td className="px-6 py-3 min-w-[180px]">
                        <UserSelect
                          value={String(assignment.owner_user_id || '')}
                          onChange={(v) => handleAssign(String(control.control_id), 'owner_user_id', v)}
                          disabled={loading}
                        />
                      </td>
                      <td className="px-6 py-3 min-w-[180px]">
                        <UserSelect
                          value={String(assignment.reviewer_user_id || '')}
                          onChange={(v) => handleAssign(String(control.control_id), 'reviewer_user_id', v)}
                          disabled={loading}
                        />
                      </td>
                      <td className="px-6 py-3 min-w-[180px]">
                        <UserSelect
                          value={String(assignment.tester_user_id || '')}
                          onChange={(v) => handleAssign(String(control.control_id), 'tester_user_id', v)}
                          disabled={loading}
                        />
                      </td>
                    </tr>
                  );
                })}
                {!controls.length ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-[var(--text-secondary)]" colSpan={5}>
                      No controls returned.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
