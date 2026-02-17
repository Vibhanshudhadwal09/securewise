"use client";

import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getSecurityPostureHistory } from '@/lib/api/dashboards';

type HistoryRow = {
  score_date?: string;
  overall_score?: number;
};

type ChartPoint = {
  date: string;
  score: number;
};

function formatDate(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatScore(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

export default function SecurityPostureTrendChart(props: { days?: number; tenantId?: string }) {
  const days = props.days ?? 90;
  const tenantId = props.tenantId;

  const [data, setData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = (await getSecurityPostureHistory(days, tenantId)) as HistoryRow[];
        if (!cancelled) setData(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load security posture history');
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [days, tenantId]);

  const points = useMemo<ChartPoint[]>(() => {
    return data
      .map((row) => ({
        date: row.score_date ? formatDate(row.score_date) : 'Unknown',
        score: typeof row.overall_score === 'number' ? row.overall_score : Number(row.overall_score || 0),
      }))
      .filter((row) => Number.isFinite(row.score));
  }, [data]);

  if (loading) {
    return <div className="h-64 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  if (!points.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
        No security posture history available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={formatScore} />
          <Tooltip
            formatter={(value: number) => formatScore(value)}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{ borderRadius: 8 }}
          />
          <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
