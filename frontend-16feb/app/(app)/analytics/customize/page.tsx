'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { LayoutGrid } from 'lucide-react';
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

export default function CustomizeAnalytics() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, mutate, isLoading } = useSWR(`/api/analytics/widgets?dashboard_page=main`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });
  const items = Array.isArray((data as any)?.items) ? (data as any).items : [];

  async function create() {
    try {
      const v = await form.validateFields();
      const payload = {
        widget_name: v.widget_name,
        widget_type: v.widget_type,
        dashboard_page: v.dashboard_page || 'main',
        widget_config: { note: String(v.note || '') },
        grid_position_x: 0,
        grid_position_y: items.length,
        grid_width: 6,
        grid_height: 3,
      };
      const res = await fetch('/api/analytics/widgets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      message.success('Widget created');
      setCreateOpen(false);
      form.resetFields();
      await mutate();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in (e as any)) return;
      message.error(e instanceof Error ? e.message : 'Failed to create widget');
    }
  }

  async function del(id: string) {
    const ok = window.confirm('Delete this widget?');
    if (!ok) return;
    const res = await fetch(`/api/analytics/widgets/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include', headers: { 'x-tenant-id': tenantId } });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return message.error(String(j?.error || `HTTP ${res.status}`));
    message.success('Deleted');
    await mutate();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Customize Dashboard"
        description="Lightweight widget configuration store (v1). Drag-and-drop can be layered later."
        icon={LayoutGrid}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Analytics', href: '/analytics' },
          { label: 'Customize' },
        ]}
        stats={[
          { label: 'Widgets', value: items.length },
          { label: 'Status', value: isLoading ? 'Loading' : 'Ready' },
        ]}
        actions={
          <Space>
            <Button onClick={() => setCreateOpen(true)} type="primary">
              Add widget
            </Button>
          </Space>
        }
      />

      <div className="p-8 space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={items}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Name', dataIndex: 'widget_name', render: (v: any) => String(v || '') },
            { title: 'Type', dataIndex: 'widget_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
            { title: 'Page', dataIndex: 'dashboard_page', render: (v: any) => <Tag color="blue">{String(v || 'main')}</Tag> },
            { title: 'Refresh (s)', dataIndex: 'refresh_interval', render: (v: any) => String(v ?? 300) },
            { title: 'Shared', dataIndex: 'is_shared', render: (v: any) => (v ? <Tag color="green">yes</Tag> : <Tag>no</Tag>) },
            {
              title: 'Actions',
              render: (_: any, r: any) => (
                <Space>
                  <Button size="small" danger onClick={() => del(String(r.id))}>
                    Delete
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal title="Add widget" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={create}>
        <Form layout="vertical" form={form} initialValues={{ widget_type: 'kpi_card', dashboard_page: 'main' }}>
          <Form.Item name="widget_name" label="Widget name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="widget_type" label="Widget type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'kpi_card', value: 'kpi_card' },
                { label: 'trend_chart', value: 'trend_chart' },
                { label: 'risk_heatmap', value: 'risk_heatmap' },
                { label: 'findings_table', value: 'findings_table' },
                { label: 'policy_status', value: 'policy_status' },
                { label: 'compliance_gauge', value: 'compliance_gauge' },
              ]}
            />
          </Form.Item>
          <Form.Item name="dashboard_page" label="Dashboard page">
            <Select options={[{ label: 'main', value: 'main' }, { label: 'risk', value: 'risk' }, { label: 'compliance', value: 'compliance' }, { label: 'audit', value: 'audit' }]} />
          </Form.Item>
          <Form.Item name="note" label="Widget note (stored in config)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </div>
  );
}

