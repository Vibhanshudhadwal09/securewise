'use client';

import { useEffect, useMemo, useState } from 'react';

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

export default function ControlAssignmentsPage() {
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AssignmentRow>>({});
  const [loading, setLoading] = useState(false);

  const tenantId = useMemo(() => {
    // Support both legacy localStorage usage and current cookie-based tenant.
    return window.localStorage.getItem('tenant') || readCookie('sw_tenant') || 'demo-tenant';
  }, []);

  const users = [
    { id: 'grc@example.com', name: 'GRC Team' },
    { id: 'it-ops@example.com', name: 'IT Operations' },
    { id: 'security@example.com', name: 'Security Team' },
    { id: 'compliance@example.com', name: 'Compliance Team' },
    { id: 'auditor@example.com', name: 'Internal Auditor' },
  ];

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
        body: JSON.stringify({
          control_id: controlId,
          [role]: userId || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(String((j as any)?.error || `HTTP ${res.status}`));
      }

      await fetchAssignments();
      alert(`Control ${controlId} assigned successfully`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error assigning control:', err);
      alert('Failed to assign control');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Control Assignments</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Assign owners, reviewers, and testers to controls. Evidence requests will be auto-created for owners.
      </p>

      <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 10, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: 12 }}>Control</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Owner</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Reviewer</th>
              <th style={{ textAlign: 'left', padding: 12 }}>Tester</th>
            </tr>
          </thead>
          <tbody>
            {controls.slice(0, 200).map((control: any) => {
              const assignment = assignments[String(control.control_id)] || {};
              return (
                <tr key={String(control.control_id)} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(control.control_id)}</td>
                  <td style={{ padding: 12 }}>{String(control.title || control.name || '')}</td>
                  <td style={{ padding: 12 }}>
                    <select
                      value={String(assignment.owner_user_id || '')}
                      onChange={(e) => handleAssign(String(control.control_id), 'owner_user_id', e.target.value)}
                      disabled={loading}
                      style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, minWidth: 220 }}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 12 }}>
                    <select
                      value={String(assignment.reviewer_user_id || '')}
                      onChange={(e) => handleAssign(String(control.control_id), 'reviewer_user_id', e.target.value)}
                      disabled={loading}
                      style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, minWidth: 220 }}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 12 }}>
                    <select
                      value={String(assignment.tester_user_id || '')}
                      onChange={(e) => handleAssign(String(control.control_id), 'tester_user_id', e.target.value)}
                      disabled={loading}
                      style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, minWidth: 220 }}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!controls.length ? (
              <tr>
                <td style={{ padding: 12, color: '#6b7280' }} colSpan={5}>
                  No controls returned.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Assignment Rules</h3>
        <ul style={{ marginBottom: 0 }}>
          <li>
            <strong>Owner:</strong> Responsible for providing evidence (auto-creates evidence request)
          </li>
          <li>
            <strong>Reviewer:</strong> Reviews and approves/rejects evidence
          </li>
          <li>
            <strong>Tester:</strong> Performs control testing (design + operating effectiveness)
          </li>
        </ul>
      </div>
    </div>
  );
}

