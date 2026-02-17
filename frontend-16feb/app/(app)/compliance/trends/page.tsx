'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type TrendPoint = {
  score_date: string;
  score_percentage: number;
  moving_average?: number;
};

type TrendMetrics = {
  current_score: number;
  change_7d: number;
  change_30d: number;
  velocity: number;
  forecast_7d: number;
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

async function fetchJson(url: string, tenantId: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': tenantId,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((json as any)?.error || `HTTP ${res.status}`));
  return json as any;
}

export default function ComplianceTrendsPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [metrics, setMetrics] = useState<TrendMetrics | null>(null);
  const [framework, setFramework] = useState<'iso27001' | 'soc2'>('iso27001');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework, days]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [trendsRes, metricsRes] = await Promise.all([
        fetchJson(`/api/compliance-trends/${framework}?days=${days}`, tenantId),
        fetchJson(`/api/compliance-trends/${framework}/metrics`, tenantId),
      ]);
      setTrendData(Array.isArray(trendsRes?.data) ? trendsRes.data : []);
      setMetrics((metricsRes?.metrics as TrendMetrics) || null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load trend data');
    } finally {
      setLoading(false);
    }
  }

  async function backfill() {
    setLoading(true);
    setError(null);
    try {
      await fetchJson(`/api/compliance-trends/${framework}/backfill`, tenantId, {
        method: 'POST',
        body: JSON.stringify({ days: 30 }),
      });
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Backfill failed');
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8">Loading trend data...</div>;

  const chartData = trendData.map((d) => ({
    date: new Date(d.score_date).toLocaleDateString(),
    score: Number(d.score_percentage || 0),
    ma: Number(d.moving_average || 0),
  }));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Compliance Trend Dashboard</h1>
          <p className="text-gray-600 mt-2">Track compliance improvement over time</p>
        </div>
        <div className="flex gap-3">
          <select value={framework} onChange={(e) => setFramework(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="iso27001">ISO 27001</option>
            <option value="soc2">SOC 2</option>
          </select>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="border rounded px-3 py-2">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          {trendData.length === 0 ? <Button onClick={backfill}>Backfill History</Button> : null}
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-3xl font-bold">{metrics.current_score}%</div>
            <div className="text-sm text-gray-600">Current Score</div>
          </Card>
          <Card className={`p-4 ${metrics.change_7d >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <div className={`text-3xl font-bold ${metrics.change_7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.change_7d > 0 ? '+' : ''}
              {metrics.change_7d}%
            </div>
            <div className="text-sm text-gray-600">7-Day Change {metrics.change_7d >= 0 ? '↑' : '↓'}</div>
          </Card>
          <Card className={`p-4 ${metrics.change_30d >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <div className={`text-3xl font-bold ${metrics.change_30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.change_30d > 0 ? '+' : ''}
              {metrics.change_30d}%
            </div>
            <div className="text-sm text-gray-600">30-Day Change {metrics.change_30d >= 0 ? '↑' : '↓'}</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold">
              {metrics.velocity > 0 ? '+' : ''}
              {metrics.velocity}%
            </div>
            <div className="text-sm text-gray-600">Daily Velocity</div>
          </Card>
          <Card className="p-4 border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{metrics.forecast_7d}%</div>
            <div className="text-sm text-gray-600">7-Day Forecast</div>
          </Card>
        </div>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Compliance Score History</h2>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis domain={[0, 100]} label={{ value: 'Compliance Score (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Actual Score" />
            <Line type="monotone" dataKey="ma" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="7-Day Moving Avg" />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 text-sm text-gray-600">
          <p>• Blue line: Daily compliance score</p>
          <p>• Green dashed line: 7-day moving average (smoothed trend)</p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Continuous Improvement Evidence</h2>
        <div className="space-y-3">
          {metrics && metrics.change_30d > 0 ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold text-green-900">Positive 30-Day Trend</p>
              <p className="text-sm text-green-700 mt-1">
                Compliance score improved by {metrics.change_30d}% over the past month, demonstrating continuous compliance enhancement.
              </p>
            </div>
          ) : null}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="font-semibold text-blue-900">Historical Tracking</p>
            <p className="text-sm text-blue-700 mt-1">{trendData.length} days of compliance score history captured for audit evidence.</p>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <p className="font-semibold text-purple-900">Forecast</p>
            <p className="text-sm text-purple-700 mt-1">
              Based on current velocity, projected to reach {metrics?.forecast_7d}% in 7 days.
            </p>
          </div>
        </div>
      </Card>

      {trendData.length === 0 ? (
        <div className="text-sm text-gray-600">
          <Badge variant="warning">No history yet</Badge> Run backfill or wait for the nightly snapshot.
        </div>
      ) : null}
    </div>
  );
}
