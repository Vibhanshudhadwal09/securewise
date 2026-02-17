'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Table, Tag, Tabs, Typography, message } from 'antd';
import { useParams } from 'next/navigation';

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

export default function VendorDetailPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const params = useParams<{ vendorId: string }>();
  const vendorId = String((params as any)?.vendorId || '');

  const { data, mutate } = useSWR(vendorId ? `/api/vendors/${encodeURIComponent(vendorId)}` : null, (u) => fetchJson(u as any, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });

  const vendor = (data as any)?.vendor || null;
  const contacts: any[] = Array.isArray((data as any)?.contacts) ? (data as any).contacts : [];
  const documents: any[] = Array.isArray((data as any)?.documents) ? (data as any).documents : [];
  const assessments: any[] = Array.isArray((data as any)?.assessments) ? (data as any).assessments : [];
  const accessReviews: any[] = Array.isArray((data as any)?.access_reviews) ? (data as any).access_reviews : [];
  const incidents: any[] = Array.isArray((data as any)?.incidents) ? (data as any).incidents : [];

  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm] = Form.useForm();

  const [docOpen, setDocOpen] = useState(false);
  const [docForm] = Form.useForm();
  const [docFile, setDocFile] = useState<File | null>(null);

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentForm] = Form.useForm();

  if (!vendor) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Typography.Text type="secondary">Loading vendor…</Typography.Text>
      </div>
    );
  }

  async function patchVendor(values: any) {
    setSaving(true);
    try {
      const res = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      setEditOpen(false);
      mutate();
      message.success('Saved');
    } finally {
      setSaving(false);
    }
  }

  async function createAssessment(values: any) {
    setSaving(true);
    try {
      const res = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/assessments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      setAssessmentOpen(false);
      mutate();
      window.location.href = `/vendors/${encodeURIComponent(vendorId)}/assessments/${encodeURIComponent(String(json.id))}`;
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocument(values: any) {
    if (!docFile) {
      message.error('Choose a file first');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set('document_name', values.document_name);
      fd.set('document_type', values.document_type);
      if (values.document_description) fd.set('document_description', values.document_description);
      if (values.valid_until) fd.set('valid_until', values.valid_until);
      fd.set('file', docFile);

      const res = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/documents`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      setDocOpen(false);
      setDocFile(null);
      docForm.resetFields();
      mutate();
      message.success('Uploaded');
    } finally {
      setSaving(false);
    }
  }

  async function addContact(values: any) {
    setSaving(true);
    try {
      const res = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/contacts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      setContactOpen(false);
      contactForm.resetFields();
      mutate();
      message.success('Contact added');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(vendor.vendor_name)}</h1>
          <Space style={{ marginTop: 6 }} wrap>
            <Tag>{String(vendor.vendor_type || '')}</Tag>
            <Tag color={critColor(String(vendor.criticality || ''))}>{String(vendor.criticality || '')}</Tag>
            <Tag>{String(vendor.vendor_status || '')}</Tag>
            {vendor.overall_risk_score != null ? <Tag color={Number(vendor.overall_risk_score) >= 15 ? 'red' : Number(vendor.overall_risk_score) >= 10 ? 'orange' : 'green'}>{`Risk ${Number(vendor.overall_risk_score).toFixed(2)}`}</Tag> : null}
          </Space>
        </div>
        <Space>
          <Button href="/vendors">Back</Button>
          <Button onClick={() => mutate()}>Refresh</Button>
          <Button type="primary" onClick={() => { setEditOpen(true); editForm.setFieldsValue(vendor); }}>
            Edit
          </Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title="Vendor Information">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Business function">{vendor.business_function || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Services">{vendor.services_provided || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Data access">{vendor.has_data_access ? 'Yes' : 'No'}</Descriptions.Item>
                      <Descriptions.Item label="Data types">{Array.isArray(vendor.data_types_accessed) ? vendor.data_types_accessed.join(', ') : '-'}</Descriptions.Item>
                      <Descriptions.Item label="Internal owner">{vendor.internal_owner_email || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Business unit">{vendor.business_unit || '-'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title="Contract">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Start">{vendor.contract_start_date ? String(vendor.contract_start_date).slice(0, 10) : '-'}</Descriptions.Item>
                      <Descriptions.Item label="End">{vendor.contract_end_date ? String(vendor.contract_end_date).slice(0, 10) : '-'}</Descriptions.Item>
                      <Descriptions.Item label="Value">{vendor.contract_value != null ? `${vendor.contract_currency || 'USD'} ${vendor.contract_value}` : '-'}</Descriptions.Item>
                      <Descriptions.Item label="Renewal notify">{vendor.renewal_notification_days != null ? `${vendor.renewal_notification_days} days` : '-'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'assessments',
            label: 'Risk Assessments',
            children: (
              <Card
                title="Assessments"
                extra={
                  <Button type="primary" onClick={() => setAssessmentOpen(true)}>
                    Start New Assessment
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  dataSource={assessments}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Name', dataIndex: 'assessment_name', render: (v: any, r: any) => <a href={`/vendors/${encodeURIComponent(vendorId)}/assessments/${encodeURIComponent(String(r.id))}`}>{String(v || '')}</a> },
                    { title: 'Type', dataIndex: 'assessment_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                    { title: 'Template', dataIndex: 'assessment_template', render: (v: any) => (v ? String(v) : '-') },
                    { title: 'Score', dataIndex: 'risk_score', render: (v: any) => (v != null ? Number(v).toFixed(2) : '-') },
                    { title: 'Status', dataIndex: 'assessment_status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                    { title: 'Created', dataIndex: 'created_at', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'contacts',
            label: 'Contacts',
            children: (
              <Card title="Contacts" extra={<Button onClick={() => setContactOpen(true)}>Add Contact</Button>}>
                <Table
                  rowKey="id"
                  dataSource={contacts}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Name', dataIndex: 'contact_name', render: (v: any) => String(v || '') },
                    { title: 'Role', dataIndex: 'contact_role', render: (v: any) => (v ? String(v) : '-') },
                    { title: 'Email', dataIndex: 'contact_email', render: (v: any) => (v ? <a href={`mailto:${String(v)}`}>{String(v)}</a> : '-') },
                    { title: 'Primary', dataIndex: 'is_primary', render: (v: any) => (v ? <Tag color="blue">Primary</Tag> : '-') },
                    { title: 'Security', dataIndex: 'is_security_contact', render: (v: any) => (v ? <Tag color="green">Security</Tag> : '-') },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'documents',
            label: 'Documents',
            children: (
              <Card title="Documents" extra={<Button onClick={() => setDocOpen(true)}>Upload Document</Button>}>
                <Table
                  rowKey="id"
                  dataSource={documents}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Name', dataIndex: 'document_name', render: (v: any) => String(v || '') },
                    { title: 'Type', dataIndex: 'document_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                    { title: 'Uploaded', dataIndex: 'uploaded_at', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                    { title: 'Valid until', dataIndex: 'valid_until', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                    {
                      title: 'Actions',
                      render: (_: any, r: any) => (
                        <Space>
                          <Button size="small" href={`/api/vendors/${encodeURIComponent(vendorId)}/documents/${encodeURIComponent(String(r.id))}/download`}>
                            Download
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={async () => {
                              await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/documents/${encodeURIComponent(String(r.id))}`, { method: 'DELETE', credentials: 'include', headers: { 'x-tenant-id': tenantId } }).catch(() => null);
                              mutate();
                            }}
                          >
                            Delete
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'reviews',
            label: 'Access Reviews',
            children: (
              <Card title="Access Reviews">
                <Table
                  rowKey="id"
                  dataSource={accessReviews}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Period', render: (_: any, r: any) => `${String(r.review_period_start || '').slice(0, 10)} → ${String(r.review_period_end || '').slice(0, 10)}` },
                    { title: 'Type', dataIndex: 'review_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                    { title: 'Status', dataIndex: 'review_status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                    { title: 'Reviewer', dataIndex: 'reviewer_email', render: (v: any) => (v ? String(v) : '-') },
                    { title: 'Next due', dataIndex: 'next_review_due', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'incidents',
            label: 'Incidents',
            children: (
              <Card title="Vendor Incidents">
                <Table
                  rowKey="id"
                  dataSource={incidents}
                  pagination={{ pageSize: 10 }}
                  columns={[
                    { title: 'Title', dataIndex: 'incident_title', render: (v: any) => String(v || '') },
                    { title: 'Type', dataIndex: 'incident_type', render: (v: any) => (v ? <Tag>{String(v)}</Tag> : '-') },
                    { title: 'Severity', dataIndex: 'severity', render: (v: any) => <Tag color={critColor(String(v || ''))}>{String(v || '')}</Tag> },
                    { title: 'Date', dataIndex: 'incident_date', render: (v: any) => (v ? String(v).slice(0, 10) : '-') },
                    { title: 'Status', dataIndex: 'incident_status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                    { title: 'Internal incident', dataIndex: 'internal_incident_id', render: (v: any) => (v ? <a href={`/incidents/${encodeURIComponent(String(v))}`}>{String(v).slice(0, 8)}…</a> : '-') },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal title="Edit Vendor" open={editOpen} onCancel={() => setEditOpen(false)} onOk={() => editForm.submit()} confirmLoading={saving} okText="Save" destroyOnClose>
        <Form form={editForm} layout="vertical" onFinish={patchVendor}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="vendor_name" label="Vendor name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="criticality" label="Criticality" rules={[{ required: true }]}>
                <Select options={[{ value: 'critical' }, { value: 'high' }, { value: 'medium' }, { value: 'low' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="vendor_status" label="Status">
            <Select options={[{ value: 'active' }, { value: 'inactive' }, { value: 'under_review' }, { value: 'terminated' }]} />
          </Form.Item>
          <Form.Item name="services_provided" label="Services provided">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="contract_end_date" label="Contract end date (YYYY-MM-DD)">
            <Input />
          </Form.Item>
          <Form.Item name="renewal_notification_days" label="Renewal notification days">
            <Input type="number" min={1} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Add Contact" open={contactOpen} onCancel={() => setContactOpen(false)} onOk={() => contactForm.submit()} confirmLoading={saving} okText="Add" destroyOnClose>
        <Form form={contactForm} layout="vertical" onFinish={addContact} initialValues={{ is_primary: false, is_security_contact: false }}>
          <Form.Item name="contact_name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contact_email" label="Email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contact_role" label="Role">
            <Input />
          </Form.Item>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="is_primary" label="Primary?">
                <Select options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="is_security_contact" label="Security contact?">
                <Select options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="Upload Document" open={docOpen} onCancel={() => setDocOpen(false)} onOk={() => docForm.submit()} confirmLoading={saving} okText="Upload" destroyOnClose>
        <Form form={docForm} layout="vertical" onFinish={uploadDocument}>
          <Form.Item name="document_name" label="Document name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="document_type" label="Document type" rules={[{ required: true }]}>
            <Select options={[{ value: 'contract' }, { value: 'soc2_report' }, { value: 'iso_certificate' }, { value: 'dpa' }, { value: 'sla' }, { value: 'security_questionnaire' }, { value: 'other' }]} />
          </Form.Item>
          <Form.Item name="valid_until" label="Valid until (YYYY-MM-DD)">
            <Input />
          </Form.Item>
          <Form.Item label="File">
            <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          </Form.Item>
          <Form.Item name="document_description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Start Assessment" open={assessmentOpen} onCancel={() => setAssessmentOpen(false)} onOk={() => assessmentForm.submit()} confirmLoading={saving} okText="Create" destroyOnClose>
        <Form form={assessmentForm} layout="vertical" onFinish={createAssessment} initialValues={{ assessment_type: 'annual', assessment_template: 'lightweight' }}>
          <Form.Item name="assessment_name" label="Assessment name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Annual vendor review 2026" />
          </Form.Item>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="assessment_type" label="Type" rules={[{ required: true }]}>
                <Select options={[{ value: 'initial' }, { value: 'annual' }, { value: 'change_triggered' }, { value: 'incident_triggered' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="assessment_template" label="Template">
                <Select options={[{ value: 'lightweight' }, { value: 'iso27001_vendor' }, { value: 'custom' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

