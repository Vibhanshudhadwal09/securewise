'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Card, Col, Row, Statistic, Tag, Typography, Table, Button, Space } from 'antd';
import { Line, Pie } from '@ant-design/plots';
import { AlertTriangle, BarChart3, ClipboardCheck, ShieldCheck } from 'lucide-react';
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

function scoreTag(score: number) {
  if (score >= 85) return <Tag color="green">Healthy</Tag>;
  if (score >= 70) return <Tag color="gold">Watch</Tag>;
  return <Tag color="red">At risk</Tag>;
}

export default function AnalyticsDashboard() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const { data: live } = useSWR(`/api/analytics/live/summary`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });
  const metrics = (live as any)?.metrics || {};

  const { data: heatmap } = useSWR(`/api/analytics/risk-heatmap`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const { data: findings } = useSWR(`/api/analytics/audit-findings-trends?period=monthly`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const { data: expiringPolicies } = useSWR(`/api/analytics/policies-expiring-soon?days_ahead=30`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const score = Number(metrics?.overall_compliance_score || 0);
  const openRisks = Number(metrics?.high_risks || 0) + Number(metrics?.critical_risks || 0);

  const trendItems = Array.isArray((findings as any)?.items) ? (findings as any).items : [];
  const trendChartData = trendItems.flatMap((r: any) => {
    const bucket = String(r.bucket || '').slice(0, 10);
    return [
      { bucket, type: 'major_nc', value: Number(r.major_nc || 0) },
      { bucket, type: 'minor_nc', value: Number(r.minor_nc || 0) },
      { bucket, type: 'observations', value: Number(r.observations || 0) },
    ];
  });

  const policyItems = Array.isArray((expiringPolicies as any)?.items) ? (expiringPolicies as any).items : [];

  const controlsPie = [
    { status: 'implemented', value: Number(metrics?.controls_implemented || 0) },
    { status: 'in_progress', value: Number(metrics?.controls_in_progress || 0) },
    { status: 'not_implemented', value: Number(metrics?.controls_not_implemented || 0) },
  ].filter((x) => x.value > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Analytics"
        description="Executive dashboard across controls, risks, audits, policies, and remediation."
        icon={BarChart3}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Analytics' },
        ]}
        stats={[
          { label: 'Compliance Score', value: `${score.toFixed(1)}%` },
          { label: 'Open Risks', value: openRisks },
        ]}
        actions={
          <Space>
            <Button href="/analytics/executive">Executive Summary</Button>
            <Button
              type="primary"
              onClick={() =>
                fetch('/api/analytics/compliance-metrics/calculate', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
                  body: JSON.stringify({ period: 'daily' }),
                }).catch(() => null)
              }
            >
              Refresh Metrics
            </Button>
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Compliance Score" value={`${score.toFixed(1)}%`} subtitle="Overall readiness" icon={ShieldCheck} color="green" />
          <MetricCard title="Open High/Critical Risks" value={openRisks} subtitle="Needs mitigation" icon={AlertTriangle} color="red" />
          <MetricCard title="Active Audits" value={Number(metrics?.active_audits || 0)} subtitle="In progress" icon={ClipboardCheck} color="blue" />
          <MetricCard title="Overdue Remediation" value={Number(metrics?.overdue_remediation_plans || 0)} subtitle="Past due" icon={AlertTriangle} color="orange" />
        </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Audit Findings Trend (monthly)" extra={<a href="/analytics/audits">Details</a>}>
            {trendChartData.length ? (
              <Line
                data={trendChartData}
                xField="bucket"
                yField="value"
                seriesField="type"
                height={260}
                smooth
                legend={{ position: 'top' }}
              />
            ) : (
              <Typography.Text type="secondary">No findings trend data yet.</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Control Status" extra={<a href="/analytics/compliance">Details</a>}>
            {controlsPie.length ? (
              <Pie data={controlsPie} angleField="value" colorField="status" radius={0.9} height={260} />
            ) : (
              <Typography.Text type="secondary">No control status data yet.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Risk Heatmap (5x5)" extra={<a href="/analytics/risks">Details</a>}>
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
          <Card title="Policies Due for Review (next 30 days)" extra={<a href="/analytics/policies">Details</a>}>
            <Table
              rowKey="id"
              size="small"
              dataSource={policyItems}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Policy', dataIndex: 'title', render: (v: any, r: any) => <a href={`/policies/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a> },
                { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                { title: 'Next review', dataIndex: 'next_review_date', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
    </div>
  );
}

