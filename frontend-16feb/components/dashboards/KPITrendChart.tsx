"use client";

import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getKPIHistory } from '@/lib/api/dashboards';

type HistoryRow = {
  measured_at?: string;
  value?: number;
};

type ChartPoint = {
  ts: string;
  value: number;
};

export default function KPITrendChart(props: { kpiId: string; days?: number; tenantId?: string }) {
  const { kpiId } = props;
  const days = props.days ?? 30;
  const tenantId = props.tenantId;

  const [data, setData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const rows = (await getKPIHistory(kpiId, days, tenantId)) as HistoryRow[];
        if (!cancelled) setData(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (kpiId) load();
    return () => {
      cancelled = true;
    };
  }, [kpiId, days, tenantId]);

  const points = useMemo<ChartPoint[]>(() => {
    return data
      .map((row) => ({
        ts: String(row.measured_at || ''),
        value: typeof row.value === 'number' ? row.value : Number(row.value || 0),
      }))
      .filter((row) => Number.isFinite(row.value));
  }, [data]);

  if (loading) {
    return <div className="h-8 w-full rounded bg-gray-100 animate-pulse" />;
  }

  if (!points.length) {
    return <div className="h-8 w-full rounded bg-gray-50" />;
  }

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
