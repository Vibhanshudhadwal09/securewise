'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Badge, Button, DatePicker, Descriptions, Form, Input, Modal, Progress, Select, Steps, Table, Tag, Tabs, message } from 'antd';
import { useParams } from 'next/navigation';

type Audit = {
  id: string;
  audit_name: string;
  audit_type?: string | null;
  audit_standard?: string | null;
  description?: string | null;
  auditor_name?: string | null;
  auditor_email?: string | null;
  auditor_organization?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  fieldwork_start?: string | null;
  fieldwork_end?: string | null;
  report_due_date?: string | null;
  status?: string | null;
  evidence_package_generated?: boolean | null;
  evidence_package_url?: string | null;
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

function severityTag(sev: string) {
  const s = String(sev || 'medium');
  if (s === 'critical') return <Tag color="red">critical</Tag>;
  if (s === 'high') return <Tag color="orange">high</Tag>;
  if (s === 'medium') return <Tag color="gold">medium</Tag>;
  return <Tag color="blue">low</Tag>;
}

function reviewTag(v: string) {
  const s = String(v || 'pending');
  if (s === 'approved') return <Tag color="green">approved</Tag>;
  if (s === 'rejected') return <Tag color="red">rejected</Tag>;
  if (s === 'needs_clarification') return <Tag color="orange">needs clarification</Tag>;
  return <Tag>pending</Tag>;
}

function auditStatusIndex(status: string | null | undefined): number {
  const s = String(status || 'planning');
  if (s === 'planning') return 0;
  if (s === 'evidence_collection') return 1;
  if (s === 'fieldwork') return 2;
  if (s === 'review') return 3;
  if (s === 'completed') return 4;
  return 0;
}

export default function AuditDetailPage() {
  const params = useParams() as any;
  const auditId = String(params?.id || '');
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const { data, isLoading, mutate } = useSWR<{ audit: Audit; stats: any }>(
    auditId ? `/api/audits/${encodeURIComponent(auditId)}` : null,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const audit: Audit | null = (data as any)?.audit || null;
  const stats: any = (data as any)?.stats || {};

  const { data: scopeData, mutate: mutateScope } = useSWR<{ items: any[] }>(
    auditId ? `/api/audits/${encodeURIComponent(auditId)}/scope` : null,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );
  const scopeItems = Array.isArray((scopeData as any)?.items) ? (scopeData as any).items : [];

  const { data: evidenceData, mutate: mutateEvidence } = useSWR<{ items: any[] }>(
    auditId ? `/api/audits/${encodeURIComponent(auditId)}/evidence` : null,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );
  const evidenceItems = Array.isArray((evidenceData as any)?.items) ? (evidenceData as any).items : [];

  const { data: findingsData, mutate: mutateFindings } = useSWR<{ items: any[] }>(
    auditId ? `/api/audits/${encodeURIComponent(auditId)}/findings` : null,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );
  const findingItems = Array.isArray((findingsData as any)?.items) ? (findingsData as any).items : [];

  const { data: commData, mutate: mutateComms } = useSWR<{ items: any[] }>(
    auditId ? `/api/audits/${encodeURIComponent(auditId)}/communications` : null,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );
  const commItems = Array.isArray((commData as any)?.items) ? (commData as any).items : [];

  const [statusBusy, setStatusBusy] = useState(false);
  const [addScopeOpen, setAddScopeOpen] = useState(false);
  const [addFindingOpen, setAddFindingOpen] = useState(false);
  const [addCommOpen, setAddCommOpen] = useState(false);

  const [scopeForm] = Form.useForm();
  const [findingForm] = Form.useForm();
  const [commForm] = Form.useForm();

  const controlsInScope = Number(stats?.controls_in_scope || 0);
  const evidenceTotal = Number(stats?.evidence_total || 0);
  const evidencePct = controlsInScope > 0 ? Math.min(100, Math.round((evidenceTotal / controlsInScope) * 100)) : 0;

  async function setAuditStatus(nextStatus: string) {
    try {
      setStatusBusy(true);
      const res = await fetch(`/api/audits/${encodeURIComponent(auditId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ status: nextStatus }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      message.success('Status updated');
      await mutate();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setStatusBusy(false);
    }
  }

  async function generatePackage() {
    try {
      const res = await fetch(`/api/audits/${encodeURIComponent(auditId)}/generate-package`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      message.success(`Evidence package generated (${j?.evidence_count ?? 0} items)`);
      await Promise.all([mutate(), mutateScope(), mutateEvidence()]);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to generate package');
    }
  }

  async function bulkAddScope() {
    try {
      const v = await scopeForm.validateFields();
      const raw = String(v.control_ids || '');
      const ids = raw
        .split(/[\s,]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!ids.length) throw new Error('Provide at least one control id');

      const res = await fetch(`/api/audits/${encodeURIComponent(auditId)}/scope/bulk`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ control_ids: ids, in_scope: true, priority: v.priority || 'medium' }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      message.success('Controls added to scope');
      setAddScopeOpen(false);
      scopeForm.resetFields();
      await mutateScope();
      await mutate();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in (e as any)) return;
      message.error(e instanceof Error ? e.message : 'Failed to add scope');
    }
  }

  async function updateScope(scopeId: string, patch: any) {
    const res = await fetch(`/api/audits/${encodeURIComponent(auditId)}/scope/${encodeURIComponent(scopeId)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify(patch),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
    return j;
  }

  async function reviewEvidence(packageId: string, review_status: string) {
    const res = await fetch(`/api/audits/${encodeURIComponent(auditId)}/evidence/${encodeURIComponent(packageId)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ review_status }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
    return j;
  }

  async function addFinding() {
    try {
      const v = await findingForm.validateFields();
      const payload: any = {
        finding_title: String(v.finding_title || '').trim(),
        finding_description: String(v.finding_description || '').trim(),
        finding_type: v.finding_type,
        severity: v.severity,
        control_id: v.control_id || undefined,
        impact_description: v.impact_description || undefined,
        recommendation: v.recommendation || undefined,
        root_cause: v.root_cause || undefined,
        assigned_to: v.assigned_to || undefined,
        due_date: v.due_date ? v.due_date.format('YYYY-MM-DD') : undefined,
      };

      const res = await fetch(`/api/audits/${encodeURIComponent(auditId)}/findings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      message.success('Finding created');
      setAddFindingOpen(false);
      findingForm.resetFields();
      await Promise.all([mutateFindings(), mutate()]);
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in (e as any)) return;
      message.error(e instanceof Error ? e.message : 'Failed to create finding');
    }
  }

  async function linkRemediation(findingId: string, remediationPlanId: string) {
    const res = await fetch(`/api/audit-findings/${encodeURIComponent(findingId)}/link-remediation`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ remediation_plan_id: remediationPlanId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
    return j;
  }

  async function addComm() {
    try {
      const v = await commForm.validateFields();
      const payload: any = {
        communication_type: v.communication_type,
        subject: v.subject,
        message: v.message || undefined,
        to_email: v.to_email || undefined,
        related_control_id: v.related_control_id || undefined,
        requires_response: Boolean(v.requires_response),
        response_due_date: v.response_due_date ? v.response_due_date.format('YYYY-MM-DD') : undefined,
      };

      const res = await fetch(`/api/audits/${encodeURIComponent(auditId)}/communications`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
      message.success('Communication logged');
      setAddCommOpen(false);
      commForm.resetFields();
      await mutateComms();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in (e as any)) return;
      message.error(e instanceof Error ? e.message : 'Failed to log communication');
    }
  }

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!audit) return <div className="p-6">Audit not found.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{audit.audit_name}</h1>
          <div className="text-sm text-gray-600">
            <span style={{ fontFamily: 'ui-monospace' }}>{audit.audit_type || '-'}</span> · {audit.audit_standard || '-'} ·{' '}
            <Tag>{String(audit.status || 'planning')}</Tag>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => (window.location.href = `/api/audits/${encodeURIComponent(auditId)}/export-package`)} disabled={!auditId}>
            Export Package (ZIP)
          </Button>
          <Button type="primary" onClick={generatePackage}>
            Generate Evidence Package
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div style={{ flex: 1 }}>
            <Steps
              size="small"
              current={auditStatusIndex(audit.status)}
              items={[
                { title: 'Planning' },
                { title: 'Evidence collection' },
                { title: 'Fieldwork' },
                { title: 'Review' },
                { title: 'Completed' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              style={{ width: 220 }}
              value={String(audit.status || 'planning')}
              options={[
                { label: 'planning', value: 'planning' },
                { label: 'evidence_collection', value: 'evidence_collection' },
                { label: 'fieldwork', value: 'fieldwork' },
                { label: 'review', value: 'review' },
                { label: 'completed', value: 'completed' },
                { label: 'cancelled', value: 'cancelled' },
              ]}
              onChange={(v) => setAuditStatus(String(v))}
              disabled={statusBusy}
            />
            {audit.evidence_package_generated ? <Badge status="success" text="Package generated" /> : <Badge status="processing" text="Package not generated" />}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-600">Evidence collection</div>
          <div className="mt-2">
            <Progress percent={evidencePct} />
          </div>
          <div className="mt-1 text-sm text-gray-700">{evidenceTotal} evidence items · {controlsInScope} scoped controls</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-600">Testing status</div>
          <div className="mt-2 text-sm text-gray-800">
            {scopeItems.filter((s: any) => s.testing_status === 'passed').length} passed · {scopeItems.filter((s: any) => s.testing_status === 'failed').length} failed ·{' '}
            {scopeItems.filter((s: any) => s.testing_status === 'pending').length} pending
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-600">Findings</div>
          <div className="mt-2 text-sm text-gray-800">
            {findingItems.filter((f: any) => f.finding_type === 'major_nc').length} major NC · {findingItems.filter((f: any) => f.finding_type === 'minor_nc').length} minor NC ·{' '}
            {findingItems.filter((f: any) => f.finding_type === 'observation').length} observations
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Descriptions title="Audit details" column={3} size="small">
          <Descriptions.Item label="Dates">
            {String(audit.start_date || '').slice(0, 10)} → {String(audit.end_date || '').slice(0, 10)}
          </Descriptions.Item>
          <Descriptions.Item label="Auditor">{audit.auditor_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Auditor email">{audit.auditor_email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Organization">{audit.auditor_organization || '-'}</Descriptions.Item>
          <Descriptions.Item label="Fieldwork">
            {audit.fieldwork_start ? String(audit.fieldwork_start).slice(0, 10) : '-'} → {audit.fieldwork_end ? String(audit.fieldwork_end).slice(0, 10) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Report due">{audit.report_due_date ? String(audit.report_due_date).slice(0, 10) : '-'}</Descriptions.Item>
          <Descriptions.Item label="Description" span={3}>
            {audit.description || '-'}
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm">
        <Tabs
          items={[
            {
              key: 'scope',
              label: `Scope (${scopeItems.length})`,
              children: (
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>Controls in scope</div>
                    <Button onClick={() => setAddScopeOpen(true)}>Add Controls to Scope</Button>
                  </div>
                  <Table
                    rowKey="id"
                    dataSource={scopeItems}
                    pagination={{ pageSize: 20 }}
                    columns={[
                      { title: 'Control ID', dataIndex: 'control_id', render: (v: any) => <span style={{ fontFamily: 'ui-monospace' }}>{String(v || '')}</span> },
                      { title: 'Priority', dataIndex: 'priority', render: (v: any) => <Tag>{String(v || 'medium')}</Tag> },
                      {
                        title: 'Testing',
                        dataIndex: 'testing_status',
                        render: (v: any, r: any) => (
                          <Select
                            size="small"
                            value={String(v || 'pending')}
                            style={{ width: 160 }}
                            options={[
                              { label: 'pending', value: 'pending' },
                              { label: 'testing', value: 'testing' },
                              { label: 'passed', value: 'passed' },
                              { label: 'failed', value: 'failed' },
                              { label: 'not_applicable', value: 'not_applicable' },
                            ]}
                            onChange={async (nv) => {
                              try {
                                await updateScope(String(r.id), { testing_status: nv });
                                message.success('Updated');
                                await mutateScope();
                              } catch (e) {
                                message.error(e instanceof Error ? e.message : 'Failed');
                              }
                            }}
                          />
                        ),
                      },
                      { title: 'Evidence count', dataIndex: 'evidence_count', render: (v: any) => String(v ?? 0) },
                      { title: 'In scope', dataIndex: 'in_scope', render: (v: any) => (v ? <Tag color="green">yes</Tag> : <Tag>no</Tag>) },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'evidence',
              label: `Evidence Package (${evidenceItems.length})`,
              children: (
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>Evidence items</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button onClick={() => (window.location.href = `/api/audits/${encodeURIComponent(auditId)}/export-package`)}>Export Package</Button>
                      <Button type="primary" onClick={generatePackage}>
                        Generate Package
                      </Button>
                    </div>
                  </div>
                  <Table
                    rowKey="id"
                    dataSource={evidenceItems}
                    pagination={{ pageSize: 20 }}
                    columns={[
                      { title: 'Control', dataIndex: 'control_id', render: (v: any) => <span style={{ fontFamily: 'ui-monospace' }}>{String(v || '-')}</span> },
                      { title: 'Title', dataIndex: 'evidence_title', render: (v: any) => String(v || '-') },
                      { title: 'Type', dataIndex: 'evidence_type', render: (v: any) => <Tag>{String(v || '-')}</Tag> },
                      { title: 'Added', dataIndex: 'added_at', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                      { title: 'Review', dataIndex: 'review_status', render: (v: any) => reviewTag(String(v || 'pending')) },
                      {
                        title: 'Actions',
                        render: (_: any, r: any) => (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              size="small"
                              onClick={async () => {
                                try {
                                  await reviewEvidence(String(r.id), 'approved');
                                  await mutateEvidence();
                                  message.success('Approved');
                                } catch (e) {
                                  message.error(e instanceof Error ? e.message : 'Failed');
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={async () => {
                                try {
                                  await reviewEvidence(String(r.id), 'rejected');
                                  await mutateEvidence();
                                  message.success('Rejected');
                                } catch (e) {
                                  message.error(e instanceof Error ? e.message : 'Failed');
                                }
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              size="small"
                              onClick={async () => {
                                try {
                                  await reviewEvidence(String(r.id), 'needs_clarification');
                                  await mutateEvidence();
                                  message.success('Needs clarification');
                                } catch (e) {
                                  message.error(e instanceof Error ? e.message : 'Failed');
                                }
                              }}
                            >
                              Clarify
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'findings',
              label: `Findings (${findingItems.length})`,
              children: (
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>Audit findings</div>
                    <Button type="primary" onClick={() => setAddFindingOpen(true)}>
                      Add Finding
                    </Button>
                  </div>
                  <Table
                    rowKey="id"
                    dataSource={findingItems}
                    pagination={{ pageSize: 20 }}
                    columns={[
                      { title: '#', dataIndex: 'finding_number', render: (v: any) => <span style={{ fontFamily: 'ui-monospace' }}>{String(v || '-')}</span> },
                      { title: 'Title', dataIndex: 'finding_title', render: (v: any) => String(v || '') },
                      { title: 'Type', dataIndex: 'finding_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                      { title: 'Severity', dataIndex: 'severity', render: (v: any) => severityTag(String(v || 'medium')) },
                      { title: 'Control', dataIndex: 'control_id', render: (v: any) => <span style={{ fontFamily: 'ui-monospace' }}>{String(v || '-')}</span> },
                      { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag>{String(v || 'open')}</Tag> },
                      { title: 'Due', dataIndex: 'due_date', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                      {
                        title: 'Remediation',
                        render: (_: any, r: any) => {
                          const cur = String(r.remediation_plan_id || '');
                          return (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Input
                                size="small"
                                placeholder="plan UUID"
                                defaultValue={cur || ''}
                                style={{ width: 220, fontFamily: 'ui-monospace' }}
                                onPressEnter={async (e) => {
                                  try {
                                    const next = String((e.target as any).value || '').trim();
                                    if (!next) throw new Error('Provide remediation plan id');
                                    await linkRemediation(String(r.id), next);
                                    message.success('Linked');
                                    await mutateFindings();
                                  } catch (err) {
                                    message.error(err instanceof Error ? err.message : 'Failed');
                                  }
                                }}
                              />
                            </div>
                          );
                        },
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'communications',
              label: `Communications (${commItems.length})`,
              children: (
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>Auditor communications</div>
                    <Button onClick={() => setAddCommOpen(true)}>Log Communication</Button>
                  </div>
                  <Table
                    rowKey="id"
                    dataSource={commItems}
                    pagination={{ pageSize: 20 }}
                    columns={[
                      { title: 'Date', dataIndex: 'communication_date', render: (v: any) => (v ? String(v).slice(0, 19).replace('T', ' ') : '-') },
                      { title: 'Type', dataIndex: 'communication_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                      { title: 'Subject', dataIndex: 'subject', render: (v: any) => String(v || '') },
                      { title: 'To', dataIndex: 'to_email', render: (v: any) => String(v || '-') },
                      { title: 'Requires response', dataIndex: 'requires_response', render: (v: any) => (v ? <Tag color="orange">yes</Tag> : <Tag>no</Tag>) },
                      { title: 'Response received', dataIndex: 'response_received', render: (v: any) => (v ? <Tag color="green">yes</Tag> : <Tag>no</Tag>) },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal title="Add controls to scope" open={addScopeOpen} onCancel={() => setAddScopeOpen(false)} onOk={bulkAddScope}>
        <Form form={scopeForm} layout="vertical" initialValues={{ priority: 'medium' }}>
          <Form.Item
            name="control_ids"
            label="Control IDs"
            rules={[{ required: true, message: 'Provide control IDs' }]}
            extra="Paste control IDs separated by spaces, commas, or newlines."
          >
            <Input.TextArea rows={4} placeholder="ISO27001-A.5.1.1\nISO27001-A.5.1.2\n..." />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <Select
              options={[
                { label: 'low', value: 'low' },
                { label: 'medium', value: 'medium' },
                { label: 'high', value: 'high' },
                { label: 'critical', value: 'critical' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Add finding" open={addFindingOpen} onCancel={() => setAddFindingOpen(false)} onOk={addFinding} okText="Create">
        <Form form={findingForm} layout="vertical" initialValues={{ finding_type: 'observation', severity: 'medium' }}>
          <Form.Item name="finding_title" label="Finding Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="finding_description" label="Finding Description" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="finding_type" label="Finding Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { label: 'Major NC', value: 'major_nc' },
                  { label: 'Minor NC', value: 'minor_nc' },
                  { label: 'Observation', value: 'observation' },
                  { label: 'Opportunity', value: 'opportunity' },
                  { label: 'Best Practice', value: 'best_practice' },
                ]}
              />
            </Form.Item>
            <Form.Item name="severity" label="Severity">
              <Select
                options={[
                  { label: 'low', value: 'low' },
                  { label: 'medium', value: 'medium' },
                  { label: 'high', value: 'high' },
                  { label: 'critical', value: 'critical' },
                ]}
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="control_id" label="Related Control">
              <Input placeholder="Control ID (optional)" />
            </Form.Item>
            <Form.Item name="assigned_to" label="Assigned To">
              <Input placeholder="user@company.com (optional)" />
            </Form.Item>
          </div>
          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="impact_description" label="Impact">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="recommendation" label="Recommendation">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="root_cause" label="Root Cause">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Log communication" open={addCommOpen} onCancel={() => setAddCommOpen(false)} onOk={addComm} okText="Log">
        <Form form={commForm} layout="vertical" initialValues={{ communication_type: 'email', requires_response: false }}>
          <Form.Item name="communication_type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'email', value: 'email' },
                { label: 'meeting', value: 'meeting' },
                { label: 'document_request', value: 'document_request' },
                { label: 'clarification', value: 'clarification' },
                { label: 'status_update', value: 'status_update' },
              ]}
            />
          </Form.Item>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="message" label="Message">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="to_email" label="To Email">
              <Input />
            </Form.Item>
            <Form.Item name="related_control_id" label="Related Control (optional)">
              <Input />
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Form.Item name="requires_response" label="Requires response">
              <Select options={[{ label: 'no', value: false }, { label: 'yes', value: true }]} />
            </Form.Item>
            <Form.Item name="response_due_date" label="Response due date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

