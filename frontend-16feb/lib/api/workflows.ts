import type { Workflow } from '@/types/workflows';

type ApiRequestOptions = RequestInit & { tenantId?: string };

async function requestJson(path: string, init: ApiRequestOptions = {}) {
  const { tenantId, ...rest } = init;
  const headers = new Headers(rest.headers || {});
  if (tenantId) headers.set('x-tenant-id', tenantId);

  const res = await fetch(path, {
    credentials: 'include',
    cache: 'no-store',
    ...rest,
    headers,
  });

  const txt = await res.text();
  let json: any = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = { raw: txt };
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || `Request failed (${res.status})`;
    throw Object.assign(new Error(String(msg)), { status: res.status, body: json });
  }

  return json;
}

export async function getWorkflows(entityType?: string, tenantId?: string) {
  const qs = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return requestJson(`/api/workflows/approval${qs}`, { tenantId });
}

export async function getWorkflow(id: string, tenantId?: string) {
  return requestJson(`/api/workflows/approval/${encodeURIComponent(id)}`, { tenantId });
}

export async function createWorkflow(data: Partial<Workflow>, tenantId?: string) {
  return requestJson('/api/workflows/approval', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function updateWorkflow(id: string, data: Partial<Workflow>, tenantId?: string) {
  return requestJson(`/api/workflows/approval/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function deleteWorkflow(id: string, tenantId?: string) {
  return requestJson(`/api/workflows/approval/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    tenantId,
  });
}

export async function activateWorkflow(id: string, tenantId?: string) {
  return requestJson(`/api/workflows/approval/${encodeURIComponent(id)}/activate`, {
    method: 'POST',
    tenantId,
  });
}

export async function deactivateWorkflow(id: string, tenantId?: string) {
  return requestJson(`/api/workflows/approval/${encodeURIComponent(id)}/deactivate`, {
    method: 'POST',
    tenantId,
  });
}
