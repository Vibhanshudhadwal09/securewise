'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { Badge, Button, Card, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { AlertCircle, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { usePermissions } from '../../../lib/permissions';

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

function sevColor(s: string) {
  const v = String(s || '').toLowerCase();
  if (v === 'critical') return 'red';
  if (v === 'high') return 'orange';
  if (v === 'medium') return 'gold';
  return 'green';
}

function statusColor(s: string) {
  const v = String(s || '').toLowerCase();
  if (v === 'closed') return 'green';
  if (v === 'contained' || v === 'eradicated' || v === 'recovering') return 'blue';
  if (v === 'investigating') return 'gold';
  return 'default';
}

function alertSeverity(level: number) {
  if (level >= 12) return 'critical';
  if (level >= 8) return 'high';
  if (level >= 4) return 'medium';
  return 'low';
}

export default function IncidentsPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const { can } = usePermissions();

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[any | null, any | null]>([null, null]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  // Initialize filters from URL query (shareable links)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search || '');
      const s = sp.get('severity');
      const st = sp.get('status');
      const t = sp.get('type');
      const from = sp.get('from_date');
      const to = sp.get('to_date');

      if (s) setSeverityFilter(String(s));
      if (st) setStatusFilter(String(st));
      if (t) setTypeFilter(String(t));
      if (from || to) {
        const fromD = from ? dayjs(from) : null;
        const toD = to ? dayjs(to) : null;
        setDateRange([fromD?.isValid?.() ? fromD : null, toD?.isValid?.() ? toD : null]);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    if (statusFilter !== 'all') qs.set('status', statusFilter);
    if (severityFilter !== 'all') qs.set('severity', severityFilter);
    if (typeFilter !== 'all') qs.set('type', typeFilter);
    if (dateRange?.[0]) qs.set('from_date', dateRange[0].toDate().toISOString());
    if (dateRange?.[1]) qs.set('to_date', dateRange[1].toDate().toISOString());
    return qs.toString();
  }, [dateRange, severityFilter, statusFilter, typeFilter]);

  // Keep URL query in sync (without navigation)
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search || '');
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      else qs.delete('status');
      if (severityFilter !== 'all') qs.set('severity', severityFilter);
      else qs.delete('severity');
      if (typeFilter !== 'all') qs.set('type', typeFilter);
      else qs.delete('type');
      if (dateRange?.[0]) qs.set('from_date', dateRange[0].toDate().toISOString());
      else qs.delete('from_date');
      if (dateRange?.[1]) qs.set('to_date', dateRange[1].toDate().toISOString());
      else qs.delete('to_date');
      const next = `${window.location.pathname}${qs.toString() ? `?${qs.toString()}` : ''}`;
      window.history.replaceState(null, '', next);
    } catch {
      // ignore
    }
  }, [dateRange, severityFilter, statusFilter, typeFilter]);

  const { data, mutate } = useSWR(`/api/incidents${query ? `?${query}` : ''}`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });
  const items: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];
  const metrics = useMemo(() => {
    const total = items.length;
    const open = items.filter((i) => String(i.status || '') !== 'closed').length;
    const critical = items.filter((i) => String(i.severity || '') === 'critical').length;
    const closed = items.filter((i) => String(i.status || '') === 'closed').length;
    return { total, open, critical, closed };
  }, [items]);

  const { data: mttr } = useSWR(`/api/incidents/metrics/mttr`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const { data: wazuhAlertsData } = useSWR(`/api/wazuh/alerts/recent?range=24h&limit=25`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });
  const wazuhAlerts: any[] = Array.isArray((wazuhAlertsData as any)?.items) ? (wazuhAlertsData as any).items : [];

  // Client-side filtering as a fallback (and to keep UI responsive)
  const filteredIncidents = useMemo(() => {
    const [from, to] = dateRange || [null, null];
    return items.filter((inc) => {
      const sevOk = severityFilter === 'all' || String(inc.severity || '').toLowerCase() === severityFilter;
      const statusOk = statusFilter === 'all' || String(inc.status || '').toLowerCase() === statusFilter;
      const typeOk = typeFilter === 'all' || String(inc.incident_type || '').toLowerCase() === typeFilter;
      const detected = inc.detected_at ? new Date(String(inc.detected_at)) : null;
      const fromOk = from ? (detected ? detected.getTime() >= from.toDate().getTime() : false) : true;
      const toOk = to ? (detected ? detected.getTime() <= to.toDate().getTime() : false) : true;
      return sevOk && statusOk && typeOk && fromOk && toOk;
    });
  }, [dateRange, items, severityFilter, statusFilter, typeFilter]);

  const openCount = filteredIncidents.filter((i) => String(i.status || '') !== 'closed').length;
  const criticalCount = filteredIncidents.filter((i) => String(i.severity || '') === 'critical' && String(i.status || '') !== 'closed').length;
  const slaBreaches = filteredIncidents.filter((i) => Boolean(i.sla_response_breached_live) || Boolean(i.sla_resolution_breached_live)).length;
  const avgResolveMinutes = Number((mttr as any)?.mttr_resolution_minutes || 0);
  const avgResolveDays = avgResolveMinutes ? avgResolveMinutes / 1440 : 0;

  const activeFilters = useMemo(() => {
    const out: { key: string; label: string; value: string }[] = [];
    if (severityFilter !== 'all') out.push({ key: 'severity', label: 'Severity', value: severityFilter });
    if (statusFilter !== 'all') out.push({ key: 'status', label: 'Status', value: statusFilter });
    if (typeFilter !== 'all') out.push({ key: 'type', label: 'Type', value: typeFilter });
    if (dateRange?.[0] || dateRange?.[1]) {
      const from = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD HH:mm') : '…';
      const to = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD HH:mm') : '…';
      out.push({ key: 'date', label: 'Date', value: `${from} → ${to}` });
    }
    return out;
  }, [dateRange, severityFilter, statusFilter, typeFilter]);

  async function createIncident(values: any) {
    setCreating(true);
    try {
      const payload = {
        incident_title: values.incident_title,
        incident_description: values.incident_description,
        incident_type: values.incident_type,
        incident_category: values.incident_category || undefined,
        severity: values.severity,
        detected_at: values.detected_at?.toDate?.().toISOString?.() || new Date().toISOString(),
        incident_commander: values.incident_commander || undefined,
        response_team: values.response_team?.length ? values.response_team : undefined,
        affected_users_count: Number(values.affected_users_count || 0),
        affected_records_count: Number(values.affected_records_count || 0),
        data_types_affected: values.data_types_affected?.length ? values.data_types_affected : undefined,
        estimated_cost: values.estimated_cost != null && String(values.estimated_cost) !== '' ? Number(values.estimated_cost) : undefined,
        related_control_ids: values.related_control_ids?.length ? values.related_control_ids : undefined,
        related_asset_ids: values.related_asset_ids?.length ? values.related_asset_ids : undefined,
        related_risk_ids: values.related_risk_ids?.length ? values.related_risk_ids : undefined,
      };

      const res = await fetch('/api/incidents', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));

      setCreateOpen(false);
      form.resetFields();
      mutate();
      window.location.href = `/incidents/${encodeURIComponent(String(json?.id || json?.incident?.id || json?.incident_id || json?.incidentId || json?.incident?.id || json?.id))}`;
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Security Incidents"
        description="Track security, privacy, compliance, and operational incidents end-to-end."
        icon={AlertCircle}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Incidents' },
        ]}
        stats={[
          { label: 'Total', value: metrics.total },
          { label: 'Open', value: metrics.open },
        ]}
        actions={
          <Space>
            <Button onClick={() => mutate()}>Refresh</Button>
            {can('incidents.create') ? (
              <Button type="primary" onClick={() => setCreateOpen(true)}>
                Create Incident
              </Button>
            ) : null}
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Open Incidents" value={metrics.open} subtitle="Active response" icon={Shield} color="orange" />
          <MetricCard title="Critical" value={metrics.critical} subtitle="Immediate action" icon={AlertTriangle} color="red" />
          <MetricCard title="Closed" value={metrics.closed} subtitle="Resolved" icon={CheckCircle} color="green" />
          <MetricCard title="Total Incidents" value={metrics.total} subtitle="All time" icon={AlertCircle} color="blue" />
        </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(String(v || 'all'))}
              getPopupContainer={() => document.body}
              dropdownStyle={{ zIndex: 2000 }}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'reported', label: 'Reported' },
                { value: 'investigating', label: 'Investigating' },
                { value: 'contained', label: 'Contained' },
                { value: 'eradicated', label: 'Eradicated' },
                { value: 'recovering', label: 'Recovering' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={severityFilter}
              onChange={(v) => setSeverityFilter(String(v || 'all'))}
              getPopupContainer={() => document.body}
              dropdownStyle={{ zIndex: 2000 }}
              options={[
                { value: 'all', label: 'All severities' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={(v) => setTypeFilter(String(v || 'all'))}
              getPopupContainer={() => document.body}
              dropdownStyle={{ zIndex: 2000 }}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'security', label: 'Security' },
                { value: 'privacy', label: 'Privacy' },
                { value: 'operational', label: 'Operational' },
                { value: 'compliance', label: 'Compliance' },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <DatePicker.RangePicker
              showTime
              style={{ width: '100%' }}
              value={dateRange as any}
              onChange={(v) => setDateRange([v?.[0] || null, v?.[1] || null])}
              allowClear
            />
          </Col>
        </Row>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Space size={6} wrap>
            {activeFilters.length ? (
              <>
                <Tag color="blue">Filtered</Tag>
                {activeFilters.map((f) => (
                  <Tag key={f.key} style={{ marginInlineEnd: 0 }}>
                    {f.label}: {f.value}
                  </Tag>
                ))}
                <Tag color="default">
                  Showing {filteredIncidents.length} / {items.length}
                </Tag>
              </>
            ) : (
              <Tag color="default">No filters</Tag>
            )}
          </Space>

          {activeFilters.length ? (
            <Button
              size="small"
              onClick={() => {
                setSeverityFilter('all');
                setStatusFilter('all');
                setTypeFilter('all');
                setDateRange([null, null]);
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Open Incidents" value={openCount} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Critical (open)" value={criticalCount} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="SLA Breaches" value={slaBreaches} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Avg Time to Resolve" value={avgResolveDays ? avgResolveDays : 0} precision={2} suffix="days" />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Wazuh Security Alerts
        </Typography.Title>
        <Table
          rowKey={(r: any) => r.id || `${r?.ts}-${r?.rule?.id}`}
          dataSource={wazuhAlerts}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: 'Timestamp',
              dataIndex: 'ts',
              render: (v: any) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-'),
            },
            {
              title: 'Agent',
              dataIndex: 'agent',
              render: (_: any, r: any) => r?.agent?.name || r?.agent?.id || '-',
            },
            {
              title: 'Rule',
              dataIndex: 'rule',
              render: (_: any, r: any) => r?.rule?.description || r?.rule?.id || '-',
            },
            {
              title: 'Severity',
              dataIndex: 'rule',
              render: (_: any, r: any) => {
                const level = Number(r?.rule?.level || 0);
                const label = alertSeverity(level);
                return <Tag color={sevColor(label)}>{label}</Tag>;
              },
            },
            {
              title: 'Message',
              dataIndex: 'message',
              render: (v: any, r: any) => String(v || r?.full_log || '-'),
            },
          ]}
        />

        {!wazuhAlerts.length ? <Typography.Text type="secondary">No Wazuh alerts available.</Typography.Text> : null}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          dataSource={filteredIncidents}
          pagination={{ pageSize: 15 }}
          columns={[
            {
              title: 'Incident #',
              dataIndex: 'incident_number',
              render: (v: any, r: any) => <a href={`/incidents/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a>,
            },
            { title: 'Title', dataIndex: 'incident_title', render: (v: any) => <span style={{ fontWeight: 600 }}>{String(v || '')}</span> },
            { title: 'Type', dataIndex: 'incident_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
            { title: 'Severity', dataIndex: 'severity', render: (v: any) => <Tag color={sevColor(String(v || ''))}>{String(v || '')}</Tag> },
            { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag color={statusColor(String(v || '')) as any}>{String(v || '')}</Tag> },
            { title: 'Detected', dataIndex: 'detected_at', render: (v: any) => (v ? String(v).replace('T', ' ').slice(0, 19) : '-') },
            { title: 'Commander', dataIndex: 'incident_commander', render: (v: any) => (v ? String(v) : '-') },
            {
              title: 'SLA',
              render: (_: any, r: any) => {
                const breached = Boolean(r.sla_response_breached_live) || Boolean(r.sla_resolution_breached_live);
                return breached ? (
                  <Badge status="error" text="Breached" />
                ) : (
                  <Badge status="success" text="OK" />
                );
              },
            },
            {
              title: 'Actions',
              render: (_: any, r: any) => (
                <Space>
                  <Button size="small" href={`/incidents/${encodeURIComponent(String(r.id))}`}>
                    View
                  </Button>
                  {String(r.status || '') !== 'closed' && can('incidents.close') ? (
                    <Button
                      size="small"
                      danger
                      onClick={async () => {
                        await fetch(`/api/incidents/${encodeURIComponent(String(r.id))}/status`, {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
                          body: JSON.stringify({ new_status: 'closed', comment: 'Closed from incidents list' }),
                        }).catch(() => null);
                        mutate();
                      }}
                    >
                      Close
                    </Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />

        {!filteredIncidents.length ? <Typography.Text type="secondary">No incidents found for the selected filters.</Typography.Text> : null}
      </Card>

      <Modal
        title="Create Incident"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        okText="Create"
        confirmLoading={creating}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={createIncident}>
          <Form.Item name="incident_title" label="Incident Title" rules={[{ required: true, message: 'Title is required' }]}>
            <Input placeholder="e.g., Phishing email compromise" />
          </Form.Item>
          <Form.Item name="incident_description" label="Description" rules={[{ required: true, message: 'Description is required' }]}>
            <Input.TextArea rows={4} placeholder="What happened? What was detected?" />
          </Form.Item>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="incident_type" label="Incident Type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'security', label: 'Security' },
                    { value: 'privacy', label: 'Privacy' },
                    { value: 'operational', label: 'Operational' },
                    { value: 'compliance', label: 'Compliance' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="incident_category" label="Category">
                <Input placeholder="e.g., data_breach, malware, phishing" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="detected_at" label="Detected At" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="incident_commander" label="Incident Commander (email)">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="response_team" label="Response Team (emails)">
                <Select mode="tags" placeholder="Add team emails" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="affected_users_count" label="Affected Users Count">
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="affected_records_count" label="Affected Records Count">
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="data_types_affected" label="Data Types Affected">
                <Select
                  mode="multiple"
                  options={[
                    { value: 'PII', label: 'PII' },
                    { value: 'PHI', label: 'PHI' },
                    { value: 'financial', label: 'Financial' },
                    { value: 'credentials', label: 'Credentials' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="estimated_cost" label="Estimated Cost (USD)">
                <Input type="number" min={0} step="0.01" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="related_control_ids" label="Related Controls">
            <Select mode="tags" placeholder="e.g., A.8.2, A.5.15" />
          </Form.Item>
          <Form.Item name="related_asset_ids" label="Related Assets">
            <Select mode="tags" placeholder="e.g., endpoints/agent-123, k8s/cluster-1" />
          </Form.Item>
          <Form.Item name="related_risk_ids" label="Related Risk IDs (UUIDs)">
            <Select mode="tags" placeholder="Paste risk UUIDs" />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary">
          Tip: after creation, use the incident detail page to track response actions, assets, and activity timeline.
        </Typography.Text>
      </Modal>
    </div>
    </div>
  );
}

