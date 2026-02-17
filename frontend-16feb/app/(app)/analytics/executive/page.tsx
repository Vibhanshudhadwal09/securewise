'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, Card, DatePicker, Descriptions, Space, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { BarChart3 } from 'lucide-react';
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

export default function ExecutiveSummaryPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [start, setStart] = useState(dayjs().subtract(30, 'day'));
  const [end, setEnd] = useState(dayjs());
  const qs = `period_start=${encodeURIComponent(start.format('YYYY-MM-DD'))}&period_end=${encodeURIComponent(end.format('YYYY-MM-DD'))}`;

  const { data, mutate, isLoading } = useSWR(`/api/analytics/executive-summary?${qs}`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const metrics = (data as any)?.metrics || {};
  const topRisks = Array.isArray((data as any)?.top_risks) ? (data as any).top_risks : [];
  const findings = Array.isArray((data as any)?.recent_findings) ? (data as any).recent_findings : [];

  async function generateReport(report_type: string) {
    try {
      const res = await fetch('/api/analytics/reports/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ report_type, period_start: start.format('YYYY-MM-DD'), period_end: end.format('YYYY-MM-DD') }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      message.success('Report generated');
      const id = String(j?.report?.id || '');
      if (id) window.location.href = `/api/analytics/reports/${encodeURIComponent(id)}/export?format=pdf`;
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to generate report');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Executive Summary"
        description="Cross-module snapshot with exportable reports."
        icon={BarChart3}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Analytics', href: '/analytics' },
          { label: 'Executive Summary' },
        ]}
        stats={[
          { label: 'Compliance', value: `${Number(metrics.overall_compliance_score || 0).toFixed(1)}%` },
          { label: 'Open Findings', value: Number(metrics.audit_findings_open || 0) },
        ]}
        actions={
          <Space>
            <DatePicker value={start} onChange={(v) => v && setStart(v)} />
            <DatePicker value={end} onChange={(v) => v && setEnd(v)} />
            <Button onClick={() => mutate()} loading={isLoading}>
              Refresh
            </Button>
            <Button type="primary" onClick={() => generateReport('executive_summary')}>
              Export PDF
            </Button>
            <Button onClick={() => generateReport('executive_summary')}>Export XLSX/PPTX (via report)</Button>
          </Space>
        }
      />

      <div className="p-8 space-y-6">

      <Card title="Key metrics">
        <Descriptions column={3} size="small">
          <Descriptions.Item label="Compliance score">{Number(metrics.overall_compliance_score || 0).toFixed(2)}%</Descriptions.Item>
          <Descriptions.Item label="Open findings">{Number(metrics.audit_findings_open || 0)}</Descriptions.Item>
          <Descriptions.Item label="Overdue remediation">{Number(metrics.overdue_remediation_plans || 0)}</Descriptions.Item>
          <Descriptions.Item label="Critical risks">{Number(metrics.critical_risks || 0)}</Descriptions.Item>
          <Descriptions.Item label="High risks">{Number(metrics.high_risks || 0)}</Descriptions.Item>
          <Descriptions.Item label="Policies due review">{Number(metrics.policies_due_review || 0)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Top risks">
          <Table
            rowKey="risk_id"
            size="small"
            pagination={{ pageSize: 6 }}
            dataSource={topRisks}
            columns={[
              { title: 'Risk', dataIndex: 'title', render: (v: any, r: any) => <a href={`/risks/${encodeURIComponent(String(r.risk_id))}`}>{String(v || '')}</a> },
              { title: 'Residual score', dataIndex: 'residual_score', render: (v: any) => <Tag color={Number(v || 0) >= 15 ? 'red' : 'gold'}>{String(v || 0)}</Tag> },
            ]}
          />
        </Card>

        <Card title="Recent audit findings">
          <Table
            rowKey="id"
            size="small"
            pagination={{ pageSize: 6 }}
            dataSource={findings}
            columns={[
              { title: '#', dataIndex: 'finding_number', render: (v: any) => <span style={{ fontFamily: 'ui-monospace' }}>{String(v || '-')}</span> },
              { title: 'Title', dataIndex: 'finding_title', render: (v: any) => String(v || '') },
              { title: 'Severity', dataIndex: 'severity', render: (v: any) => <Tag color={String(v) === 'critical' ? 'red' : String(v) === 'high' ? 'orange' : 'gold'}>{String(v || 'medium')}</Tag> },
              { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
            ]}
          />
        </Card>
      </div>
    </div>
    </div>
  );
}

