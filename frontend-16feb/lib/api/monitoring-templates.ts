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

export async function getMonitoringTemplates(category?: string, tenantId?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return requestJson(`/api/monitoring-templates${qs}`, { tenantId });
}

export async function getMonitoringCategories(tenantId?: string) {
  return requestJson('/api/monitoring-templates/categories', { tenantId });
}

export async function getTemplateById(id: string, tenantId?: string) {
  return requestJson(`/api/monitoring-templates/${encodeURIComponent(id)}`, { tenantId });
}

export async function getMonitoringRules(tenantId?: string) {
  return requestJson('/api/monitoring/rules', { tenantId });
}

export async function createMonitoringRule(data: any, tenantId?: string) {
  return requestJson('/api/monitoring/rules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function updateMonitoringRule(id: string, data: any, tenantId?: string) {
  return requestJson(`/api/monitoring/rules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function deleteMonitoringRule(id: string, tenantId?: string) {
  return requestJson(`/api/monitoring/rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    tenantId,
  });
}

export async function testMonitoringRule(id: string, config?: any, tenantId?: string) {
  return requestJson(`/api/monitoring/rules/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ config }),
    tenantId,
  });
}

export async function runMonitoringRule(id: string, tenantId?: string) {
  return requestJson(`/api/monitoring/rules/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    tenantId,
  });
}

export async function getMonitoringAlerts(filters: Record<string, any> = {}, tenantId?: string) {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString() ? `?${params.toString()}` : '';
  return requestJson(`/api/monitoring/alerts${qs}`, { tenantId });
}

export async function acknowledgeAlert(id: string, notes?: string, tenantId?: string) {
  return requestJson(`/api/monitoring/alerts/${encodeURIComponent(id)}/acknowledge`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ notes }),
    tenantId,
  });
}

export async function resolveAlert(id: string, resolution: string, tenantId?: string) {
  return requestJson(`/api/monitoring/alerts/${encodeURIComponent(id)}/resolve`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ resolution }),
    tenantId,
  });
}

export async function getExecutionHistory(ruleId?: string, tenantId?: string) {
  const qs = ruleId ? `?ruleId=${encodeURIComponent(ruleId)}` : '';
  return requestJson(`/api/monitoring/executions${qs}`, { tenantId });
}
