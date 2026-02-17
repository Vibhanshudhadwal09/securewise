'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Settings, ShieldCheck, Zap } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/enforcement/StatsCard';
import { EnforcementChart } from '@/components/enforcement/EnforcementChart';
import { DecisionsList, type EnforcementDecisionRow } from '@/components/enforcement/DecisionsList';
import { CircuitBreakerStatus } from '@/components/enforcement/CircuitBreakerStatus';
import { Card } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlaybookLibrary } from '@/components/enforcement/PlaybookLibrary';
import { EnforcementSettingsPanel } from '@/components/enforcement/EnforcementSettingsPanel';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cur = String(document.cookie || '');
  const cookie = cur.split('; ').find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

type StatsResponse = {
  total_enforcements?: number;
  successful?: number;
  failed?: number;
  success_rate?: number;
  avg_response_time_ms?: number;
  enforcements_today?: number;
  enforcements_this_week?: number;
  enforcements_this_month?: number;
  circuit_breaker_status?: string;
};

export default function EnforcementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [decisions, setDecisions] = useState<EnforcementDecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'playbooks', label: 'Playbooks', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const activeTab = tabs.find((t) => t.id === searchParams?.get('tab'))?.id || 'overview';

  useEffect(() => {
    setTenantId(readCookie('sw_tenant') || 'demo-tenant');
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    let mounted = true;
    let timer: any;

    const fetchAll = async () => {
      try {
        setError(null);
        const [statsRes, decisionsRes] = await Promise.all([
          fetch('/api/enforcement/stats', { headers: { 'x-tenant-id': tenantId }, credentials: 'include' }),
          fetch('/api/enforcement/decisions?limit=200&offset=0', { headers: { 'x-tenant-id': tenantId }, credentials: 'include' }),
        ]);

        const statsData = await statsRes.json().catch(() => null);
        const decisionsData = await decisionsRes.json().catch(() => null);

        if (!statsRes.ok) {
          throw new Error(statsData?.error || `Failed to load stats (${statsRes.status})`);
        }
        if (!decisionsRes.ok) {
          throw new Error(decisionsData?.error || `Failed to load decisions (${decisionsRes.status})`);
        }

        if (mounted) {
          setStats(statsData || null);
          setDecisions(Array.isArray(decisionsData?.decisions) ? decisionsData.decisions : []);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load enforcement data.');
          setStats(null);
          setDecisions([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    timer = setInterval(fetchAll, 5000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [tenantId]);

  const chartData = useMemo(() => {
    const now = new Date();
    const days = 14;
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map.set(key, 0);
    }
    for (const d of decisions) {
      if (!d.created_at) continue;
      const dt = new Date(d.created_at);
      const key = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
  }, [decisions]);

  const avgMs = stats?.avg_response_time_ms ?? 0;
  const avgText = avgMs >= 1000 ? `${(avgMs / 1000).toFixed(1)}s` : `${Math.round(avgMs)}ms`;
  const successRate = stats?.success_rate ?? 0;
  const breakerStatus = stats?.circuit_breaker_status || 'unknown';

  const changeTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'overview') params.delete('tab');
    else params.set('tab', tabId);
    const qs = params.toString();
    router.push(qs ? `/enforcement?${qs}` : '/enforcement');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Enforcement"
        subtitle="Monitor automated enforcement decisions and system health."
        icon={ShieldCheck}
      />

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${
                active
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => changeTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' ? (
        <>
          {error ? (
            <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
              <p className="text-sm font-medium">Unable to load enforcement data.</p>
              <p className="text-xs mt-1">{error}</p>
            </Card>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((k) => (
                <Card key={k} className="p-6 h-24 animate-pulse bg-gray-50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard title="Enforcements Today" value={stats?.enforcements_today || 0} trend="+12%" status="healthy" />
              <StatsCard title="Success Rate" value={`${successRate}%`} trend="+3%" status="healthy" />
              <StatsCard title="Avg Response Time" value={avgText} trend="-15%" status="healthy" />
              <StatsCard
                title="Circuit Breaker"
                value={<CircuitBreakerStatus status={breakerStatus} />}
                status={breakerStatus === 'open' ? 'danger' : breakerStatus === 'half-open' ? 'warning' : 'healthy'}
              />
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <EnforcementChart data={chartData} />
            </div>
            <Card className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Key Metrics</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total enforcements (30d)</span>
                  <span className="font-semibold text-gray-900">{stats?.enforcements_this_month || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total enforcements (7d)</span>
                  <span className="font-semibold text-gray-900">{stats?.enforcements_this_week || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful</span>
                  <span className="font-semibold text-gray-900">{stats?.successful || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed</span>
                  <span className="font-semibold text-gray-900">{stats?.failed || 0}</span>
                </div>
              </div>
            </Card>
          </div>

          <DecisionsList
            decisions={decisions.slice(0, 20)}
            onViewDetails={(id) => router.push(`/enforcement/decisions/${id}`)}
          />
        </>
      ) : null}

      {activeTab === 'playbooks' ? <PlaybookLibrary /> : null}

      {activeTab === 'settings' ? <EnforcementSettingsPanel /> : null}
    </div>
  );
}
