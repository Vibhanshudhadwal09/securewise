import { cookies } from 'next/headers';

async function cookieHeader(): Promise<string> {
  const store = await cookies();
  const all = store.getAll();
  return all.map((c) => `${c.name}=${c.value}`).join('; ');
}

function apiBase(): string {
  // Server-side fetch needs an absolute URL. We intentionally call the Next.js
  // server (/api/*) so rewrites can proxy to the backend.
  return String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://127.0.0.1:3020').replace(/\/+$/, '');
}

export function apiUrl(path: string): string {
  const p = path.replace(/^\/+/, '').replace(/^api\//, '');
  return `${apiBase()}/api/${p}`;
}

export async function apiFetch(path: string, init: RequestInit & { tenantId?: string } = {}) {
  const { tenantId, ...rest } = init;
  const headers = new Headers(rest.headers || {});
  const ck = await cookieHeader();
  if (ck) headers.set('cookie', ck);
  if (tenantId) headers.set('x-tenant-id', tenantId);
  return fetch(apiUrl(path), { cache: 'no-store', ...rest, headers });
}

export async function apiJson(path: string, tenantId?: string) {
  const res = await apiFetch(path, { tenantId });
  const txt = await res.text();
  let json: any = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = { raw: txt };
  }
  return { ok: res.ok, status: res.status, json };
}

