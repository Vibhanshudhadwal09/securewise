'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { Pie, Column } from '@ant-design/plots';

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

function critColor(v: string) {
  const s = String(v || '').toLowerCase();
  if (s === 'critical') return 'red';
  if (s === 'high') return 'orange';
  if (s === 'medium') return 'gold';
  return 'green';
}

export default function VendorsDashboard() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const { data: summary } = useSWR(`/api/vendors/analytics/summary`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: dist } = useSWR(`/api/vendors/analytics/risk-distribution`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: expiring } = useSWR(`/api/vendors/analytics/expiring-contracts?days_ahead=90`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: overdue } = useSWR(`/api/vendors/analytics/overdue-assessments`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });

  const distItems: any[] = Array.isArray((dist as any)?.items) ? (dist as any).items : [];
  const expItems: any[] = Array.isArray((expiring as any)?.items) ? (expiring as any).items : [];
  const overdueItems: any[] = Array.isArray((overdue as any)?.items) ? (overdue as any).items : [];

  const pieData = distItems.map((r: any) => ({ type: String(r.criticality), value: Number(r.count || 0) }));
  const colData = distItems.map((r: any) => ({ type: String(r.criticality), value: Number(r.avg_risk || 0) }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Vendor Risk Dashboard</h1>
          <p className="text-sm text-gray-600">Portfolio view of vendor criticality, risk scores, renewals, and overdue assessments.</p>
        </div>
        <a href="/vendors">Go to vendor registry</a>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Total Vendors" value={Number((summary as any)?.total_vendors || 0)} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Critical Vendors" value={Number((summary as any)?.critical_vendors || 0)} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Overdue Assessments" value={Number((summary as any)?.overdue_assessments || 0)} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Expiring Contracts (90d)" value={Number((summary as any)?.expiring_contracts_90d || 0)} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Vendors by Criticality">
            {pieData.length ? <Pie data={pieData} angleField="value" colorField="type" radius={0.9} height={260} /> : <Typography.Text type="secondary">No data.</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Average Risk Score by Criticality">
            {colData.length ? <Column data={colData} xField="type" yField="value" height={260} /> : <Typography.Text type="secondary">No data.</Typography.Text>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Overdue Assessments">
            <Table
              rowKey="id"
              size="small"
              dataSource={overdueItems}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Vendor', dataIndex: 'vendor_name', render: (v: any, r: any) => <a href={`/vendors/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a> },
                { title: 'Criticality', dataIndex: 'criticality', render: (v: any) => <Tag color={critColor(String(v || ''))}>{String(v || '')}</Tag> },
                { title: 'Next due', dataIndex: 'next_assessment_due', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Expiring Contracts (90 days)">
            <Table
              rowKey="id"
              size="small"
              dataSource={expItems}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Vendor', dataIndex: 'vendor_name', render: (v: any, r: any) => <a href={`/vendors/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a> },
                { title: 'End', dataIndex: 'contract_end_date', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                { title: 'Notify', dataIndex: 'renewal_notification_days', render: (v: any) => (v != null ? `${Number(v)}d` : '-') },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

