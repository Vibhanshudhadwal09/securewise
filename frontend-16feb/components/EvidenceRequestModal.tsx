'use client';

import React, { useMemo, useState } from 'react';
import { Button, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';

function defaultDueDate() {
  return dayjs().add(7, 'day');
}

export function EvidenceRequestModal(props: {
  tenantId: string;
  controlId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const tenantId = props.tenantId || 'demo-tenant';
  const controlId = props.controlId;
  const [loading, setLoading] = useState(false);

  const initialValues = useMemo(
    () => ({
      assigned_to: '',
      evidence_type: 'attestation',
      instructions: '',
      due_date: defaultDueDate(),
      suggested_expiration_days: undefined,
    }),
    []
  );

  async function submit(values: any) {
    setLoading(true);
    try {
      const res = await fetch('/api/evidence-requests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          control_id: controlId,
          assigned_to: values.assigned_to,
          evidence_type: values.evidence_type,
          instructions: values.instructions || '',
          due_date: values.due_date ? dayjs(values.due_date).toISOString() : null,
          suggested_expiration_days: values.suggested_expiration_days ?? undefined,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));

      alert(`Evidence request sent to ${values.assigned_to}`);
      props.onSuccess?.();
      props.onClose();
    } catch (e) {
      console.error('Error creating evidence request:', e);
      alert('Failed to create evidence request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={props.open} onCancel={props.onClose} footer={null} title="Request Evidence" destroyOnClose>
      <Form layout="vertical" initialValues={initialValues as any} onFinish={submit}>
        <Form.Item label="Assign to *" name="assigned_to" rules={[{ required: true, message: 'Select an owner' }]}>
          <Select
            placeholder="Select owner..."
            options={[
              { value: 'grc@example.com', label: 'GRC Team (grc@example.com)' },
              { value: 'it-ops@example.com', label: 'IT Operations (it-ops@example.com)' },
              { value: 'security@example.com', label: 'Security Team (security@example.com)' },
              { value: 'compliance@example.com', label: 'Compliance (compliance@example.com)' },
            ]}
          />
        </Form.Item>

        <Form.Item label="Evidence Type *" name="evidence_type" rules={[{ required: true, message: 'Select a type' }]}>
          <Select
            options={[
              { value: 'attestation', label: 'Attestation' },
              { value: 'policy_doc', label: 'Policy Document' },
              { value: 'screenshot', label: 'Screenshot' },
              { value: 'log_export', label: 'Log Export' },
              { value: 'scan_report', label: 'Scan Report' },
              { value: 'test_result', label: 'Test Result' },
            ]}
          />
        </Form.Item>

        <Form.Item label="Instructions" name="instructions">
          <Input.TextArea rows={4} placeholder="Describe what evidence is needed..." />
        </Form.Item>

        <Form.Item label="Due Date *" name="due_date" rules={[{ required: true, message: 'Select a due date' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Suggested Expiration Period (optional)"
          name="suggested_expiration_days"
          extra="If set, evidence uploaded for this request will auto-fill an expiration date."
        >
          <Select
            allowClear
            placeholder="Select suggested validity..."
            options={[
              { value: 30, label: '30 days' },
              { value: 90, label: '90 days' },
              { value: 180, label: '6 months' },
              { value: 365, label: '1 year' },
              { value: 730, label: '2 years' },
            ]}
          />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Send Request
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

