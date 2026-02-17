'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { Line, Pie } from '@ant-design/plots';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';

function readCookie(name: string): string | null {
  const cur = document.cookie
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
  if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
  return json;
}

export default function RiskAnalytics() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const { data: score } = useSWR(`/api/analytics/compliance-score`, (u) => fetchJson(u, tenantId), { refreshInterval: 30_000, revalidateOnFocus: false });
  const breakdown = (score as any)?.breakdown || {};

  const { data: heatmap } = useSWR(`/api/analytics/risk-heatmap`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: trends } = useSWR(`/api/analytics/risk-trends?period=monthly`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: byCat } = useSWR(`/api/analytics/risks-by-category`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });

  const trendItems = Array.isArray((trends as any)?.items) ? (trends as any).items : [];
  const trend = trendItems.map((r: any) => ({
    bucket: String(r.bucket || '').slice(0, 10),
    total: Number(r.total || 0),
    avg_residual: Number(r.avg_residual || 0),
  }));

  const pie = (Array.isArray((byCat as any)?.items) ? (byCat as any).items : []).map((r: any) => ({
    category: String(r.status || 'unknown'),
    value: Number(r.count || 0),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Risk Analytics"
        description="Risk posture summary, heatmap distribution, and trends."
        icon={ShieldAlert}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Analytics', href: '/analytics' },
          { label: 'Risks' },
        ]}
        stats={[
          { label: 'Total Risks', value: Number(breakdown.total_risks || 0) },
          { label: 'Critical', value: Number(breakdown.critical_risks || 0) },
        ]}
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total Risks" value={Number(breakdown.total_risks || 0)} subtitle="All tracked risks" icon={ShieldAlert} color="blue" />
          <MetricCard title="Critical Risks" value={Number(breakdown.critical_risks || 0)} subtitle="Highest impact" icon={AlertTriangle} color="red" />
          <MetricCard title="High Risks" value={Number(breakdown.high_risks || 0)} subtitle="High priority" icon={AlertTriangle} color="orange" />
          <MetricCard title="Above Appetite" value={Number(breakdown.risks_above_appetite || 0)} subtitle="Exceeds threshold" icon={ShieldAlert} color="purple" />
        </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Risk Heatmap (5x5)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {Array.isArray((heatmap as any)?.grid)
                ? (heatmap as any).grid.map((row: any[], y: number) =>
                    row.map((cell: any, x: number) => {
                      const n = Number(cell?.count || 0);
                      const bg = n >= 5 ? '#ff4d4f' : n >= 3 ? '#faad14' : n >= 1 ? '#ffe58f' : '#f5f5f5';
                      return (
                        <div key={`${y}-${x}`} style={{ borderRadius: 10, padding: 10, background: bg, minHeight: 54 }}>
                          <div style={{ fontWeight: 700 }}>{n}</div>
                          <div style={{ fontSize: 11, opacity: 0.75 }}>risks</div>
                        </div>
                      );
                    })
                  )
                : null}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Likelihood (rows) × Impact (columns)</div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Risks by status">
            {pie.length ? <Pie data={pie} angleField="value" colorField="category" radius={0.9} height={280} /> : <Typography.Text type="secondary">No data.</Typography.Text>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="Risk trends (monthly)">
            {trend.length ? (
              <Line
                data={trend.flatMap((r: any) => [
                  { bucket: r.bucket, metric: 'total', value: r.total },
                  { bucket: r.bucket, metric: 'avg_residual', value: r.avg_residual },
                ])}
                xField="bucket"
                yField="value"
                seriesField="metric"
                height={280}
                smooth
                legend={{ position: 'top' }}
              />
            ) : (
              <Typography.Text type="secondary">No trend data yet.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="Top risk list (open risk register)">
            <Table
              rowKey="k"
              size="small"
              pagination={false}
              dataSource={[
                { k: 'avg_inherent', label: 'Avg inherent risk (0-25)', value: Number(breakdown.average_inherent_risk || 0) },
                { k: 'avg_residual', label: 'Avg residual risk (0-25)', value: Number(breakdown.average_residual_risk || 0) },
              ]}
              columns={[
                { title: 'Metric', dataIndex: 'label' },
                { title: 'Value', dataIndex: 'value' },
              ]}
            />
            <div style={{ marginTop: 10 }}>
              <a href="/risks">Go to Risk Register</a>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
    </div>
  );
}

