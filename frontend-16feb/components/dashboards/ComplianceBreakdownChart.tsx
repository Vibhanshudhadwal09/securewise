"use client";

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getAllComplianceScores } from '@/lib/api/dashboards';

type ComplianceRow = {
  framework?: string;
  overall_compliance_score?: number;
  readiness_score?: number;
};

type ChartPoint = {
  framework: string;
  score: number;
};

function formatFramework(name: string) {
  const s = String(name || '').toLowerCase();
  if (!s) return 'Unknown';
  if (s === 'soc2' || s === 'soc_2') return 'SOC 2';
  if (s === 'iso27001' || s === 'iso_27001') return 'ISO 27001';
  if (s === 'hipaa') return 'HIPAA';
  if (s === 'pci') return 'PCI DSS';
  if (s === 'gdpr') return 'GDPR';
  return s.replace(/_/g, ' ').toUpperCase();
}

function formatScore(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function barColor(score: number) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#f59e0b';
  return '#dc2626';
}

export default function ComplianceBreakdownChart(props: { tenantId?: string }) {
  const tenantId = props.tenantId;
  const [data, setData] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = (await getAllComplianceScores(tenantId)) as ComplianceRow[];
        if (!cancelled) setData(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load compliance breakdown');
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
  }, [tenantId]);

  const points = useMemo<ChartPoint[]>(() => {
    return data
      .map((row) => ({
        framework: formatFramework(row.framework || 'unknown'),
        score: Number(row.overall_compliance_score ?? row.readiness_score ?? 0),
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
        No compliance scores available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={points} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} tickFormatter={formatScore} stroke="#9ca3af" />
          <YAxis type="category" dataKey="framework" tick={{ fontSize: 12 }} stroke="#9ca3af" width={90} />
          <Tooltip formatter={(value: number) => formatScore(value)} contentStyle={{ borderRadius: 8 }} />
          <Bar dataKey="score" radius={[6, 6, 6, 6]}>
            {points.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={barColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
