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

export async function getEvidenceTemplates(category?: string, tenantId?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return requestJson(`/api/evidence-templates${qs}`, { tenantId });
}

export async function getTemplateById(id: string, tenantId?: string) {
  return requestJson(`/api/evidence-templates/${encodeURIComponent(id)}`, { tenantId });
}

export async function getTemplateCategories(tenantId?: string) {
  return requestJson('/api/evidence-templates/categories', { tenantId });
}

export async function testEvidenceConnection(config: any, tenantId?: string) {
  return requestJson('/api/evidence/test-connection', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config || {}),
    tenantId,
  });
}

export async function previewEvidence(config: any, tenantId?: string) {
  return requestJson('/api/evidence/preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config || {}),
    tenantId,
  });
}

export async function createEvidenceAutomation(data: any, tenantId?: string) {
  return requestJson('/api/evidence-collection/rules', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function updateEvidenceAutomation(id: string, data: any, tenantId?: string) {
  return requestJson(`/api/evidence-collection/rules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data || {}),
    tenantId,
  });
}

export async function runEvidenceCollection(id: string, tenantId?: string) {
  return requestJson(`/api/evidence-collection/rules/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    tenantId,
  });
}
