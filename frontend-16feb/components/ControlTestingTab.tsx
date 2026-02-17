'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Skeleton, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

type TestRow = any;

async function fetchJson(path: string, tenantId: string) {
  const res = await fetch(path, {
    method: 'GET',
    credentials: 'include',
    headers: { 'x-tenant-id': tenantId },
    cache: 'no-store',
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
  return j;
}

async function postJson(path: string, tenantId: string, body: any) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
  return j;
}

function statusTag(v: any) {
  const s = String(v || '');
  if (s === 'passed') return <Tag color="green">Passed</Tag>;
  if (s === 'failed') return <Tag color="red">Failed</Tag>;
  if (s === 'not_applicable') return <Tag>Not applicable</Tag>;
  return <Tag>{s || '-'}</Tag>;
}

export function ControlTestingTab(props: { tenantId: string; controlId: string }) {
  const tenantId = props.tenantId || 'demo-tenant';
  const controlId = props.controlId;

  const url = `/api/control-tests?controlId=${encodeURIComponent(controlId)}`;
  const { data, error, isLoading, mutate } = useSWR<{ items?: TestRow[] }>(url, (u) => fetchJson(u, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });

  const items = useMemo(() => {
    const anyData: any = data as any;
    return Array.isArray(anyData?.items) ? anyData.items : [];
  }, [data]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(values: any) {
    setSaving(true);
    try {
      await postJson('/api/control-tests', tenantId, {
        control_id: controlId,
        test_type: values.test_type,
        test_status: values.test_status,
        test_notes: values.test_notes || '',
        sample_size: values.sample_size ?? null,
        failures_found: values.failures_found ?? 0,
        severity: values.severity || null,
      });
      setOpen(false);
      await mutate();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to record test', e);
      alert(String(e?.message || 'Failed to record test'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Test History
        </Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Record Test
        </Button>
      </div>

      {isLoading ? <Skeleton active /> : error ? <Alert type="warning" showIcon message="Tests unavailable" description={String((error as any)?.message || error)} /> : null}

      {!isLoading && !error ? (
        items.length === 0 ? (
          <Typography.Text type="secondary">No tests recorded yet</Typography.Text>
        ) : (
          <Table<TestRow>
            rowKey={(r) => String(r.id || '')}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            dataSource={items}
            columns={[
              {
                title: 'Date',
                dataIndex: 'test_date',
                width: 140,
                render: (v) => (v ? dayjs(String(v)).format('YYYY-MM-DD') : '-'),
              },
              {
                title: 'Type',
                dataIndex: 'test_type',
                width: 180,
                render: (v) => {
                  const s = String(v || '');
                  if (s === 'design_effectiveness') return <Tag>Design</Tag>;
                  if (s === 'operating_effectiveness') return <Tag>Operating</Tag>;
                  return <Tag>{s || '-'}</Tag>;
                },
              },
              { title: 'Status', dataIndex: 'test_status', width: 140, render: (v) => statusTag(v) },
              { title: 'Tested By', dataIndex: 'tested_by', width: 220, render: (v) => <Typography.Text>{String(v || '-')}</Typography.Text> },
              { title: 'Notes', dataIndex: 'test_notes', render: (v) => <Typography.Text>{String(v || '-')}</Typography.Text> },
            ]}
          />
        )
      ) : null}

      <Modal open={open} onCancel={() => setOpen(false)} footer={null} title="Record Control Test" destroyOnClose>
        <Form
          layout="vertical"
          initialValues={{
            test_type: 'design_effectiveness',
            test_status: 'passed',
            test_notes: '',
            sample_size: null,
            failures_found: 0,
            severity: null,
          }}
          onFinish={submit}
        >
          <Form.Item label="Test Type *" name="test_type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'design_effectiveness', label: 'Design Effectiveness' },
                { value: 'operating_effectiveness', label: 'Operating Effectiveness' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Test Result *" name="test_status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'passed', label: 'Passed' },
                { value: 'failed', label: 'Failed' },
                { value: 'not_applicable', label: 'Not Applicable' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Severity (if failed)" name="severity">
            <Select
              allowClear
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Test Notes" name="test_notes">
            <Input.TextArea rows={4} placeholder="Describe the test performed and findings..." />
          </Form.Item>

          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const type = String(getFieldValue('test_type') || '');
              const status = String(getFieldValue('test_status') || '');
              if (type !== 'operating_effectiveness') return null;
              return (
                <>
                  <Form.Item label="Sample Size" name="sample_size">
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g., 25" />
                  </Form.Item>
                  {status === 'failed' ? (
                    <Form.Item label="Failures Found" name="failures_found">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g., 3" />
                    </Form.Item>
                  ) : null}
                </>
              );
            }}
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Record Test
            </Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}

