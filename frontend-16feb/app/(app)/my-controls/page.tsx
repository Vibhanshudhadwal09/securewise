'use client';

import { useEffect, useMemo, useState } from 'react';

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

export default function MyControlsPage() {
  const [myControls, setMyControls] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('grc@example.com');

  const tenantId = useMemo(() => {
    return window.localStorage.getItem('tenant') || readCookie('sw_tenant') || 'demo-tenant';
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json().catch(() => null));
        const userId = String(me?.user?.id || me?.user?.username || me?.userId || '').trim();
        if (userId) setCurrentUser(userId);
      } catch {
        // ignore; fallback stays
      }
    })();
  }, []);

  useEffect(() => {
    fetchMyControls();
    fetchPendingRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function fetchMyControls() {
    try {
      const res = await fetch('/api/control-assignments/my-controls', {
        headers: {
          'x-tenant-id': tenantId,
          'x-user-id': currentUser,
        },
        credentials: 'include',
      });
      const data = await res.json().catch(() => []);
      setMyControls(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching my controls:', err);
    }
  }

  async function fetchPendingRequests() {
    try {
      const res = await fetch(`/api/evidence-requests?assignedTo=${encodeURIComponent(currentUser)}`, {
        headers: { 'x-tenant-id': tenantId },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setPendingRequests(items.filter((r: any) => String(r.status || '') === 'pending'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching pending requests:', err);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>My Controls</h1>
      <p style={{ color: '#6b7280' }}>
        Signed in as: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{currentUser}</span>
      </p>

      <div style={{ marginTop: 24, marginBottom: 32 }}>
        <h2 style={{ marginTop: 0 }}>Pending Evidence Requests ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No pending requests</p>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 10, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: 12 }}>Control</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Evidence Type</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Due Date</th>
                  <th style={{ textAlign: 'left', padding: 12 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req: any) => (
                  <tr key={String(req.id || req.request_id || req.requestId || '')} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(req.control_id || '')}</td>
                    <td style={{ padding: 12 }}>{String(req.evidence_type || '')}</td>
                    <td style={{ padding: 12 }}>{req.due_date ? new Date(String(req.due_date)).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: 12 }}>
                      <a href={`/controls/${encodeURIComponent(String(req.control_id || ''))}`} style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                        View Control
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 style={{ marginTop: 0 }}>Controls I Own / Review / Test ({myControls.length})</h2>
        <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 10, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: 12 }}>Control</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Role</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {myControls.map((c: any) => {
                const roles: string[] = [];
                if (String(c.owner_user_id || '') === currentUser) roles.push('Owner');
                if (String(c.reviewer_user_id || '') === currentUser) roles.push('Reviewer');
                if (String(c.tester_user_id || '') === currentUser) roles.push('Tester');
                return (
                  <tr key={String(c.control_id || '')} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(c.control_id || '')}</td>
                    <td style={{ padding: 12 }}>{String(c.name || '')}</td>
                    <td style={{ padding: 12 }}>{roles.length ? roles.join(' · ') : '-'}</td>
                    <td style={{ padding: 12 }}>
                      <a href={`/controls/${encodeURIComponent(String(c.control_id || ''))}`} style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                        View
                      </a>
                    </td>
                  </tr>
                );
              })}
              {!myControls.length ? (
                <tr>
                  <td style={{ padding: 12, color: '#6b7280' }} colSpan={4}>
                    No assigned controls found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

