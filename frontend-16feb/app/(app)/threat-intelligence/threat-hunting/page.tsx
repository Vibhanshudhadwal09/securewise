/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ThreatEvent = {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: string;
  incident_type: string;
  incident_category?: string | null;
  source_system?: string | null;
  external_reference?: string | null;
  status?: string | null;
  agent_name?: string | null;
  agent_ip?: string | null;
};

type SeverityStat = { severity_level: string; count: number };
type TechniqueStat = { technique: string; count: number };
type TimelinePoint = { time_bucket: string | null; count: number };

type ThreatResponse = {
  events: ThreatEvent[];
  total: number;
  page: number;
  limit: number;
  stats: {
    severity: SeverityStat[];
    techniques: TechniqueStat[];
    timeline: TimelinePoint[];
  };
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

export default function GlobalThreatHuntingPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [stats, setStats] = useState<ThreatResponse['stats'] | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [severity, setSeverity] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [timeRange, severity, search, selectedAgents, page]);

  async function fetchAgents() {
    try {
      const res = await fetch('/api/threat-hunting/agents', {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setAgents(Array.isArray(json?.agents) ? json.agents : []);
      }
    } catch {
      setAgents([]);
    }
  }

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('timeRange', timeRange);
      params.set('page', String(page));
      params.set('limit', '50');
      if (severity.length > 0) params.set('severity', severity.join(','));
      if (search.trim()) params.set('search', search.trim());
      if (selectedAgents.length > 0) params.set('agents', selectedAgents.join(','));

      const res = await fetch(`/api/threat-hunting/events?${params.toString()}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const json = (await res.json().catch(() => ({}))) as ThreatResponse & { error?: string };
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      setEvents(Array.isArray(json?.events) ? json.events : []);
      setStats(json?.stats || null);
      setTotal(Number(json?.total || 0));
    } catch (err: any) {
      setError(err?.message || 'Failed to load threat events');
    } finally {
      setLoading(false);
    }
  }

  function toggleSeverity(level: string) {
    setPage(1);
    setSeverity((prev) => {
      if (prev.includes(level)) return prev.filter((v) => v !== level);
      return [...prev, level];
    });
  }

  const severityCounts = useMemo(() => {
    const base = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const row of stats?.severity || []) {
      const key = String(row.severity_level || 'low') as keyof typeof base;
      base[key] = Number(row.count || 0);
    }
    return base;
  }, [stats]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Threat Hunting</h1>
        <p className="text-gray-600 mt-2">Live security events from Wazuh SIEM.</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-sm font-medium">Time Range</label>
            <select
              className="ml-2 rounded-md border px-3 py-2 text-sm"
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                setPage(1);
              }}
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Search incidents, rules, agent names"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchEvents()}>
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['critical', 'high', 'medium', 'low'].map((level) => (
            <Button
              key={level}
              size="sm"
              variant={severity.includes(level) ? 'default' : 'outline'}
              onClick={() => toggleSeverity(level)}
            >
              {level}
            </Button>
          ))}
          {agents.length > 0 ? (
            <select
              multiple
              className="ml-auto min-w-[220px] rounded-md border px-3 py-2 text-sm"
              value={selectedAgents}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                setSelectedAgents(values);
                setPage(1);
              }}
            >
              {agents.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </Card>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Critical</div>
          <div className="text-2xl font-semibold text-red-600">{severityCounts.critical}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">High</div>
          <div className="text-2xl font-semibold text-orange-600">{severityCounts.high}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Medium</div>
          <div className="text-2xl font-semibold text-yellow-600">{severityCounts.medium}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Low</div>
          <div className="text-2xl font-semibold">{severityCounts.low}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Recent Threat Events</h2>
          {loading ? (
            <div className="text-sm text-gray-500">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-gray-500">No events found for the selected filters.</div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={severityVariant(String(event.severity || 'low'))}>{event.severity}</Badge>
                        <span className="font-semibold">{event.title}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {event.agent_name ? `Agent: ${event.agent_name}` : 'Agent: -'}
                        {event.agent_ip ? ` · IP: ${event.agent_ip}` : ''}
                        {event.incident_type ? ` · Type: ${event.incident_type}` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {event.timestamp ? new Date(event.timestamp).toLocaleString() : '-'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 mt-2">{event.description || '-'}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {event.status ? `Status: ${event.status}` : 'Status: -'}
                    {event.source_system ? ` · Source: ${event.source_system}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Top Techniques</h2>
          <div className="space-y-2">
            {(stats?.techniques || []).length === 0 ? (
              <div className="text-sm text-gray-500">No technique data.</div>
            ) : (
              stats?.techniques.map((tech) => (
                <div key={tech.technique} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{tech.technique}</span>
                  <span className="text-gray-500">{tech.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Page {page} of {totalPages} ({total} events)
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

