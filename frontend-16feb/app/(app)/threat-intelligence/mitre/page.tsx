/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type MitreResponse = {
  total_events: number;
  tactics: Array<{ tactic: string; count: number }>;
  techniques: Array<{ technique_id: string; technique_name: string; count: number; avg_severity: number }>;
  timeline: Array<{ date: string; tactics: Record<string, number> }>;
  recent_events: Array<{
    id: string;
    timestamp: string;
    description: string;
    severity_label: string;
    tactics: string[];
    techniques: string[];
    technique_names: string[];
  }>;
};

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

function severityVariant(sev: string) {
  if (sev === 'critical') return 'danger';
  if (sev === 'high') return 'warning';
  if (sev === 'medium') return 'info';
  return 'neutral';
}

export default function GlobalMitrePage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [timeRange, setTimeRange] = useState('7d');
  const [data, setData] = useState<MitreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMitre();
  }, [timeRange]);

  async function fetchMitre() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mitre-attack/matrix?timeRange=${encodeURIComponent(timeRange)}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const json = (await res.json().catch(() => ({}))) as MitreResponse;
      if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Failed to load MITRE data');
    } finally {
      setLoading(false);
    }
  }

  const timelineSummary = useMemo(() => {
    return (data?.timeline || []).map((row) => {
      const total = Object.values(row.tactics || {}).reduce((sum, v) => sum + Number(v || 0), 0);
      return { date: row.date, total };
    });
  }, [data]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">MITRE ATT&CK</h1>
          <p className="text-gray-600 mt-2">Mapped techniques from live Wazuh security incidents.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => fetchMitre()}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-gray-500">Loading MITRE data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-gray-600">Total Events</div>
              <div className="text-2xl font-semibold">{data?.total_events || 0}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Tactics Observed</div>
              <div className="text-2xl font-semibold">{data?.tactics?.length || 0}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Techniques Observed</div>
              <div className="text-2xl font-semibold">{data?.techniques?.length || 0}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">Top Tactics</h2>
              <div className="space-y-2">
                {(data?.tactics || []).length === 0 ? (
                  <div className="text-sm text-gray-500">No tactic data.</div>
                ) : (
                  data?.tactics?.map((t) => (
                    <div key={t.tactic} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{t.tactic}</span>
                      <span className="text-gray-500">{t.count}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="p-4 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-3">Technique Heatmap</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(data?.techniques || []).length === 0 ? (
                  <div className="text-sm text-gray-500">No technique data.</div>
                ) : (
                  data?.techniques?.map((tech) => (
                    <div key={tech.technique_id} className="rounded-lg border border-gray-200 p-3">
                      <div className="text-sm font-semibold">{tech.technique_id}</div>
                      <div className="text-xs text-gray-600">{tech.technique_name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Count: {tech.count} · Avg Severity: {tech.avg_severity.toFixed(1)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-3">Attack Timeline</h2>
            <div className="space-y-2">
              {timelineSummary.length === 0 ? (
                <div className="text-sm text-gray-500">No timeline data.</div>
              ) : (
                timelineSummary.map((row) => (
                  <div key={row.date} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{row.date}</span>
                    <span className="text-gray-500">{row.total}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-3">Recent MITRE Events</h2>
            <div className="space-y-3">
              {(data?.recent_events || []).length === 0 ? (
                <div className="text-sm text-gray-500">No recent events.</div>
              ) : (
                data?.recent_events?.map((event) => (
                  <div key={event.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={severityVariant(event.severity_label)}>{event.severity_label}</Badge>
                        <span className="text-sm font-semibold">{event.description || 'MITRE event'}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {event.timestamp ? new Date(event.timestamp).toLocaleString() : '-'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      Tactics: {event.tactics?.join(', ') || '-'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Techniques: {event.techniques?.join(', ') || '-'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

