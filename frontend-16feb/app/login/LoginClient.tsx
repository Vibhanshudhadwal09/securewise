'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginClient(props: { tenant: string }) {
  const router = useRouter();
  const tenant = props.tenant || 'demo-tenant';

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setError(j?.error ? String(j.error) : `Login failed (${res.status})`);
        setBusy(false);
        return;
      }

      // Keep a stable tenant cookie for header binding.
      document.cookie = `sw_tenant=${encodeURIComponent(tenant)}; path=/; samesite=lax`;
      router.push(`/dashboard?tenantId=${encodeURIComponent(tenant)}`);
    } catch (err: any) {
      setError(String(err?.message || err || 'Login failed'));
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 440 }}>
      <h1>Sign in</h1>
      <p style={{ opacity: 0.75 }}>Local dev/demo login (cookie session).</p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
          />
        </label>

        <button
          disabled={busy}
          style={{
            marginTop: 6,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #ddd',
            background: '#f7f7f7',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        {error ? (
          <div style={{ marginTop: 10, padding: 12, border: '1px solid #f1c0c0', borderRadius: 10, background: '#fff6f6' }}>
            <strong>Error</strong>
            <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}>{error}</div>
          </div>
        ) : null}

        <p style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
          Default admin: <code>admin</code> / <code>admin123</code> (configurable via backend env).
        </p>
      </form>
    </main>
  );
}

