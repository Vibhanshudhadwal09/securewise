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

export async function getExecutiveDashboard(tenantId?: string) {
  return requestJson('/api/dashboards/executive', { tenantId });
}

export async function getSecurityPostureHistory(days: number, tenantId?: string) {
  const qs = new URLSearchParams({ days: String(days || 90) }).toString();
  return requestJson(`/api/dashboards/posture/security/history?${qs}`, { tenantId });
}

export async function getAllComplianceScores(tenantId?: string) {
  return requestJson('/api/dashboards/posture/compliance/all', { tenantId });
}

export async function calculateSecurityPosture(tenantId?: string) {
  return requestJson('/api/dashboards/posture/security/calculate', { method: 'POST', tenantId });
}

export async function calculateAllKPIs(tenantId?: string) {
  return requestJson('/api/kpis/calculate', { method: 'POST', tenantId });
}

export async function calculateAllComplianceScores(tenantId?: string) {
  return requestJson('/api/dashboards/posture/compliance/calculate-all', { method: 'POST', tenantId });
}

export async function getKPIHistory(kpiId: string, days: number, tenantId?: string) {
  const qs = new URLSearchParams({ days: String(days || 30) }).toString();
  return requestJson(`/api/kpis/${encodeURIComponent(kpiId)}/history?${qs}`, { tenantId });
}
