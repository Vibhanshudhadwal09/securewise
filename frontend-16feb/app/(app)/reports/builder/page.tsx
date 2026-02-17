'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, Typography, message } from 'antd';
import { usePermissions } from '../../../../lib/permissions';

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

export default function ReportBuilderPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const { can } = usePermissions();
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();

  async function save(values: any) {
    if (!can('reports.generate')) {
      message.error('You do not have permission to create report templates.');
      return;
    }
    setBusy(true);
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
      await fetchJson('/api/reports/templates', tenantId, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          template_name: values.template_name,
          template_description: values.template_description || null,
          template_type: values.template_type,
          output_format: values.output_format,
          report_config: reportConfig,
          branding,
        }),
      });
      message.success('Template saved');
      window.location.href = '/reports?tab=templates';
    } catch (e: any) {
      message.error(`Failed: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Report Builder
          </Typography.Title>
          <Typography.Text type="secondary">
            This is a lightweight builder that saves templates. Use JSON sections for now (drag-and-drop can be added next).
          </Typography.Text>
        </div>

        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={save}
            initialValues={{
              template_type: 'custom',
              output_format: 'pdf',
              report_config: JSON.stringify(
                {
                  data_sources: ['risks', 'controls', 'incidents'],
                  sections: [{ section_name: 'Executive Summary', section_type: 'text', content: 'This report provides...' }],
                  filters: {},
                  include_charts: true,
                  include_tables: true,
                },
                null,
                2
              ),
              branding: JSON.stringify({ primary_color: '#1F4788' }, null, 2),
            }}
          >
            <Form.Item name="template_name" label="Report Name" rules={[{ required: true }]}>
              <Input placeholder="Q1 GRC Status Report" />
            </Form.Item>
            <Form.Item name="template_description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="output_format" label="Output Format" rules={[{ required: true }]}>
              <Select options={[{ value: 'pdf', label: 'PDF' }, { value: 'excel', label: 'Excel' }, { value: 'csv', label: 'CSV' }, { value: 'both', label: 'Both' }]} />
            </Form.Item>
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
            <Form.Item name="report_config" label="Sections & Data (JSON)" rules={[{ required: true }]}>
              <Input.TextArea rows={12} />
            </Form.Item>
            <Form.Item name="branding" label="Branding (JSON)">
              <Input.TextArea rows={6} />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={busy}>
                Save as Template
              </Button>
              <Button href="/reports">Cancel</Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </div>
  );
}

