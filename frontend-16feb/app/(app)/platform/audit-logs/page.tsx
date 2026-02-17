'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Col, DatePicker, Input, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { useSearchParams } from 'next/navigation';
import { FileSearch, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(String(json?.error || `HTTP ${res.status}`)), { status: res.status, body: json });
  return json;
}

function getCookie(name: string): string | null {
  const parts = String(document.cookie || '').split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.split('=').slice(1).join('='));
  } catch {
    return hit.split('=').slice(1).join('=');
  }
}

export default function AuditLogsPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || getCookie('sw_tenant') || 'demo-tenant';
  const [action, setAction] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [risk, setRisk] = useState<string>('all');
  const [range, setRange] = useState<[any | null, any | null]>([null, null]);
  const [q, setQ] = useState<string>('');

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    if (action !== 'all') qs.set('action', action);
    if (category !== 'all') qs.set('action_category', category);
    if (risk !== 'all') qs.set('risk_level', risk);
    if (range?.[0]) qs.set('from_date', range[0].toDate().toISOString());
    if (range?.[1]) qs.set('to_date', range[1].toDate().toISOString());
    // (Optional) client-side search, because API search isn't implemented here.
    return qs.toString();
  }, [action, category, risk, range]);

  const { data, error, mutate } = useSWR(`/api/audit-logs${query ? `?${query}` : ''}`, (u) => fetchJson(u, tenantId));
  const items: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];

  const totalLogs = items.length;
  const highRisk = items.filter((r) => String(r.risk_level || '').toLowerCase() === 'high').length;
  const mediumRisk = items.filter((r) => String(r.risk_level || '').toLowerCase() === 'medium').length;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) => {
      const hay = `${r.user_email || ''} ${r.action || ''} ${r.action_description || ''} ${r.target_type || ''} ${r.target_name || ''}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Audit Logs"
        description="Immutable audit trail of authentication, authorization, and configuration events."
        icon={FileSearch}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Audit Logs' },
        ]}
        stats={[
          { label: 'Total Logs', value: totalLogs },
          { label: 'High Risk', value: highRisk },
        ]}
        actions={
          <Space>
            <Button onClick={() => mutate()}>Refresh</Button>
            <Button href={`/api/audit-logs/export/xlsx`} target="_blank">
              Export (XLSX)
            </Button>
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Total Logs" value={totalLogs} subtitle="Recorded events" icon={FileSearch} color="blue" />
          <MetricCard title="High Risk" value={highRisk} subtitle="Requires review" icon={ShieldAlert} color="red" />
          <MetricCard title="Medium Risk" value={mediumRisk} subtitle="Monitor closely" icon={ShieldCheck} color="orange" />
        </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load audit logs"
          description={String((error as any)?.body?.error || (error as any)?.message || error)}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={5}>
            <Select
              style={{ width: '100%' }}
              value={action}
              onChange={(v) => setAction(String(v))}
              options={[
                { value: 'all', label: 'All actions' },
                { value: 'login', label: 'Login' },
                { value: 'logout', label: 'Logout' },
                { value: 'create', label: 'Create' },
                { value: 'update', label: 'Update' },
                { value: 'delete', label: 'Delete' },
                { value: 'role_assigned', label: 'Role assigned' },
                { value: 'role_removed', label: 'Role removed' },
                { value: 'permission_changed', label: 'Permission changed' },
              ]}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              style={{ width: '100%' }}
              value={category}
              onChange={(v) => setCategory(String(v))}
              options={[
                { value: 'all', label: 'All categories' },
                { value: 'authentication', label: 'Authentication' },
                { value: 'authorization', label: 'Authorization' },
                { value: 'configuration', label: 'Configuration' },
                { value: 'data', label: 'Data' },
              ]}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              style={{ width: '100%' }}
              value={risk}
              onChange={(v) => setRisk(String(v))}
              options={[
                { value: 'all', label: 'All risk' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} value={range as any} onChange={(v) => setRange([v?.[0] || null, v?.[1] || null])} allowClear />
          </Col>
          <Col xs={24} md={4}>
            <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} allowClear />
          </Col>
        </Row>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <Table
          rowKey="id"
          dataSource={filtered}
          pagination={{ pageSize: 25 }}
          columns={[
            { title: 'Time', dataIndex: 'created_at', render: (v: any) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-') },
            { title: 'User', dataIndex: 'user_email', render: (v: any) => <span style={{ fontWeight: 600 }}>{String(v || '')}</span> },
            { title: 'Action', dataIndex: 'action', render: (v: any) => <Tag>{String(v || '')}</Tag> },
            { title: 'Category', dataIndex: 'action_category', render: (v: any) => <Tag color="blue">{String(v || '')}</Tag> },
            { title: 'Target', render: (_: any, r: any) => (r.target_type ? `${r.target_type}${r.target_name ? `: ${r.target_name}` : ''}` : '—') },
            {
              title: 'Result',
              dataIndex: 'success',
              render: (v: any) => (v === false ? <Tag color="red">Failed</Tag> : <Tag color="green">OK</Tag>),
            },
            { title: 'Risk', dataIndex: 'risk_level', render: (v: any) => (v ? <Tag color={String(v) === 'high' || String(v) === 'critical' ? 'red' : 'default'}>{String(v)}</Tag> : <Typography.Text type="secondary">—</Typography.Text>) },
          ]}
        />
      </div>
    </div>
    </div>
  );
}

