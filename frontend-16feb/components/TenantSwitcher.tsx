'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Tenant = { tenant_id: string; name: string };

export function TenantSwitcher() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenant, setTenant] = useState<string>('');

  useEffect(() => {
    const cur = document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('sw_tenant='));
    if (cur) setTenant(decodeURIComponent(cur.split('=')[1]));
  }, []);

  useEffect(() => {
    // Best-effort: only works for admin users
    fetch('/api/tenants', { headers: { 'x-tenant-id': tenant || 'demo-tenant' }, credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setTenants)
      .catch(()=>setTenants([]));
  }, [tenant]);

  function apply(next: string) {
    document.cookie = `sw_tenant=${encodeURIComponent(next)}; path=/; samesite=lax`;
    setTenant(next);
    window.location.reload();
  }

  if (!tenants.length) return null;

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Tenant</span>
        <select value={tenant} onChange={(e)=>apply(e.target.value)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd' }}>
          {tenants.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.name} ({t.tenant_id})</option>)}
        </select>
      </div>

      <button
        onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null);
          router.push('/login');
        }}
        style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #ddd', background: '#f7f7f7' }}
      >
        Logout
      </button>
    </div>
  );
}
