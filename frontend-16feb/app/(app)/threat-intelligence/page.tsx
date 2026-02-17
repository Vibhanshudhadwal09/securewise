'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { AlertTriangle, ExternalLink, Radar, ShieldCheck } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { DecisionsList, type EnforcementDecisionRow } from '@/components/enforcement/DecisionsList';
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

function sevColor(s: string) {
  const v = String(s || '').toLowerCase();
  if (v === 'critical') return 'red';
  if (v === 'high') return 'orange';
  if (v === 'medium') return 'gold';
  return 'green';
}

interface WazuhIndicator {
  indicator_id: string;
  indicator_type: 'ip' | 'hash' | 'domain';
  indicator_value: string;
  threat_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence_level: 'low' | 'medium' | 'high';
  first_seen: string;
  last_seen: string;
  occurrences: number;
  is_active: boolean;
  description: string;
  agent_refs: string[];
  rule_ids: string[];
  source: {
    tool: string;
    source_ref?: string;
    automated: boolean;
  };
}

interface WazuhIndicatorsTableProps {
  indicators: WazuhIndicator[];
  loading: boolean;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function WazuhIndicatorsTable({ indicators, loading }: WazuhIndicatorsTableProps) {
  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading threat indicators...</div>;
  }

  if (indicators.length === 0) {
    return <div className="text-center py-12 text-slate-500">No threat indicators found for the selected filters.</div>;
  }

  const severityColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const confidenceColors = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Indicator</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Threat Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Severity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Confidence</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Occurrences</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Last Seen</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {indicators.map((indicator) => (
            <tr key={indicator.indicator_id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  {indicator.indicator_type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-mono">{indicator.indicator_value}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{indicator.threat_type ? indicator.threat_type.replace(/_/g, ' ') : '-'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${severityColors[indicator.severity]}`}>
                  {indicator.severity}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${confidenceColors[indicator.confidence_level]}`}>
                  {indicator.confidence_level}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{indicator.occurrences}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatRelativeTime(indicator.last_seen)}</td>
              <td className="px-4 py-3">
                {indicator.source?.source_ref && (
                  <a
                    href={indicator.source.source_ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ThreatIntelligenceIndicators() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [activeTab, setActiveTab] = useState<'manual' | 'wazuh'>('wazuh');
  const [filters, setFilters] = useState<{ indicator_type?: string; severity?: string; is_active?: string; threat_type?: string; q?: string }>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [wazuhIndicators, setWazuhIndicators] = useState<WazuhIndicator[]>([]);
  const [wazuhSummary, setWazuhSummary] = useState<any>(null);
  const [wazuhLoading, setWazuhLoading] = useState(false);
  const [windowFilter, setWindowFilter] = useState('7d');
  const [form] = Form.useForm();

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue;
      qs.set(k, String(v));
    }
    return qs.toString();
  }, [filters]);

  const { data, mutate } = useSWR(`/api/threat-intelligence${query ? `?${query}` : ''}`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });
  const items: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];

  const { data: enforcementData } = useSWR(
    '/api/enforcement/decisions?limit=5&offset=0',
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 10_000, revalidateOnFocus: false }
  );
  const recentDecisions: EnforcementDecisionRow[] = Array.isArray(enforcementData?.decisions) ? enforcementData.decisions : [];

  const total = items.length;
  const active = items.filter((i) => Boolean(i.is_active)).length;
  const high = items.filter((i) => ['high', 'critical'].includes(String(i.severity || '').toLowerCase())).length;

  const fetchWazuhIndicators = async () => {
    try {
      setWazuhLoading(true);
      const params = new URLSearchParams();
      params.set('window', windowFilter);
      if (filters.indicator_type) params.set('type', filters.indicator_type);
      if (filters.severity) params.set('severity', filters.severity);
      const data = await fetchJson(`/api/connectors/wazuh/threat-indicators?${params.toString()}`, tenantId);
      setWazuhIndicators(Array.isArray(data?.indicators) ? data.indicators : []);
      setWazuhSummary(data?.summary || {});
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch Wazuh indicators:', err);
    } finally {
      setWazuhLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wazuh') {
      void fetchWazuhIndicators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, windowFilter, filters.indicator_type, filters.severity, tenantId]);

  async function createIndicator(values: any) {
    setSaving(true);
    try {
      const payload = {
        indicator_type: values.indicator_type,
        indicator_value: values.indicator_value,
        threat_type: values.threat_type || undefined,
        severity: values.severity || undefined,
        confidence_level: values.confidence_level || undefined,
        description: values.description || undefined,
        threat_actor: values.threat_actor || undefined,
        campaign_name: values.campaign_name || undefined,
        source: values.source || undefined,
        source_url: values.source_url || undefined,
        tags: values.tags?.length ? values.tags : undefined,
        related_incident_ids: values.related_incident_ids?.length ? values.related_incident_ids : undefined,
        related_cve_ids: values.related_cve_ids?.length ? values.related_cve_ids : undefined,
      };
      const res = await fetch('/api/threat-intelligence', {
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
      message.success('Indicator added');
    } finally {
      setSaving(false);
    }
  }

  async function patchIndicator(id: string, patch: any) {
    const res = await fetch(`/api/threat-intelligence/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
    return json;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Threat Intelligence"
        description="Manage indicators (IOCs), link them to incidents, and track exposure."
        icon={Radar}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Threat Intelligence' },
        ]}
        stats={[
          { label: 'Total Indicators', value: total },
          { label: 'Active', value: active },
        ]}
        actions={
          <Space>
            <Button href="/threat-intelligence/threat-hunting">Threat Hunting</Button>
            <Button onClick={() => mutate()}>Refresh</Button>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Add Indicator
            </Button>
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="flex gap-2 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('wazuh')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'wazuh'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Wazuh Feed (Automated)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'manual'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manual IOCs
          </button>
        </div>

        {activeTab === 'wazuh' && (
          <div className="mb-4">
            <label className="text-sm text-slate-600 mr-2">Time Window:</label>
            <select
              value={windowFilter}
              onChange={(e) => setWindowFilter(e.target.value)}
              className="border border-slate-200 rounded px-3 py-1 text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {activeTab === 'wazuh' ? (
            <>
              <MetricCard title="Total Indicators" value={wazuhSummary?.total || 0} subtitle="Automated from alerts" icon={ShieldCheck} color="blue" />
              <MetricCard title="Active" value={wazuhSummary?.total || 0} subtitle="Live indicators" icon={ShieldCheck} color="green" />
              <MetricCard title="High Severity" value={wazuhSummary?.by_severity?.high || 0} subtitle="Immediate action" icon={AlertTriangle} color="red" />
              <MetricCard title="High Confidence" value={wazuhSummary?.high_confidence_count || 0} subtitle="Verified threats" icon={ShieldCheck} color="blue" />
            </>
          ) : (
            <>
              <MetricCard title="Total Indicators" value={total} subtitle="Tracked IOCs" icon={ShieldCheck} color="blue" />
              <MetricCard title="Active" value={active} subtitle="Live indicators" icon={ShieldCheck} color="green" />
              <MetricCard title="High Severity" value={high} subtitle="Immediate action" icon={AlertTriangle} color="red" />
            </>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
          <h3 className="text-lg font-semibold mb-3">Automated Enforcement</h3>
          <DecisionsList decisions={recentDecisions} compact title="Recent Enforcement Actions" />
          <div className="text-right mt-3">
            <a href="/enforcement" className="text-sm text-blue-600 hover:text-blue-800">
              View All →
            </a>
          </div>
        </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={5}>
            <Select
              allowClear
              placeholder="Type"
              style={{ width: '100%' }}
              value={filters.indicator_type}
              onChange={(v) => setFilters((p) => ({ ...p, indicator_type: v || undefined }))}
              options={[
                { value: 'ip', label: 'IP' },
                { value: 'domain', label: 'Domain' },
                { value: 'url', label: 'URL' },
                { value: 'hash', label: 'Hash' },
                { value: 'email', label: 'Email' },
                { value: 'cve', label: 'CVE' },
              ]}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              allowClear
              placeholder="Severity"
              style={{ width: '100%' }}
              value={filters.severity}
              onChange={(v) => setFilters((p) => ({ ...p, severity: v || undefined }))}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              allowClear
              placeholder="Active?"
              style={{ width: '100%' }}
              value={filters.is_active}
              onChange={(v) => setFilters((p) => ({ ...p, is_active: v || undefined }))}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          </Col>
          <Col xs={24} md={5}>
            <Input placeholder="Threat type (optional)" value={filters.threat_type} onChange={(e) => setFilters((p) => ({ ...p, threat_type: e.target.value || undefined }))} />
          </Col>
          <Col xs={24} md={4}>
            <Input placeholder="Search" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value || undefined }))} />
          </Col>
        </Row>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        {activeTab === 'wazuh' ? (
          <WazuhIndicatorsTable indicators={wazuhIndicators} loading={wazuhLoading} />
        ) : (
          <>
            <Table
              rowKey="id"
              dataSource={items}
              pagination={{ pageSize: 15 }}
              columns={[
                { title: 'Type', dataIndex: 'indicator_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                { title: 'Indicator', dataIndex: 'indicator_value', render: (v: any) => <code>{String(v || '')}</code> },
                { title: 'Threat type', dataIndex: 'threat_type', render: (v: any) => (v ? String(v) : '-') },
                { title: 'Severity', dataIndex: 'severity', render: (v: any) => <Tag color={sevColor(String(v || ''))}>{String(v || '')}</Tag> },
                { title: 'Confidence', dataIndex: 'confidence_level', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                { title: 'First seen', dataIndex: 'first_seen', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                { title: 'Last seen', dataIndex: 'last_seen', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                { title: 'Status', dataIndex: 'is_active', render: (v: any) => (v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>) },
                {
                  title: 'Actions',
                  render: (_: any, r: any) => (
                    <Space>
                      <Button size="small" onClick={() => setDetail(r)}>
                        View
                      </Button>
                      <Button
                        size="small"
                        onClick={async () => {
                          try {
                            await patchIndicator(String(r.id), { is_active: !Boolean(r.is_active) });
                            mutate();
                          } catch (e: any) {
                            message.error(String(e?.message || e));
                          }
                        }}
                      >
                        Toggle
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />

            {!items.length ? <Typography.Text type="secondary">No indicators found.</Typography.Text> : null}
          </>
        )}
      </div>

      <Modal
        title="Add Threat Indicator"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        okText="Add"
        confirmLoading={saving}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={createIndicator} initialValues={{ severity: 'medium', confidence_level: 'medium' }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={10}>
              <Form.Item name="indicator_type" label="Indicator Type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'ip', label: 'IP' },
                    { value: 'domain', label: 'Domain' },
                    { value: 'url', label: 'URL' },
                    { value: 'hash', label: 'Hash' },
                    { value: 'email', label: 'Email' },
                    { value: 'cve', label: 'CVE' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={14}>
              <Form.Item name="indicator_value" label="Indicator Value" rules={[{ required: true }]}>
                <Input placeholder="e.g., 8.8.8.8, example.com, CVE-2024-1234" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="severity" label="Severity">
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
            <Col xs={24} md={12}>
              <Form.Item name="confidence_level" label="Confidence">
                <Select options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="threat_type" label="Threat Type">
            <Input placeholder="e.g., malware, phishing, c2, exploit" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="threat_actor" label="Threat Actor">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="campaign_name" label="Campaign">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="source" label="Source">
                <Input placeholder="OSINT / SIEM / Threat Feed / Internal Detection" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="source_url" label="Source URL">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="tags" label="Tags">
            <Select mode="tags" placeholder="Add tags" />
          </Form.Item>
          <Form.Item name="related_incident_ids" label="Related Incidents (UUIDs)">
            <Select mode="tags" placeholder="Paste incident UUIDs" />
          </Form.Item>
          <Form.Item name="related_cve_ids" label="Related CVEs">
            <Select mode="tags" placeholder="e.g., CVE-2024-1234" />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary">You can link indicators to incidents from either module.</Typography.Text>
      </Modal>

      <Modal
        title="Threat Indicator Details"
        open={Boolean(detail)}
        onCancel={() => setDetail(null)}
        footer={[
          <Button key="close" onClick={() => setDetail(null)}>
            Close
          </Button>,
          <Button
            key="toggle"
            type="primary"
            onClick={async () => {
              if (!detail) return;
              setSaving(true);
              try {
                await patchIndicator(String(detail.id), { is_active: !Boolean(detail.is_active) });
                setDetail(null);
                mutate();
              } catch (e: any) {
                message.error(String(e?.message || e));
              } finally {
                setSaving(false);
              }
            }}
            loading={saving}
          >
            Toggle Active
          </Button>,
        ]}
      >
        {detail ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <Tag>{String(detail.indicator_type || '')}</Tag> <Tag color={sevColor(String(detail.severity || ''))}>{String(detail.severity || '')}</Tag>{' '}
              {detail.is_active ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>}
            </div>
            <div>
              <Typography.Text strong>Indicator:</Typography.Text> <code>{String(detail.indicator_value || '')}</code>
            </div>
            <div>
              <Typography.Text strong>Description:</Typography.Text> {detail.description ? <span style={{ whiteSpace: 'pre-wrap' }}>{String(detail.description)}</span> : <span>-</span>}
            </div>
            <div>
              <Typography.Text strong>Last seen:</Typography.Text> {detail.last_seen ? String(detail.last_seen).slice(0, 19).replace('T', ' ') : '-'}
            </div>
            <div>
              <Typography.Text strong>Related incidents:</Typography.Text>{' '}
              {Array.isArray(detail.related_incident_ids) && detail.related_incident_ids.length ? (
                <Space wrap>
                  {detail.related_incident_ids.map((id: any) => (
                    <Tag key={String(id)}>
                      <a href={`/incidents/${encodeURIComponent(String(id))}`}>{String(id).slice(0, 8)}…</a>
                    </Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
    </div>
  );
}

