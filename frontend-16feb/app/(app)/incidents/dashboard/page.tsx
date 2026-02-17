'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Column, Line, Pie } from '@ant-design/plots';

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

function sevColor(s: string) {
  const v = String(s || '').toLowerCase();
  if (v === 'critical') return 'red';
  if (v === 'high') return 'orange';
  if (v === 'medium') return 'gold';
  return 'green';
}

export default function IncidentsDashboard() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const { data: summary } = useSWR(`/api/incidents/metrics/summary`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });
  const { data: mttr } = useSWR(`/api/incidents/metrics/mttr`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });
  const { data: sla } = useSWR(`/api/incidents/metrics/sla-compliance`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });
  const { data: trends } = useSWR(`/api/incidents/metrics/trends?period=daily`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });
  const { data: list } = useSWR(`/api/incidents`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });

  const items: any[] = Array.isArray((list as any)?.items) ? (list as any).items : [];
  const open = Number((summary as any)?.open || 0);
  const total = Number((summary as any)?.total || 0);
  const mttrResolve = Number((mttr as any)?.mttr_resolution_minutes || 0);
  const avgResolveDays = mttrResolve ? mttrResolve / 1440 : 0;

  const responseBreaches = Number((sla as any)?.responseBreaches || 0);
  const resolutionBreaches = Number((sla as any)?.resolutionBreaches || 0);
  const breachTotal = responseBreaches + resolutionBreaches;

  const byStatus = Array.isArray((summary as any)?.by_status) ? (summary as any).by_status : [];
  const bySeverity = Array.isArray((summary as any)?.by_severity) ? (summary as any).by_severity : [];
  const byType = Array.isArray((summary as any)?.by_type) ? (summary as any).by_type : [];
  const trendItems = Array.isArray((trends as any)?.items) ? (trends as any).items : [];
  const trendData = trendItems.map((r: any) => ({
    bucket: String(r.bucket || '').slice(0, 10),
    total: Number(r.total || 0),
    critical: Number(r.critical || 0),
    high: Number(r.high || 0),
  }));

  const recentCritical = items
    .filter((i) => String(i.severity) === 'critical')
    .slice(0, 10);
  const slaBreached = items
    .filter((i) => Boolean(i.sla_response_breached_live) || Boolean(i.sla_resolution_breached_live))
    .slice(0, 10);
  const longestOpen = items
    .filter((i) => String(i.status) !== 'closed')
    .slice()
    .sort((a, b) => new Date(String(a.detected_at)).getTime() - new Date(String(b.detected_at)).getTime())
    .slice(0, 10);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Incident Dashboard</h1>
          <p className="text-sm text-gray-600">Operational view of incident volume, trends, and SLA health.</p>
        </div>
        <Space>
          <a href="/incidents">Go to incidents list</a>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Open Incidents" value={open} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Total (90d)" value={total} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="SLA Breaches" value={breachTotal} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Avg Time to Resolve" value={avgResolveDays || 0} precision={2} suffix="days" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Incidents by Status">
            {byStatus.length ? <Pie data={byStatus.map((r: any) => ({ type: String(r.status), value: Number(r.count || 0) }))} angleField="value" colorField="type" radius={0.9} height={260} /> : <Typography.Text type="secondary">No data yet.</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Incidents Trend (daily)">
            {trendData.length ? (
              <Line
                data={trendData.flatMap((r) => [
                  { bucket: r.bucket, series: 'total', value: r.total },
                  { bucket: r.bucket, series: 'critical', value: r.critical },
                  { bucket: r.bucket, series: 'high', value: r.high },
                ])}
                xField="bucket"
                yField="value"
                seriesField="series"
                height={260}
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
        <Col xs={24} md={12}>
          <Card title="Incidents by Type">
            {byType.length ? (
              <Column
                data={byType.map((r: any) => ({ type: String(r.incident_type), value: Number(r.count || 0) }))}
                xField="type"
                yField="value"
                height={260}
              />
            ) : (
              <Typography.Text type="secondary">No data yet.</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Incidents by Severity">
            {bySeverity.length ? (
              <Pie
                data={bySeverity.map((r: any) => ({ type: String(r.severity), value: Number(r.count || 0) }))}
                angleField="value"
                colorField="type"
                radius={0.9}
                height={260}
              />
            ) : (
              <Typography.Text type="secondary">No data yet.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Recent Critical Incidents">
            <Table
              rowKey="id"
              size="small"
              dataSource={recentCritical}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'Incident', dataIndex: 'incident_number', render: (v: any, r: any) => <a href={`/incidents/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a> },
                { title: 'Title', dataIndex: 'incident_title', render: (v: any) => String(v || '') },
                { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="SLA Breached Incidents">
            <Table
              rowKey="id"
              size="small"
              dataSource={slaBreached}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'Incident', dataIndex: 'incident_number', render: (v: any, r: any) => <a href={`/incidents/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a> },
                { title: 'Severity', dataIndex: 'severity', render: (v: any) => <Tag color={sevColor(String(v || ''))}>{String(v || '')}</Tag> },
                { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Longest Open Incidents">
            <Table
              rowKey="id"
              size="small"
              dataSource={longestOpen}
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'Incident', dataIndex: 'incident_number', render: (v: any, r: any) => <a href={`/incidents/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a> },
                { title: 'Detected', dataIndex: 'detected_at', render: (v: any) => String(v || '').slice(0, 10) },
                { title: 'Severity', dataIndex: 'severity', render: (v: any) => <Tag color={sevColor(String(v || ''))}>{String(v || '')}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

