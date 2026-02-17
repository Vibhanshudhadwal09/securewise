'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { FileText } from 'lucide-react';
import { usePermissions } from '../../../lib/permissions';
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

async function fetchJson(url: string, tenantId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('x-tenant-id', tenantId);
  const res = await fetch(url, { credentials: 'include', cache: 'no-store', ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
  return json;
}

function fmtBytes(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i += 1;
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

type ReportTemplate = {
  id: string;
  template_name: string;
  template_type: string;
  output_format: string;
  is_system_template: boolean;
  usage_count?: number;
  last_used_at?: string | null;
};

export default function ReportsHubPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const { can } = usePermissions();
  const [tab, setTab] = useState('generate');
  const [range, setRange] = useState<[any, any] | null>([dayjs().subtract(90, 'day'), dayjs()]);
  const [genBusy, setGenBusy] = useState(false);

  const { data: templatesData, mutate: refreshTemplates } = useSWR(['templates', tenantId], () =>
    fetchJson('/api/reports/templates', tenantId)
  );
  const templates: ReportTemplate[] = templatesData?.items || [];
  const systemByType = useMemo(() => {
    const m = new Map<string, ReportTemplate>();
    for (const t of templates) if (t.is_system_template) m.set(String(t.template_type), t);
    return m;
  }, [templates]);

  const { data: schedulesData, mutate: refreshSchedules } = useSWR(
    tab === 'scheduled' ? ['scheduled', tenantId] : null,
    () => fetchJson('/api/reports/scheduled', tenantId)
  );

  const { data: historyData, mutate: refreshHistory } = useSWR(tab === 'history' ? ['history', tenantId] : null, () =>
    fetchJson('/api/reports/history', tenantId)
  );

  const [createTplOpen, setCreateTplOpen] = useState(false);
  const [editTpl, setEditTpl] = useState<ReportTemplate | null>(null);
  const [tplBusy, setTplBusy] = useState(false);
  const [tplForm] = Form.useForm();

  const [createSchedOpen, setCreateSchedOpen] = useState(false);
  const [schedBusy, setSchedBusy] = useState(false);
  const [schedForm] = Form.useForm();

  async function generateFromTemplate(templateId: string, outputFormat?: string, extra?: any) {
    if (!can('reports.generate')) {
      message.error('You do not have permission to generate reports.');
      return;
    }
    setGenBusy(true);
    try {
      const dr = range
        ? { from: range[0]?.toISOString?.() || null, to: range[1]?.toISOString?.() || null }
        : { from: null, to: null };
      const res = await fetchJson('/api/reports/generate', tenantId, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ template_id: templateId, output_format: outputFormat, date_range: dr, ...(extra || {}) }),
      } as any);
      message.success('Report generated');
      if (res?.download_url) window.open(res.download_url, '_blank');
      await refreshHistory?.();
    } catch (e: any) {
      message.error(`Failed to generate: ${String(e?.message || e)}`);
    } finally {
      setGenBusy(false);
    }
  }

  async function downloadExportXlsx(url: string, suggestedName: string) {
    try {
      const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e: any) {
      message.error(`Export failed: ${String(e?.message || e)}`);
    }
  }

  async function saveTemplate(values: any) {
    if (!can('reports.generate')) {
      message.error('You do not have permission to manage templates.');
      return;
    }
    setTplBusy(true);
    try {
      let reportConfig: any = {};
      let branding: any = {};
      try {
        reportConfig = values.report_config ? JSON.parse(values.report_config) : {};
      } catch {
        message.error('Report config must be valid JSON');
        return;
      }
      try {
        branding = values.branding ? JSON.parse(values.branding) : {};
      } catch {
        message.error('Branding must be valid JSON');
        return;
      }
      if (editTpl) {
        await fetchJson(`/api/reports/templates/${editTpl.id}`, tenantId, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
          body: JSON.stringify({
            template_name: values.template_name,
            template_description: values.template_description || null,
            output_format: values.output_format,
            report_config: reportConfig,
            branding,
          }),
        } as any);
        message.success('Template updated');
      } else {
        await fetchJson('/api/reports/templates', tenantId, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
          body: JSON.stringify({
            template_name: values.template_name,
            template_description: values.template_description || null,
            template_type: values.template_type,
            output_format: values.output_format,
            report_config: reportConfig,
            branding,
          }),
        } as any);
        message.success('Template created');
      }
      setCreateTplOpen(false);
      setEditTpl(null);
      tplForm.resetFields();
      await refreshTemplates();
    } catch (e: any) {
      message.error(`Failed: ${String(e?.message || e)}`);
    } finally {
      setTplBusy(false);
    }
  }

  async function deleteTemplate(t: ReportTemplate) {
    Modal.confirm({
      title: 'Delete template?',
      content: t.is_system_template ? 'System templates cannot be deleted.' : 'This cannot be undone.',
      okButtonProps: { danger: true, disabled: t.is_system_template },
      onOk: async () => {
        if (t.is_system_template) return;
        if (!can('reports.generate')) {
          message.error('You do not have permission to delete templates.');
          return;
        }
        try {
          await fetchJson(`/api/reports/templates/${t.id}`, tenantId, { method: 'DELETE', headers: { 'x-tenant-id': tenantId } } as any);
          message.success('Deleted');
          await refreshTemplates();
        } catch (e: any) {
          message.error(`Failed: ${String(e?.message || e)}`);
        }
      },
    });
  }

  async function openEditTemplate(t: ReportTemplate) {
    if (t.is_system_template) {
      // duplicate system template
      try {
        const full = await fetchJson(`/api/reports/templates/${t.id}`, tenantId);
        setEditTpl(null);
        setCreateTplOpen(true);
        tplForm.setFieldsValue({
          template_name: `${t.template_name} (Copy)`,
          template_description: full.template_description || '',
          template_type: full.template_type,
          output_format: full.output_format,
          report_config: JSON.stringify(full.report_config || {}, null, 2),
          branding: JSON.stringify(full.branding || {}, null, 2),
        });
      } catch (e: any) {
        message.error(`Failed: ${String(e?.message || e)}`);
      }
      return;
    }
    try {
      const full = await fetchJson(`/api/reports/templates/${t.id}`, tenantId);
      setEditTpl(t);
      setCreateTplOpen(true);
      tplForm.setFieldsValue({
        template_name: full.template_name,
        template_description: full.template_description || '',
        template_type: full.template_type,
        output_format: full.output_format,
        report_config: JSON.stringify(full.report_config || {}, null, 2),
        branding: JSON.stringify(full.branding || {}, null, 2),
      });
    } catch (e: any) {
      message.error(`Failed: ${String(e?.message || e)}`);
    }
  }

  async function createSchedule(values: any) {
    setSchedBusy(true);
    try {
      const cfg: any = {};
      if (values.time) cfg.time = values.time;
      if (values.day_of_week) cfg.day = values.day_of_week;
      if (values.day_of_month) cfg.day = Number(values.day_of_month);
      await fetchJson('/api/reports/scheduled', tenantId, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          template_id: values.template_id,
          schedule_name: values.schedule_name,
          schedule_description: values.schedule_description || null,
          frequency: values.frequency,
          frequency_config: cfg,
          recipients: values.recipients || [],
          email_subject: values.email_subject || null,
          email_body: values.email_body || null,
          is_enabled: true,
        }),
      } as any);
      message.success('Schedule created');
      setCreateSchedOpen(false);
      schedForm.resetFields();
      await refreshSchedules?.();
    } catch (e: any) {
      message.error(`Failed: ${String(e?.message || e)}`);
    } finally {
      setSchedBusy(false);
    }
  }

  async function toggleSchedule(s: any, enabled: boolean) {
    try {
      await fetchJson(`/api/reports/scheduled/${s.id}`, tenantId, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ is_enabled: enabled }),
      } as any);
      await refreshSchedules?.();
    } catch (e: any) {
      message.error(`Failed: ${String(e?.message || e)}`);
    }
  }

  async function runScheduleNow(s: any) {
    try {
      const r = await fetchJson(`/api/reports/scheduled/${s.id}/run-now`, tenantId, { method: 'POST', headers: { 'x-tenant-id': tenantId } } as any);
      message.success('Triggered');
      const url = r?.result?.download_url;
      if (url) window.open(url, '_blank');
      await refreshHistory?.();
    } catch (e: any) {
      message.error(`Failed: ${String(e?.message || e)}`);
    }
  }

  async function deleteReport(row: any) {
    Modal.confirm({
      title: 'Delete report?',
      content: 'This will delete the stored file and history record.',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await fetchJson(`/api/reports/history/${row.id}`, tenantId, { method: 'DELETE', headers: { 'x-tenant-id': tenantId } } as any);
          message.success('Deleted');
          await refreshHistory?.();
        } catch (e: any) {
          message.error(`Failed: ${String(e?.message || e)}`);
        }
      },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Reports & Exports"
        description="Generate professional reports and export data for analysis."
        icon={FileText}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Reports' },
        ]}
      />
      <div className="p-8">
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k)}
          items={[
            {
              key: 'generate',
              label: 'Generate Reports',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Card>
                    <Row gutter={12} align="middle">
                      <Col flex="none">
                        <Typography.Text strong>Date range</Typography.Text>
                      </Col>
                      <Col flex="auto">
                        <DatePicker.RangePicker value={range as any} onChange={(v) => setRange(v as any)} style={{ width: '100%' }} />
                      </Col>
                    </Row>
                  </Card>

                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={12} lg={8}>
                      <Card
                        title="Executive Summary"
                        extra={<Tag color="blue">PDF</Tag>}
                        actions={[
                          <Button key="gen" type="primary" loading={genBusy} onClick={() => generateFromTemplate(systemByType.get('executive_summary')?.id || '', 'pdf')} disabled={!systemByType.get('executive_summary')}>
                            Generate
                          </Button>,
                        ]}
                      >
                        <Typography.Text type="secondary">High-level GRC metrics and trends.</Typography.Text>
                      </Card>
                    </Col>
                    <Col xs={24} md={12} lg={8}>
                      <Card
                        title="Risk Register"
                        extra={<Tag color="green">Excel/CSV</Tag>}
                        actions={[
                          <Space key="actions">
                            <Button loading={genBusy} onClick={() => generateFromTemplate(systemByType.get('risk_register')?.id || '', 'excel')} disabled={!systemByType.get('risk_register')}>
                              Excel
                            </Button>
                            <Button loading={genBusy} onClick={() => generateFromTemplate(systemByType.get('risk_register')?.id || '', 'csv')} disabled={!systemByType.get('risk_register')}>
                              CSV
                            </Button>
                          </Space>,
                        ]}
                      >
                        <Typography.Text type="secondary">Complete risk inventory export.</Typography.Text>
                      </Card>
                    </Col>
                    <Col xs={24} md={12} lg={8}>
                      <Card
                        title="Compliance Status"
                        extra={<Tag>PDF</Tag>}
                        actions={[
                          <Button key="gen" loading={genBusy} onClick={() => generateFromTemplate(systemByType.get('compliance_status')?.id || '', 'pdf')} disabled={!systemByType.get('compliance_status')}>
                            Generate
                          </Button>,
                        ]}
                      >
                        <Typography.Text type="secondary">Framework compliance overview.</Typography.Text>
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Data Exports (Excel)">
                    <Space wrap>
                      <Button onClick={() => downloadExportXlsx('/api/exports/risks', `risk_register_${dayjs().format('YYYY-MM-DD')}.xlsx`)}>Export Risks</Button>
                      <Button onClick={() => downloadExportXlsx('/api/exports/controls', `controls_${dayjs().format('YYYY-MM-DD')}.xlsx`)}>Export Controls</Button>
                      <Button onClick={() => downloadExportXlsx('/api/exports/incidents', `incidents_${dayjs().format('YYYY-MM-DD')}.xlsx`)}>Export Incidents</Button>
                      <Button onClick={() => downloadExportXlsx('/api/exports/vendors', `vendors_${dayjs().format('YYYY-MM-DD')}.xlsx`)}>Export Vendors</Button>
                      <Button onClick={() => downloadExportXlsx('/api/exports/policies', `policies_${dayjs().format('YYYY-MM-DD')}.xlsx`)}>Export Policies</Button>
                      <Button onClick={() => downloadExportXlsx('/api/exports/audit-findings', `audit_findings_${dayjs().format('YYYY-MM-DD')}.xlsx`)}>Export Audit Findings</Button>
                    </Space>
                  </Card>

                  <Card title="Custom Reports">
                    <Space>
                      <Button type="primary" href="/reports/builder">
                        Build Custom Report
                      </Button>
                      <Button onClick={() => { setEditTpl(null); setCreateTplOpen(true); tplForm.resetFields(); }}>
                        Create Template (JSON)
                      </Button>
                    </Space>
                  </Card>
                </Space>
              ),
            },
            {
              key: 'scheduled',
              label: 'Scheduled Reports',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Card>
                    <Space>
                      <Button type="primary" onClick={() => { setCreateSchedOpen(true); schedForm.resetFields(); }}>
                        Create Schedule
                      </Button>
                    </Space>
                  </Card>
                  <Table
                    rowKey="id"
                    dataSource={schedulesData?.items || []}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Name', dataIndex: 'schedule_name' },
                      { title: 'Template', render: (_, r: any) => <span>{r.template_name}</span> },
                      { title: 'Frequency', dataIndex: 'frequency', render: (v) => <Badge status="processing" text={String(v)} /> },
                      { title: 'Next Run', dataIndex: 'next_run_at' },
                      { title: 'Last Run', dataIndex: 'last_run_at' },
                      {
                        title: 'Recipients',
                        render: (_, r: any) => (
                          <Space wrap>
                            {(r.recipients || []).slice(0, 3).map((e: string) => (
                              <Tag key={e}>{e}</Tag>
                            ))}
                            {(r.recipients || []).length > 3 ? <Tag>+{(r.recipients || []).length - 3}</Tag> : null}
                          </Space>
                        ),
                      },
                      {
                        title: 'Enabled',
                        render: (_, r: any) => (
                          <Button size="small" onClick={() => toggleSchedule(r, !r.is_enabled)}>
                            {r.is_enabled ? 'Disable' : 'Enable'}
                          </Button>
                        ),
                      },
                      {
                        title: 'Actions',
                        render: (_, r: any) => (
                          <Space>
                            <Button size="small" onClick={() => runScheduleNow(r)}>
                              Run now
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={() =>
                                Modal.confirm({
                                  title: 'Delete schedule?',
                                  okButtonProps: { danger: true },
                                  onOk: async () => {
                                    await fetchJson(`/api/reports/scheduled/${r.id}`, tenantId, { method: 'DELETE', headers: { 'x-tenant-id': tenantId } } as any);
                                    await refreshSchedules?.();
                                  },
                                })
                              }
                            >
                              Delete
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: 'history',
              label: 'Report History',
              children: (
                <Table
                  rowKey="id"
                  dataSource={historyData?.items || []}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Report', dataIndex: 'report_name' },
                    { title: 'Type', dataIndex: 'report_type' },
                    { title: 'Format', dataIndex: 'output_format', render: (v) => <Tag>{String(v).toUpperCase()}</Tag> },
                    { title: 'Generated By', dataIndex: 'generated_by' },
                    { title: 'Generated At', dataIndex: 'generated_at' },
                    { title: 'Size', dataIndex: 'file_size_bytes', render: (v) => fmtBytes(v) },
                    { title: 'Downloads', dataIndex: 'download_count' },
                    {
                      title: 'Actions',
                      render: (_, r: any) => (
                        <Space>
                          <Button size="small" onClick={() => window.open(`/api/reports/history/${encodeURIComponent(String(r.id))}/download`, '_blank')}>
                            Download
                          </Button>
                          <Button size="small" danger onClick={() => deleteReport(r)}>
                            Delete
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'templates',
              label: 'Templates',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Card>
                    <Space>
                      <Button type="primary" onClick={() => { setEditTpl(null); setCreateTplOpen(true); tplForm.resetFields(); }}>
                        Create Template
                      </Button>
                      <Button href="/reports/builder">Open Builder</Button>
                    </Space>
                  </Card>

                  <Row gutter={[12, 12]}>
                    {templates.map((t) => (
                      <Col key={t.id} xs={24} md={12} lg={8}>
                        <Card
                          title={
                            <Space>
                              <span>{t.template_name}</span>
                              {t.is_system_template ? <Tag color="blue">System</Tag> : <Tag>Custom</Tag>}
                            </Space>
                          }
                          extra={<Tag>{String(t.output_format).toUpperCase()}</Tag>}
                          actions={[
                            <Button key="use" size="small" onClick={() => generateFromTemplate(t.id, String(t.output_format) === 'both' ? 'pdf' : String(t.output_format))} loading={genBusy}>
                              Use
                            </Button>,
                            <Button key="edit" size="small" onClick={() => openEditTemplate(t)}>
                              {t.is_system_template ? 'Duplicate' : 'Edit'}
                            </Button>,
                            <Button key="del" size="small" danger disabled={t.is_system_template} onClick={() => deleteTemplate(t)}>
                              Delete
                            </Button>,
                          ]}
                        >
                          <Space direction="vertical" size={4}>
                            <Typography.Text type="secondary">Type: {t.template_type}</Typography.Text>
                            <Typography.Text type="secondary">Usage: {t.usage_count || 0}</Typography.Text>
                            <Typography.Text type="secondary">Last used: {t.last_used_at || '-'}</Typography.Text>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        open={createTplOpen}
        title={editTpl ? 'Edit Template' : 'Create Template'}
        onCancel={() => { setCreateTplOpen(false); setEditTpl(null); }}
        onOk={() => tplForm.submit()}
        confirmLoading={tplBusy}
        width={900}
      >
        <Form form={tplForm} layout="vertical" onFinish={saveTemplate} initialValues={{ output_format: 'pdf', template_type: 'custom' }}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="template_name" label="Template Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="template_type" label="Template Type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'executive_summary', label: 'Executive Summary' },
                    { value: 'risk_register', label: 'Risk Register' },
                    { value: 'audit_report', label: 'Audit Report' },
                    { value: 'vendor_assessment', label: 'Vendor Assessment' },
                    { value: 'compliance_status', label: 'Compliance Status' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="output_format" label="Output Format" rules={[{ required: true }]}>
                <Select options={[{ value: 'pdf', label: 'PDF' }, { value: 'excel', label: 'Excel' }, { value: 'csv', label: 'CSV' }, { value: 'both', label: 'Both' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="template_description" label="Description">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="report_config"
            label="Report Config (JSON)"
            rules={[{ required: true, message: 'Provide JSON config ({} is fine)' }]}
            initialValue={JSON.stringify({ include_charts: true, include_tables: true, sections: [] }, null, 2)}
          >
            <Input.TextArea rows={10} />
          </Form.Item>
          <Form.Item name="branding" label="Branding (JSON)" initialValue={JSON.stringify({}, null, 2)}>
            <Input.TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={createSchedOpen}
        title="Create Scheduled Report"
        onCancel={() => setCreateSchedOpen(false)}
        onOk={() => schedForm.submit()}
        confirmLoading={schedBusy}
        width={900}
      >
        <Form form={schedForm} layout="vertical" onFinish={createSchedule} initialValues={{ frequency: 'weekly', day_of_week: 'monday', time: '09:00' }}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="template_id" label="Report Template" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={templates.map((t) => ({ value: t.id, label: `${t.template_name} (${t.template_type})` }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="schedule_name" label="Schedule Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="schedule_description" label="Description">
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="frequency" label="Frequency" rules={[{ required: true }]}>
                <Select options={[{ value: 'daily' }, { value: 'weekly' }, { value: 'monthly' }, { value: 'quarterly' }, { value: 'annual' }].map((x) => ({ value: x.value, label: x.value }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item noStyle shouldUpdate={(p, c) => p.frequency !== c.frequency}>
                {({ getFieldValue }) => {
                  const f = getFieldValue('frequency');
                  if (f === 'weekly') {
                    return (
                      <Form.Item name="day_of_week" label="Day of Week" rules={[{ required: true }]}>
                        <Select options={['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => ({ value: d, label: d }))} />
                      </Form.Item>
                    );
                  }
                  if (f === 'monthly') {
                    return (
                      <Form.Item name="day_of_month" label="Day of Month" rules={[{ required: true }]}>
                        <Input type="number" min={1} max={31} />
                      </Form.Item>
                    );
                  }
                  return <div />;
                }}
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="time" label="Time (HH:MM)" rules={[{ required: true }]}>
                <Input placeholder="09:00" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="recipients" label="Recipients (comma-separated emails)" rules={[{ required: true }]}>
            <Select mode="tags" tokenSeparators={[',']} placeholder="security@company.com" />
          </Form.Item>
          <Form.Item name="email_subject" label="Email Subject">
            <Input placeholder="Monthly GRC Report - {{date}}" />
          </Form.Item>
          <Form.Item name="email_body" label="Email Body">
            <Input.TextArea rows={4} placeholder="Please find attached the scheduled report." />
          </Form.Item>
          <Typography.Text type="secondary">
            Scheduled reports require Email (SMTP) integration to be configured and enabled.
          </Typography.Text>
        </Form>
      </Modal>
    </div>
    </div>
  );
}

