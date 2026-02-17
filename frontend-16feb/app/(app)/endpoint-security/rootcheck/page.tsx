'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function readCookie(name: string): string | null {
  const cur = String(document.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((json as any)?.error || `HTTP ${res.status}`));
  return json as any;
}

function findingStatus(item: any) {
  const raw = String(item?.status || item?.result || item?.event || '').toLowerCase();
  if (raw.includes('fail') || raw.includes('alert')) return 'alert';
  if (raw.includes('pass') || raw.includes('ok')) return 'ok';
  return raw || 'info';
}

function findingTimestamp(item: any) {
  return item?.timestamp || item?.date || item?.time || null;
}

export default function RootcheckPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchFindings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFindings() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson('/api/wazuh/rootcheck?limit=100', tenantId);
      setFindings(Array.isArray(data?.findings) ? data.findings : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load rootcheck results');
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const agents = new Set<string>();
    let alerts = 0;
    for (const f of findings) {
      if (f?.agent_id || f?.agent_name) agents.add(String(f?.agent_name || f?.agent_id));
      if (findingStatus(f) === 'alert') alerts += 1;
    }
    return { total: findings.length, agents: agents.size, alerts };
  }, [findings]);

  if (loading) return <div className="p-8">Loading rootcheck results...</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rootcheck</h1>
        <p className="text-gray-600 mt-2">Rootkit, malware, and security posture checks from Wazuh</p>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{totals.total}</div>
          <div className="text-sm text-gray-600">Total Findings</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{totals.alerts}</div>
          <div className="text-sm text-gray-600">Alerts</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{totals.agents}</div>
          <div className="text-sm text-gray-600">Agents</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Rootcheck Results</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-3">Agent</th>
                <th className="p-3">Check</th>
                <th className="p-3">Status</th>
                <th className="p-3">Description</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding: any, i) => {
                const status = findingStatus(finding);
                const ts = findingTimestamp(finding);
                return (
                  <tr key={`${finding?.id || i}`} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <Badge variant="info">{finding.agent_name || finding.agent_id || 'Unknown'}</Badge>
                    </td>
                    <td className="p-3 text-sm">{finding?.type || finding?.category || 'Rootcheck'}</td>
                    <td className="p-3">
                      <Badge variant={status === 'alert' ? 'danger' : status === 'ok' ? 'success' : 'neutral'}>{status}</Badge>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{finding?.description || finding?.title || finding?.file || '-'}</td>
                    <td className="p-3 text-sm text-gray-600">{ts ? new Date(ts).toLocaleString() : '-'}</td>
                  </tr>
                );
              })}
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-sm text-gray-500">
                    No rootcheck findings found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
