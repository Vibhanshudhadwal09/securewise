import type { ApprovalRequest } from '@/types/workflows';

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

export async function getApprovalRequests(filters: Record<string, any> = {}, tenantId?: string) {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return requestJson(`/api/approvals/requests${qs}`, { tenantId });
}

export async function createApprovalRequest(data: Partial<ApprovalRequest>, tenantId?: string) {
  return requestJson('/api/approvals/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function getApprovalRequestDetails(id: string, tenantId?: string) {
  return requestJson(`/api/approvals/requests/${encodeURIComponent(id)}`, { tenantId });
}

export async function approveRequest(id: string, stepId: string, comments?: string, tenantId?: string) {
  return requestJson(`/api/approvals/requests/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ step_id: stepId, decision_notes: comments || null }),
    tenantId,
  });
}

export async function rejectRequest(id: string, stepId: string, comments: string, tenantId?: string) {
  return requestJson(`/api/approvals/requests/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ step_id: stepId, decision_notes: comments || null }),
    tenantId,
  });
}

export async function addComment(id: string, comment: string, tenantId?: string) {
  return requestJson(`/api/approvals/requests/${encodeURIComponent(id)}/comment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ comment }),
    tenantId,
  });
}
