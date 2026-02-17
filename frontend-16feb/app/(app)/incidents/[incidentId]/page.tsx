'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
} from 'antd';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';

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

function fmtTs(v: any) {
  if (!v) return '-';
  return String(v).replace('T', ' ').slice(0, 19);
}

function formatDuration(seconds?: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return '-';
  const s = Number(seconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function IncidentDetailPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const params = useParams<{ incidentId: string }>();
  const incidentId = String((params as any)?.incidentId || '');

  const { data, mutate } = useSWR(incidentId ? `/api/incidents/${encodeURIComponent(incidentId)}` : null, (u) => fetchJson(u as any, tenantId), {
    refreshInterval: 20_000,
    revalidateOnFocus: false,
  });

  const incident = (data as any)?.incident || null;
  const activities: any[] = Array.isArray((data as any)?.activities) ? (data as any).activities : [];
  const affectedAssets: any[] = Array.isArray((data as any)?.affected_assets) ? (data as any).affected_assets : [];
  const threatIntel: any[] = Array.isArray((data as any)?.threat_intelligence) ? (data as any).threat_intelligence : [];

  const { data: timelineData } = useSWR(
    incidentId ? `/api/incidents/${encodeURIComponent(incidentId)}/timeline` : null,
    (u) => fetchJson(u as any, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );
  const statusTimeline: any[] = Array.isArray((timelineData as any)?.timeline) ? (timelineData as any).timeline : [];

  const { data: controlsData } = useSWR(
    incidentId ? `/api/incidents/${encodeURIComponent(incidentId)}/controls` : null,
    (u) => fetchJson(u as any, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );
  const relatedControls: any[] = Array.isArray((controlsData as any)?.controls) ? (controlsData as any).controls : [];

  const { data: metricsData } = useSWR(
    incidentId ? `/api/incidents/${encodeURIComponent(incidentId)}/metrics` : null,
    (u) => fetchJson(u as any, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );
  const metrics = (metricsData as any)?.metrics || null;

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [activityOpen, setActivityOpen] = useState(false);
  const [activityForm] = Form.useForm();

  const [assetOpen, setAssetOpen] = useState(false);
  const [assetForm] = Form.useForm();

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm] = Form.useForm();

  const [jiraOpen, setJiraOpen] = useState(false);
  const [jiraForm] = Form.useForm();

  const handleTabChange = () => {
    setStatusOpen(false);
    setActivityOpen(false);
    setAssetOpen(false);
    setAssignOpen(false);
    setJiraOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const steps = [
    { key: 'reported', title: 'Reported', ts: incident?.reported_at },
    { key: 'investigating', title: 'Investigating', ts: incident?.acknowledged_at },
    { key: 'contained', title: 'Contained', ts: incident?.contained_at },
    { key: 'eradicated', title: 'Eradicated', ts: incident?.eradicated_at },
    { key: 'recovering', title: 'Recovering', ts: incident?.recovered_at },
    { key: 'closed', title: 'Closed', ts: incident?.closed_at },
  ];
  const currentStepIndex = Math.max(
    0,
    steps.findIndex((s) => String(incident?.status || 'reported') === s.key)
  );

  const responseTarget = Number(incident?.sla_target_response || 60);
  const resolutionTarget = Number(incident?.sla_target_resolution || 1440);
  const responseMinutes = incident?.sla_response_time != null ? Number(incident.sla_response_time) : null;
  const resolutionMinutes = incident?.sla_resolution_time != null ? Number(incident.sla_resolution_time) : null;
  const responseBreached = Boolean(incident?.sla_response_breached);
  const resolutionBreached = Boolean(incident?.sla_resolution_breached);

  async function patchIncident(patch: any) {
    setSaving(true);
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      await mutate();
      message.success('Incident updated');
    } finally {
      setSaving(false);
    }
  }

  if (!incident) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Typography.Text type="secondary">Loading incident…</Typography.Text>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            #{String(incident.incident_number)} - {String(incident.incident_title)}
          </h1>
          <div className="text-sm text-gray-600 mt-1">{String(incident.incident_description || '')}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <Tag color={statusColor(String(incident.status)) as any}>{String(incident.status)}</Tag>
            <Tag color={sevColor(String(incident.severity))}>{String(incident.severity)}</Tag>
            <Tag>{String(incident.incident_type)}</Tag>
            {Boolean(incident.requires_notification) ? <Tag color="blue">Notification required</Tag> : null}
          </div>
        </div>
        <Space>
          <Button href="/incidents">Back</Button>
          <Button onClick={() => mutate()}>Refresh</Button>
          <Button onClick={() => setAssignOpen(true)}>Assign</Button>
          <Button onClick={() => setJiraOpen(true)}>Create Jira Ticket</Button>
          <Button type="primary" onClick={() => setStatusOpen(true)}>
            Change Status
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Steps
          current={currentStepIndex}
          items={steps.map((s) => ({
            title: s.title,
            description: s.ts ? fmtTs(s.ts) : undefined,
          }))}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Overview">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Detected At">{fmtTs(incident.detected_at)}</Descriptions.Item>
              <Descriptions.Item label="Reported At">{fmtTs(incident.reported_at)}</Descriptions.Item>
              <Descriptions.Item label="Commander">{incident.incident_commander ? String(incident.incident_commander) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Assigned To">
                {incident.assigned_to ? String(incident.assigned_to) : incident.incident_commander ? String(incident.incident_commander) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Category">{incident.incident_category ? String(incident.incident_category) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Impact">{incident.impact_description ? String(incident.impact_description) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Affected Users">{Number(incident.affected_users_count || 0)}</Descriptions.Item>
              <Descriptions.Item label="Affected Records">{Number(incident.affected_records_count || 0)}</Descriptions.Item>
              <Descriptions.Item label="Estimated Cost">{incident.estimated_cost != null ? `$${String(incident.estimated_cost)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="MTTR">{formatDuration(metrics?.mttr_seconds)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="SLA">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Response SLA">
                <Space>
                  <span>{responseMinutes != null ? `${responseMinutes} min` : 'Pending'}</span>
                  <Tag>{`Target ${responseTarget} min`}</Tag>
                  {responseBreached ? <Badge status="error" text="Breached" /> : <Badge status="success" text="OK" />}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Resolution SLA">
                <Space>
                  <span>{resolutionMinutes != null ? `${resolutionMinutes} min` : 'Open'}</span>
                  <Tag>{`Target ${resolutionTarget} min`}</Tag>
                  {resolutionBreached ? <Badge status="error" text="Breached" /> : <Badge status="success" text="OK" />}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          destroyInactiveTabPane
          onChange={handleTabChange}
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <div>
                  <Typography.Title level={5}>Description</Typography.Title>
                  <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{String(incident.incident_description || '')}</Typography.Paragraph>
                </div>
              ),
            },
            {
              key: 'response',
              label: 'Response Details',
              children: (
                <Form
                  form={editForm}
                  layout="vertical"
                  initialValues={{
                    incident_commander: incident.incident_commander || '',
                    response_team: Array.isArray(incident.response_team) ? incident.response_team : [],
                    containment_actions: incident.containment_actions || '',
                    eradication_actions: incident.eradication_actions || '',
                    recovery_actions: incident.recovery_actions || '',
                    root_cause: incident.root_cause || '',
                    lessons_learned: incident.lessons_learned || '',
                    preventive_measures: incident.preventive_measures || '',
                  }}
                  onFinish={(v) => patchIncident(v)}
                >
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
                  <Form.Item name="containment_actions" label="Containment Actions">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item name="eradication_actions" label="Eradication Actions">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item name="recovery_actions" label="Recovery Actions">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item name="root_cause" label="Root Cause">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                      <Form.Item name="lessons_learned" label="Lessons Learned">
                        <Input.TextArea rows={3} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="preventive_measures" label="Preventive Measures">
                        <Input.TextArea rows={3} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={saving}>
                      Save
                    </Button>
                  </Space>
                </Form>
              ),
            },
            {
              key: 'assets',
              label: 'Affected Assets',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Typography.Text type="secondary">Track impact and recovery per affected asset.</Typography.Text>
                    <Button type="primary" onClick={() => setAssetOpen(true)}>
                      Add Asset
                    </Button>
                  </div>
                  <Table
                    rowKey={(r) => String(r.asset_id)}
                    dataSource={affectedAssets}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      { title: 'Asset ID', dataIndex: 'asset_id', render: (v: any) => <a href={`/assets/${encodeURIComponent(String(v))}`}>{String(v)}</a> },
                      { title: 'Type', dataIndex: 'asset_kind', render: (v: any) => (v ? String(v) : '-') },
                      {
                        title: 'Impact',
                        dataIndex: 'impact_description',
                        render: (v: any) => (v ? <span style={{ whiteSpace: 'pre-wrap' }}>{String(v)}</span> : '-'),
                      },
                      {
                        title: 'Compromised',
                        dataIndex: 'compromised',
                        render: (v: any) => (v ? <Tag color="red">Yes</Tag> : <Tag> No</Tag>),
                      },
                      {
                        title: 'Recovery',
                        render: (_: any, r: any) => (r.recovery_completed ? <Badge status="success" text="Complete" /> : <Badge status="processing" text="In progress" />),
                      },
                      {
                        title: 'Actions',
                        render: (_: any, r: any) => (
                          <Space>
                            <Button
                              size="small"
                              onClick={async () => {
                                await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/affected-assets/${encodeURIComponent(String(r.asset_id))}`, {
                                  method: 'PATCH',
                                  credentials: 'include',
                                  headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
                                  body: JSON.stringify({ recovery_completed: !Boolean(r.recovery_completed) }),
                                }).catch(() => null);
                                mutate();
                              }}
                            >
                              Toggle Recovery
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={async () => {
                                await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/affected-assets/${encodeURIComponent(String(r.asset_id))}`, {
                                  method: 'DELETE',
                                  credentials: 'include',
                                  headers: { 'x-tenant-id': tenantId },
                                }).catch(() => null);
                                mutate();
                              }}
                            >
                              Remove
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'controls',
              label: 'Related Controls',
              children: (
                <div>
                  {relatedControls.length ? (
                    <Table
                      rowKey={(r) => String(r.incident_control_id || r.control_uuid || r.control_code)}
                      dataSource={relatedControls}
                      pagination={{ pageSize: 8 }}
                      columns={[
                        { title: 'Framework', dataIndex: 'framework', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                        { title: 'Control', dataIndex: 'control_code', render: (v: any) => <code>{String(v || '')}</code> },
                        { title: 'Title', dataIndex: 'control_title', render: (v: any) => String(v || '-') },
                        { title: 'Failure Type', dataIndex: 'failure_type', render: (v: any) => (v ? <Tag color="orange">{String(v)}</Tag> : '-') },
                        { title: 'Evidence', dataIndex: 'evidence_count', render: (v: any) => Number(v || 0) },
                        { title: 'Last Evidence', dataIndex: 'last_evidence_at', render: (v: any) => fmtTs(v) },
                      ]}
                    />
                  ) : (
                    <Typography.Text type="secondary">No related controls linked.</Typography.Text>
                  )}
                </div>
              ),
            },
            {
              key: 'timeline',
              label: 'Activity Timeline',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Typography.Text type="secondary">All updates during response are logged here.</Typography.Text>
                    <Button onClick={() => setActivityOpen(true)}>Add Update</Button>
                  </div>
                  {statusTimeline.length ? (
                    <Table
                      rowKey={(r) => `${r.event_type}-${r.timestamp}-${r.actor}`}
                      dataSource={statusTimeline}
                      pagination={{ pageSize: 6 }}
                      style={{ marginBottom: 16 }}
                      columns={[
                        { title: 'When', dataIndex: 'timestamp', render: (v: any) => fmtTs(v) },
                        { title: 'Event', dataIndex: 'event_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                        { title: 'Status', dataIndex: 'status', render: (v: any) => (v ? String(v) : '-') },
                        { title: 'Actor', dataIndex: 'actor', render: (v: any) => (v ? String(v) : '-') },
                        { title: 'Notes', dataIndex: 'notes', render: (v: any) => (v ? String(v) : '-') },
                      ]}
                    />
                  ) : null}
                  <Table
                    rowKey="id"
                    dataSource={activities}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'When', dataIndex: 'performed_at', render: (v: any) => fmtTs(v) },
                      { title: 'Who', dataIndex: 'performed_by', render: (v: any) => (v ? String(v) : '-') },
                      { title: 'Type', dataIndex: 'activity_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                      { title: 'Description', dataIndex: 'activity_description', render: (v: any) => <span style={{ whiteSpace: 'pre-wrap' }}>{String(v || '')}</span> },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'notifications',
              label: 'Notifications & Compliance',
              children: (
                <Form
                  layout="vertical"
                  initialValues={{
                    requires_notification: Boolean(incident.requires_notification),
                    notification_required_by: incident.notification_required_by ? dayjs(String(incident.notification_required_by)) : undefined,
                    notification_completed: Boolean(incident.notification_completed),
                    regulatory_bodies_notified: Array.isArray(incident.regulatory_bodies_notified) ? incident.regulatory_bodies_notified : [],
                  }}
                  onFinish={(v) => {
                    const patch: any = {
                      requires_notification: Boolean(v.requires_notification),
                      notification_completed: Boolean(v.notification_completed),
                      regulatory_bodies_notified: v.regulatory_bodies_notified?.length ? v.regulatory_bodies_notified : [],
                    };
                    if (v.notification_required_by?.toDate) patch.notification_required_by = v.notification_required_by.toDate().toISOString();
                    return patchIncident(patch);
                  }}
                >
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={8}>
                      <Form.Item name="requires_notification" label="Requires notification?">
                        <Select
                          options={[
                            { value: true, label: 'Yes' },
                            { value: false, label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="notification_required_by" label="Notification deadline">
                        <DatePicker showTime style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="notification_completed" label="Notification completed?">
                        <Select
                          options={[
                            { value: true, label: 'Completed' },
                            { value: false, label: 'Pending' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="regulatory_bodies_notified" label="Regulatory bodies notified">
                    <Select mode="tags" placeholder="e.g., SEC, FTC, HHS" />
                  </Form.Item>

                  <Button type="primary" htmlType="submit" loading={saving}>
                    Save
                  </Button>
                </Form>
              ),
            },
            {
              key: 'metrics',
              label: 'Metrics',
              children: (
                <div>
                  {metrics ? (
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={12}>
                        <Card>
                          <div className="text-sm text-gray-600">Time to Acknowledge</div>
                          <div className="text-2xl font-semibold mt-2">{formatDuration(metrics.time_to_acknowledge_seconds)}</div>
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card>
                          <div className="text-sm text-gray-600">Time to Investigate</div>
                          <div className="text-2xl font-semibold mt-2">{formatDuration(metrics.time_to_investigate_seconds)}</div>
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card>
                          <div className="text-sm text-gray-600">Time to Resolve</div>
                          <div className="text-2xl font-semibold mt-2">{formatDuration(metrics.time_to_resolve_seconds)}</div>
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card>
                          <div className="text-sm text-gray-600">MTTR</div>
                          <div className="text-2xl font-semibold mt-2">{formatDuration(metrics.mttr_seconds)}</div>
                        </Card>
                      </Col>
                    </Row>
                  ) : (
                    <Typography.Text type="secondary">Metrics will appear after status changes are recorded.</Typography.Text>
                  )}
                </div>
              ),
            },
            {
              key: 'related',
              label: 'Related Items',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="Controls">
                      {Array.isArray(incident.related_control_ids) && incident.related_control_ids.length ? (
                        <Space wrap>
                          {incident.related_control_ids.map((c: any) => (
                            <Tag key={String(c)}>
                              <a href={`/controls/${encodeURIComponent(String(c))}`}>{String(c)}</a>
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        <Typography.Text type="secondary">No related controls.</Typography.Text>
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="Risks">
                      {Array.isArray(incident.related_risk_ids) && incident.related_risk_ids.length ? (
                        <Space wrap>
                          {incident.related_risk_ids.map((rid: any) => (
                            <Tag key={String(rid)}>
                              <a href={`/risks/${encodeURIComponent(String(rid))}`}>{String(rid).slice(0, 8)}…</a>
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        <Typography.Text type="secondary">No related risks.</Typography.Text>
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="Assets">
                      {Array.isArray(incident.related_asset_ids) && incident.related_asset_ids.length ? (
                        <Space wrap>
                          {incident.related_asset_ids.map((aid: any) => (
                            <Tag key={String(aid)}>
                              <a href={`/assets/${encodeURIComponent(String(aid))}`}>{String(aid)}</a>
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        <Typography.Text type="secondary">No related assets.</Typography.Text>
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="Threat Intelligence">
                      {threatIntel.length ? (
                        <Table
                          rowKey="id"
                          dataSource={threatIntel}
                          size="small"
                          pagination={{ pageSize: 5 }}
                          columns={[
                            { title: 'Type', dataIndex: 'indicator_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                            { title: 'Value', dataIndex: 'indicator_value', render: (v: any) => <code>{String(v || '')}</code> },
                            { title: 'Severity', dataIndex: 'severity', render: (v: any) => <Tag color={sevColor(String(v || ''))}>{String(v || '')}</Tag> },
                          ]}
                        />
                      ) : (
                        <Typography.Text type="secondary">No related indicators.</Typography.Text>
                      )}
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Change Status"
        open={statusOpen}
        onCancel={() => setStatusOpen(false)}
        okText="Update"
        confirmLoading={saving}
        onOk={() => statusForm.submit()}
        destroyOnClose
      >
        <Form
          form={statusForm}
          layout="vertical"
          initialValues={{ new_status: incident.status, comment: '' }}
          onFinish={async (v) => {
            setSaving(true);
            try {
              const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/status`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
                body: JSON.stringify({ new_status: v.new_status, comment: v.comment || undefined }),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
              setStatusOpen(false);
              await mutate();
              message.success('Status updated');
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="new_status" label="New status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'reported', label: 'Reported' },
                { value: 'investigating', label: 'Investigating' },
                { value: 'contained', label: 'Contained' },
                { value: 'eradicated', label: 'Eradicated' },
                { value: 'recovering', label: 'Recovering' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
          </Form.Item>
          <Form.Item name="comment" label="Comment (optional)">
            <Input.TextArea rows={3} placeholder="What changed?" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Activity"
        open={activityOpen}
        onCancel={() => setActivityOpen(false)}
        okText="Add"
        confirmLoading={saving}
        onOk={() => activityForm.submit()}
        destroyOnClose
      >
        <Form
          form={activityForm}
          layout="vertical"
          initialValues={{ activity_type: 'comment', activity_description: '' }}
          onFinish={async (v) => {
            setSaving(true);
            try {
              const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/activities`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
                body: JSON.stringify(v),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
              setActivityOpen(false);
              activityForm.resetFields();
              await mutate();
              message.success('Activity added');
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="activity_type" label="Activity type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'comment', label: 'Comment' },
                { value: 'update', label: 'Update' },
                { value: 'action_taken', label: 'Action taken' },
                { value: 'escalation', label: 'Escalation' },
                { value: 'notification_sent', label: 'Notification sent' },
              ]}
            />
          </Form.Item>
          <Form.Item name="activity_description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Affected Asset"
        open={assetOpen}
        onCancel={() => setAssetOpen(false)}
        okText="Add"
        confirmLoading={saving}
        onOk={() => assetForm.submit()}
        destroyOnClose
      >
        <Form
          form={assetForm}
          layout="vertical"
          initialValues={{ compromised: false, data_exfiltrated: false, service_disrupted: false, recovery_completed: false }}
          onFinish={async (v) => {
            setSaving(true);
            try {
              const payload: any = { ...v };
              if (v.affected_from?.toDate) payload.affected_from = v.affected_from.toDate().toISOString();
              if (v.affected_until?.toDate) payload.affected_until = v.affected_until.toDate().toISOString();
              const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/affected-assets`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
                body: JSON.stringify(payload),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
              setAssetOpen(false);
              assetForm.resetFields();
              await mutate();
              message.success('Asset added');
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="asset_id" label="Asset ID" rules={[{ required: true }]}>
            <Input placeholder="e.g., endpoints/agent-123" />
          </Form.Item>
          <Form.Item name="impact_description" label="Impact description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item name="compromised" label="Compromised?">
                <Select options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="data_exfiltrated" label="Data exfiltrated?">
                <Select options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="service_disrupted" label="Service disrupted?">
                <Select options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="affected_from" label="Affected from">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="affected_until" label="Affected until">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="recovery_actions" label="Recovery actions">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="recovery_completed" label="Recovery completed?">
            <Select options={[{ value: true, label: 'Complete' }, { value: false, label: 'In progress' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Assign Incident"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        okText="Assign"
        confirmLoading={saving}
        onOk={() => assignForm.submit()}
        destroyOnClose
      >
        <Form
          form={assignForm}
          layout="vertical"
          initialValues={{ assigned_to: incident?.incident_commander || '', role: '' }}
          onFinish={async (v) => {
            setSaving(true);
            try {
              const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}/assign`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
                body: JSON.stringify({ assignedTo: v.assigned_to, role: v.role || undefined }),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
              setAssignOpen(false);
              await mutate();
              message.success('Incident assigned');
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="assigned_to" label="Assign to (email)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role (optional)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Create Jira Ticket"
        open={jiraOpen}
        onCancel={() => setJiraOpen(false)}
        okText="Create"
        confirmLoading={saving}
        onOk={() => jiraForm.submit()}
        destroyOnClose
      >
        <Form
          form={jiraForm}
          layout="vertical"
          initialValues={{
            summary: `${String(incident.incident_number)}: ${String(incident.incident_title)}`,
            description: `Incident ${String(incident.incident_number)}\nSeverity: ${String(incident.severity)}\nStatus: ${String(incident.status)}\nDetected: ${fmtTs(incident.detected_at)}\n\n${String(incident.incident_description || '')}`,
            priority: String(incident.severity || 'medium').toLowerCase() === 'critical' ? 'Highest' : String(incident.severity || '').toLowerCase() === 'high' ? 'High' : 'Medium',
          }}
          onFinish={async (v) => {
            setSaving(true);
            try {
              const res = await fetch(`/api/integrations/jira/create-ticket`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
                body: JSON.stringify({
                  entity_type: 'incident',
                  entity_id: String(incident.id),
                  summary: v.summary,
                  description: v.description,
                  priority: v.priority || undefined,
                }),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
              setJiraOpen(false);
              message.success('Jira ticket created');
              if (json?.ticket_url || json?.record?.ticket_url) {
                window.open(String(json.ticket_url || json.record.ticket_url), '_blank');
              }
            } finally {
              setSaving(false);
            }
          }}
        >
          <Form.Item name="summary" label="Summary" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <Select options={[{ value: 'Highest' }, { value: 'High' }, { value: 'Medium' }, { value: 'Low' }]} />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
          <Typography.Text type="secondary">Requires Jira integration to be configured in Integrations & Notifications.</Typography.Text>
        </Form>
      </Modal>
    </div>
  );
}

