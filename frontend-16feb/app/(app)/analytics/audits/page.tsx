'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { Line, Pie } from '@ant-design/plots';
import { AlertTriangle, ClipboardCheck, ShieldCheck } from 'lucide-react';
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

function sevTag(sev: string) {
  const s = String(sev || 'medium');
  if (s === 'critical') return <Tag color="red">critical</Tag>;
  if (s === 'high') return <Tag color="orange">high</Tag>;
  if (s === 'medium') return <Tag color="gold">medium</Tag>;
  return <Tag color="blue">low</Tag>;
}

export default function AuditAnalytics() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const { data: score } = useSWR(`/api/analytics/compliance-score`, (u) => fetchJson(u, tenantId), { refreshInterval: 30_000, revalidateOnFocus: false });
  const breakdown = (score as any)?.breakdown || {};

  const { data: trends } = useSWR(`/api/analytics/audit-findings-trends?period=monthly`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: bySev } = useSWR(`/api/analytics/findings-by-severity`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: perf } = useSWR(`/api/analytics/audit-performance`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: exec } = useSWR(`/api/analytics/executive-summary?period_start=&period_end=`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });

  const trendItems = Array.isArray((trends as any)?.items) ? (trends as any).items : [];
  const line = trendItems.flatMap((r: any) => {
    const bucket = String(r.bucket || '').slice(0, 10);
    return [
      { bucket, type: 'major_nc', value: Number(r.major_nc || 0) },
      { bucket, type: 'minor_nc', value: Number(r.minor_nc || 0) },
      { bucket, type: 'observations', value: Number(r.observations || 0) },
    ];
  });

  const pie = (Array.isArray((bySev as any)?.items) ? (bySev as any).items : []).map((r: any) => ({
    severity: String(r.severity || 'unknown'),
    value: Number(r.count || 0),
  }));

  const recentFindings = Array.isArray((exec as any)?.recent_findings) ? (exec as any).recent_findings : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Audit Analytics"
        description="Active audits, findings trends, and performance metrics."
        icon={ClipboardCheck}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Analytics', href: '/analytics' },
          { label: 'Audits' },
        ]}
        stats={[
          { label: 'Active Audits', value: Number(breakdown.active_audits || 0) },
          { label: 'Open Findings', value: Number(breakdown.audit_findings_open || 0) },
        ]}
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Active Audits" value={Number(breakdown.active_audits || 0)} subtitle="Currently running" icon={ClipboardCheck} color="blue" />
          <MetricCard title="Open Findings" value={Number(breakdown.audit_findings_open || 0)} subtitle="Needs review" icon={AlertTriangle} color="orange" />
          <MetricCard title="Major NC" value={Number(breakdown.audit_findings_major || 0)} subtitle="High severity" icon={AlertTriangle} color="red" />
          <MetricCard title="Minor NC" value={Number(breakdown.audit_findings_minor || 0)} subtitle="Lower severity" icon={ShieldCheck} color="green" />
        </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Findings trend (monthly)">
            {line.length ? (
              <Line data={line} xField="bucket" yField="value" seriesField="type" height={280} smooth legend={{ position: 'top' }} />
            ) : (
              <Typography.Text type="secondary">No findings trend data yet.</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Findings by severity">
            {pie.length ? <Pie data={pie} angleField="value" colorField="severity" radius={0.9} height={280} /> : <Typography.Text type="secondary">No data.</Typography.Text>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Audit performance">
            <Table
              rowKey="k"
              size="small"
              pagination={false}
              dataSource={[
                { k: 'audits_total', label: 'Total audits', value: Number((perf as any)?.audits_total || 0) },
                { k: 'audits_completed', label: 'Completed audits', value: Number((perf as any)?.audits_completed || 0) },
                { k: 'completion_rate', label: 'Completion rate (%)', value: Number((perf as any)?.completion_rate || 0) },
                { k: 'avg_findings', label: 'Avg findings per audit', value: Number((perf as any)?.avg_findings_per_audit || 0) },
              ]}
              columns={[
                { title: 'Metric', dataIndex: 'label' },
                { title: 'Value', dataIndex: 'value' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Recent audit findings" extra={<a href="/audits">Open audits</a>}>
            <Table
              rowKey="id"
              size="small"
              dataSource={recentFindings}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '#', dataIndex: 'finding_number', render: (v: any) => <span style={{ fontFamily: 'ui-monospace' }}>{String(v || '-')}</span> },
                { title: 'Title', dataIndex: 'finding_title', render: (v: any) => String(v || '') },
                { title: 'Severity', dataIndex: 'severity', render: (v: any) => sevTag(String(v || 'medium')) },
                { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
    </div>
  );
}

