'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { Pie } from '@ant-design/plots';
import { FileText, ShieldCheck } from 'lucide-react';
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

export default function PolicyAnalytics() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const { data: pol } = useSWR(`/api/analytics/policy-compliance`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const { data: expiring } = useSWR(`/api/analytics/policies-expiring-soon?days_ahead=90`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });

  const pie = [
    { status: 'published', value: Number((pol as any)?.policies_published || 0) },
    { status: 'draft', value: Number((pol as any)?.policies_draft || 0) },
    { status: 'expired', value: Number((pol as any)?.policies_expired || 0) },
  ].filter((x) => x.value > 0);

  const items = Array.isArray((expiring as any)?.items) ? (expiring as any).items : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Policy Analytics"
        description="Policy posture: publication status, review cadence, and attestations."
        icon={FileText}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Analytics', href: '/analytics' },
          { label: 'Policies' },
        ]}
        stats={[
          { label: 'Total Policies', value: Number((pol as any)?.total_policies || 0) },
          { label: 'Due Review', value: Number((pol as any)?.policies_due_review || 0) },
        ]}
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total Policies" value={Number((pol as any)?.total_policies || 0)} subtitle="All policies" icon={FileText} color="blue" />
          <MetricCard title="Due Review" value={Number((pol as any)?.policies_due_review || 0)} subtitle="Needs review" icon={ShieldCheck} color="orange" />
          <MetricCard title="Attestation Rate" value={`${Number((pol as any)?.policy_attestation_rate || 0).toFixed(1)}%`} subtitle="Employee sign-off" icon={ShieldCheck} color="green" />
          <MetricCard title="Published" value={Number((pol as any)?.policies_published || 0)} subtitle="Live policies" icon={FileText} color="purple" />
        </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Policies by status">
            {pie.length ? <Pie data={pie} angleField="value" colorField="status" radius={0.9} height={280} /> : <Typography.Text type="secondary">No data.</Typography.Text>}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Upcoming reviews (next 90 days)" extra={<a href="/policies">Open policies</a>}>
            <Table
              rowKey="id"
              size="small"
              dataSource={items}
              pagination={{ pageSize: 8 }}
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

