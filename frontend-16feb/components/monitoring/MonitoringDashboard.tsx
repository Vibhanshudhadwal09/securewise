"use client";

import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

export default function MonitoringDashboard(props: { alerts: any[]; rules: any[] }) {
  const { alerts, rules } = props;

  const alertsBySeverity = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach((a) => {
      const key = String(a.severity || 'info');
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const alertsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach((a) => {
      const key = String(a.category || 'general');
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const alertsTimeline = useMemo(() => {
    const buckets: Record<string, number> = {};
    alerts.forEach((a) => {
      const day = String(a.detected_at || '').slice(0, 10);
      if (!day) return;
      buckets[day] = (buckets[day] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [alerts]);

  const successRate = useMemo(() => {
    const total = rules.length || 1;
    const active = rules.filter((r) => r.status === 'active').length;
    return Math.round((active / total) * 100);
  }, [rules]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Alerts over time</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={alertsTimeline}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Alerts by severity</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={alertsBySeverity} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                {alertsBySeverity.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Alerts by category</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={alertsByCategory}>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="value" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Rule execution health</div>
        <div className="text-4xl font-semibold text-gray-900">{successRate}%</div>
        <div className="text-xs text-gray-500 mt-1">Active rules as a share of total</div>
      </div>
    </div>
  );
}
