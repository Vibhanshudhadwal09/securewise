'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Form, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '../../../../lib/permissions';
import { Shield, Users } from 'lucide-react';
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

export default function PlatformRolesPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || getCookie('sw_tenant') || 'demo-tenant';
  const { can } = usePermissions();
  const { data, error, mutate } = useSWR('/api/roles', (u) => fetchJson(u, tenantId));
  const roles: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];

  const totalRoles = roles.length;
  const systemRoles = roles.filter((r) => r.is_system_role === true).length;

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const defaultPerms = useMemo(
    () =>
      JSON.stringify(
        {
          incidents: { view: true, create: false, edit: false, delete: false, close: false },
          risks: { view: true, create: false, edit: false, delete: false, approve_treatment: false },
          controls: { view: true, create: false, edit: false, delete: false, test: false },
          reports: { view: true, generate: false, schedule: false },
          users: { view: false, create: false, edit: false, delete: false, manage_roles: false },
        },
        null,
        2
      ),
    []
  );

  async function createRole(values: any) {
    setCreating(true);
    try {
      let perms: any = {};
      try {
        perms = values.permissions_json ? JSON.parse(values.permissions_json) : {};
      } catch {
        throw new Error('permissions_json must be valid JSON');
      }
      const res = await fetch('/api/roles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          role_name: values.role_name,
          role_display_name: values.role_display_name,
          role_description: values.role_description || undefined,
          permissions: perms,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      setCreateOpen(false);
      form.resetFields();
      mutate();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Roles"
        description="Define permission sets and assign them to users."
        icon={Shield}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Roles' },
        ]}
        stats={[
          { label: 'Total Roles', value: totalRoles },
          { label: 'System Roles', value: systemRoles },
        ]}
        actions={
          <Space>
            <Button onClick={() => mutate()}>Refresh</Button>
            {can('users.manage_roles') ? (
              <Button type="primary" onClick={() => setCreateOpen(true)}>
                Create Role
              </Button>
            ) : null}
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricCard title="Total Roles" value={totalRoles} subtitle="Defined permissions" icon={Shield} color="blue" />
          <MetricCard title="System Roles" value={systemRoles} subtitle="Built-in roles" icon={Users} color="purple" />
        </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load roles"
          description={String((error as any)?.body?.error || (error as any)?.message || error)}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <Table
          rowKey="id"
          dataSource={roles}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Role', render: (_: any, r: any) => <span style={{ fontWeight: 600 }}>{String(r.role_display_name || r.role_name || '')}</span> },
            { title: 'Name', dataIndex: 'role_name', render: (v: any) => <Tag>{String(v || '')}</Tag> },
            { title: 'System', dataIndex: 'is_system_role', render: (v: any) => (v ? <Tag color="blue">System</Tag> : <Tag>Custom</Tag>) },
            { title: 'Active', dataIndex: 'is_active', render: (v: any) => (v ? <Tag color="green">Active</Tag> : <Tag>Disabled</Tag>) },
            { title: 'Created', dataIndex: 'created_at', render: (v: any) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-') },
          ]}
        />
      </div>

      <Modal title="Create Role" open={createOpen} onCancel={() => setCreateOpen(false)} okText="Create" confirmLoading={creating} onOk={() => form.submit()} destroyOnClose width={720}>
        <Form form={form} layout="vertical" onFinish={createRole} initialValues={{ permissions_json: defaultPerms }}>
          <Space style={{ width: '100%' }} size={12} align="start">
            <Form.Item style={{ flex: 1 }} name="role_name" label="Role name" rules={[{ required: true }]}>
              <Input placeholder="e.g., analyst" />
            </Form.Item>
            <Form.Item style={{ flex: 1 }} name="role_display_name" label="Display name" rules={[{ required: true }]}>
              <Input placeholder="e.g., Security Analyst" />
            </Form.Item>
          </Space>
          <Form.Item name="role_description" label="Description">
            <Input.TextArea rows={2} placeholder="What can this role do?" />
          </Form.Item>
          <Form.Item name="permissions_json" label="Permissions (JSON)" rules={[{ required: true }]}>
            <Input.TextArea rows={12} spellCheck={false} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace' }} />
          </Form.Item>
          <Typography.Text type="secondary">
            Tip: permissions are boolean flags under categories (e.g. <code>incidents.view</code>, <code>users.manage_roles</code>).
          </Typography.Text>
        </Form>
      </Modal>
    </div>
    </div>
  );
}

