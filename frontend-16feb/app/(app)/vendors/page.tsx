'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { Building2, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { usePermissions } from '../../../lib/permissions';
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

function critColor(v: string) {
  const s = String(v || '').toLowerCase();
  if (s === 'critical') return 'red';
  if (s === 'high') return 'orange';
  if (s === 'medium') return 'gold';
  return 'green';
}

export default function VendorsPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const { can } = usePermissions();
  const [filters, setFilters] = useState<{ criticality?: string; vendor_status?: string; business_function?: string; q?: string }>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    if (filters.criticality) qs.set('criticality', filters.criticality);
    if (filters.vendor_status) qs.set('vendor_status', filters.vendor_status);
    if (filters.business_function) qs.set('business_function', filters.business_function);
    if (filters.q) qs.set('q', filters.q);
    return qs.toString();
  }, [filters]);

  const { data, mutate } = useSWR(`/api/vendors${query ? `?${query}` : ''}`, (u) => fetchJson(u, tenantId), { refreshInterval: 30_000, revalidateOnFocus: false });
  const { data: summary } = useSWR(`/api/vendors/analytics/summary`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });

  const items: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];

  async function createVendor(values: any) {
    setSaving(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      message.success('Vendor created');
      setCreateOpen(false);
      form.resetFields();
      mutate();
      window.location.href = `/vendors/${encodeURIComponent(String(json.id))}`;
    } catch (e: any) {
      message.error(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const totalVendors = Number((summary as any)?.total_vendors || 0);
  const criticalVendors = Number((summary as any)?.critical_vendors || 0);
  const overdueAssessments = Number((summary as any)?.overdue_assessments || 0);
  const expiringContracts = Number((summary as any)?.expiring_contracts_90d || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Vendor Risk Management"
        description="Manage third‑party vendors, assessments, documents, access reviews, and vendor incidents."
        icon={Building2}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Vendors' },
        ]}
        stats={[
          { label: 'Total Vendors', value: totalVendors },
          { label: 'Critical', value: criticalVendors },
        ]}
        actions={
          <Space>
            <Button href="/vendors/dashboard">Dashboard</Button>
            <Button href="/vendors/templates">Templates</Button>
            <Button onClick={() => mutate()}>Refresh</Button>
            {can('vendors.create') ? (
              <Button type="primary" onClick={() => setCreateOpen(true)}>
                Add Vendor
              </Button>
            ) : null}
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Total Vendors" value={totalVendors} subtitle="Active third parties" icon={Building2} color="blue" />
          <MetricCard title="Critical Vendors" value={criticalVendors} subtitle="High risk exposure" icon={AlertTriangle} color="red" />
          <MetricCard title="Overdue Assessments" value={overdueAssessments} subtitle="Needs review" icon={FileText} color="orange" />
          <MetricCard title="Expiring Contracts" value={expiringContracts} subtitle="Next 90 days" icon={Calendar} color="purple" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
          <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Select
              allowClear
              placeholder="Criticality"
              style={{ width: '100%' }}
              value={filters.criticality}
              onChange={(v) => setFilters((p) => ({ ...p, criticality: v || undefined }))}
              options={[{ value: 'critical' }, { value: 'high' }, { value: 'medium' }, { value: 'low' }]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: '100%' }}
              value={filters.vendor_status}
              onChange={(v) => setFilters((p) => ({ ...p, vendor_status: v || undefined }))}
              options={[{ value: 'active' }, { value: 'inactive' }, { value: 'under_review' }, { value: 'terminated' }]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Input placeholder="Business function" value={filters.business_function} onChange={(e) => setFilters((p) => ({ ...p, business_function: e.target.value || undefined }))} />
          </Col>
          <Col xs={24} md={6}>
            <Input.Search placeholder="Search vendors" allowClear onSearch={(v) => setFilters((p) => ({ ...p, q: v || undefined }))} />
          </Col>
        </Row>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <Table
          rowKey="id"
          dataSource={items}
          pagination={{ pageSize: 15 }}
          columns={[
            { title: 'Vendor', dataIndex: 'vendor_name', render: (v: any, r: any) => <a href={`/vendors/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a> },
            { title: 'Type', dataIndex: 'vendor_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
            { title: 'Criticality', dataIndex: 'criticality', render: (v: any) => <Tag color={critColor(String(v || ''))}>{String(v || '')}</Tag> },
            { title: 'Risk score', dataIndex: 'overall_risk_score', render: (v: any) => (v != null ? Number(v).toFixed(2) : '-') },
            { title: 'Contract end', dataIndex: 'contract_end_date', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
            { title: 'Last assessment', dataIndex: 'last_assessment_date', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
            { title: 'Status', dataIndex: 'vendor_status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
            {
              title: 'Actions',
              render: (_: any, r: any) => (
                <Space>
                  <Button size="small" href={`/vendors/${encodeURIComponent(String(r.id))}`}>
                    View
                  </Button>
                </Space>
              ),
            },
          ]}
        />
        {!items.length ? <Typography.Text type="secondary">No vendors found.</Typography.Text> : null}
      </div>

      <Modal title="Add Vendor" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={saving} okText="Save" destroyOnClose>
        <Form form={form} layout="vertical" onFinish={createVendor} initialValues={{ vendor_status: 'active', contract_currency: 'USD', renewal_notification_days: 90, has_data_access: false }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="vendor_name" label="Vendor name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="vendor_type" label="Vendor type" rules={[{ required: true }]}>
                <Select options={[{ value: 'software_saas' }, { value: 'cloud_provider' }, { value: 'consultant' }, { value: 'supplier' }, { value: 'contractor' }, { value: 'other' }]} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="criticality" label="Criticality" rules={[{ required: true }]}>
                <Select options={[{ value: 'critical' }, { value: 'high' }, { value: 'medium' }, { value: 'low' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="business_function" label="Business function">
                <Input placeholder="IT / HR / Finance" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="services_provided" label="Services provided">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="primary_contact_email" label="Primary contact email">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="internal_owner_email" label="Internal owner email">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="contract_end_date" label="Contract end date (YYYY-MM-DD)">
                <Input placeholder="2026-12-31" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="renewal_notification_days" label="Renewal notification (days)">
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="vendor_status" label="Status">
            <Select options={[{ value: 'active' }, { value: 'inactive' }, { value: 'under_review' }, { value: 'terminated' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </div>
  );
}

