'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, DatePicker, Form, Input, Modal, Progress, Select, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { usePermissions } from '../../../lib/permissions';
import { ClipboardCheck, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';

type AuditRow = {
  id: string;
  audit_name: string;
  audit_type?: string | null;
  audit_standard?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  auditor_name?: string | null;
  controls_in_scope?: number;
  findings_count?: number;
  evidence_count?: number;
};

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

function statusTag(status: string | null | undefined) {
  const s = String(status || 'planning');
  if (s === 'completed') return <Tag color="green">completed</Tag>;
  if (s === 'review') return <Tag color="blue">review</Tag>;
  if (s === 'fieldwork') return <Tag color="geekblue">fieldwork</Tag>;
  if (s === 'evidence_collection') return <Tag color="gold">evidence collection</Tag>;
  if (s === 'cancelled') return <Tag color="default">cancelled</Tag>;
  return <Tag>planning</Tag>;
}

export default function AuditsPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const { can } = usePermissions();

  const [filters, setFilters] = useState<{ status?: string; audit_type?: string; year?: string }>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.status) p.set('status', filters.status);
    if (filters.audit_type) p.set('audit_type', filters.audit_type);
    if (filters.year) p.set('year', filters.year);
    return p.toString();
  }, [filters]);

  const { data, isLoading, mutate } = useSWR<{ items: AuditRow[] }>(
    `/api/audits${qs ? `?${qs}` : ''}`,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const items = Array.isArray((data as any)?.items) ? ((data as any).items as AuditRow[]) : [];
  const totalAudits = items.length;
  const completedAudits = items.filter((a) => String(a.status || '') === 'completed').length;
  const activeAudits = items.filter((a) => String(a.status || '') !== 'completed' && String(a.status || '') !== 'cancelled').length;
  const findingsOpen = items.reduce((sum, a) => sum + Number(a.findings_count || 0), 0);

  async function createAudit() {
    try {
      const v = await form.validateFields();
      const payload = {
        audit_name: String(v.audit_name || '').trim(),
        audit_type: v.audit_type,
        audit_standard: v.audit_standard || undefined,
        description: v.description || undefined,
        auditor_name: v.auditor_name || undefined,
        auditor_email: v.auditor_email || undefined,
        auditor_organization: v.auditor_organization || undefined,
        start_date: v.start_date.format('YYYY-MM-DD'),
        end_date: v.end_date.format('YYYY-MM-DD'),
        fieldwork_start: v.fieldwork_start ? v.fieldwork_start.format('YYYY-MM-DD') : undefined,
        fieldwork_end: v.fieldwork_end ? v.fieldwork_end.format('YYYY-MM-DD') : undefined,
        report_due_date: v.report_due_date ? v.report_due_date.format('YYYY-MM-DD') : undefined,
      };

      setCreating(true);
      const res = await fetch('/api/audits', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));

      message.success('Audit created');
      setCreateOpen(false);
      form.resetFields();
      await mutate();
      if (j?.id) window.location.href = `/audits/${encodeURIComponent(String(j.id))}`;
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in (e as any)) return;
      message.error(e instanceof Error ? e.message : 'Failed to create audit');
    } finally {
      setCreating(false);
    }
  }

  async function deleteAudit(id: string) {
    try {
      const ok = window.confirm('Delete this audit? This removes scope, evidence package items, findings, and communications.');
      if (!ok) return;
      const res = await fetch(`/api/audits/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include', headers: { 'x-tenant-id': tenantId } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      message.success('Audit deleted');
      await mutate();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to delete audit');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-gray-50">
      <PageHeader
        title="Audit Management"
        description="Track audit periods, findings, remediation activities, and maintain audit readiness."
        icon={ClipboardCheck}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Audits' },
        ]}
        stats={[
          { label: 'Total Audits', value: totalAudits },
          { label: 'Active', value: activeAudits },
        ]}
        actions={
          can('audits.create') ? (
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Create Audit
            </Button>
          ) : null
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Audit Readiness" value={`${Math.min(100, totalAudits ? Math.round((completedAudits / totalAudits) * 100) : 0)}%`} subtitle="Completed audits" icon={ClipboardCheck} color="purple" progress={totalAudits ? Math.round((completedAudits / totalAudits) * 100) : 0} />
          <MetricCard title="Active Audits" value={activeAudits} subtitle="In progress" icon={Calendar} color="blue" />
          <MetricCard title="Open Findings" value={findingsOpen} subtitle="In remediation" icon={AlertTriangle} color="orange" />
          <MetricCard title="Closed Audits" value={completedAudits} subtitle="This year" icon={CheckCircle} color="green" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select
            allowClear
            placeholder="Status"
            value={filters.status}
            options={[
              { label: 'planning', value: 'planning' },
              { label: 'evidence_collection', value: 'evidence_collection' },
              { label: 'fieldwork', value: 'fieldwork' },
              { label: 'review', value: 'review' },
              { label: 'completed', value: 'completed' },
              { label: 'cancelled', value: 'cancelled' },
            ]}
            onChange={(v) => setFilters((p) => ({ ...p, status: v || undefined }))}
          />
          <Select
            allowClear
            placeholder="Audit Type"
            value={filters.audit_type}
            options={[
              { label: 'internal', value: 'internal' },
              { label: 'external', value: 'external' },
              { label: 'certification', value: 'certification' },
              { label: 'compliance', value: 'compliance' },
            ]}
            onChange={(v) => setFilters((p) => ({ ...p, audit_type: v || undefined }))}
          />
          <Select
            allowClear
            placeholder="Year"
            value={filters.year}
            options={Array.from({ length: 6 }).map((_, i) => {
              const y = String(dayjs().year() - i);
              return { label: y, value: y };
            })}
            onChange={(v) => setFilters((p) => ({ ...p, year: v || undefined }))}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-x-auto">
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={items}
          pagination={{ pageSize: 20 }}
          onRow={(r) => ({ onClick: () => (window.location.href = `/audits/${encodeURIComponent(String(r.id))}`) })}
          columns={[
            {
              title: 'Audit Name',
              dataIndex: 'audit_name',
              render: (_: any, r: AuditRow) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{String(r.audit_name || '')}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{String(r.audit_standard || '-')}</div>
                </div>
              ),
            },
            { title: 'Type', dataIndex: 'audit_type', render: (v: any) => <span style={{ fontFamily: 'ui-monospace' }}>{String(v || '-')}</span> },
            { title: 'Status', dataIndex: 'status', render: (v: any) => statusTag(v) },
            { title: 'Dates', render: (_: any, r: AuditRow) => `${String(r.start_date || '').slice(0, 10)} → ${String(r.end_date || '').slice(0, 10)}` },
            { title: 'Auditor', dataIndex: 'auditor_name', render: (v: any) => String(v || '-') },
            { title: 'Controls', dataIndex: 'controls_in_scope', render: (v: any) => String(v ?? 0) },
            { title: 'Findings', dataIndex: 'findings_count', render: (v: any) => String(v ?? 0) },
            {
              title: 'Progress',
              render: (_: any, r: AuditRow) => {
                const controls = Number(r.controls_in_scope || 0);
                const ev = Number(r.evidence_count || 0);
                const pct = controls > 0 ? Math.min(100, Math.round((ev / controls) * 100)) : 0;
                return (
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{`${ev} evidence items`}</div>
                    <Progress percent={pct} size="small" />
                  </div>
                );
              },
            },
            {
              title: 'Actions',
              render: (_: any, r: AuditRow) => (
                <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <Button size="small" onClick={() => (window.location.href = `/audits/${encodeURIComponent(String(r.id))}`)}>
                    View
                  </Button>
                  <Button size="small" danger onClick={() => deleteAudit(String(r.id))}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
        {!isLoading && items.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">No audits scheduled. Create your first audit to begin evidence collection.</div>
        ) : null}
      </div>

      <Modal
        title="Create Audit"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={createAudit}
        okText={creating ? 'Creating…' : 'Create'}
        okButtonProps={{ disabled: creating, loading: creating }}
      >
        <Form form={form} layout="vertical" initialValues={{ audit_type: 'external', audit_standard: 'ISO27001' }}>
          <Form.Item name="audit_name" label="Audit Name" rules={[{ required: true, message: 'Audit Name is required' }]}>
            <Input placeholder="ISO 27001 Annual Surveillance Audit" />
          </Form.Item>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="audit_type" label="Audit Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Internal', value: 'internal' },
                  { label: 'External', value: 'external' },
                  { label: 'Certification', value: 'certification' },
                  { label: 'Compliance', value: 'compliance' },
                ]}
              />
            </Form.Item>
            <Form.Item name="audit_standard" label="Audit Standard">
              <Select
                options={[
                  { label: 'ISO27001', value: 'ISO27001' },
                  { label: 'SOC2', value: 'SOC2' },
                  { label: 'PCI-DSS', value: 'PCI-DSS' },
                  { label: 'HIPAA', value: 'HIPAA' },
                  { label: 'Custom', value: 'Custom' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Form.Item name="auditor_name" label="Auditor Name">
              <Input />
            </Form.Item>
            <Form.Item name="auditor_email" label="Auditor Email" rules={[{ type: 'email', message: 'Invalid email' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="auditor_organization" label="Auditor Organization">
              <Input />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="end_date"
              label="End Date"
              rules={[
                { required: true },
                {
                  validator: async (_, value) => {
                    const start = form.getFieldValue('start_date');
                    if (start && value && dayjs(value).isBefore(dayjs(start))) throw new Error('End date must be after start date');
                  },
                },
              ]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Form.Item name="fieldwork_start" label="Fieldwork Start">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="fieldwork_end" label="Fieldwork End">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="report_due_date" label="Report Due Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
    </div>
  );
}

