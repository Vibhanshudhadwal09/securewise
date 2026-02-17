import useSWR from 'swr';

type MeResponse =
  | { ok: true; user: { id: string; email?: string; username?: string; roles?: string[]; permissions?: any } }
  | { ok: false; error: string };

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw Object.assign(new Error(String(json?.error || `HTTP ${res.status}`)), { status: res.status, body: json });
  return json as MeResponse;
}

function getPerm(permissions: any, dotted: string): boolean {
  if (!permissions || typeof permissions !== 'object') return false;
  const parts = String(dotted || '')
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean);
  let cur: any = permissions;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return false;
    cur = cur[p];
  }
  return cur === true;
}

export function usePermissions() {
  const { data, error, isLoading, mutate } = useSWR<MeResponse>('/api/auth/me', fetchJson, { revalidateOnFocus: true });
  const ok = Boolean((data as any)?.ok);
  const permissions = ok ? (data as any).user?.permissions || {} : {};
  const roles = ok ? (data as any).user?.roles || [] : [];
  const normalizedRoles = Array.isArray(roles) ? roles.map((role: string) => String(role || '').toLowerCase()) : [];
  const normalizedTokens = normalizedRoles.map((role) => role.replace(/\s+/g, '_'));
  const all = new Set([...normalizedRoles, ...normalizedTokens]);
  const isAdmin =
    all.has('admin') ||
    all.has('securewise_admin') ||
    all.has('super_user') ||
    all.has('superuser') ||
    all.has('super_admin') ||
    all.has('super user');

  return {
    me: ok ? (data as any).user : null,
    roles,
    permissions,
    isAdmin,
    isLoading,
    error: error || (!ok && (data as any)?.error ? new Error(String((data as any).error)) : null),
    refresh: mutate,
    can: (dotted: string) => getPerm(permissions, dotted),
  };
}

