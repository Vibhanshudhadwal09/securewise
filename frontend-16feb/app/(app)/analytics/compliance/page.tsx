'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { Pie, Line } from '@ant-design/plots';
import { BarChart3, ShieldCheck } from 'lucide-react';
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

export default function ComplianceAnalytics() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const { data: score } = useSWR(`/api/analytics/compliance-score`, (u) => fetchJson(u, tenantId), { refreshInterval: 30_000, revalidateOnFocus: false });
  const { data: series } = useSWR(`/api/analytics/compliance-metrics?period=daily`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });

  const breakdown = (score as any)?.breakdown || {};
  const scoreVal = Number((score as any)?.score || 0);

  const pie = [
    { status: 'implemented', value: Number(breakdown.controls_implemented || 0) },
    { status: 'in_progress', value: Number(breakdown.controls_in_progress || 0) },
    { status: 'not_implemented', value: Number(breakdown.controls_not_implemented || 0) },
  ].filter((x) => x.value > 0);

  const items = Array.isArray((series as any)?.items) ? (series as any).items : [];
  const trend = items.map((r: any) => ({
    date: String(r.metric_date || '').slice(0, 10),
    score: Number(r.overall_compliance_score || 0),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Compliance Analytics"
        description="Score and control implementation snapshot with historical trend."
        icon={ShieldCheck}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Analytics', href: '/analytics' },
          { label: 'Compliance' },
        ]}
        stats={[
          { label: 'Compliance Score', value: `${scoreVal.toFixed(1)}%` },
          { label: 'Controls with Evidence', value: Number(breakdown.controls_with_evidence || 0) },
        ]}
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Compliance Score" value={`${scoreVal.toFixed(1)}%`} subtitle="Overall health" icon={ShieldCheck} color="green" />
          <MetricCard title="Controls with Evidence" value={Number(breakdown.controls_with_evidence || 0)} subtitle={`of ${Number(breakdown.total_controls || 0)} controls`} icon={BarChart3} color="blue" />
          <MetricCard title="Avg Effectiveness" value={`${Number(breakdown.average_control_effectiveness || 0).toFixed(1)}%`} subtitle="Latest test outcomes" icon={BarChart3} color="orange" />
        </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Implementation Status">
            {pie.length ? <Pie data={pie} angleField="value" colorField="status" radius={0.9} height={280} /> : <Typography.Text type="secondary">No data.</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Compliance Score Trend (daily)">
            {trend.length ? <Line data={trend} xField="date" yField="score" height={280} smooth /> : <Typography.Text type="secondary">No trend data yet. Use “Refresh Metrics” on /analytics.</Typography.Text>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="Evidence collection progress (top-level)">
            <Table
              rowKey="k"
              size="small"
              pagination={false}
              dataSource={[
                { k: 'controls_total', label: 'Total controls (scoped)', value: Number(breakdown.total_controls || 0) },
                { k: 'controls_evidence', label: 'Controls with any evidence', value: Number(breakdown.controls_with_evidence || 0) },
                { k: 'controls_implemented', label: 'Implemented (accepted evidence or passing test)', value: Number(breakdown.controls_implemented || 0) },
              ]}
              columns={[
                { title: 'Metric', dataIndex: 'label' },
                { title: 'Value', dataIndex: 'value' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
    </div>
  );
}

