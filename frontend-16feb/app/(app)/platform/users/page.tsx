'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '../../../../lib/permissions';
import { Shield, UserPlus, Users } from 'lucide-react';
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

export default function PlatformUsersPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || getCookie('sw_tenant') || 'demo-tenant';
  const { can } = usePermissions();
  const { data, error, mutate } = useSWR('/api/users?limit=200', (u) => fetchJson(u, tenantId));
  const { data: rolesData } = useSWR('/api/roles', (u) => fetchJson(u, tenantId));

  const users: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];
  const roles: any[] = Array.isArray((rolesData as any)?.items) ? (rolesData as any).items : [];

  const totalUsers = users.length;
  const adminUsers = users.filter((u) => Array.isArray(u.roles) ? u.roles.some((r: any) => String(r?.role_name || r).includes('admin')) : String(u.role || '').includes('admin')).length;
  const activeUsers = users.filter((u) => u.is_active !== false).length;

  const roleOptions = useMemo(() => roles.map((r) => ({ label: `${r.role_display_name} (${r.role_name})`, value: String(r.role_name) })), [roles]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  async function createUser(values: any) {
    setCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          email: values.email,
          first_name: values.first_name || undefined,
          last_name: values.last_name || undefined,
          department: values.department || undefined,
          job_title: values.job_title || undefined,
          roles: values.roles?.length ? values.roles : undefined,
          must_change_password: values.must_change_password !== false,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      setCreateOpen(false);
      form.resetFields();
      mutate();
      Modal.info({
        title: 'User created',
        content: (
          <div>
            <div>
              <strong>Email:</strong> {String(json.email || values.email)}
            </div>
            {json.temp_password ? (
              <div style={{ marginTop: 8 }}>
                <strong>Temporary password:</strong> <code>{String(json.temp_password)}</code>
              </div>
            ) : null}
            <div style={{ marginTop: 8 }}>
              Ask the user to log in and change their password immediately.
            </div>
          </div>
        ),
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Users"
        description="Manage user accounts and role assignments for this tenant."
        icon={Users}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Users' },
        ]}
        stats={[
          { label: 'Total Users', value: totalUsers },
          { label: 'Admins', value: adminUsers },
        ]}
        actions={
          <Space>
            <Button onClick={() => mutate()}>Refresh</Button>
            {can('users.create') ? (
              <Button type="primary" onClick={() => setCreateOpen(true)}>
                Create User
              </Button>
            ) : null}
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Total Users" value={totalUsers} subtitle="All active accounts" icon={Users} color="blue" />
          <MetricCard title="Active Users" value={activeUsers} subtitle="Enabled accounts" icon={UserPlus} color="green" />
          <MetricCard title="Admin Users" value={adminUsers} subtitle="Privileged roles" icon={Shield} color="purple" />
        </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load users"
          description={String((error as any)?.body?.error || (error as any)?.message || error)}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <Table
          rowKey="id"
          dataSource={users}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Email', dataIndex: 'email', render: (v: any) => <span style={{ fontWeight: 600 }}>{String(v || '')}</span> },
            {
              title: 'Name',
              render: (_: any, r: any) => String(r.display_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '-'),
            },
            {
              title: 'Roles',
              dataIndex: 'roles',
              render: (v: any) => {
                const arr = Array.isArray(v) ? v : [];
                return arr.length ? (
                  <Space size={6} wrap>
                    {arr.map((x: any) => (
                      <Tag key={String(x)}>{String(x)}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">—</Typography.Text>
                );
              },
            },
            { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag color={String(v) === 'active' ? 'green' : 'default'}>{String(v || '')}</Tag> },
            { title: 'Last login', dataIndex: 'last_login_at', render: (v: any) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-') },
            {
              title: 'Actions',
              render: (_: any, r: any) => (
                <Space>
                  {String(r.status || '') === 'inactive' ? (
                    <Button
                      size="small"
                      disabled={!can('users.edit')}
                      onClick={async () => {
                        await fetch(`/api/users/${encodeURIComponent(String(r.id))}/activate`, { method: 'POST', credentials: 'include', headers: { 'x-tenant-id': tenantId } }).catch(() => null);
                        mutate();
                      }}
                    >
                      Activate
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      danger
                      disabled={!can('users.delete')}
                      onClick={async () => {
                        await fetch(`/api/users/${encodeURIComponent(String(r.id))}/deactivate`, { method: 'POST', credentials: 'include', headers: { 'x-tenant-id': tenantId } }).catch(() => null);
                        mutate();
                      }}
                    >
                      Deactivate
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal title="Create User" open={createOpen} onCancel={() => setCreateOpen(false)} okText="Create" confirmLoading={creating} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={createUser}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="user@company.com" />
          </Form.Item>
          <Space style={{ width: '100%' }} size={12} align="start">
            <Form.Item style={{ flex: 1 }} name="first_name" label="First name">
              <Input />
            </Form.Item>
            <Form.Item style={{ flex: 1 }} name="last_name" label="Last name">
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={12} align="start">
            <Form.Item style={{ flex: 1 }} name="department" label="Department">
              <Input />
            </Form.Item>
            <Form.Item style={{ flex: 1 }} name="job_title" label="Job title">
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="roles" label="Roles">
            <Select mode="multiple" placeholder="Select roles" options={roleOptions} />
          </Form.Item>
          <Typography.Text type="secondary">
            This will create a user with a temporary password and require them to change it on first login.
          </Typography.Text>
        </Form>
      </Modal>
    </div>
    </div>
  );
}

