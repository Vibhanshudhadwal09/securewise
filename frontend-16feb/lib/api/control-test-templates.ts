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

export async function getControlTestTemplates(category?: string, tenantId?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return requestJson(`/api/control-test-templates${qs}`, { tenantId });
}

export async function getTemplateById(id: string, tenantId?: string) {
  return requestJson(`/api/control-test-templates/${encodeURIComponent(id)}`, { tenantId });
}

export async function getTestCategories(tenantId?: string) {
  return requestJson('/api/control-test-templates/categories', { tenantId });
}

export async function getControlTestScripts(tenantId?: string) {
  return requestJson('/api/control-test-scripts', { tenantId });
}

export async function createControlTestScript(data: any, tenantId?: string) {
  return requestJson('/api/control-test-scripts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function updateControlTestScript(id: string, data: any, tenantId?: string) {
  return requestJson(`/api/control-test-scripts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function deleteControlTestScript(id: string, tenantId?: string) {
  return requestJson(`/api/control-test-scripts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    tenantId,
  });
}

export async function executeControlTest(id: string, tenantId?: string) {
  return requestJson(`/api/control-test-scripts/${encodeURIComponent(id)}/execute`, {
    method: 'POST',
    tenantId,
  });
}

export async function getTestExecutions(scriptId?: string, limit?: number, tenantId?: string) {
  if (scriptId) {
    const qs = limit ? `?limit=${limit}` : '';
    return requestJson(`/api/control-test-scripts/${encodeURIComponent(scriptId)}/executions${qs}`, { tenantId });
  }
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return requestJson(`/api/control-test-executions${qs}`, { tenantId });
}

export async function getLatestTestResult(scriptId: string, tenantId?: string) {
  return requestJson(`/api/control-test-scripts/${encodeURIComponent(scriptId)}/latest-result`, { tenantId });
}
